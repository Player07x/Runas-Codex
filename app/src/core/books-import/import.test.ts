import { readFileSync } from "node:fs"
import { unzipSync, zipSync, strToU8 } from "fflate"
import { importHomebrewery } from "./homebrewery"
import { importDocx } from "./docx"
import { htmlToMarkdown, sanitizeMarkdown } from "./html"
import { importFolder, saveImportedBook } from "./save"
import { VaultIndex } from "../vault-index"
import { readBook } from "../books"
import { PAGE_BREAK } from "./types"

const options = { title: "Livro de teste", headingLevel: 1 }
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url))

describe("Importação de livros", () => {
  it("converte Homebrewery com caixas aninhadas, colunas, quebras e estilos do dialeto", () => {
    const book = importHomebrewery(fixture("homebrewery.md").toString(), options)
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["A Torre de Vidro", "O Retorno"])
    const text = book.chapters.map((chapter) => chapter.markdown).join("\n")
    for (const type of ["nota", "descritivo", "statblock", "largo", "barra-lateral", "colunas"]) expect(text).toContain(`[!${type}]`)
    expect(text).toContain('class="quebra-coluna"')
    expect(text).toContain(PAGE_BREAK)
    expect(text).toContain("color:#8b1e1e")
    expect(text).toContain('<p align="center">')
    expect(text).toContain("[Torre](https://example.org/torre.png)")
    expect(text).not.toContain("![Torre]")
    expect(text).toContain("{{note exemplo literal}}")
    expect(book.warnings.some((warning) => warning.includes("misterioso"))).toBe(true)
    expect(book.warnings.some((warning) => warning.includes("URL"))).toBe(true)
  })
  it("converte GM Binder legado e preserva comandos em código inline", () => {
    const source = '# Primeiro\n\n<div class="descriptive">\n**Leia isto**\n</div>\n\n`\\page`\n\n\\pagebreak\n\n# Segundo\n\n<div class="wide">\nTabela\n</div>'
    const book = importHomebrewery(source, options)
    expect(book.chapters).toHaveLength(2)
    expect(book.chapters[0].markdown).toContain("> [!descritivo]\n> **Leia isto**")
    expect(book.chapters[0].markdown).toContain("`\\page`")
    expect(book.chapters[1].markdown).toContain("> [!largo]")
  })
  it("mantém todas as linhas de código cercado dentro da caixa", () => {
    const source = `# Código\n\n{{note\n\`\`\`text\nprimeira linha\nsegunda linha\n\`\`\`\n}}\n\n<div class="note">\n\`\`\`js\nconst valor = 1\nconsole.log(valor)\n\`\`\`\n</div>`
    const markdown = importHomebrewery(source, options).chapters[0]!.markdown
    expect(markdown).toContain("> [!nota]\n> \`\`\`text\n> primeira linha\n> segunda linha\n> \`\`\`")
    expect(markdown).toContain("> [!nota]\n> \`\`\`js\n> const valor = 1\n> console.log(valor)\n> \`\`\`")
  })
  it("importa DOCX com títulos, ênfase, lista, tabela e imagem e permite escolher H2", async () => {
    const bytes = fixture("exemplo.docx")
    const book = await importDocx(bytes, options)
    expect(book.chapters.map((chapter) => chapter.title)).toEqual(["A Chegada", "O Retorno"])
    const text = book.chapters[0].markdown
    expect(text).toContain("**Negrito** e *itálico*")
    expect(text).toContain("- Levar corda")
    expect(text).toContain("<table>")
    expect(text).toMatch(/<td>(?:<p>)?50/)
    expect(text).toContain("import-image:1")
    expect(book.images[0].bytes[0]).toBe(137)
    expect(book.images[0].name).toBe("Imagem 1.png")
    const h2 = await importDocx(bytes, { ...options, headingLevel: 2 })
    expect(h2.chapters.map((chapter) => chapter.title)).toEqual([options.title, "Preparação"])
  })
  it("sanitiza HTML antes de converter: scripts, handlers, URLs e CSS ativos não sobrevivem", () => {
    const warnings = new Set<string>()
    const html = '<script>alert(1)</script><style>body{display:none}</style><p onclick="alert(2)">Olá <strong>mundo</strong></p><a href="javascript:alert(3)">link</a><img src="https://example.org/a.png" onerror="alert(4)"><span style="color:red;background-image:url(https://example.org/x)">cor</span>'
    for (const text of [htmlToMarkdown(html, warnings), sanitizeMarkdown(html, warnings)]) {
      expect(text).not.toMatch(/<script|<style|onclick|onerror|javascript:|background-image|alert\(/)
      expect(text).not.toContain("<img")
      expect(text).toContain("color:red")
      expect(text).toContain("Olá")
    }
    expect(warnings.size).toBeGreaterThan(0)
  })
  it("recusa arquivos inválidos e ZIPs expandidos acima do limite", async () => {
    await expect(importDocx(strToU8("não é um DOCX"), options)).rejects.toThrow()
    const zip = unzipSync(fixture("exemplo.docx"))
    zip["grande.bin"] = new Uint8Array(101 * 1024 * 1024)
    await expect(importDocx(zipSync(zip, { level: 1 }), options)).rejects.toThrow("grande demais")
    expect(() => importHomebrewery("", options)).toThrow("não contém texto")
  }, 15000) // A fixture compacta 101 MiB reais; o limite não depende da velocidade da máquina.
  it("grava um livro Obsidian na ordem, com imagens em Anexos e sem sobrescrever pastas", async () => {
    const book = await importDocx(fixture("exemplo.docx"), options)
    book.chapters[0].markdown += '\n\n<table><tr><td><img src="import-image:1" alt="Cristal"></td></tr></table>'
    const texts: Record<string, string> = {}, attachments = new Map<string, Uint8Array>()
    const folder = importFolder(book.title, ["livros/livro de teste/antigo.md"])
    expect(folder).toBe("Livros/Livro de teste 2")
    const path = await saveImportedBook(book, folder, {
      createFolder: async () => {},
      createNote: async (parent, name, content = "") => { const path = `${parent}/${name}.md`; texts[path] = content; return path },
      addAttachment: async (name, bytes, _near, target) => { const path = `${target}/${name}`; attachments.set(path, bytes); return path },
    })
    const index = new VaultIndex(Object.entries(texts).map(([path, text]) => ({ path, size: text.length, mtime: 1 })), texts)
    const result = readBook(index, index.note(path)!)
    expect(result.items.map((item) => item.note?.name)).toEqual(["01 — A Chegada", "02 — O Retorno"])
    expect(result.items[0].note?.text).toContain(`![[${folder}/Anexos/Imagem 1.png]]`)
    expect(result.items[0].note?.text).toContain(`src="${folder}/Anexos/Imagem 1.png"`)
    expect(attachments.has(`${folder}/Anexos/Imagem 1.png`)).toBe(true)
    expect(Object.values(texts).join("\n")).not.toContain("import-image:")
  })
  it("preserva células mescladas de tabelas HTML do GM Binder e avisa sobre imagens por referência", () => {
    const book = importHomebrewery('# Tabela\n\n<table><tr><td colspan="2">Tesouro</td></tr><tr><td>Moeda</td><td>5</td></tr></table>\n\n![Mapa][mapa]\n\n[mapa]: https://example.org/mapa.png', options)
    expect(book.chapters[0].markdown).toContain('<td colspan="2">Tesouro</td>')
    expect(book.chapters[0].markdown).toContain("[Mapa][mapa]")
    expect(book.warnings.some((warning) => warning.includes("referência"))).toBe(true)
  })
  it("informa o destino preservado após uma falha parcial", async () => {
    const book = importHomebrewery("# Um\nTexto\n# Dois\nFim", options)
    let calls = 0
    await expect(saveImportedBook(book, "Livros/Teste", {
      createFolder: async () => {}, addAttachment: async () => "",
      createNote: async () => { if (++calls > 1) throw new Error("mudou fora do app"); return "Livros/Teste/Um.md" },
    })).rejects.toThrow("preservados em “Livros/Teste”")
  })
})
