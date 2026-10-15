import { buildGraph } from "./graph-data"
import { creationTime, timelapseFrame, timelapseOrder } from "./graph-timelapse"
import { VaultIndex } from "./vault-index"

const texts: Record<string, string> = {
  "Notas/Velha.md": "---\ncriado: 2024-01-05\n---\nLiga [[Nova]] e ![[mapa.png]].\n",
  "Notas/Nova.md": "---\ncreated: 2026-03-01T10:00\n---\nVolta para [[Velha]] e [[Inexistente]].\n",
  "Notas/Sem data.md": "Sem propriedade; vale a modificação.\n",
}
const entries = [
  { path: "Notas/Velha.md", size: 1, mtime: Date.parse("2026-10-01") },
  { path: "Notas/Nova.md", size: 1, mtime: Date.parse("2026-10-02") },
  { path: "Notas/Sem data.md", size: 1, mtime: Date.parse("2025-06-01") },
  { path: "Notas/mapa.png", size: 1, mtime: 1 },
]
const index = new VaultIndex(entries, texts)

describe("timelapse do gráfico", () => {
  it("usa a data de criação das propriedades e, sem ela, a modificação", () => {
    expect(creationTime(index.note("Notas/Velha.md")!)).toBe(Date.parse("2024-01-05"))
    expect(creationTime(index.note("Notas/Nova.md")!)).toBe(Date.parse("2026-03-01T10:00"))
    expect(creationTime(index.note("Notas/Sem data.md")!)).toBe(Date.parse("2025-06-01"))
  })

  it("as notas entram pela data; anexos e links quebrados logo depois da nota que os cita", () => {
    const data = buildGraph(index, { root: "Notas/", filter: "", showOrphans: true, showAttachments: true, showMissing: true, groups: [] })
    const time = (path: string) => (index.note(path) ? creationTime(index.note(path)!) : undefined)
    const order = timelapseOrder(data, time)
    const label = (id: string) => data.nodes.find((n) => n.id === id)!.label
    expect(order.map(label)).toEqual(["Velha", "mapa.png", "Sem data", "Nova", "Inexistente"])
    expect(order).toHaveLength(data.nodes.length)
  })

  it("cada quadro tem só as ligações entre os nós que já apareceram", () => {
    const data = buildGraph(index, { root: "Notas/", filter: "", showOrphans: true, showAttachments: true, showMissing: true, groups: [] })
    const order = timelapseOrder(data, (path) => (index.note(path) ? creationTime(index.note(path)!) : undefined))
    expect(timelapseFrame(data, order, 1)).toMatchObject({ edges: [] })
    expect(timelapseFrame(data, order, 2).edges).toHaveLength(1)
    expect(timelapseFrame(data, order, order.length)).toEqual({ nodes: data.nodes, edges: data.edges })
  })
})
