import { describe, expect, it } from "vitest"
import { applyBookFixes, blankRuns, findBookFixes } from "./book-fixes"

describe("Revisar o livro (U43)", () => {
  it("a linha só com \\ vira linha vazia", () => {
    const text = "**Força**: forte.\n\n\\\n**Destreza**: ágil."
    const fixes = findBookFixes(text)
    expect(fixes).toEqual([{ kind: "barra", line: 2, before: ["\\"], after: [""] }])
    expect(applyBookFixes(text, fixes).text).toBe("**Força**: forte.\n\n\n**Destreza**: ágil.")
  })
  it("dentro da caixa, `texto\\` + `> \\` viram dois parágrafos", () => {
    const text = "> [!magia] Fogo\n> Dano 3D. *Ampliação: +2.*\\\n> \\\n> **Truque**: metade."
    const [fix] = findBookFixes(text)
    expect(fix).toMatchObject({ kind: "barra", line: 1, after: ["> Dano 3D. *Ampliação: +2.*", ">"] })
    expect(applyBookFixes(text, [fix!]).text).toBe("> [!magia] Fogo\n> Dano 3D. *Ampliação: +2.*\n>\n> **Truque**: metade.")
  })
  it("quebra de linha de verdade (`**Nome**:\\` com texto embaixo) e código ficam", () => {
    expect(findBookFixes("**Nome**:\\\n**Nascimento**:")).toEqual([])
    expect(findBookFixes("```\n\\\n::: runas-colunas-2\n:::\n```")).toEqual([])
  })
  it("colunas vazias saem; colunas-1 só em volta da tabela vira largura toda", () => {
    const text = [":::  runas-colunas-2", "Texto", ":::", "::: runas-colunas-1", "### Tabela de Carma", "| a | b |", "|---|---|", ":::", "::: runas-colunas-2", "", "", ":::", "Fim"].join("\n")
    const fixes = findBookFixes(text)
    expect(fixes.map((f) => f.kind)).toEqual(["colunas-tabela", "colunas-vazio"])
    expect(applyBookFixes(text, fixes).text).toBe([":::  runas-colunas-2", "Texto", ":::", "%% livro: largura-toda %%", "### Tabela de Carma", "| a | b |", "|---|---|", "Fim"].join("\n"))
  })
  it("colunas-1 com mais que a tabela, ou colunas-2 com tabela, ficam", () => {
    expect(findBookFixes("::: runas-colunas-1\nTexto\n\n| a |\n|---|\n:::")).toEqual([])
    expect(findBookFixes("::: runas-colunas-2\n| a |\n|---|\n:::")).toEqual([])
  })
  it("não troca o que mudou depois da revisão e troca o resto", () => {
    const text = "A\n\n\\\nB\n\n\\\nC"
    const fixes = findBookFixes(text)
    const changed = text.replace("A\n\n\\", "A\n\nnovo")
    expect(applyBookFixes(changed, fixes)).toEqual({ text: "A\n\nnovo\nB\n\n\nC", applied: 1, skipped: 1 })
  })
  it("conta as linhas vazias seguidas entre blocos", () => {
    expect(blankRuns("A\n\n\nB\n\nC\n\n\n\nD\n\n\n")).toBe(2)
  })
})
