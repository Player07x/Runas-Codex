import { describe, expect, it } from "vitest"
import { importedPlaces } from "./imported"

describe("abrir o que entrou depois de importar (U104)", () => {
  it("leva à wiki, à campanha, ao livro e às mesas que receberam arquivos", () => {
    const places = importedPlaces([
      "Wikis/Valdris/Personagens/Ana.md", "Wikis/Valdris/Valdris.md", "Wikis/Valdris/Anexos/ana.png",
      "Campanhas/Cinzas/Cinzas.md", "Livros/Guia/Guia.md", "Livros/Guia/Capítulos/Um.md",
      ".runas/mesas/praca-1a2b/world.json",
    ], (path) => path === "Livros/Guia/Guia.md")
    expect(places).toEqual([
      { label: "Wiki Valdris", route: `/wiki/artigo/${encodeURIComponent("Wikis/Valdris/Valdris.md")}` },
      { label: "Campanha Cinzas", route: "/campanhas/Cinzas" },
      { label: "Livro Guia", route: `/livros/${encodeURIComponent("Livros/Guia/Guia.md")}` },
      { label: "Mesas do VTT", route: "/vtt/criar" },
    ])
  })

  it("notas soltas abrem a primeira em Notas", () => {
    expect(importedPlaces(["Notion/Projeto/Tarefas.md", "Notion/Projeto/img.png"])).toEqual([{ label: "Abrir em Notas", route: `/notas/${encodeURIComponent("Notion/Projeto/Tarefas.md")}` }])
  })

  it("a biblioteca da mesa sozinha não vira atalho, e o limite é respeitado", () => {
    expect(importedPlaces([".runas/mesas/biblioteca/itens/lobo.json"])).toEqual([])
    const many = ["A", "B", "C", "D", "E"].map((w) => `Wikis/${w}/x.md`)
    expect(importedPlaces(many, () => false, 4)).toHaveLength(4)
  })
})
