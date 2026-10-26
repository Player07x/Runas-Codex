import { describe, expect, it } from "vitest"
import { BOOK_MODELS, STYLE_KEYS, bookModel, fontFromFile, modelNoteText, resolveStyle, styleCss, styleProperties } from "./book-style"
import { parseFrontmatter } from "./parse"

describe("estilo do livro (L3)", () => {
  it("parte do modelo e aplica só o que o livro muda", () => {
    const style = resolveStyle({ modelo: "manual", corpo_pt: 11, fonte_texto: "Crimson Pro", colunas: 1 })
    expect(style).toMatchObject({ model: "manual", sizePt: 11, textFont: "Crimson Pro", columns: 1, titleFont: "Cinzel", paper: BOOK_MODELS.manual.style.paper })
  })
  it("traduz o tema antigo para um modelo", () => {
    expect(bookModel({ tema: "pergaminho" })).toBe("grimorio")
    expect(bookModel({ tema: "manual" })).toBe("manual")
    expect(bookModel({})).toBe("manual")
    expect(resolveStyle({ tema: "minimalista" })).toMatchObject({ model: "moderno", accent: "#222222" })
  })
  it("a nota de modelo fica entre o modelo pronto e o livro", () => {
    const style = resolveStyle({ modelo: "[[Grimório Valknut]]", cor_destaque: "#112233" }, { tipo: "modelo-livro", modelo: "grimorio", corpo_pt: 9.5, cor_destaque: "#445566" })
    expect(style).toMatchObject({ model: "grimorio", sizePt: 9.5, accent: "#112233", titleFont: "Uncial Antiqua" })
  })
  it("a cor do papel antiga (fundo_pagina) continua valendo", () => {
    expect(resolveStyle({ fundo_pagina: "#EAD7B2" }).paper).toBe("#ead7b2")
  })
  it("ignora valores que não são seguros para o CSS", () => {
    const style = resolveStyle({ fonte_titulos: 'Cinzel"}body{x:y', cor_papel: "red;", corpo_pt: 99, colunas: 7, entrelinha: "enorme" })
    expect(style).toMatchObject({ titleFont: "Cinzel", paper: BOOK_MODELS.manual.style.paper, sizePt: 16, columns: 2, leading: "normal" })
    expect(styleCss(style)).not.toMatch(/body\{|red;/)
  })
  it("gera as variáveis do papel", () => {
    const css = styleCss(resolveStyle({ modelo: "facil" }))
    expect(css).toContain('--book-body:"Atkinson Hyperlegible Next"')
    expect(css).toContain("--book-align:left")
    expect(css).toContain("--book-columns:1")
  })
})

describe("modelos e fontes do cofre (L3)", () => {
  it("lê o nome da fonte pelo arquivo", () => {
    expect(fontFromFile("Anexos/Fontes/Minha Fonte.ttf")).toBe("Minha Fonte")
    expect(fontFromFile("Rúnica-Bold.WOFF2")).toBe("Rúnica-Bold")
    expect(fontFromFile("Anexos/x.png")).toBeNull()
    expect(fontFromFile('Anexos/a"b.otf')).toBeNull()
  })
  it("a nota de modelo guarda o estilo inteiro e volta igual", () => {
    const style = resolveStyle({ modelo: "grimorio", corpo_pt: 9.5, cor_destaque: "#112233", alinhamento: "esquerda" })
    const text = modelNoteText(style)
    const data = parseFrontmatter(text)!.data!
    expect(data).toMatchObject({ tipo: "modelo-livro", modelo: "grimorio", corpo_pt: 9.5, cor_destaque: "#112233", alinhamento: "esquerda", colunas: 2 })
    expect(resolveStyle({ modelo: "[[Meu]]" }, data)).toEqual(style)
  })
  it("styleProperties cobre todas as chaves de estilo", () => {
    expect(Object.keys(styleProperties(resolveStyle({})))).toEqual([...STYLE_KEYS])
  })
})

describe("hifenização (L5)", () => {
  it("hifeniza por padrão quem justifica, e o livro pode escolher", () => {
    expect(resolveStyle({ modelo: "manual" }).hyphenate).toBe(true)
    expect(resolveStyle({ modelo: "facil" }).hyphenate).toBe(false)
    expect(resolveStyle({ modelo: "manual", alinhamento: "esquerda" }).hyphenate).toBe(false)
    expect(resolveStyle({ modelo: "manual", hifenizar: false }).hyphenate).toBe(false)
    expect(resolveStyle({ modelo: "[[M]]" }, { tipo: "modelo-livro", modelo: "facil", hifenizar: true }).hyphenate).toBe(true)
  })
})
