import { blockRefAt } from "./block-ref"
import { extractSection, noteBody } from "./sections"

const fixed = () => "abc123"

describe("referência de bloco (copiar link do bloco)", () => {
  const NOTE = "---\ntipo: npc\n---\n# Título\n\nPrimeira linha\nsegunda linha do parágrafo.\n\n- item um\n- item dois ^antigo\n\n> citação\n> continua\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```\ncódigo\n```\n"
  const at = (needle: string) => NOTE.indexOf(needle) + 2

  it("cria o ^id no fim do parágrafo, de qualquer linha dele", () => {
    const ref = blockRefAt(NOTE, at("Primeira"), fixed)!
    expect(ref).toMatchObject({ id: "abc123", created: true })
    expect(ref.text).toContain("segunda linha do parágrafo. ^abc123\n")
    expect(blockRefAt(NOTE, at("segunda"), fixed)!.text).toBe(ref.text)
    // A transclusão acha o bloco pelo id criado.
    expect(extractSection(noteBody(ref.text), "#^abc123")).toBe("Primeira linha\nsegunda linha do parágrafo.")
  })

  it("item de lista: o id vai no fim do item; o que já existe é reaproveitado", () => {
    expect(blockRefAt(NOTE, at("item um"), fixed)!.text).toContain("- item um ^abc123\n- item dois")
    expect(blockRefAt(NOTE, at("item dois"), fixed)).toEqual({ text: NOTE, id: "antigo", created: false })
  })

  it("citação e tabela: o id numa linha própria depois do bloco", () => {
    const quote = blockRefAt(NOTE, at("continua"), fixed)!
    expect(quote.text).toContain("> citação\n> continua\n\n^abc123\n")
    expect(extractSection(noteBody(quote.text), "#^abc123")).toBe("> citação\n> continua")
    const table = blockRefAt(NOTE, at("| 1"), fixed)!
    expect(table.text).toContain("| 1 | 2 |\n\n^abc123\n")
    expect(blockRefAt(quote.text, at("citação"), () => "outro1")).toMatchObject({ id: "abc123", created: false })
  })

  it("título, linha vazia, código e frontmatter não têm bloco", () => {
    expect(blockRefAt(NOTE, at("Título"), fixed)).toBeNull()
    expect(blockRefAt(NOTE, NOTE.indexOf("\n\nPrimeira") + 1, fixed)).toBeNull()
    expect(blockRefAt(NOTE, at("código"), fixed)).toBeNull()
    expect(blockRefAt(NOTE, at("tipo"), fixed)).toBeNull()
  })

  it("não repete um id que já existe na nota e mantém o CRLF", () => {
    let n = 0
    const ids = () => (n++ === 0 ? "antigo" : "novo42")
    expect(blockRefAt(NOTE, at("Primeira"), ids)!.id).toBe("novo42")
    const crlf = "Um parágrafo\r\nem duas linhas.\r\n\r\n> citação\r\n"
    expect(blockRefAt(crlf, 2, fixed)!.text).toBe("Um parágrafo\r\nem duas linhas. ^abc123\r\n\r\n> citação\r\n")
    expect(blockRefAt(crlf, crlf.indexOf("citação"), fixed)!.text).toBe("Um parágrafo\r\nem duas linhas.\r\n\r\n> citação\r\n\r\n^abc123\r\n")
  })
})
