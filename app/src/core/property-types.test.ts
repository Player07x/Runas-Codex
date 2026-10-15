import { declaredTypes, emptyValue, parseInput, propertyKind } from "./property-types"

describe("tipos das propriedades", () => {
  it("deduz o tipo pelo valor", () => {
    expect(propertyKind("ativo", true)).toBe("caixa")
    expect(propertyKind("nivel", 3)).toBe("numero")
    expect(propertyKind("tags", ["a"])).toBe("lista")
    expect(propertyKind("prazo", "2026-10-17")).toBe("data")
    expect(propertyKind("inicio", "2026-10-17T19:30")).toBe("data-hora")
    expect(propertyKind("local", "[[Valdris]]")).toBe("link")
    expect(propertyKind("resumo", "texto qualquer")).toBe("texto")
  })

  it("o types.json do Obsidian vale primeiro; datas do mundo são sempre texto", () => {
    const types = declaredTypes('{ "types": { "prazo": "date", "sessao": "datetime", "nomes": "multitext", "aliases": "aliases" } }')
    expect(propertyKind("prazo", "", types.prazo)).toBe("data")
    expect(propertyKind("sessao", "", types.sessao)).toBe("data-hora")
    expect(propertyKind("nomes", "", types.nomes)).toBe("lista")
    expect(propertyKind("data_mundo", "4031-03-12", "date")).toBe("texto")
    // Declarado como data, mas com texto livre: o campo fica de texto, para não apagar o que está escrito.
    expect(propertyKind("prazo", "amanhã", types.prazo)).toBe("texto")
    expect(declaredTypes("isto não é json")).toEqual({})
  })

  it("valor inicial de cada tipo", () => {
    const now = new Date(2026, 9, 15, 9, 5)
    expect([emptyValue("texto", now), emptyValue("lista", now), emptyValue("numero", now), emptyValue("caixa", now), emptyValue("data", now), emptyValue("data-hora", now)]).toEqual(["", [], 0, false, "2026-10-15", "2026-10-15T09:05"])
  })

  it("converte o que foi digitado, e recusa o que não serve", () => {
    expect(parseInput("lista", "a, b ,, c")).toEqual(["a", "b", "c"])
    expect(parseInput("numero", "12.5")).toBe(12.5)
    expect(parseInput("numero", "doze")).toBeNull()
    expect(parseInput("data", "2026-10-17")).toBe("2026-10-17")
    expect(parseInput("data", "17/10/2026")).toBeNull()
    expect(parseInput("data-hora", "2026-10-17T19:30:00")).toBe("2026-10-17T19:30")
    expect(parseInput("link", "Valdris")).toBe("[[Valdris]]")
    expect(parseInput("link", "[[Valdris]]")).toBe("[[Valdris]]")
  })
})
