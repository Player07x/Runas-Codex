import { crumbsFor } from "./crumbs"

const labels = (route: string[]) => crumbsFor(route).map((c) => c.label)

describe("migalha da barra de cima", () => {
  it("mostra o nome do livro, não o caminho do arquivo", () => {
    expect(labels(["livros", "Livros/Guia do Condado de Valdris/Guia do Condado de Valdris.md"])).toEqual(["Livros", "Guia do Condado de Valdris"])
  })

  it("nomeia as abas da Wiki com maiúscula, inclusive Ferramentas", () => {
    expect(labels(["wiki", "ferramentas"])).toEqual(["Wiki", "Ferramentas"])
    expect(labels(["wiki", "linha-do-tempo"])).toEqual(["Wiki", "Linha do tempo"])
  })

  it("mostra o nome do artigo e da nota pelo nome do arquivo", () => {
    expect(labels(["wiki", "artigo", "Wikis/Ordem x Caos/Personagens/Edric Ormund.md"])).toEqual(["Wiki", "Edric Ormund"])
    expect(labels(["notas", "Notas/Diário/2026-10-13.md"])).toEqual(["Notas", "2026-10-13"])
  })

  it("liga cada nível da campanha ao seu endereço", () => {
    const crumbs = crumbsFor(["campanhas", "As Cinzas de Valdris", "sessoes", "Campanhas/As Cinzas de Valdris/Sessões/Sessão 12.md"])
    expect(crumbs.map((c) => c.label)).toEqual(["Campanhas", "As Cinzas de Valdris", "Sessões", "Sessão 12"])
    expect(crumbs[1]!.to).toBe("/campanhas/As%20Cinzas%20de%20Valdris")
    expect(crumbs[2]!.to).toBe("/campanhas/As%20Cinzas%20de%20Valdris/sessoes")
  })

  it("chama a tela de transferências pelo nome que aparece no menu", () => {
    expect(labels(["transferir"])).toEqual(["Importar e exportar"])
    expect(labels([])).toEqual(["Início"])
  })

  it("nunca mostra um segmento desconhecido cru", () => {
    expect(labels(["config", "acessibilidade"])).toEqual(["Configurações", "Acessibilidade"])
  })
})
