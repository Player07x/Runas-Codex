import { CALENDAR_EXAMPLE, articleImage, articleKind, ARTICLE_KINDS, calendarFor, diplomacy, familyTree, listCalendars, listWikis, newArticleNote, newCalendarNote, noteDates, orgChart, parseMap, pinsToYaml, relationsOf, timelineEvents, type CalendarRef } from "./wiki"
import { parseCalendar } from "./calendar"
import { VaultIndex } from "./vault-index"
import { parseFrontmatter } from "./parse"

const W = "Wikis/Mundo/"
const CAL = `${W}Calendários/Calendário do Mundo.md`
const files: Record<string, string> = {
  [`${W}Mundo.md`]: "---\ntipo: wiki\n---\n# Mundo",
  [CAL]: "# Cal\n\n```runas-calendario\n" + CALENDAR_EXAMPLE.replace('hoje: "1000-01-01"', 'hoje: "1032-03-10"') + "\n```\n",
  [`${W}Personagens/Avô.md`]: "---\ntipo: personagem\nnascimento_mundo: \"0950-01-01\"\n---",
  [`${W}Personagens/Pai.md`]: "---\ntipo: personagem\npais: [\"[[Avô]]\"]\nconjuges: [\"[[Mãe]]\"]\nlider_de: \"[[Ordem]]\"\n---",
  [`${W}Personagens/Mãe.md`]: "---\ntipo: personagem\n---",
  [`${W}Personagens/Aldren.md`]: "---\ntipo: personagem\ncalendario: \"[[Calendário do Mundo]]\"\nnascimento_mundo: \"1000-02-12\"\npais: [\"[[Pai]]\", \"[[Mãe]]\"]\ninimigos: [\"[[Conde]] (hostil)\"]\nmembro_de: [\"[[Ordem]]\"]\nsubordinado_a: \"[[Pai]]\"\nrelacoes: [\"[[Ilsa]] (dívida de vida)\"]\n---",
  [`${W}Personagens/Irmã.md`]: "---\ntipo: personagem\npais: [\"[[Pai]]\"]\n---",
  [`${W}Personagens/Filho.md`]: "---\ntipo: personagem\npais: [\"[[Aldren]]\"]\n---",
  [`${W}Personagens/Conde.md`]: "---\ntipo: personagem\n---",
  [`${W}Personagens/Ilsa.md`]: "---\ntipo: personagem\n---",
  [`${W}Organizações/Ordem.md`]: "---\ntipo: organizacao\nlider: \"[[Pai]]\"\naliados: [\"[[Reino]]\"]\n---",
  [`${W}Países/Reino.md`]: "---\ntipo: pais\nem_guerra_com: [\"[[Império]]\"]\n---",
  [`${W}Países/Império.md`]: "---\ntipo: pais\nvassalo_de: \"[[Reino]]\"\n---",
  [`${W}Acontecimentos/Queda.md`]: "---\ntipo: acontecimento\ndata_mundo: \"1010-05-01\"\ndata_fim_mundo: \"1010-05-03\"\ntrilha: \"[[Reino]]\"\n---",
  [`${W}Acontecimentos/Coroação.md`]: "---\ntipo: evento\ndata_mundo: \"1005-01-01\"\n---",
  [`${W}Mapas/Mapa.md`]: "# Mapa\n```runas-mapa\nimagem: \"[[mapa.png]]\"\ncamadas: [Locais, Segredos]\nescala: { pixels: 100, distancia: 10, unidade: km }\nviagem: { por_dia: 30 }\npinos:\n  - { nota: \"[[Reino]]\", x: 0.4, y: 0.25, camada: Locais }\n  - { rotulo: Ruínas, x: 2, y: -1, segredo: true }\n  - { x: 0.1, y: 0.1 }\n```\n",
  ["Wikis/Outra/Nota.md"]: "texto",
}
const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)
const P = (name: string) => `${W}Personagens/${name}.md`

