import { useSyncExternalStore } from "react"
import { parseFreeTimePrefs, type FreeTimePrefs } from "../core/free-time"

/**
 * Horários disponíveis para o tempo livre da Agenda: preferência deste aparelho, uma por cofre (`localStorage`, chave
 * `runas-codex:tempo-livre:<cofre>`). Não vai para o cofre: não é uma nota.
 */
const PREFIX = "runas-codex:tempo-livre:"
const listeners = new Set<() => void>()
const cache = new Map<string, FreeTimePrefs>()

export function freeTimePrefsOf(vault: string | undefined): FreeTimePrefs {
  const key = vault ?? ""
  let prefs = cache.get(key)
  if (!prefs) {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(PREFIX + key)
    } catch {
      /* sem armazenamento: sem faixas */
    }
    prefs = parseFreeTimePrefs(stored)
    cache.set(key, prefs)
  }
  return prefs
}

export function saveFreeTimePrefs(vault: string | undefined, prefs: FreeTimePrefs): void {
  const key = vault ?? ""
  cache.set(key, prefs)
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(prefs))
  } catch {
    /* fica só até fechar o app */
  }
  listeners.forEach((listener) => listener())
}

export function useFreeTimePrefs(vault: string | undefined): FreeTimePrefs {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => freeTimePrefsOf(vault),
  )
}
