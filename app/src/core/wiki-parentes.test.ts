import { familyTree, inverseKeyOf, relationEdges, relationsOf, RELATION_TYPES } from "./wiki"
import { relationSentence } from "./relation-sides"
import { VaultIndex } from "./vault-index"

const W = "Wikis/Mundo/Personagens/"
const P = (name: string) => `${W}${name}.md`
const files: Record<string, string> = {
  [P("Prismeus")]: "---\ntipo: personagem\npais: [\"[[Mãe]]\"]\ntios: [\"[[Tia]]\"]\nprimos: [\"[[Primo]]\"]\navos: [\"[[Avó]]\"]\nbisavos: [\"[[Bisavô]]\"]\npadrinhos: [\"[[Madrinha]]\"]\n---",
  [P("Mãe")]: "---\ntipo: personagem\n---",
  [P("Tia")]: "---\ntipo: personagem\nsobrinhos: [\"[[Prismeus]]\"]\n---",
  [P("Primo")]: "---\ntipo: personagem\n---",
  [P("Avó")]: "---\ntipo: personagem\n---",
  [P("Bisavô")]: "---\ntipo: personagem\n---",
  [P("Madrinha")]: "---\ntipo: personagem\n---",
  [P("Sobrinha")]: "---\ntipo: personagem\ntios: [\"[[Prismeus]]\"]\n---",
}
const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)
const labels = (path: string) => relationsOf(index, path).map((r) => `${r.type.label}:${r.other?.split("/").pop()}`)

describe("parentes além do núcleo", () => {
  it("cada parente novo é da família e tem o outro lado", () => {
    const keys = new Set(RELATION_TYPES.map((t) => t.key))
    for (const key of ["avos", "netos", "bisavos", "bisnetos", "tios", "sobrinhos", "primos", "meio_irmaos", "cunhados", "sogros", "genros", "padrastos", "enteados", "pais_adotivos", "filhos_adotivos", "padrinhos", "afilhados"]) {
      const type = RELATION_TYPES.find((t) => t.key === key)!
      expect(type.group).toBe("familia")
      expect(keys.has(inverseKeyOf(key))).toBe(true)
      expect(RELATION_TYPES.find((t) => t.key === inverseKeyOf(key))!.label).toBe(type.inverse)
    }
    // Os rótulos continuam únicos: o organograma acha o inverso pelo rótulo.
    expect(new Set(RELATION_TYPES.map((t) => t.label)).size).toBe(RELATION_TYPES.length)
  })

  it("mostra o parente dos dois lados", () => {
    expect(labels(P("Prismeus"))).toEqual(expect.arrayContaining(["Tios:Tia.md", "Primos:Primo.md", "Avós:Avó.md", "Padrinhos:Madrinha.md", "Sobrinhos:Sobrinha.md"]))
    expect(labels(P("Primo"))).toEqual(["Primos:Prismeus.md"])
    expect(labels(P("Avó"))).toEqual(["Netos:Prismeus.md"])
    expect(labels(P("Madrinha"))).toEqual(["Afilhados:Prismeus.md"])
  })

  it("tios num lado e sobrinhos no outro contam uma vez", () => {
    const tia = relationEdges(index, "Wikis/Mundo/").filter((e) => [e.from, e.to].includes(P("Tia")))
    expect(tia).toEqual([expect.objectContaining({ from: P("Prismeus"), to: P("Tia"), type: expect.objectContaining({ key: "tios" }) })])
  })

  it("a árvore põe cada parente na sua geração", () => {
    const tree = familyTree(index, P("Prismeus"))
    expect(tree.generations.get(-2)).toEqual([P("Avó")])
    expect(tree.generations.get(-1)?.sort()).toEqual([P("Madrinha"), P("Mãe"), P("Tia")].sort())
    expect(tree.generations.get(0)).toEqual([P("Prismeus"), P("Primo")])
    expect(tree.generations.get(1)).toEqual([P("Sobrinha")])
    expect(tree.generations.has(-3)).toBe(false)
    expect(familyTree(index, P("Prismeus"), 3).generations.get(-3)).toEqual([P("Bisavô")])
  })

  it("a frase do Adicionar diz quem é o quê", () => {
    expect(relationSentence("tios", "Prismeus", "Tia")).toBe("Tia é tio ou tia de Prismeus")
    expect(relationSentence("primos", "Prismeus", "Primo")).toBe("Prismeus e Primo são primos")
    expect(relationSentence("afilhados", "Madrinha", "Prismeus")).toBe("Prismeus é afilhado ou afilhada de Madrinha")
  })
})
