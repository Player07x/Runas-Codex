import { strFromU8, unzipSync } from "fflate"
import { VaultIndex } from "../vault-index"
import { bookExportPlan, type ExportBook, type ExportNode } from "./book"
import { generateEpub } from "./epub"
import { generateDocx } from "./docx"
const el = (tag: string, children: ExportNode[], attrs: Record<string, string> = {}): ExportNode => ({ tag, attrs, children })
const book: ExportBook = { title: "Guia & mesa", author: "João", identifier: "urn:test:guia", language: "pt-BR", theme: "manual", size: "A5", css: "", warnings: [], assets: [{ name: "assets/token.png", mime: "image/png", width: 1, height: 1, bytes: Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1sAAAAASUVORK5CYII="), (c) => c.charCodeAt(0)) }], sections: [
  { title: "Parte I", kind: "parte", path: "Parte.md", nodes: [el("h1", ["Parte I"])] },
  { title: "Capítulo", kind: "capitulo", path: "Um.md", nodes: [el("h2", ["Capítulo"]), el("div", [el("p", ["Texto ", el("strong", ["forte"])])], { class: "callout" }), el("div", [el("p", ["Duas colunas"])], { class: "md-colunas" }), el("div", [], { class: "quebra-pagina" }), el("table", [el("tr", [el("td", ["célula"])])]), el("p", [el("img", [], { src: "assets/token.png", alt: "Token" })])] },
] }
describe("Exportação de livros", () => {
  it("monta capa, créditos, partes, capítulos e contracapa na ordem, usando o rascunho", () => {
    const files = { "Livros/Guia.md": '---\ntipo: livro\nautor: Ana\ncreditos: Equipe\ncontracapa: Fim\nestrutura: ["[[Parte]]", "[[Um]]"]\n---\nNão exportar', "Livros/Parte.md": "---\ntipo: parte\n---\nParte", "Livros/Um.md": "antigo" }
    const index = new VaultIndex(Object.entries(files).map(([path, text]) => ({ path, size: text.length, mtime: 1 })), files)
    const plan = bookExportPlan(index, index.note("Livros/Guia.md")!, { path: "Livros/Um.md", text: "novo" })
    expect(plan.sections.map((s) => s.kind)).toEqual(["capa", "creditos", "parte", "capitulo", "contracapa"])
    expect(plan.sections[3].body).toBe("novo")
    expect(plan.sections.some((s) => s.body.includes("Não exportar"))).toBe(false)
    index.remove("Livros/Um.md")
    expect(() => bookExportPlan(index, index.note("Livros/Guia.md")!)).toThrow("Corrija os links")
  })
  it("gera EPUB 3 com mimetype primeiro e sem compressão, sumário, spine e imagens", () => {
    const bytes = generateEpub(book, new Date("2026-10-14T12:00:00Z")), zip = unzipSync(bytes)
    expect(strFromU8(bytes.slice(30, 38))).toBe("mimetype")
    expect(new DataView(bytes.buffer).getUint16(8, true)).toBe(0)
    expect(strFromU8(zip.mimetype)).toBe("application/epub+zip")
    const opf = strFromU8(zip["EPUB/package.opf"])
    expect(opf).toContain("Guia &amp; mesa")
    expect(opf).toContain('<itemref idref="s0"/><itemref idref="s1"/>')
    expect(opf).toContain("pt-BR")
    expect(strFromU8(zip["EPUB/nav.xhtml"])).toContain('href="section-1.xhtml"')
    expect(strFromU8(zip["EPUB/section-1.xhtml"])).toContain('src="assets/token.png"')
    expect(zip["EPUB/assets/token.png"]).toEqual(book.assets[0].bytes)
  })
  it("gera DOCX com títulos, ordem, tabelas, caixas, colunas, quebra e imagem embutida", async () => {
    const zip = unzipSync(await generateDocx(book)), doc = strFromU8(zip["word/document.xml"])
    expect(doc.indexOf("Parte I")).toBeLessThan(doc.indexOf("Capítulo"))
    expect(doc).toContain('w:val="Heading2"')
    expect(doc).toContain("<w:tbl>")
    expect(doc).toContain('w:fill="F2EBDD"')
    expect(doc).toContain('w:num="2"')
    expect(doc).toContain('w:type="page"')
    expect(Object.keys(zip).some((path) => path.startsWith("word/media/") && path.endsWith(".png"))).toBe(true)
    expect(strFromU8(zip["word/_rels/document.xml.rels"])).toContain("relationships/image")
  })
})
