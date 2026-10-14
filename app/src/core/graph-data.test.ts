import { buildGraph, type GraphOptions } from "./graph-data"
import { VaultIndex } from "./vault-index"

const files: Record<string, string> = {
  "Notas/A.md": "[[B]] [[C]] [[Fantasma]] ![[mapa.png]] [[Wikis/Mundo/Rei|Rei]] #npc",
  "Notas/B.md": "[[A]] [[C]]",
  "Notas/C.md": "fim",
  "Notas/D.md": "[[C]]",
  "Notas/Sozinha.md": "sem links",
  "Wikis/Mundo/Rei.md": "[[A]]",
}
const index = new VaultIndex(
  [...Object.keys(files), "Notas/mapa.png"].map((path) => ({ path, size: 1, mtime: 1 })),
  files,
)
const base: GraphOptions = { root: "Notas/", filter: "", showOrphans: false, showAttachments: false, showMissing: false, groups: [] }
const ids = (options: Partial<GraphOptions>) => buildGraph(index, { ...base, ...options }).nodes.map((n) => n.id).sort()

describe("buildGraph", () => {
  it("notas do espaço, sem órfãs, com outro espaço como portal e arestas sem repetir", () => {
    const graph = buildGraph(index, base)
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["Notas/A.md", "Notas/B.md", "Notas/C.md", "Notas/D.md", "portal:Wikis/Mundo/Rei.md"])
    expect(graph.edges).toHaveLength(5) // A-B (uma vez só, nos dois sentidos), A-C, A-portal, B-C, D-C
    expect(graph.edges.find((e) => e.source === "Notas/A.md" && e.target === "Notas/B.md")?.mutual).toBe(true)
    expect(graph.nodes.find((n) => n.id === "Notas/A.md")!.degree).toBe(3)
  })

  it("liga órfãs, anexos e notas que ainda não existem", () => {
    expect(ids({ showOrphans: true })).toContain("Notas/Sozinha.md")
    expect(ids({ showAttachments: true })).toContain("Notas/mapa.png")
    expect(ids({ showMissing: true })).toContain("missing:fantasma")
  })

  it("no cofre inteiro, a nota de outro espaço é um nó comum", () => {
    expect(ids({ root: "" })).toContain("Wikis/Mundo/Rei.md")
    expect(ids({ root: "" }).some((id) => id.startsWith("portal:"))).toBe(false)
  })

  it("a busca filtra as notas", () => {
    expect(ids({ filter: "path:Notas/A", showOrphans: true })).toEqual(["Notas/A.md", "portal:Wikis/Mundo/Rei.md"])
  })

  it("gráfico local por profundidade", () => {
    expect(ids({ center: "Notas/D.md", depth: 1 })).toEqual(["Notas/C.md", "Notas/D.md"])
    expect(ids({ center: "Notas/D.md", depth: 2 })).toEqual(["Notas/A.md", "Notas/B.md", "Notas/C.md", "Notas/D.md"])
  })

  it("grupos de cor pela primeira busca que bate", () => {
    const graph = buildGraph(index, { ...base, groups: [{ query: "tag:npc", color: "#f00" }, { query: "path:Notas", color: "#0f0" }] })
    expect(graph.nodes.find((n) => n.id === "Notas/A.md")!.group).toBe(0)
    expect(graph.nodes.find((n) => n.id === "Notas/B.md")!.group).toBe(1)
  })
})

describe("buildGraph com cofre grande", () => {
  it("monta 5 mil notas e 15 mil links rápido", () => {
    const big: Record<string, string> = {}
    for (let i = 0; i < 5000; i++) big[`Notas/N${i}.md`] = `[[N${(i * 7) % 5000}]] [[N${(i * 13 + 1) % 5000}]] [[N${(i + 1) % 5000}]]`
    const bigIndex = new VaultIndex(Object.keys(big).map((path) => ({ path, size: 1, mtime: 1 })), big)
    const start = performance.now()
    const graph = buildGraph(bigIndex, base)
    const elapsed = performance.now() - start
    expect(graph.nodes).toHaveLength(5000)
    expect(elapsed).toBeLessThan(3000)
  })
})
