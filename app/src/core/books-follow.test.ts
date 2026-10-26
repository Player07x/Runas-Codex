import { describe, expect, it } from "vitest"
import { cursorAnchor, firstBodyLine, followPage, headingKey, lineForRendered, matchHeadings, sourceHeadings } from "./books-follow"

const note = `---
tipo: secao
---
## Magias de Fogo

**TORRETA DE FOGO**\\
Custo: 1 PV

\`\`\`
# não é título
\`\`\`

### Flecha de **Fogo**
Texto.
Mais texto.

### [[Bafo de Fogo|Bafo]]
Fim.
`

describe("prévia ao lado: títulos", () => {
  it("lê os títulos da nota com a linha, sem contar o código", () => {
    expect(sourceHeadings(note)).toEqual([
      { text: "Magias de Fogo", line: 3 },
      { text: "Flecha de **Fogo**", line: 12 },
      { text: "[[Bafo de Fogo|Bafo]]", line: 16 },
    ])
  })

  it("compara títulos sem a marcação, como a página mostra", () => {
    expect(headingKey("Flecha de **Fogo**")).toBe("flecha de fogo")
    expect(headingKey("[[Bafo de Fogo|Bafo]]")).toBe("bafo")
    expect(headingKey("[[Bafo de Fogo]]")).toBe("bafo de fogo")
    expect(headingKey("<u>Truque</u>  rápido ^bloco")).toBe("truque rápido")
  })

  it("casa os títulos em ordem e pula os que só existem na página", () => {
    const source = ["Magias de Fogo", "Flecha de **Fogo**", "Bafo"]
    const rendered = ["Magias de Fogo", "Título de uma nota transcluída", "Flecha de Fogo", "Bafo"]
    expect(matchHeadings(source, rendered)).toEqual([0, 2, 3])
    expect(matchHeadings(["A", "Sumiu", "B"], ["A", "B"])).toEqual([0, undefined, 1])
  })

  it("repete o mesmo título na ordem em que aparece", () => {
    expect(matchHeadings(["Truque", "Truque"], ["Truque", "Truque"])).toEqual([0, 1])
  })
})

describe("prévia ao lado: cursor e página", () => {
  const headings = sourceHeadings(note)

  it("acha o título acima do cursor e quanto falta para o próximo", () => {
    expect(cursorAnchor(headings, 1, 20)).toEqual({ heading: -1, fraction: 1 / 3 })
    expect(cursorAnchor(headings, 12, 20)).toEqual({ heading: 1, fraction: 0 })
    expect(cursorAnchor(headings, 14, 20)).toEqual({ heading: 1, fraction: 0.5 })
    expect(cursorAnchor(headings, 19, 20)).toEqual({ heading: 2, fraction: 3 / 4 })
  })

  it("estima a página entre dois títulos pela proporção", () => {
    const chapter = { start: 4, end: 8 }
    expect(followPage({ heading: 1, fraction: 0 }, [4, 5, 7], chapter)).toBe(5)
    expect(followPage({ heading: 1, fraction: 0.5 }, [4, 5, 7], chapter)).toBe(6)
    expect(followPage({ heading: 2, fraction: 1 }, [4, 5, 7], chapter)).toBe(8)
    expect(followPage({ heading: -1, fraction: 0 }, [4, 5, 7], chapter)).toBe(4)
  })

  it("usa os títulos vizinhos quando um título não aparece nas páginas", () => {
    expect(followPage({ heading: 1, fraction: 0 }, [4, undefined, 7], { start: 4, end: 8 })).toBe(4)
    expect(followPage({ heading: 0, fraction: 1 }, [undefined, undefined], { start: 2, end: 3 })).toBe(3)
  })

  it("começa o capítulo depois do frontmatter", () => {
    expect(firstBodyLine(note)).toBe(3)
    expect(firstBodyLine("# Sem propriedades\nTexto")).toBe(0)
  })

  it("leva o clique num título da página à linha da nota", () => {
    const match = matchHeadings(headings.map((h) => h.text), ["Magias de Fogo", "Outro", "Flecha de Fogo", "Bafo"])
    expect(lineForRendered(headings, match, 2)).toBe(12)
    expect(lineForRendered(headings, match, 1)).toBeUndefined()
  })
})
