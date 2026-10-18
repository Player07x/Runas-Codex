import { useSyncExternalStore } from "react"
import { editForLine } from "../core/tasks/edit"
import { DEFAULT_TASKS_SETTINGS, importTasksPluginData, parseStoredTasksSettings, type ImportedTasksSettings, type TasksSettings } from "../core/tasks/settings"
import { parseContext, tasksInNote, type ParseContext, type Task } from "../core/tasks/task"
import type { VaultIndex } from "../core/vault-index"
import { registerTaskToggle } from "../markdown/extensions"
import type { VaultState } from "../platform/VaultProvider"

/**
 * Tarefas do cofre com o comportamento do plugin Tasks. As configurações são deste aparelho, uma por cofre
 * (`localStorage`, chave `runas-codex:tasks:<cofre>`): o app lê o `data.json` do Tasks só quando o usuário pede a
 * importação, e nunca grava no `.obsidian`.
 */
const PREFIX = "runas-codex:tasks:"
export const TASKS_PLUGIN_DATA = ".obsidian/plugins/obsidian-tasks-plugin/data.json"

const listeners = new Set<() => void>()
const cache = new Map<string, TasksSettings>()
let currentVault: string | undefined

export function tasksSettingsOf(vault: string | undefined): TasksSettings {
  if (!vault) return DEFAULT_TASKS_SETTINGS
  let settings = cache.get(vault)
  if (!settings) {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(PREFIX + vault)
    } catch {
      /* sem armazenamento: padrões do Tasks */
    }
    settings = parseStoredTasksSettings(stored)
    cache.set(vault, settings)
  }
  return settings
}

export function saveTasksSettings(vault: string | undefined, settings: TasksSettings): void {
  if (!vault) return
  cache.set(vault, settings)
  try {
    localStorage.setItem(PREFIX + vault, JSON.stringify(settings))
  } catch {
    /* fica só até fechar o app */
  }
  listeners.forEach((listener) => listener())
}

export function resetTasksSettings(vault: string | undefined): void {
  if (!vault) return
  cache.delete(vault)
  try {
    localStorage.removeItem(PREFIX + vault)
  } catch {
    /* nada a apagar */
  }
  listeners.forEach((listener) => listener())
}

/** Importa o `data.json` do Tasks deste cofre (só leitura). */
export async function importTasksSettings(vault: string | undefined, readTexts: (paths: string[]) => Promise<Record<string, string>>): Promise<ImportedTasksSettings> {
  const texts = await readTexts([TASKS_PLUGIN_DATA])
  const json = texts[TASKS_PLUGIN_DATA]
  if (json === undefined) throw new Error("Este cofre não tem as configurações do plugin Tasks (.obsidian/plugins/obsidian-tasks-plugin/data.json).")
  const imported = importTasksPluginData(json)
  saveTasksSettings(vault, imported.settings)
  return imported
}

export function useTasksSettings(vault: string | undefined): TasksSettings {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => tasksSettingsOf(vault),
  )
}

/** O cofre aberto agora (para o clique na caixa do editor usar as configurações dele). */
export function setTasksVault(vault: string | undefined): void {
  currentVault = vault
}

export function currentParseContext(now = new Date()): ParseContext {
  return parseContext(tasksSettingsOf(currentVault), now)
}

// O clique em qualquer caixa (live preview e modo leitura) segue o Tasks com as configurações do cofre aberto.
registerTaskToggle((line) => editForLine(line, 0, currentParseContext())?.lines ?? null)

// ---------- Índice de tarefas ----------

/** Cache por nota: só relê a nota cujo texto mudou. */
const parsed = new Map<string, { text: string; key: string; tasks: Task[] }>()

function settingsKey(settings: TasksSettings, today: string): string {
  return `${today}|${JSON.stringify(settings)}`
}

export interface VaultTasksOptions {
  /** Esconde as tarefas do espaço Notas (e as de fora dos espaços) enquanto o PIN está bloqueado. */
  notesLocked?: boolean
  now?: Date
}

/** Todas as tarefas do cofre (com o filtro global e as opções do Tasks). */
export function vaultTasks(index: VaultIndex, settings: TasksSettings, options: VaultTasksOptions = {}): Task[] {
  const ctx = parseContext(settings, options.now ?? new Date())
  const key = settingsKey(settings, ctx.today)
  const out: Task[] = []
  const seen = new Set<string>()
  for (const note of index.allNotes()) {
    if (options.notesLocked && (note.scope.space === "notas" || note.scope.space === null)) continue
    seen.add(note.path)
    let entry = parsed.get(note.path)
    if (!entry || entry.text !== note.text || entry.key !== key) {
      entry = { text: note.text, key, tasks: tasksInNote(note.path, note.text, ctx) }
      parsed.set(note.path, entry)
    }
    out.push(...entry.tasks)
  }
  if (parsed.size > seen.size * 2 + 50) for (const path of parsed.keys()) if (!seen.has(path)) parsed.delete(path)
  return out
}

// ---------- Cofre para os blocos desenhados ----------

/**
 * O estado do cofre e o aviso na tela, publicados pelo `TasksRuntime`. Os blocos ```tasks do live preview são
 * desenhados numa raiz React à parte (sem o contexto do `VaultProvider`); eles leem daqui.
 */
export interface TasksVaultSnapshot {
  vault: VaultState | null
  toast: (message: string) => void
}

let snapshot: TasksVaultSnapshot = { vault: null, toast: () => undefined }
const vaultListeners = new Set<() => void>()

export function publishTasksVault(vault: VaultState, toast: (message: string) => void): void {
  snapshot = { vault, toast }
  vaultListeners.forEach((listener) => listener())
}

export function useTasksVault(): TasksVaultSnapshot {
  return useSyncExternalStore(
    (listener) => (vaultListeners.add(listener), () => vaultListeners.delete(listener)),
    () => snapshot,
  )
}

/** O cofre publicado agora (para quem não é componente, como o autocompletar do editor). */
export function currentTasksVault(): VaultState | null {
  return snapshot.vault
}

/** Ids das tarefas do cofre (sugestões de ⛔ "depende de"). */
export function vaultTaskIds(): { id: string; description: string }[] {
  const vault = snapshot.vault
  if (!vault?.index) return []
  return vaultTasks(vault.index, tasksSettingsOf(currentVault)).filter((t) => t.id).map((t) => ({ id: t.id, description: t.description }))
}
