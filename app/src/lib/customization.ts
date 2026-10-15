import { useSyncExternalStore } from "react"
import type { ShortcutAction } from "../core/shortcuts"
const KEY = "runas-codex:personalizacao"
export interface Decoration { icon?: string; color?: string }
export interface Preferences { shortcuts: Partial<Record<ShortcutAction, string>>; snippets: { id: string; name: string; css: string; enabled: boolean }[]; folders: Record<string, Decoration> }
const empty: Preferences = { shortcuts: {}, snippets: [], folders: {} }
let cached: Preferences | undefined
const listeners = new Set<() => void>()
export function preferences(): Preferences {
  if (!cached) {
    try { const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<Preferences> | null; cached = raw ? { shortcuts: raw.shortcuts ?? {}, snippets: Array.isArray(raw.snippets) ? raw.snippets.filter(s => typeof s.css === "string" && typeof s.name === "string") : [], folders: raw.folders ?? {} } : empty } catch { cached = empty }
  }
  return cached
}
export function updatePreferences(change: (value: Preferences) => Preferences) {
  const next = change(preferences())
  localStorage.setItem(KEY, JSON.stringify(next)); cached = next; listeners.forEach(fn => fn())
}
export function usePreferences() { return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener) }, preferences) }
export const folderKey = (vault: string, path: string) => vault + "\0" + path
export function renameDecorations(vault: string, from: string, to: string) {
  const prefix = folderKey(vault, from)
  const value = preferences()
  if (!Object.keys(value.folders).some(key => key === prefix || key.startsWith(prefix + "/"))) return
  updatePreferences(current => ({ ...current, folders: Object.fromEntries(Object.entries(current.folders).map(([key, decoration]) => [key === prefix || key.startsWith(prefix + "/") ? folderKey(vault, to) + key.slice(prefix.length) : key, decoration])) }))
}
if (typeof window !== "undefined") window.addEventListener("storage", event => { if (event.key === KEY) { cached = undefined; listeners.forEach(fn => fn()) } })
