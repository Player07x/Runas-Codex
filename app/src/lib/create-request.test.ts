import { describe, expect, it } from "vitest"
import { createRoute } from "./create-request"

describe("createRoute", () => {
  it("leva a nota do mestre às Sessões da campanha aberta", () => {
    expect(createRoute("nota-mestre", "#/campanhas/As%20Cinzas%20de%20Valdris/elenco")).toBe("/campanhas/As%20Cinzas%20de%20Valdris/sessoes")
    expect(createRoute("nota-mestre", "#/campanhas/Bitu")).toBe("/campanhas/Bitu/sessoes")
  })

  it("fora de uma campanha, manda a nota do mestre para a lista de campanhas", () => {
    expect(createRoute("nota-mestre", "#/wiki")).toBe("/campanhas")
    expect(createRoute("nota-mestre", "#/campanhas")).toBe("/campanhas")
  })

  it("os outros pedidos vão sempre para a tela do espaço", () => {
    expect(createRoute("artigo", "#/campanhas/Bitu")).toBe("/wiki")
    expect(createRoute("evento", "#/campanhas/Bitu")).toBe("/agenda")
  })
})
