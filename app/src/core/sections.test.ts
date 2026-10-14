import { extractSection, noteBody } from "./sections"

const NOTE = `# Título

Intro.

## Ideias

Parágrafo das ideias
em duas linhas. ^par

- Item com bloco ^item
  - subitem
- Outro

### Detalhe
Fundo.

## Outra
\`\`\`
## Não é título
\`\`\`
Fim.

| a | b |
|---|---|
| 1 | 2 |

^tabela
`

describe("extractSection", () => {
  it("devolve a nota inteira sem subcaminho", () => {
    expect(extractSection(NOTE, undefined)).toBe(NOTE)
  })

  it("pega a seção do título até o próximo de nível igual ou maior", () => {
    const section = extractSection(NOTE, "#Ideias")!
    expect(section.startsWith("## Ideias")).toBe(true)
    expect(section).toContain("### Detalhe")
    expect(section).not.toContain("## Outra")
  })

  it("segue o caminho #a#b e ignora títulos dentro de código", () => {
    expect(extractSection(NOTE, "#Ideias#Detalhe")).toBe("### Detalhe\nFundo.")
    expect(extractSection(NOTE, "#Não é título")).toBeNull()
    expect(extractSection(NOTE, "#Outra")).toContain("## Não é título")
  })

  it("acha blocos: parágrafo, item de lista com subitens e bloco marcado embaixo", () => {
    expect(extractSection(NOTE, "#^par")).toBe("Parágrafo das ideias\nem duas linhas.")
    expect(extractSection(NOTE, "#^item")).toBe("- Item com bloco\n  - subitem")
    expect(extractSection(NOTE, "#^tabela")).toBe("| a | b |\n|---|---|\n| 1 | 2 |")
    expect(extractSection(NOTE, "#^nada")).toBeNull()
  })

  it("compara títulos sem maiúsculas e sem acento", () => {
    expect(extractSection(NOTE, "#ideias")).not.toBeNull()
  })
})

describe("noteBody", () => {
  it("tira o frontmatter", () => {
    expect(noteBody("---\na: 1\n---\n# Oi\n")).toBe("# Oi\n")
    expect(noteBody("# Sem\n")).toBe("# Sem\n")
  })
})
