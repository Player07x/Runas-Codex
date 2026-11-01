import { describe, expect, it } from "vitest"
import { buildRelationMap, PARTY, relationMapCanvas, type RelationMember } from "./relation-map"
import { VaultIndex } from "./vault-index"

const files: Record<string, string> = {
  "Wikis/M/Personagens/Conde.md": '---\ntipo: personagem\ninimigos: ["[[Yara]]"]\nmembro_de: ["[[Coroa]]"]\nfilhos: ["[[Filho]]"]\n---\n# Conde\n',
  "Wikis/M/Personagens/Yara.md": '---\ntipo: personagem\ninimigos: ["[[Conde]]"]\naliados: ["[[Fora do elenco]]"]\n---\n# Yara\n',
  "Wikis/M/Organizações/Coroa.md": "---\ntipo: organizacao\n---\n# Coroa\n",
  "Wikis/M/Personagens/Fora do elenco.md": "# Fora\n",
  "Wikis/M/Personagens/Filho.md": '---\ntipo: personagem\npais: ["[[Conde]]"]\n---\n# Filho\n',
}
const index = new VaultIndex(Object.entries(files).map(([path, text]) => ({ path, mtime: 1, size: text.length })), files)
const members: RelationMember[] = [
  { path: "Wikis/M/Personagens/Conde.md", title: "Conde", kind: "npc", toParty: "hostil" },
  { path: "Wikis/M/Personagens/Yara.md", title: "Yara", kind: "npc", toParty: "aliado" },
  { path: "Wikis/M/Organizações/Coroa.md", title: "Coroa", kind: "faccao", toParty: "-1" },
  { path: "Wikis/M/Personagens/Filho.md", title: "Filho", kind: "npc" },
]

describe("mapa de relações do Elenco", () => {
  it("liga só quem está no elenco, uma vez por relação simétrica, e o grupo pela atitude", () => {
    const map = buildRelationMap(index, members, "Wikis/M/")
    const edges = map.edges.map((e) => `${e.from.split("/").pop()}>${e.to.split("/").pop()}:${e.label}`)
    expect(edges).toContain("Conde.md>Yara.md:Inimigos")
    expect(edges).toContain("Conde.md>Coroa.md:Membro de")
    expect(edges.filter((e) => e.includes("Inimigos"))).toHaveLength(1)
    expect(edges.some((e) => e.includes("Fora"))).toBe(false)
    // `filhos` escrito no pai e `pais` escrito no filho são a mesma ligação.
    expect(edges.filter((e) => e.includes("Filho.md"))).toEqual(["Conde.md>Filho.md:Filhos"])
    expect(map.edges.filter((e) => e.from === PARTY).map((e) => e.label)).toEqual(["hostil", "aliado", "-1"])
  })

  it("vira um .canvas que guarda o que o mestre acrescentou e onde ele arrastou os cartões", () => {
    const map = buildRelationMap(index, members, "Wikis/M/")
    const first = relationMapCanvas(map)
    expect(first.nodes.filter((n) => n.type === "file").map((n) => n.file)).toEqual(members.map((m) => m.path))
    const conde = first.nodes.find((n) => n.file === members[0]!.path)!
    const edited = {
      ...first,
      nodes: [...first.nodes.map((n) => (n.id === conde.id ? { ...n, x: 999, y: 888 } : n)), { id: "meu", type: "text", text: "nota do mestre", x: 0, y: 0, width: 100, height: 60 }],
      edges: [...first.edges, { id: "minha", fromNode: "meu", toNode: conde.id }],
    }
    const again = relationMapCanvas(map, edited)
    expect(again.nodes.find((n) => n.id === conde.id)).toMatchObject({ x: 999, y: 888 })
    expect(again.nodes.some((n) => n.id === "meu")).toBe(true)
    expect(again.edges.some((e) => e.id === "minha")).toBe(true)
    expect(again.nodes.filter((n) => n.id === conde.id)).toHaveLength(1)
  })

  it("põe muitos membros em anéis sem sobrepor o grupo", () => {
    const many = Array.from({ length: 40 }, (_, i): RelationMember => ({ path: `N${i}.md`, title: `N${i}`, kind: "npc" }))
    const map = buildRelationMap(new VaultIndex([], {}), many)
    expect(map.members).toHaveLength(40)
    expect(new Set(map.members.map((m) => `${m.x},${m.y}`)).size).toBe(40)
    expect(map.members.every((m) => Math.abs(m.x) + Math.abs(m.y) > 200)).toBe(true)
  })
})
