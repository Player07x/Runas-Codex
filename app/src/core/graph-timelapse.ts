import type { GraphData } from "./graph-data"
import type { IndexedNote } from "./vault-index"

/**
 * Timelapse do gráfico: as notas aparecem na ordem em que foram criadas, com as ligações entre as que já estão na tela.
 * A data é a da propriedade de criação (`criado`, `created`, `date`, `data`); sem ela, a da última modificação do
 * arquivo (o app não lê a data de criação do disco).
 */
const DATE_KEYS = ["criado", "criada", "created", "date", "data", "criacao"]

export function creationTime(note: Pick<IndexedNote, "meta" | "mtime">): number {
  const data = note.meta.frontmatter?.data
  for (const key of DATE_KEYS) {
    const value = data?.[key]
    if (typeof value !== "string" && !(value instanceof Date)) continue
    const time = value instanceof Date ? value.getTime() : Date.parse(value.trim().replace(" ", "T"))
    if (Number.isFinite(time)) return time
  }
  return note.mtime
}

/**
 * A ordem em que os nós aparecem: as notas pela data; anexos, links quebrados e portais logo depois da primeira nota
 * ligada a eles (um nó solto sem nota vai para o fim).
 */
export function timelapseOrder(data: GraphData, timeOf: (path: string) => number | undefined): string[] {
  const notes = data.nodes.filter((n) => n.kind === "note").sort((a, b) => (timeOf(a.path) ?? 0) - (timeOf(b.path) ?? 0) || a.label.localeCompare(b.label, "pt-BR"))
  const neighbors = new Map<string, string[]>()
  for (const edge of data.edges) {
    neighbors.set(edge.source, [...(neighbors.get(edge.source) ?? []), edge.target])
    neighbors.set(edge.target, [...(neighbors.get(edge.target) ?? []), edge.source])
  }
  const order: string[] = []
  const placed = new Set<string>()
  const kinds = new Map(data.nodes.map((n) => [n.id, n.kind]))
  for (const note of notes) {
    order.push(note.id)
    placed.add(note.id)
    for (const other of neighbors.get(note.id) ?? []) {
      if (placed.has(other) || kinds.get(other) === "note" || !kinds.has(other)) continue
      order.push(other)
      placed.add(other)
    }
  }
  for (const node of data.nodes) if (!placed.has(node.id)) order.push(node.id)
  return order
}

/** Os primeiros `count` nós da ordem e as ligações entre eles. */
export function timelapseFrame(data: GraphData, order: string[], count: number): GraphData {
  const shown = new Set(order.slice(0, count))
  return { nodes: data.nodes.filter((n) => shown.has(n.id)), edges: data.edges.filter((e) => shown.has(e.source) && shown.has(e.target)) }
}
