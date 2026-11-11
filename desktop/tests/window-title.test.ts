import { vi } from "vitest"
vi.mock("electron", () => ({ BrowserWindow: vi.fn(), dialog: {}, shell: {}, Menu: {}, MenuItem: vi.fn() }))
import { noteTitle } from "../src/main/windows"

describe("título da janela de nota (U40)", () => {
  it("usa o nome da nota, sem pasta e sem .md", () => {
    expect(noteTitle("/notas/Campanhas/Valknut/Sess%C3%A3o%201.md")).toBe("Sessão 1")
  })
  it("não quebra com caminho mal codificado nem vazio", () => {
    expect(noteTitle("/notas/A/100%.md")).toBe("100%")
    expect(noteTitle("/notas/")).toBe("Nota")
  })
})
