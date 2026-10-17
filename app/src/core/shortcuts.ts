export const SHORTCUTS = { palette: { label: "Paleta de comandos", key: "Mod+P" }, switcher: { label: "Alternador rápido", key: "Mod+O" }, newNote: { label: "Nova nota", key: "Mod+N" }, daily: { label: "Nota do dia", key: "Mod+Shift+D" }, theme: { label: "Alternar tema", key: "Mod+Shift+L" }, save: { label: "Salvar nota", key: "Mod+S" }, history: { label: "Histórico da nota", key: "Mod+Shift+H" }, undo: { label: "Desfazer no editor", key: "Mod+Z" }, redo: { label: "Refazer no editor", key: "Mod+Shift+Z" } } as const
export type ShortcutAction = keyof typeof SHORTCUTS
export function eventShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">): string | null {
  if (["Control", "Meta", "Alt", "Shift", "Dead", "Unidentified"].includes(event.key)) return null
  const mods = [event.ctrlKey || event.metaKey ? "Mod" : "", event.altKey ? "Alt" : "", event.shiftKey ? "Shift" : ""].filter(Boolean)
  if (!mods.length && !/^F\d{1,2}$/.test(event.key)) return null
  return [...mods, event.key.length === 1 ? event.key.toUpperCase() : event.key].join("+")
}
export function shortcutAction(event: Parameters<typeof eventShortcut>[0], overrides: Partial<Record<ShortcutAction, string>>): ShortcutAction | undefined {
  const pressed = eventShortcut(event)
  return (Object.keys(SHORTCUTS) as ShortcutAction[]).find(action => (overrides[action] ?? SHORTCUTS[action].key) === pressed)
}

/** A ajuda usa a mesma combinação efetiva que o comando. */
export function shortcutLabel(action: ShortcutAction, overrides: Partial<Record<ShortcutAction, string>>): string {
  return overrides[action] ?? SHORTCUTS[action].key
}
