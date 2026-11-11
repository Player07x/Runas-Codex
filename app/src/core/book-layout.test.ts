import { describe, expect, it } from "vitest"
import { bookLayout, chapterLabel, chapterNumbers, layoutPageRules, roman, tocHtml } from "./book-layout"
import { pageRules, startsNewPage } from "./books-preview"

const A4 = { width: 210, height: 297 }

describe("capa, sumário, aberturas e cabeçalhos (L4)", () => {
  it("lê o layout do livro com padrões e ignora valores estranhos", () => {
    expect(bookLayout({})).toEqual({ cover: "classica", toc: false, opening: "simples", numbering: "arabico", dropCap: false, mirrored: false, head: "livro-capitulo", pageNumber: "centro" })
    expect(bookLayout({ espelhadas: true, capa_estilo: "faixa", abertura: "x", sumario: true })).toMatchObject({ mirrored: true, pageNumber: "externo", cover: "faixa", opening: "simples", toc: true })
  })
  it("numera só os capítulos, em algarismos ou romanos", () => {
    expect(chapterNumbers(["parte", "capitulo", "secao", "capitulo", "indice"])).toEqual([null, 1, null, 2, null])
    expect(roman(14)).toBe("XIV")
    expect(roman(1999)).toBe("MCMXCIX")
    expect(chapterLabel(4, "romano")).toBe("Capítulo IV")
    expect(chapterLabel(4, "arabico", true)).toBe("Cap. 4")
    expect(chapterLabel(4, "nenhuma")).toBeNull()
  })
  it("o sumário escapa os títulos e aponta para os ids", () => {
    const html = tocHtml([{ id: "book-toc-0", title: "Magia & <Runas>", level: 1, label: "Cap. 5" }, { id: "x", title: "Fogo", level: 2 }])
    expect(html).toContain('<a href="#book-toc-0"><small>Cap. 5</small><span class="toc-titulo">Magia &amp; &lt;Runas&gt;</span>')
    expect(html).toContain('class="toc-nivel-2"')
  })
  it("cabeçalho fora da capa, do sumário e da página que abre o capítulo", () => {
    const css = layoutPageRules(A4, 18, bookLayout({}), true)
    expect(css).toContain("@top-left { content: string(book-title);")
    expect(css).toContain("@page capitulo:first { @top-left { content: none; }")
    expect(css).toContain("@page sumario {")
    expect(css).toContain("target-counter(attr(href), page)")
    expect(layoutPageRules(A4, 18, bookLayout({}), false)).not.toContain("@page capitulo:first")
    // A quebra vem depois do nome da página: capítulos e seções se chamam `capitulo`.
    expect(css.indexOf("break-before: page")).toBeGreaterThan(css.indexOf("page: capitulo"))
  })
  it("páginas espelhadas: margem interna maior, número do lado de fora, capítulo à direita", () => {
    const css = layoutPageRules(A4, 18, bookLayout({ espelhadas: true }), true)
    expect(css).toContain("@page :left { margin-left: 18mm; margin-right: 22mm; @bottom-left { content: counter(page);")
    expect(css).toContain("@page :right { margin-left: 22mm; margin-right: 18mm; @bottom-right { content: counter(page);")
    expect(css).toContain("break-before: right")
  })
  it("sem cabeçalho nem número quando o livro pede", () => {
    const css = layoutPageRules(A4, 18, bookLayout({ cabecalho: "nenhum", numero_pagina: "nenhum" }), true)
    expect(css).not.toMatch(/content: (string|counter)\(/)
  })
  it("a capa e a abertura em página inteira ocupam a área do texto", () => {
    expect(pageRules("A5")).toContain(".book-print .book-print-cover { height: 182.0mm;")
    expect(pageRules("A4", undefined, bookLayout({ abertura: "pagina" }))).toContain("abertura-pagina .book-chapter > .book-chapter-opening { height: 259.0mm;")
  })
})

describe("página nova por capítulo e por seção (U43)", () => {
  const book = { newChapter: true, newSection: false }
  it("capítulo e seção usam a mesma página nomeada: a seção não força página nova", () => {
    const css = layoutPageRules(A4, 18, bookLayout({}), true)
    expect(css).toContain(".book-print .book-chapter, .book-print .book-section { page: capitulo; }")
    expect(css).toContain(".book-print .book-part, .book-print .nova-pagina { break-before: page; }")
    expect(pageRules("A4")).not.toContain("chapters-new-page")
  })
  it("o padrão vem do livro e a nota pode pedir o contrário", () => {
    expect(startsNewPage("capitulo", undefined, book)).toBe(true)
    expect(startsNewPage("secao", undefined, book)).toBe(false)
    expect(startsNewPage("secao", true, book)).toBe(true)
    expect(startsNewPage("capitulo", false, book)).toBe(false)
    expect(startsNewPage("secao", undefined, { newChapter: false, newSection: true })).toBe(true)
    // Apêndices seguem os capítulos; parte é sempre página nova.
    expect(startsNewPage("glossario", undefined, { newChapter: false, newSection: true })).toBe(false)
    expect(startsNewPage("parte", false, book)).toBe(true)
  })
})
