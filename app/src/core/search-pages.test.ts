import { describe, expect, it } from "vitest"
import { notePages, screenPages, searchPages } from "./search-pages"
import { VaultIndex } from "./vault-index"

const files: Record<string, string> = {
  "Campanhas/Cinzas/Cinzas.md": `---
tipo: campanha
npcs: ["[[Conde Ormund]] (hostil)"]
faccoes: ["[[Ordem da Brasa]]"]
---
# As Cinzas de Valdris
`,
  "Campanhas/Cinzas/Sessões/Sessão 3.md": "---\ntipo: sessao\nnumero: 3\n---\n# Sessão 3\n",
  "Campanhas/Cinzas/Missões/O ritual.md": "---\ntipo: missao\n---\n# O ritual\n",
  "Campanhas/Cinzas/Personagens/Lira.md": "# Lira\n",
  "Campanhas/Cinzas/Notas do mestre/Pista.md": "# Pista\n",
  "Wikis/Valdris/Personagens/Conde Ormund.md": "---\ntipo: personagem\nmembro_de: \"[[Ordem da Brasa]] (conde)\"\n---\n# Conde Ormund\n",
  "Wikis/Valdris/Organizações/Ordem da Brasa.md": "---\ntipo: organizacao\n---\n# Ordem da Brasa\n",
  "Wikis/Valdris/Personagens/Ana.md": "---\ntipo: personagem\npais: \"[[Conde Ormund]]\"\n---\n# Ana\n",
  "Wikis/Valdris/Lendas/Crônica.md": "# Crônica das Cinzas\n",
  "Livros/Guia/Guia.md": "---\ntipo: livro\n---\n# Guia de Valdris\n",
  "Livros/Guia/Capítulos/Abertura.md": "# Abertura\n",
  "Notas/Solta.md": "# Solta\n",
}
const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)
const labels = (path: string) => notePages(index, path).map((p) => `${p.label} | ${p.detail} | ${p.route}`)

describe("páginas da busca (U116)", () => {
  it("mostra a campanha no Painel, com atalhos para as abas", () => {
    const [page] = notePages(index, "Campanhas/Cinzas/Cinzas.md")
    expect(page).toMatchObject({ label: "As Cinzas de Valdris", detail: "Campanha · Painel", route: "/campanhas/Cinzas", notePath: "Campanhas/Cinzas/Cinzas.md" })
    expect(page!.shortcuts?.map((s) => s.label)).toEqual(["Sessões", "Missões", "Elenco", "Quadro"])
    expect(page!.shortcuts?.[2]?.route).toBe("/campanhas/Cinzas/elenco")
  })

  it("abre sessão e missão dentro da campanha", () => {
    expect(labels("Campanhas/Cinzas/Sessões/Sessão 3.md")).toEqual([`Sessão 3 | Sessão · Cinzas | /campanhas/Cinzas/sessoes/${encodeURIComponent("Campanhas/Cinzas/Sessões/Sessão 3.md")}`])
    expect(labels("Campanhas/Cinzas/Missões/O ritual.md")[0]).toContain("Missão · Cinzas | /campanhas/Cinzas/missoes/")
  })

  it("leva o personagem jogador ao Elenco", () => {
    expect(labels("Campanhas/Cinzas/Personagens/Lira.md")[0]).toContain("Lira no Elenco | Campanha · Cinzas | /campanhas/Cinzas/elenco/")
  })

  it("mostra o artigo, o Elenco da campanha que o cita e o organograma", () => {
    expect(labels("Wikis/Valdris/Personagens/Conde Ormund.md").map((l) => l.split(" | ").slice(0, 2).join(" | "))).toEqual([
      "Conde Ormund | Artigo · Wiki Valdris › Personagens",
      "Conde Ormund no Elenco | Campanha · Cinzas",
      "Conde Ormund no organograma | Wiki Valdris › Relações",
    ])
  })

  it("a organização aparece no Elenco (facção) e no organograma", () => {
    const pages = notePages(index, "Wikis/Valdris/Organizações/Ordem da Brasa.md").map((p) => p.label)
    expect(pages).toEqual(["Ordem da Brasa", "Ordem da Brasa no Elenco", "Ordem da Brasa no organograma"])
  })

  it("quem só tem família vai para a árvore genealógica", () => {
    expect(notePages(index, "Wikis/Valdris/Personagens/Ana.md").map((p) => p.label)).toEqual(["Ana", "Ana na árvore genealógica"])
  })

  it("livro e capítulo abrem o livro", () => {
    expect(labels("Livros/Guia/Guia.md")).toEqual([`Guia de Valdris | Livro | /livros/${encodeURIComponent("Livros/Guia/Guia.md")}`])
    expect(labels("Livros/Guia/Capítulos/Abertura.md")).toEqual([`Abertura | Livro · Guia de Valdris | /livros/${encodeURIComponent("Livros/Guia/Guia.md")}`])
  })

  it("nota sem tela própria não vira página", () => {
    expect(notePages(index, "Notas/Solta.md")).toEqual([])
    expect(notePages(index, "Campanhas/Cinzas/Notas do mestre/Pista.md")).toEqual([])
    expect(notePages(index, "Notas/Nao existe.md")).toEqual([])
  })

  it("acha as telas fixas pelo nome, sem diferenciar acentos", () => {
    expect(screenPages("relacoes").map((p) => p.route)).toEqual(["/wiki/relacoes"])
    expect(screenPages("calendário").map((p) => p.label)).toEqual(["Calendário do mundo"])
    expect(screenPages("  ")).toEqual([])
  })

  it("junta as páginas das notas e as telas, sem repetir, até o limite", () => {
    const paths = ["Wikis/Valdris/Personagens/Conde Ormund.md", "Wikis/Valdris/Personagens/Conde Ormund.md", "Campanhas/Cinzas/Cinzas.md"]
    const pages = searchPages(index, "co", paths)
    expect(pages.map((p) => p.key)).toEqual([...new Set(pages.map((p) => p.key))])
    expect(pages.length).toBeLessThanOrEqual(7)
    expect(searchPages(index, "co", paths, 2)).toHaveLength(2)
    expect(searchPages(index, "", paths)).toEqual([])
  })

  it("põe primeiro a tela cujo nome começa pela busca", () => {
    const pages = searchPages(index, "acess", ["Wikis/Valdris/Lendas/Crônica.md"])
    expect(pages[0]?.label).toBe("Acessibilidade")
  })
})
