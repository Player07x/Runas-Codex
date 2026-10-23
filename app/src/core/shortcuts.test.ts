import { expect, it } from "vitest"
import { eventShortcut, shortcutAction, shortcutLabel, shortcutText } from "./shortcuts"
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

describe("atalho escrito para a pessoa", () => {
  it("mostra Ctrl no lugar de Mod, e ⌘ no Mac", () => {
    expect(shortcutText("Mod+Shift+H")).toBe("Ctrl+Shift+H")
    expect(shortcutText("Mod+N", true)).toBe("⌘+N")
    expect(shortcutText("Alt+F4")).toBe("Alt+F4")
  })
})

it("os modos da nota e a galeria Formatar têm atalho próprio, como no Obsidian", () => {
  expect(shortcutAction({ ...event, key: "e" }, {})).toBe("readingMode")
  expect(shortcutAction({ ...event, key: "E", shiftKey: true }, {})).toBe("codeMode")
  expect(shortcutAction({ ...event, key: "/" }, {})).toBe("format")
})
