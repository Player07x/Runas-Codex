import { pageTitle } from "./page-title"

describe("título da aba por tela", () => {
  it("vai do mais específico ao mais geral e termina no nome do app", () => {
    expect(pageTitle(["Campanhas", "As Cinzas de Valdris", "Sessões"])).toBe("Sessões · As Cinzas de Valdris · Campanhas · Runas-Codex")
  })

  it("mostra só o espaço quando não há nada aberto", () => {
    expect(pageTitle(["Início"])).toBe("Início · Runas-Codex")
  })

  it("ignora partes vazias e repetições seguidas", () => {
    expect(pageTitle(["Livros", " ", "Guia do Condado", "Guia do Condado"])).toBe("Guia do Condado · Livros · Runas-Codex")
  })

  it("usa só o nome do app sem migalhas", () => {
    expect(pageTitle([])).toBe("Runas-Codex")
  })
})