describe("wiki", () => {
  it("lista as wikis com a nota inicial e a contagem de artigos", () => {
    expect(listWikis(index).map((w) => [w.name, w.home ?? null, w.articles])).toEqual([
      ["Mundo", `${W}Mundo.md`, Object.keys(files).filter((p) => p.startsWith(W)).length - 1],
      ["Outra", null, 1],
    ])
  })

  it("tipos de artigo: os 20 da checklist, com apelidos, e o artigo novo tem os campos e as perguntas", () => {
    expect(ARTICLE_KINDS.length).toBeGreaterThanOrEqual(20)
    expect(articleKind("Acontecimento")?.id).toBe("evento")
    expect(articleKind("País")?.id).toBe("pais")
    const text = newArticleNote(articleKind("personagem")!, "Ilsa", "Calendário do Mundo")
    const data = parseFrontmatter(text)!.data!
    expect(data).toMatchObject({ tipo: "personagem", calendario: "[[Calendário do Mundo]]", afiliacao: [] })
    expect("nascimento_mundo" in data).toBe(true)
    expect(text).toContain("# Ilsa")
    expect(text).toContain("%% O que essa pessoa quer mais do que tudo? %%")
    expect(text).toContain("## Aparência")
  })

  it("calendário de uma nota: pela propriedade, pelo único da wiki, ou o erro", () => {
    expect((calendarFor(index, P("Aldren")) as CalendarRef).path).toBe(CAL)
    expect((calendarFor(index, P("Conde")) as CalendarRef).path).toBe(CAL)
    expect(calendarFor(index, "Wikis/Outra/Nota.md")).toBeNull()
    const broken = new VaultIndex([{ path: "Wikis/X/A.md", size: 1, mtime: 1 }], { "Wikis/X/A.md": "---\ncalendario: \"[[Não existe]]\"\n---" })
    expect(calendarFor(broken, "Wikis/X/A.md")).toEqual({ error: "O calendário “Não existe” não está no cofre." })
    expect(listCalendars(index)).toHaveLength(1)
    expect(() => parseCalendar(newCalendarNote("C").split("```runas-calendario\n")[1]!.split("\n```")[0]!)).not.toThrow()
  })

  it("datas do mundo: as propriedades que terminam em _mundo", () => {
    expect(noteDates({ nascimento_mundo: "1000-02-12", fundacao_da_ordem_mundo: "0900-01-01", outra: "1000-01-01", morte_mundo: "x" })).toEqual([
      { key: "nascimento_mundo", label: "Nascimento", date: { year: 1000, month: 2, day: 12 } },
      { key: "fundacao_da_ordem_mundo", label: "Fundacao da ordem", date: { year: 900, month: 1, day: 1 } },
    ])
  })

  it("relações aparecem nas duas notas, com o tipo inverso e a atitude", () => {
    const aldren = relationsOf(index, P("Aldren")).map((r) => `${r.type.label}:${r.other?.split("/").pop()}${r.note ? `(${r.note})` : ""}`)
    expect(aldren).toEqual(expect.arrayContaining(["Pais:Pai.md", "Inimigos:Conde.md(hostil)", "Outras relações:Ilsa.md(dívida de vida)", "Filhos:Filho.md"]))
    const conde = relationsOf(index, P("Conde"))
    expect(conde).toEqual([expect.objectContaining({ inverse: true, note: "hostil", other: P("Aldren"), type: expect.objectContaining({ label: "Inimigos" }) })])
    const pai = relationsOf(index, P("Pai")).map((r) => `${r.type.label}:${r.other?.split("/").pop()}`)
    expect(pai).toEqual(expect.arrayContaining(["Filhos:Aldren.md", "Filhos:Irmã.md", "Cônjuges:Mãe.md", "Pais:Avô.md"]))
    expect(relationsOf(index, P("Mãe")).map((r) => r.type.label)).toEqual(expect.arrayContaining(["Cônjuges", "Filhos"]))
  })

  it("árvore genealógica por gerações", () => {
    const tree = familyTree(index, P("Aldren"))
    expect(tree.generations.get(-2)).toEqual([P("Avô")])
    expect(tree.generations.get(-1)?.sort()).toEqual([P("Mãe"), P("Pai")].sort())
    expect(tree.generations.get(0)).toEqual([P("Aldren"), P("Irmã")])
    expect(tree.generations.get(1)).toEqual([P("Filho")])
    expect(tree.edges).toEqual(expect.arrayContaining([{ from: P("Pai"), to: P("Aldren"), kind: "filiacao" }]))
  })

  it("organograma: líder em cima, subordinados embaixo", () => {
    const chart = orgChart(index, `${W}Organizações/Ordem.md`)
    expect(chart.children.map((c) => [c.path, c.role])).toEqual([[P("Pai"), "lider"]])
    expect(chart.children[0]!.children.map((c) => c.path)).toEqual([P("Aldren")])
  })

  it("teia diplomática com os tipos de relação", () => {
    const web = diplomacy(index, W)
    expect(web.edges.map((e) => `${e.from.split("/").pop()}-${e.kind}-${e.to.split("/").pop()}`).sort()).toEqual(["Império.md-vassalo_de-Reino.md", "Ordem.md-aliados-Reino.md", "Império.md-em_guerra_com-Reino.md"].sort())
  })

  it("linha do tempo com trilhas e, se pedido, nascimentos", () => {
    const ref = calendarFor(index, P("Aldren")) as CalendarRef
    const events = timelineEvents(index, W, ref)
    expect(events.map((e) => [e.title, e.track])).toEqual([["Coroação", "Acontecimento"], ["Queda", "Reino"]])
    expect(events[1]!.endDay - events[1]!.startDay).toBe(2)
    expect(timelineEvents(index, W, ref, { people: true }).map((e) => e.title)).toEqual(expect.arrayContaining(["Nasce Aldren", "Nasce Avô"]))
  })

  it("bloco de mapa: imagem, camadas, pinos (limitados à imagem), escala e viagem", () => {
    const content = files[`${W}Mapas/Mapa.md`]!.split("```runas-mapa\n")[1]!.split("```")[0]!
    const map = parseMap(content)
    expect(map.image).toBe("mapa.png")
    expect(map.pins).toEqual([
      { note: "Reino", x: 0.4, y: 0.25, layer: "Locais" },
      { label: "Ruínas", x: 1, y: 0, secret: true },
    ])
    expect(map.scale).toEqual({ pixels: 100, distance: 10, unit: "km" })
    expect(map.travelPerDay).toBe(30)
    expect(pinsToYaml(map.pins)[0]).toEqual({ nota: "[[Reino]]", x: 0.4, y: 0.25, camada: "Locais" })
    expect(() => parseMap("pinos: []")).toThrow("imagem")
  })
})


