import { useSyncExternalStore } from "react"
import { parseBookmarks, renameInBookmarks, serializeBookmarks, toggleBookmark, type Bookmark } from "../core/bookmarks"

/**
 * Favoritos deste aparelho, um conjunto por cofre (`localStorage`, chave `runas-codex:favoritos:<cofre>`). O app não
 * grava no `.obsidian` (a gravação segura recusa pastas ocultas); os marcadores do Obsidian aparecem só para leitura.
 */
const PREFIX = "runas-codex:favoritos:"
const listeners = new Set<() => void>()
const cache = new Map<string, Bookmark[]>()
const EMPTY: Bookmark[] = []

export function bookmarksOf(vault: string | undefined): Bookmark[] {
  if (!vault) return EMPTY
  let list = cache.get(vault)
  if (!list) {
    try {
      list = parseBookmarks(localStorage.getItem(PREFIX + vault))
    } catch {
      list = []
    }
    cache.set(vault, list)
  }
  return list
}

function store(vault: string, list: Bookmark[]) {
  cache.set(vault, list)
  try {
    localStorage.setItem(PREFIX + vault, serializeBookmarks(list))
  } catch {
    /* fica só até fechar o app */
  }
  listeners.forEach((listener) => listener())
}

export function toggleFavorite(vault: string | undefined, b: Bookmark) {
  if (vault) store(vault, toggleBookmark(bookmarksOf(vault), b))
}

/** Chamado depois de renomear ou mover nota ou pasta, para os favoritos irem junto. */
export function renameFavorites(vault: string | undefined, from: string, to: string) {
  const list = bookmarksOf(vault)
  if (vault && list.length) store(vault, renameInBookmarks(list, from, to))
}

export function useFavorites(vault: string | undefined): Bookmark[] {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => bookmarksOf(vault),
  )
}
