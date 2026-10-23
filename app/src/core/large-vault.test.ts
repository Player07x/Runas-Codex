import { buildGraph } from "./graph-data"
import { generateLargeVault } from "./large-vault"
import { searchNotes } from "./search"
import { VaultIndex } from "./vault-index"

describe("benchmark do cofre grande", () => {
  it("mede 10 mil notas no índice, busca e gráfico", () => {
    const generated = generateLargeVault()
    const start = performance.now()
    const index = new VaultIndex(generated.entries, generated.texts)
    const indexMs = performance.now() - start
    const searchStart = performance.now()
    const hits = searchNotes(index, "cidade valdris", "Notas/Grande/", 50)
    const searchMs = performance.now() - searchStart
    const graphStart = performance.now()
    const graph = buildGraph(index, { root: "Notas/Grande/", filter: "", showOrphans: true, showAttachments: false, showMissing: false, groups: [] })
    const graphMs = performance.now() - graphStart
    console.info(JSON.stringify({ notes: index.size, hits: hits.length, nodes: graph.nodes.length, edges: graph.edges.length, indexMs: Math.round(indexMs), searchMs: Math.round(searchMs), graphMs: Math.round(graphMs) }))
    expect(index.size).toBe(10_000)
    expect(hits.length).toBeGreaterThan(0)
    expect(graph.nodes).toHaveLength(10_000)
    expect(graph.edges.length).toBeGreaterThan(10_000)
    expect(indexMs).toBeLessThan(15_000)
    expect(searchMs).toBeLessThan(5_000)
    expect(graphMs).toBeLessThan(15_000)
  }, 30_000)
})
