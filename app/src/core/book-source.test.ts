import { describe, expect, it } from "vitest"
import { bookAdjust, bookSource } from "./book-source"

const off = { blankLines: false }, on = { blankLines: true }

describe("ajustes do livro em comentário (U43)", () => {
  it("lê os ajustes com ou sem acento e hífen", () => {
    expect(bookAdjust("largura-toda")).toEqual({ kind: "largura-toda" })
    expect(bookAdjust("Nova página")).toEqual({ kind: "nova-pagina" })
    expect(bookAdjust("espaço 2")).toEqual({ kind: "espaco", lines: 2 })
    expect(bookAdjust("espaco")).toEqual({ kind: "espaco", lines: 1 })
    expect(bookAdjust("espaco 40")).toEqual({ kind: "espaco", lines: 6 })
    expect(bookAdjust("revisão: trocar")).toBeNull()
  })
  it("largura toda: o bloco de baixo, até a próxima linha vazia, vira um contêiner largo", () => {
    const text = "Antes\n\n%% livro: largura-toda %%\n\n### Carma\n| a | b |\n|---|---|\n| 1 | 2 |\n\nDepois"
    expect(bookSource(text, off)).toBe("Antes\n\n\n::: livro-largo\n### Carma\n| a | b |\n|---|---|\n| 1 | 2 |\n:::\n\n\nDepois")
  })
  it("nova página e espaço viram contêineres vazios, também dentro de uma caixa", () => {
    expect(bookSource("A\n%% livro: nova-pagina %%\nB", off)).toBe("A\n\n::: livro-nova-pagina\n:::\n\nB")
    expect(bookSource("> A\n> %% livro: espaco 2 %%\n> B", off)).toBe("> A\n>\n> ::: livro-espaco-2\n> :::\n>\n> B")
  })
  it("comentário desconhecido e código ficam como estão", () => {
    expect(bookSource("%% livro: torto %%\nA", off)).toBe("%% livro: torto %%\nA")
    expect(bookSource("```\n%% livro: nova-pagina %%\n\n\n\n```", on)).toBe("```\n%% livro: nova-pagina %%\n\n\n\n```")
  })
})

describe("linhas vazias contam (U43)", () => {
  it("cada linha vazia a mais entre dois blocos vira uma linha de espaço", () => {
    expect(bookSource("A\n\n\n\nB", on)).toBe("A\n\n::: livro-espaco-2\n:::\n\nB")
    expect(bookSource("A\n\nB", on)).toBe("A\n\nB")
  })
  it("desligado, o texto fica igual (o Markdown junta as linhas, como no Obsidian)", () => {
    expect(bookSource("A\n\n\n\nB", off)).toBe("A\n\n\n\nB")
  })
  it("dentro da caixa conta as linhas `>` vazias; no fim e antes de linha recuada não conta", () => {
    expect(bookSource("> A\n>\n>\n> B", on)).toBe("> A\n>\n> ::: livro-espaco-1\n> :::\n>\n> B")
    expect(bookSource("A\n\n\n", on)).toBe("A\n\n\n")
    expect(bookSource("- item\n\n\n  continua", on)).toBe("- item\n\n\n  continua")
  })
})
