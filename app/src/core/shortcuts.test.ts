import { expect, it } from "vitest"
import { eventShortcut, shortcutAction, shortcutLabel } from "./shortcuts"
const event = { key: "p", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }
it("os atalhos respeitam modificadores e a configuração substitui o padrão", () => {
  expect(shortcutAction(event, {})).toBe("palette")
  expect(shortcutAction(event, { palette: "Mod+Alt+P" })).toBeUndefined()
  expect(shortcutAction({ ...event, altKey: true }, { palette: "Mod+Alt+P" })).toBe("palette")
  expect(shortcutAction({ ...event, ctrlKey: false, metaKey: true }, {})).toBe("palette")
})
it("uma letra simples ou só um modificador não vira atalho", () => {
  expect(eventShortcut({ ...event, ctrlKey: false })).toBeNull()
  expect(eventShortcut({ ...event, key: "Control" })).toBeNull()
})

it("a ajuda acompanha a combinação personalizada", () => {
  expect(shortcutLabel("newNote", {})).toBe("Mod+N")
  expect(shortcutLabel("newNote", { newNote: "Mod+Alt+N" })).toBe("Mod+Alt+N")
})
