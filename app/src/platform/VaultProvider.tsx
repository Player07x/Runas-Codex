import { bookEditsBeforeTrash } from "../core/book-removal"
import { DEFAULT_IMAGE_FOLDER, folderForAttachment } from "../core/images"
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { attachmentPath } from "../core/attachments"
import { caseCollision, nameProblem } from "../core/names"
import { setProperty as setPropertyText, type PropertyValue } from "../core/properties"
import { planFolderRename, planRename, type RenamePlan } from "../core/rename"
import { CONFIG_FILES, obsidianConfig, type ObsidianConfig } from "../core/templates"
import { renameFavorites } from "../lib/bookmarks"
import { renameTabs } from "../lib/tabs"
import { recordVersion, renameVersions } from "../lib/note-history"
import { renameDecorations } from "../lib/customization"
import { flushOpenNotes } from "../lib/vault-notes"
import { extname, foldName, joinPath } from "../core/text"
import { VaultIndex, type IndexedNote } from "../core/vault-index"
import { platform } from "./index"
import type { Platform, VaultChange, VaultEntry, VaultInfo } from "./platform"
import { decodeTransferText, sameTransferVersion, type TransferWrite } from "../core/transfer/plan"
import { managedWorldPath, transferPath } from "../core/transfer/archive"

const BATCH = 200

/**
 * O cofre aberto, para as telas: o índice (notas, links, tags) e as ações de gravação. Toda gravação passa por aqui,
 * com a versão que o app leu (se o arquivo mudou fora, a gravação é recusada) e com o índice atualizado na hora.
 */
export interface VaultState {
  platform: Platform
  info: VaultInfo | null
  index: VaultIndex | null
  /** Muda a cada alteração do índice (para `useMemo`). */
  version: number
  /** Configurações lidas do `.obsidian` (modelos e nota do dia). */
  config: ObsidianConfig
  /** Notas da pasta de modelos (a configurada no Obsidian, ou `Templates/`/`Modelos/`). */
  templates(): IndexedNote[]
  loading: boolean
  error?: string
  choose(): Promise<void>
  create(): Promise<void>
  setWritable(writable: boolean): Promise<void>
  reload(): Promise<void>
  /** Grava o texto completo de uma nota que já existe. */
  save(path: string, content: string): Promise<void>
  /** Cria `<pasta>/<nome>.md` e devolve o caminho. */
  createNote(folder: string, name: string, content?: string): Promise<string>
  createFolder(path: string): Promise<void>
  /** Renomeia ou move arquivo ou pasta, atualizando os links do cofre. Devolve o plano executado. */
  rename(from: string, to: string): Promise<RenamePlan>
  trash(path: string): Promise<void>
  setProperty(path: string, key: string, value: PropertyValue | undefined): Promise<void>
  /** Cria um arquivo de texto que não é nota (ex.: um quadro `.canvas`), pelo caminho completo. */
  createFile(path: string, content: string): Promise<string>
  restoreTrash(path: string, target: string): Promise<void>
  /**
   * Grava um anexo novo (imagem, PDF…) na pasta de anexos do Obsidian, relativa a `nearNote` quando a configuração é
   * `./`. Nome repetido ganha número (`mapa 1.png`). Devolve o caminho gravado.
   * Importadores podem informar uma pasta de destino explícita; o padrão continua sendo o do Obsidian.
   */
  addAttachment(fileName: string, bytes: Uint8Array, nearNote?: string, folder?: string): Promise<string>
  /** Executa a prévia confirmada, sempre com a versão capturada nela; todas as gravações ficam no useVault. */
  importTransfer(writes: TransferWrite[]): Promise<number>
}

const VaultContext = createContext<VaultState | null>(null)

const isText = (path: string) => /\.(md|canvas)$/i.test(path)

