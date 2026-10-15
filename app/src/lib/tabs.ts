import { createContext, useContext, useSyncExternalStore } from "react"
import { emptyLayout, parseLayout, parseWorkspaces, pruneLayout, renameInLayout, type TabLayout, type Workspace } from "../core/tabs"
import { navigate } from "./router"
import { noteRoute } from "./vault-notes"

/**
 * Arranjo das abas das Notas, um por cofre, guardado neste aparelho (`localStorage`, chave `runas-codex:abas:<cofre>`):
 * é estado de tela, não vai para o cofre (o Obsidian guarda o dele no `.obsidian/workspace.json`, que o app não grava).
 */
const PREFIX = "runas-codex:abas:"
const WORKSPACES = "runas-codex:workspaces:"

/**
 * Janela extra de nota (desktop, `?janela=1`): tem as abas dela, que não ficam guardadas — a janela principal continua
 * com as suas.
 */
export const IS_NOTE_WINDOW = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("janela") === "1"
if (IS_NOTE_WINDOW) document.documentElement.dataset.noteWindow = "true"
const listeners = new Set<() => void>()
const cache = new Map<string, TabLayout>()
const NONE = emptyLayout()

export function layoutOf(vault: string | undefined): TabLayout {
  if (!vault) return NONE
  let layout = cache.get(vault)
  if (!layout) {
    try {
      layout = IS_NOTE_WINDOW ? emptyLayout() : parseLayout(localStorage.getItem(PREFIX + vault))
    } catch {
      layout = emptyLayout()
    }
    cache.set(vault, layout)
  }
  return layout
}

export function setLayout(vault: string | undefined, next: TabLayout | ((current: TabLayout) => TabLayout)) {
  if (!vault) return
  const current = layoutOf(vault)
  const value = typeof next === "function" ? next(current) : next
  if (value === current) return
  cache.set(vault, value)
  try {
    if (!IS_NOTE_WINDOW) localStorage.setItem(PREFIX + vault, JSON.stringify(value))
  } catch {
    /* fica só até fechar o app */
  }
  listeners.forEach((listener) => listener())
}

export function useTabLayout(vault: string | undefined): TabLayout {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => layoutOf(vault),
  )
}

/** Chamado depois de renomear ou mover nota ou pasta, para as abas irem junto. */
export function renameTabs(vault: string | undefined, from: string, to: string) {
  setLayout(vault, (layout) => renameInLayout(layout, from, to))
}

export function pruneTabs(vault: string | undefined, exists: (path: string) => boolean) {
  setLayout(vault, (layout) => pruneLayout(layout, exists))
}

/** Como abrir uma nota: na aba atual, numa aba nova ou num painel ao lado/embaixo. */
export type OpenHow = "aqui" | "aba" | "lado" | "baixo"

/** A tela de Notas fornece isto; fora dela (Wiki, sessões), abrir é só navegar. */
export const OpenNoteContext = createContext<((path: string, how: OpenHow) => void) | null>(null)

export function useOpenNote(): (path: string, how: OpenHow) => void {
  const open = useContext(OpenNoteContext)
  return open ?? ((path) => navigate(noteRoute(path)))
}

const NARROW = "(max-width: 860px)"

/** No celular (tela estreita) só o painel em foco aparece, como no Obsidian para Android. */
export function useSinglePane(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(NARROW)
      query.addEventListener("change", listener)
      return () => query.removeEventListener("change", listener)
    },
    () => window.matchMedia(NARROW).matches,
  )
}

const workspaceCache = new Map<string, Record<string, Workspace>>()
const NO_WORKSPACES: Record<string, Workspace> = {}

function workspacesOf(vault: string | undefined): Record<string, Workspace> {
  if (!vault) return NO_WORKSPACES
  let list = workspaceCache.get(vault)
  if (!list) {
    try {
      list = parseWorkspaces(localStorage.getItem(WORKSPACES + vault))
    } catch {
      list = {}
    }
    workspaceCache.set(vault, list)
  }
  return list
}

function storeWorkspaces(vault: string, list: Record<string, Workspace>) {
  workspaceCache.set(vault, list)
  try {
    localStorage.setItem(WORKSPACES + vault, JSON.stringify(list))
  } catch {
    /* fica só até fechar o app */
  }
  listeners.forEach((listener) => listener())
}

export function useWorkspaces(vault: string | undefined): Record<string, Workspace> {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => workspacesOf(vault),
  )
}

/** Guarda o arranjo atual com um nome (o mesmo nome troca o que estava guardado). */
export function saveWorkspace(vault: string | undefined, name: string, rightPanel: boolean) {
  if (!vault || !name.trim()) return
  storeWorkspaces(vault, { ...workspacesOf(vault), [name.trim()]: { layout: layoutOf(vault), rightPanel, savedAt: Date.now() } })
}

export function deleteWorkspace(vault: string | undefined, name: string) {
  if (!vault) return
  const { [name]: _gone, ...rest } = workspacesOf(vault)
  storeWorkspaces(vault, rest)
}