describe("arte do artigo", () => {
  const note = (text: string) => new VaultIndex([{path:"Wikis/Mundo/Artigo.md",mtime:1,size:text.length}],{"Wikis/Mundo/Artigo.md":text}).note("Wikis/Mundo/Artigo.md")!
  it("prefere o campo de imagem do tipo, sem delimitadores ou legenda", () => {
    expect(articleImage(note('---\ntipo: personagem\nretrato: "[[Retrato.png|Guardiã]]"\n---\n![[Outra.png]]'))).toBe("Retrato.png")
    expect(articleImage(note('---\ntipo: organizacao\nsimbolo: "simbolo.svg"\n---'))).toBe("simbolo.svg")
    expect(articleImage(note('---\ntipo: pais\nbandeira: "[[paises/bandeira.webp]]"\n---'))).toBe("paises/bandeira.webp")
  })
  it("usa a primeira imagem embutida no corpo e ignora frontmatter e embeds de notas", () => {
    const text='---\ntipo: personagem\nreferencia: "![[Ignorar.png]]"\n---\n![[Outra nota]]\n![Primeira](../Imagens/Primeira.PNG)\n![[Segunda.png]]'
    expect(articleImage(note(text))).toBe("../Imagens/Primeira.PNG")
  })
  it("devolve null quando não há arte", () => { expect(articleImage(note('---\ntipo: local\nimagem: ""\n---\n# Local'))).toBeNull() })
  it("funciona sem tipo e com tipos desconhecidos", () => {
    expect(articleImage(note('# Sem tipo\n![[imagem.png|300]]'))).toBe("imagem.png")
    expect(articleImage(note('---\ntipo: inventado\n---\n![[arquivo.pdf]]'))).toBeNull()
  })
})
