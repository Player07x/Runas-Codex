import { prepareSource, stripComments } from "./blocks"

describe("stripComments", () => {
  it("tira %%comentários%% fora de código, inclusive em várias linhas", () => {
    expect(stripComments("a %%oculto%% b")).toBe("a  b")
    expect(stripComments("a %%linha 1\nlinha 2%% b")).toBe("a  b")
    expect(stripComments("`%%código%%` e %%x%%")).toBe("`%%código%%` e ")
    expect(stripComments("```\n%%dentro do bloco%%\n```\n%%fora%%")).toBe("```\n%%dentro do bloco%%\n```\n")
  })
})

describe("prepareSource", () => {
  it("põe as marcas de contêiner em parágrafos próprios, fora de código", () => {
    expect(prepareSource("texto\n::: nota\ndentro\n:::\nfim")).toBe("texto\n\n::: nota\n\ndentro\n\n:::\n\nfim")
    expect(prepareSource("```\n::: nota\n```")).toBe("```\n::: nota\n```")
  })

  it("$$fórmula$$ numa linha vira bloco de matemática; CRLF vira LF", () => {
    expect(prepareSource("$$x^2$$")).toBe("$$\nx^2\n$$")
    expect(prepareSource("a\r\nb")).toBe("a\nb")
  })
})