async function loadIndex(): Promise<VaultIndex> {
  const entries = await platform.listVault()
  const notes = entries.filter((entry) => extname(entry.path) === ".md")
  const texts: Record<string, string> = {}
  for (let i = 0; i < notes.length; i += BATCH) {
    Object.assign(texts, await platform.readTexts(notes.slice(i, i + BATCH).map((entry) => entry.path)))
    // Devolve a vez para a interface entre os lotes (cofres grandes não travam a tela).
    await new Promise((resolve) => setTimeout(resolve))
  }
  return new VaultIndex(entries, texts)
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [info, setInfo] = useState<VaultInfo | null>(null)
  const [index, setIndex] = useState<VaultIndex | null>(null)
  const [version, setVersion] = useState(0)
  const [config, setConfig] = useState<ObsidianConfig>(() => obsidianConfig({}))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>()
  const indexRef = useRef<VaultIndex | null>(null)
  const importing = useRef<Promise<number> | null>(null)
  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const open = useCallback(async (next: VaultInfo | null) => {
    setInfo(next)
    setError(undefined)
    if (!next) {
      indexRef.current = null
      setIndex(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      setConfig(obsidianConfig(await platform.readTexts([...CONFIG_FILES]).catch(() => ({}))))
      const loaded = await loadIndex()
      indexRef.current = loaded
      setIndex(loaded)
    } catch (err) {
      indexRef.current = null
      setIndex(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
      bump()
    }
  }, [bump])

  useEffect(() => {
    platform.vault().then(open, (err: unknown) => setError(String(err)))
  }, [open])

  // Mudanças feitas fora do app (Obsidian, sincronização) entram no índice na hora.
  useEffect(() => {
    if (!info) return
    return platform.watch(async (changes: VaultChange[]) => {
      const current = indexRef.current
      if (!current) return
      // Uma versão que o índice já tem (gravada por esta janela e avisada às outras) não precisa ser lida de novo.
      const known = (entry: VaultEntry) => {
        const file = current.allFiles().find((f) => f.path === entry.path)
        return file !== undefined && file.mtime === entry.mtime && file.size === entry.size
      }
      changes = changes.filter((c) => c.type === "deleted" || !known(c.entry))
      if (!changes.length) return
      const changed = changes.filter((c): c is Extract<VaultChange, { type: "changed" }> => c.type === "changed")
      const texts = await platform.readTexts(changed.filter((c) => isText(c.entry.path) && extname(c.entry.path) === ".md").map((c) => c.entry.path))
      for (const change of changes) {
        if (change.type === "deleted") {
          for (const file of current.allFiles()) if (file.path === change.path || file.path.startsWith(change.path + "/")) current.remove(file.path)
        } else current.set(change.entry, texts[change.entry.path])
      }
      bump()
    })
  }, [info, bump])

  const requireIndex = useCallback((): VaultIndex => {
    if (!indexRef.current || !info) throw new Error("Nenhum cofre aberto.")
    if (info.readOnly) throw new Error("Cofre em somente leitura. Libere a gravação em Configurações › Cofre.")
    return indexRef.current
  }, [info])

  const entryOf = (index: VaultIndex, path: string): VaultEntry | undefined => index.allFiles().find((file) => file.path === path)

  const save = useCallback(
    async (path: string, content: string) => {
      const current = requireIndex()
      const expected = entryOf(current, path)
      if (!expected) throw new Error(`“${path}” não está no cofre.`)
      const previous = current.note(path)?.text
      if (previous !== undefined && previous !== content) await recordVersion(info!.path, path, previous)
      const entry = await platform.writeText(path, content, expected)
      current.set(entry, content)
      bump()
    },
    [requireIndex, bump, info],
  )

  const createNote = useCallback(
    async (folder: string, name: string, content = "") => {
      const current = requireIndex()
      const problem = nameProblem(name)
      if (problem) throw new Error(problem)
      const path = joinPath(folder, `${name}.md`)
      if (!path) throw new Error("Pasta inválida.")
      const clash = caseCollision(path, current.allFiles().map((f) => f.path))
      if (clash) throw new Error(`Já existe “${clash}”.`)
      const entry = await platform.writeText(path, content, null)
      current.set(entry, content)
      bump()
      return path
    },
    [requireIndex, bump],
  )

  const createFolder = useCallback(
    async (path: string) => {
      requireIndex()
      for (const part of path.split("/")) {
        const problem = nameProblem(part)
        if (problem) throw new Error(problem)
      }
      await platform.createFolder(path)
    },
    [requireIndex],
  )

  const rename = useCallback(
    async (from: string, to: string) => {
      const current = requireIndex()
      const isFolder = !current.hasFile(from)
      const canvasPaths = current.allFiles().filter((f) => extname(f.path) === ".canvas").map((f) => f.path)
      const canvasTexts = canvasPaths.length ? await platform.readTexts(canvasPaths) : {}
      const plan = isFolder ? planFolderRename(current, from, to, canvasTexts) : planRename(current, from, to, canvasTexts)
      // Primeiro os links (cada arquivo com a versão que o app leu), depois o arquivo em si.
      for (const edit of plan.edits) {
        const expected = entryOf(current, edit.path)
        const entry = await platform.writeText(edit.path, edit.after, expected)
        current.set(entry, extname(edit.path) === ".md" ? edit.after : undefined)
      }
      await platform.rename(from, to)
      const moved = await platform.listVault(isFolder ? to + "/" : to)
      const movedTexts = await platform.readTexts(moved.filter((e) => extname(e.path) === ".md").map((e) => e.path))
      for (const file of current.allFiles()) if (file.path === from || file.path.startsWith(from + "/")) current.remove(file.path)
      for (const entry of moved) if (entry.path === to || entry.path.startsWith(to + "/")) current.set(entry, movedTexts[entry.path])
      bump()
      // Os favoritos e as abas deste aparelho acompanham a nota ou pasta.
      renameFavorites(info?.path, from, to)
      renameTabs(info?.path, from, to)
      if (info) await renameVersions(info.path, from, to)
      if (info) { try { renameDecorations(info.path, from, to) } catch { /* só a preferência do aparelho deixa de acompanhar */ } }
      return plan
    },
    [requireIndex, bump, info],
  )

  const trash = useCallback(
    async (path: string) => {
      await flushOpenNotes()
      const current = requireIndex()
      const edits = bookEditsBeforeTrash(current, path)
      const applied: typeof edits = []
      try {
        // Resolve os vínculos enquanto os destinos existem e grava com a versão esperada.
        for (const edit of edits) {
          if (current.note(edit.path)?.text !== edit.before) throw new Error(`“${edit.path}” mudou durante a remoção. Confira o livro e tente novamente.`)
          await save(edit.path, edit.after)
          applied.push(edit)
        }
        for (const note of current.allNotes()) if (note.path === path || note.path.startsWith(path + "/")) await recordVersion(info!.path, note.path, note.text, true)
        await platform.trash(path)
      } catch (error) {
        // Falha ao mover para a lixeira não deve deixar os livros sem seus vínculos.
        const failed: string[] = []
        for (const edit of applied.reverse()) {
          try {
            if (current.note(edit.path)?.text !== edit.after) throw new Error("Livro alterado durante a remoção")
            await save(edit.path, edit.before)
          } catch { failed.push(edit.path) }
        }
        if (failed.length) throw new Error(`${String(error)} Não foi possível restaurar a estrutura de: ${failed.join(", ")}. Confira esses livros.`)
        throw error
      }
      for (const file of current.allFiles()) if (file.path === path || file.path.startsWith(path + "/")) current.remove(file.path)
      bump()
    },
    [requireIndex, bump, info, save],
  )

  const setProperty = useCallback(
    async (path: string, key: string, value: PropertyValue | undefined) => {
      const note = requireIndex().note(path)
      if (!note) throw new Error(`“${path}” não está no cofre.`)
      await save(path, setPropertyText(note.text, key, value))
    },
    [requireIndex, save],
  )

  const createFile = useCallback(
    async (path: string, content: string) => {
      const current = requireIndex()
      for (const part of path.split("/")) {
        const problem = nameProblem(part)
        if (problem) throw new Error(problem)
      }
      const existing = current.allFiles().map((f) => f.path)
      const clash = caseCollision(path, existing)
      if (clash) throw new Error(`Já existe “${clash}”.`)
      const entry = await platform.writeText(path, content, null)
      current.set(entry, extname(path) === ".md" ? content : undefined)
      bump()
      return path
    },
    [requireIndex, bump],
  )

  const addAttachment = useCallback(
    async (fileName: string, bytes: Uint8Array, nearNote?: string, folder?: string) => {
      const current = requireIndex()
      const path = attachmentPath(folderForAttachment(fileName, folder ?? config.app.attachmentFolder), fileName, current.allFiles().map((f) => f.path), nearNote)
      const entry = await platform.writeBinary(path, bytes, null)
      current.set(entry)
      bump()
      return path
    },
    [requireIndex, bump, config],
  )

  const templates = useCallback((): IndexedNote[] => {
    const current = indexRef.current
    if (!current) return []
    const folders = config.templates.folder ? [config.templates.folder] : ["Templates", "Modelos", "Notas/Templates", "Notas/Modelos"]
    return current
      .allNotes()
      .filter((note) => folders.some((folder) => note.path.startsWith(folder + "/")))
      .sort((a, b) => a.path.localeCompare(b.path, "pt-BR"))
  }, [config])

  const restoreTrash = useCallback(async (path: string, target: string) => {
    const current = requireIndex()
    if (!platform.restoreTrash) throw new Error("Esta plataforma ainda não oferece restauração da lixeira.")
    const entry = await platform.restoreTrash(path, target)
    const text = /\.md$/i.test(target) ? (await platform.readTexts([target]))[target] : undefined
    current.set(entry, text); bump()
  }, [requireIndex, bump])

  const choose = useCallback(async () => { await importing.current; await flushOpenNotes(); await open(await platform.chooseVault()) }, [open])
  const create = useCallback(async () => { await importing.current; await flushOpenNotes(); const next = await platform.createVault(); if (next && !next.readOnly) await platform.createFolder(DEFAULT_IMAGE_FOLDER); await open(next) }, [open])
  const setWritable = useCallback(async (writable: boolean) => { await importing.current; setInfo(await platform.setWritable(writable)) }, [])
  const reload = useCallback(async () => { await importing.current; await open(await platform.vault()) }, [open])
  const importTransfer = useCallback((writes: TransferWrite[]): Promise<number> => {
    if (importing.current) return Promise.reject(new Error("Já há uma importação em andamento."))
    const task = (async () => {
      requireIndex()
      await flushOpenNotes()
      const identity = info!.path
      const entries = await (platform.listTransferFiles?.() ?? platform.listVault())
      for (const write of writes) {
        transferPath(write.path)
        if (!sameTransferVersion(entries.find(entry => foldName(entry.path) === foldName(write.path)), write.expected)) throw new Error(`“${write.path}” mudou desde a prévia. Prepare a importação novamente.`)
      }
      await platform.backup()
      let completed = 0
      try {
        for (const write of writes) {
          if ((await platform.vault())?.path !== identity) throw new Error("O cofre mudou durante a importação.")
          if (managedWorldPath(write.path)) {
            if (!platform.writeManagedTransfer) throw new Error("Esta versão do app não oferece importação dos dados internos das mesas.")
            await platform.writeManagedTransfer(write.path, write.bytes, write.expected)
          } else if (/\.(md|canvas|base)$/i.test(write.path)) {
            const before = indexRef.current?.note(write.path)?.text, text = decodeTransferText(write.bytes)
            if (before !== undefined && before !== text) await recordVersion(identity, write.path, before)
            await platform.writeText(write.path, text, write.expected)
          } else await platform.writeBinary(write.path, write.bytes, write.expected)
          completed++
        }
        return completed
      } catch (error) {
        throw new Error(`${error instanceof Error ? error.message : String(error)} ${completed} arquivo(s) foram gravados antes da interrupção; os demais não foram importados. Confira o pacote de segurança antes de repetir.`)
      } finally {
        try {
          const actual = await platform.vault()
          if (actual?.path === identity) {
            const loaded = await loadIndex()
            indexRef.current = loaded; setIndex(loaded); bump()
          } else await open(actual)
        } catch (error) { setError(`Não deu para reler o cofre após a importação: ${error instanceof Error ? error.message : String(error)}`) }
      }
    })()
    importing.current = task
    return task.finally(() => { if (importing.current === task) importing.current = null })
  }, [info, open, requireIndex, bump])

  return (
    <VaultContext.Provider value={{ platform, info, index, version, config, templates, loading, error, choose, create, setWritable, reload, save, createNote, createFolder, rename, trash, setProperty, createFile, addAttachment, restoreTrash, importTransfer }}>
      {children}
    </VaultContext.Provider>
  )
}

export function useVault(): VaultState {
  const state = useContext(VaultContext)
  if (!state) throw new Error("useVault fora do VaultProvider")
  return state
}

/** Visão derivada para leitura (ex.: prévia pública da Wiki), sem outro fluxo de gravação. */
export function VaultView({value,children}:{value:VaultState;children:ReactNode}) {return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>}
