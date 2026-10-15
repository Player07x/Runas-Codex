import { useSyncExternalStore } from "react"
import type { StoredPin } from "../core/pin"

/**
 * Estado do bloqueio por PIN do espaço Notas. O PIN (hash com sal) é preferência deste aparelho (`localStorage`); o
 * desbloqueio vale até o app fechar ou alguém tocar em "Bloquear".
 */
const KEY = "runas-codex:pin-notas"
let unlocked = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export function storedPin(): StoredPin | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as StoredPin | null
    return value && typeof value.salt === "string" && typeof value.hash === "string" ? value : null
  } catch {
    return null
  }
}

/** Grava (ou tira, com `null`) o PIN deste aparelho. Quem acabou de criar o PIN fica desbloqueado. */
export function savePin(pin: StoredPin | null): void {
  try {
    if (pin) localStorage.setItem(KEY, JSON.stringify(pin))
    else localStorage.removeItem(KEY)
  } catch {
    throw new Error("Este aparelho não deixou guardar o PIN.")
  }
  unlocked = true
  emit()
}

export function isNotesLocked(): boolean {
  return !unlocked && storedPin() !== null
}

export function unlockNotes(): void {
  unlocked = true
  emit()
}

export function lockNotes(): void {
  unlocked = false
  emit()
}

/** O espaço está bloqueado agora? E há PIN neste aparelho? */
export function useNotesLock(): { locked: boolean; hasPin: boolean } {
  const locked = useSyncExternalStore((listener) => (listeners.add(listener), () => listeners.delete(listener)), isNotesLocked)
  return { locked, hasPin: storedPin() !== null }
}
