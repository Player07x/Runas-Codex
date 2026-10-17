import { useSyncExternalStore } from "react"
import { DEFAULT_APPEARANCE, parseAppearance, type Appearance } from "../core/appearance"
const KEY = "runas-codex:aparencia"
let cached: Appearance | undefined
const listeners = new Set<() => void>()
export function appearance(): Appearance {
  if (!cached) { try { cached = parseAppearance(localStorage.getItem(KEY)) } catch { cached = { ...DEFAULT_APPEARANCE } } }
  return cached
}
export function updateAppearance(patch: Partial<Appearance>) {
  cached = parseAppearance(JSON.stringify({ ...appearance(), ...patch }))
  try { localStorage.setItem(KEY, JSON.stringify(cached)) } catch { /* Continua válido durante esta sessão. */ }
  listeners.forEach(listener => listener())
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }
export const useAppearance = () => useSyncExternalStore(subscribe, appearance, () => DEFAULT_APPEARANCE)
if (typeof window !== "undefined") window.addEventListener("storage", event => { if (event.key === KEY) { cached = undefined; listeners.forEach(listener => listener()) } })
