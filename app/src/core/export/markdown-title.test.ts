import { VaultIndex } from "../vault-index"
import { generateMarkdown } from "./book-extra"

function fixture(body: string) {
  const texts = {
    "Livros/Guia/Guia.md": '---\ntipo: livro\nestrutura: ["[[O Condado]]"]\n---\n',
    "Livros/Guia/O Condado.md": body,
    "Livros/Guia/Outro.md": "Destino",
  }
  const index = new VaultIndex(Object.entries(texts).map(([path,text]) => ({ path, size: text.length, mtime: 1 })), texts)
  return { index, book: index.note("Livros/Guia/Guia.md")! }
}
describe("título na exportação Markdown (U103)", () => {
  it.each(["# O Condado\n\nTexto.", "\n\n# O Condado\n\nTexto.", "# o condado ###\n\nTexto.", "   # O Condado\r\n\r\nTexto."])("conserva sem repetir o título que já abre o capítulo: %s", body => {
    const { index, book } = fixture(body), output = generateMarkdown(index, book)
    expect(output.split("\n\n---\n\n").at(-1)!.trim()).toBe(body.trim())
    expect(output).toContain("# Guia")
  })
  it.each(["Texto sem cabeçalho.", "# Outro título\n\nTexto.", "Preâmbulo.\n\n# O Condado", "```md\n# O Condado\n```"])("mantém o cabeçalho gerado quando o capítulo não começa com seu título: %s", body => {
    const { index, book } = fixture(body)
    expect(generateMarkdown(index, book)).toContain("# O Condado\n\n" + body)
  })
  it("usa o título do rascunho e conserva a resolução absoluta dos links", () => {
    const { index, book } = fixture("Texto antigo.")
    const output = generateMarkdown(index, book, { path: "Livros/Guia/O Condado.md", text: "# O Condado\n\n[[Outro|Destino]]." })
    expect(output.match(/^# O Condado$/gm)).toHaveLength(1)
    expect(output).toContain("[[Livros/Guia/Outro|Destino]]")
    expect(output).not.toContain("Texto antigo")
    expect(index.note("Livros/Guia/O Condado.md")!.text).toBe("Texto antigo.")
  })
})
