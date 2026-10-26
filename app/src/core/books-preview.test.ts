import { BOOK_SIZES, chapterTitle, pageRules, previewChapters, previewSettings } from "./books-preview"
import { newBookText } from "./books"
import { VaultIndex } from "./vault-index"
function fixture() {
  const files = { "Livros/L/L.md": newBookText("L", ["[[Capítulo]]", "[[Ausente]]"]), "Livros/L/Capítulo.md": "---\ntipo: parte\n---\nTexto salvo" }
  const index = new VaultIndex(Object.entries(files).map(([path, text]) => ({ path, size: text.length, mtime: 1 })), files)
  return { index, book: index.note("Livros/L/L.md")! }
}
it("usa dimensões físicas conhecidas e regras de paginação sem interpolar metadados", () => {
  expect(BOOK_SIZES["6x9"].width).toBe(152.4)
  expect(BOOK_SIZES.Carta.height).toBe(279.4)
  expect(pageRules("A5")).toContain("size: 148mm 210mm")
  expect(pageRules("A4")).toContain("counter(page)")
  expect(pageRules("A4")).toContain("column-span: all")
})
it("mantém padrões seguros para tema e página desconhecidos", () => {
  const { book } = fixture()
  book.meta.frontmatter!.data!.tema = "../../outro"
  book.meta.frontmatter!.data!.pagina = "A0; }"
  expect(previewSettings(book)).toEqual({ theme: "manual", size: "A4", newChapter: true })
  book.meta.frontmatter!.data!.tema = "minimalista"
  expect(previewSettings(book).newChapter).toBe(false)
  book.meta.frontmatter!.data!.capitulos_nova_pagina = true
  expect(previewSettings(book).newChapter).toBe(true)
})
it("a prévia usa o rascunho sem gravar e mantém a ordem e os avisos de links quebrados", () => {
  const { index, book } = fixture()
  const chapters = previewChapters(index, book, { path: "Livros/L/Capítulo.md", text: "---\nstatus: revisao\n---\nAinda não salvo" })
  expect(chapters[0]).toMatchObject({ kind: "parte", body: "Ainda não salvo" })
  expect(chapters[1]?.title).toBe("Link quebrado")
  expect(index.note("Livros/L/Capítulo.md")?.text).toContain("Texto salvo")
})

describe("um título por capítulo (L2)", () => {
  const chapter = (kind: string, title: string, body: string) => ({ path: `Livros/X/${title}.md`, title, kind, body })
  it("tira o # do começo quando repete o nome da nota", () => {
    expect(chapterTitle(chapter("capitulo", "Magias", "\n# Magias\n\nTexto."))).toEqual({ title: "Magias", body: "\nTexto." })
    expect(chapterTitle(chapter("capitulo", "Equipamentos", "# **Equipamentos**\n| a |"))).toEqual({ title: "Equipamentos", body: "| a |" })
  })
  it("mantém o # diferente do nome como primeiro título do capítulo", () => {
    expect(chapterTitle(chapter("capitulo", "Introdução", "# Início\nTexto."))).toEqual({ title: "Introdução", body: "# Início\nTexto." })
  })
  it("seção usa o próprio título e só ganha o nome quando não tem", () => {
    expect(chapterTitle(chapter("secao", "Magias de Fogo", "## Magias de Fogo\n::: runas-colunas-2"))).toEqual({ title: null, body: "## Magias de Fogo\n::: runas-colunas-2" })
    expect(chapterTitle(chapter("secao", "Notas soltas", "Só texto."))).toEqual({ title: "Notas soltas", body: "Só texto." })
  })
})
