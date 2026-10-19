import { describe, expect, it } from "vitest"
import { VaultIndex } from "../vault-index"
import { bookExportPlan } from "../export/book"
import { prepareDocumentExport } from "./document"
const texts = { "Wikis/Porto.md": "# Porto\n\nPúblico.\n\n> [!segredo]\n> Identidade do vilão.\n\nFim.", "Wikis/Rei.md": "---\nsegredo: true\n---\nO traidor." }
const index = new VaultIndex(Object.keys(texts).map(path => ({ path, size: 1, mtime: 1 })), texts)
describe("exportação de notas em documento", () => {
  it("prepara a coleção sem gravar ou alterar as notas originais", () => {
    const result = prepareDocumentExport(index, Object.keys(texts), "Minha coleção", false, true)
    expect(result.count).toBe(2)
    expect(bookExportPlan(result.index, result.book).sections).toHaveLength(3)
    expect(index.allNotes()).toHaveLength(2)
    expect(index.note("Wikis/Porto.md")!.text).toBe(texts["Wikis/Porto.md"])
  })
  it("a versão dos jogadores remove artigos secretos e callouts antes da captura", () => {
    const result = prepareDocumentExport(index, Object.keys(texts), "Público", true, false)
    expect(result.count).toBe(1); expect(result.excluded).toBe(1)
    expect(result.index.note("Wikis/Rei.md")).toBeUndefined()
    expect(result.index.note("Wikis/Porto.md")!.text).not.toContain("Identidade")
    expect(bookExportPlan(result.index, result.book).sections).toHaveLength(1)
  })
  it("não cria um documento vazio nem aceita uma coleção ilimitada", () => {
    expect(() => prepareDocumentExport(index, ["Wikis/Rei.md"], "x", true, false)).toThrow("ao menos")
    expect(() => prepareDocumentExport(index, Array.from({ length: 201 }, () => "Wikis/Porto.md"), "x", false, false)).toThrow("200")
  })
})

it("o HTML da coleção navega entre notas sem executar scripts ou depender da rede", async () => {
  const { generateHtml } = await import("../export/book-extra")
  const { strFromU8 } = await import("fflate")
  const html = strFromU8(generateHtml({ title: "Wiki", author: "", language: "pt-BR", identifier: "x", theme: "minimalista", size: "A4", css: "", assets: [], warnings: [], navigation: true, sections: [
    { path: "Porto.md", title: "Porto", kind: "capitulo", nodes: [{ tag: "a", attrs: { class: "wikilink", title: "Rei.md" }, children: ["Rei"] }] },
    { path: "Rei.md", title: "Rei", kind: "capitulo", nodes: ["Texto"] },
  ] }))
  expect(html).toContain('aria-label="Sumário"')
  expect(html).toContain('title="Rei.md" href="#documento-1"')
  expect(html).toContain('id="documento-1"')
  expect(html).not.toContain("<script")
  expect(html).toContain("default-src 'none'")
})
