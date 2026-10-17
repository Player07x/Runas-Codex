import { contrastRatio, parseAppearance } from "./appearance"
import { readFileSync } from "node:fs"
const tokens = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8")
import { starterNotes, exampleNotes } from "./onboarding"
import { VaultIndex } from "./vault-index"
import { findBooks, readBook } from "./books"
import { parseEvent } from "./agenda"

describe("Aparência e primeiros passos", () => {
  it("recupera preferências inválidas e limita o tamanho do texto", () => {
    expect(parseAppearance("{")).toEqual({ scale: 100, palette: "orbita", motion: "system", tablet: false })
    expect(parseAppearance('{"scale":999,"palette":"url(//externo)","tablet":"sim"}')).toMatchObject({ scale: 140, palette: "orbita", tablet: false })
    expect(parseAppearance('{"scale":50,"palette":"brasa","motion":"reduce","tablet":true}')).toEqual({ scale: 85, palette: "brasa", motion: "reduce", tablet: true })
  })
  it("mantém contraste AA dos textos e controles nas seis combinações de tema", () => {
    const blocks = [...tokens.matchAll(/(:root[^{}]*)\{([^{}]*)\}/g)].map(m => ({ selector: m[1]!, colors: Object.fromEntries([...m[2]!.matchAll(/--([\w-]+):\s*(#[\da-fA-F]{3,6})\s*;/g)].map(c => [c[1]!, c[2]!])) }))
    for (const palette of ["orbita", "floresta", "brasa"]) for (const light of [false, true]) {
      const colors: Record<string, string> = {}
      for (const block of blocks) {
        if (block.selector.includes('data-theme="light"') && !light) continue
        if (block.selector.includes("data-palette") && !block.selector.includes(`data-palette="${palette}"`)) continue
        Object.assign(colors, block.colors)
      }
      for (const text of ["text", "muted", "faint", "cyan", "green", "red", "gold", "violet"]) for (const surface of ["bg", "bg-deep", "panel", "panel-2", "panel-hover"]) {
        expect(colors[text], JSON.stringify({palette,light,colors,text,surface})).toBeDefined()
        expect(colors[surface]).toBeDefined()
        expect(contrastRatio(colors[text]!, colors[surface]!), `${palette}/${light ? "claro" : "escuro"} ${text}/${surface}`).toBeGreaterThanOrEqual(4.5)
      }
      expect(contrastRatio(colors["on-accent"]!, colors.cyan!), `${palette}: botão primário`).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors["line-strong"]!, colors.panel!), `${palette}: borda do campo`).toBeGreaterThanOrEqual(3)
    }
  })
  it("cria exemplos válidos em todos os espaços e conserva a estrutura do livro", () => {
    const examples = starterNotes(new Date(2026, 9, 17)), files = Object.fromEntries(examples.map(n => [`${n.folder}/${n.name}.md`, n.text]))
    const index = new VaultIndex(Object.entries(files).map(([path, text]) => ({ path, size: text.length, mtime: 1 })), files)
    expect(exampleNotes(index)).toHaveLength(8)
    expect(new Set(examples.map(n => n.folder.split('/')[0])).size).toBe(6)
    const book = findBooks(index)[0]!
    expect(readBook(index, book).chapters).toBe(1)
    const event = examples.find(n => n.folder === "Agenda")!
    expect(event.text).toContain('date: "2026-10-17"')
    expect(parseEvent("Agenda/Exemplo.md", event.text)?.date).toBe("2026-10-17")
  })
  it("seleciona exemplos renomeados e preserva notas pessoais sem marca", () => {
    const files = { "Notas/Minha nota.md": "# Exemplo pessoal", "Notas/Renomeada.md": "---\nexemplo_runas: true\n---\nExemplo", "Notas/Conservar.md": "---\nexemplo_runas: false\n---\nMinha história" }
    const index = new VaultIndex(Object.entries(files).map(([path, text]) => ({ path, size: text.length, mtime: 1 })), files)
    expect(exampleNotes(index).map(n => n.path)).toEqual(["Notas/Renomeada.md"])
  })
})
