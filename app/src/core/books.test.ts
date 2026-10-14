import { countWords, findBooks, moveBookItem, newBookText, readBook } from "./books"
import { VaultIndex } from "./vault-index"
import { planRename } from "./rename"
import { setProperty } from "./properties"
const path = "Livros/Guia/Guia.md"
function vault(files: Record<string, string>) {
  return new VaultIndex(Object.entries(files).map(([path, text]) => ({ path, size: text.length, mtime: 1 })), files)
}
describe("Livros em notas", () => {
  it("encontra somente livros na pasta Livros", () => {
    const index = vault({ [path]: newBookText("Guia"), "Notas/Livro.md": newBookText("Outro"), "Livros/Rascunho.md": "texto" })
    expect(findBooks(index).map((n) => n.path)).toEqual([path])
  })
  it("resolve a ordem, distingue partes e seções, marca links quebrados e lista rascunhos", () => {
    const index = vault({ [path]: newBookText("Guia", ["[[Parte]]", "[[Um]]", "[[Seção]]", "[[Ausente]]"]), "Livros/Guia/Parte.md": "---\ntipo: parte\n---\nParte", "Livros/Guia/Um.md": "Uma frase.", "Livros/Guia/Seção.md": "---\ntipo: secao\n---\nSeção", "Livros/Guia/Sobra.md": "rascunho" })
    const result = readBook(index, index.note(path)!)
    expect(result.items.map((i) => i.note?.name)).toEqual(["Parte", "Um", "Seção", undefined])
    expect(result.chapters).toBe(1)
    expect(result.words).toBe(4)
    expect(result.outside.map((n) => n.name)).toEqual(["Sobra"])
  })
  it("não conta frontmatter, comentários, código cercado, inline ou indentado", () => {
    expect(countWords('---\nautor: Fulano\n---\nUma **frase**. %% segredo %% `código`\n~~~ts\num dois\n~~~\n    outro código\n<span class="capitular">O</span>lho [[Alvo|visível]]')).toBe(4)
  })
  it("preserva links quebrados ao mover e altera apenas a propriedade estrutura", () => {
    const text = '---\ntipo: livro\n# comentário\nautor: "Ana"\nestrutura: ["[[Um]]", "[[Ausente]]"]\n---\nAnotações intactas.\n'
    const moved = moveBookItem(["[[Um]]", "[[Ausente]]"], 0, 1)
    expect(moved).toEqual(["[[Ausente]]", "[[Um]]"])
    expect(setProperty(text, "estrutura", moved)).toContain('# comentário\nautor: "Ana"')
    expect(setProperty(text, "estrutura", moved)).toContain("Anotações intactas.\n")
    expect(moveBookItem(moved, -1, 1)).toEqual(moved)
  })
  it("mantém a ordem depois de renomear um capítulo e usa caminhos para nomes repetidos", () => {
    const chapter = "Livros/Guia/Um.md"
    const index = vault({ [path]: newBookText("Guia", ["[[Um]]", "[[Ausente]]"]), [chapter]: "Texto", "Notas/Um.md": "Outro" })
    expect(index.linkTarget(chapter, path)).toBe("Livros/Guia/Um")
    const plan = planRename(index, chapter, "Livros/Guia/Dois.md")
    for (const edit of plan.edits) index.set({ path: edit.path, size: edit.after.length, mtime: 2 }, edit.after)
    index.remove(chapter); index.set({ path: "Livros/Guia/Dois.md", size: 5, mtime: 2 }, "Texto")
    expect(readBook(index, index.note(path)!).items.map((i) => i.note?.name)).toEqual(["Dois", undefined])
  })
  it("sinaliza estrutura inválida sem converter silenciosamente os dados", () => {
    const index = vault({ [path]: '---\ntipo: livro\nestrutura: errado\n---\n' })
    expect(readBook(index, index.note(path)!).error).toBeTruthy()
  })
  it("gera YAML válido com caracteres especiais no subtítulo", () => {
    const index = vault({ [path]: newBookText("Guia", [], 'Texto: "citado"') })
    expect(index.note(path)?.meta.frontmatter?.data?.subtitulo).toBe('Texto: "citado"')
  })
})
