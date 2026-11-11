import { formatTokenSize, parseTokenSize, tokenSizeLabel } from "./token-size"

describe("tamanho do token (U41)", () => {
  it("aceita vírgula e ponto, com qualquer valor quebrado", () => {
    expect(parseTokenSize("1,7")).toBe(1.7)
    expect(parseTokenSize("2.5")).toBe(2.5)
    expect(parseTokenSize(" 3 ")).toBe(3)
    expect(parseTokenSize(",5")).toBe(0.5)
  })
  it("limita de 0,25 a 20 e a duas casas", () => {
    expect(parseTokenSize("0,1")).toBe(0.25)
    expect(parseTokenSize("40")).toBe(20)
    expect(parseTokenSize("1,234")).toBe(1.23)
  })
  it("recusa o que não é número", () => {
    for (const text of ["", "abc", "1,2,3", "-1", "0", "1e3"]) expect(parseTokenSize(text)).toBeNull()
  })
  it("mostra com vírgula e no singular só para 1", () => {
    expect(formatTokenSize(1.5)).toBe("1,5")
    expect(tokenSizeLabel(1)).toBe("1 célula")
    expect(tokenSizeLabel(0.5)).toBe("0,5 células")
  })
})
