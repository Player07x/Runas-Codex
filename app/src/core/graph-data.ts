import { basename, extname, foldName, noteName } from "./text"
import type { VaultIndex } from "./vault-index"

/**
 * Dados do gráfico (global ou local), separados do desenho: quais nós e arestas entram, com os filtros do Obsidian
 * (busca, órfãs, anexos, notas que ainda não existem) e os "portais" do Runas-Codex — notas de outro espaço aparecem
 * como nós especiais, sem misturar os espaços.
 */

export type GraphNodeKind = "note" | "attachment" | "missing" | "portal"

export interface GraphNode {
  id: string
  label: string
  kind: GraphNodeKind
  /** Caminho no cofre (notas, anexos e portais); o alvo do link (inexistentes). */
  path: string
  /** Ligações do nó (o tamanho do círculo cresce com elas). */
  degree: number
  /** Índice do grupo de cor (o primeiro grupo cuja busca inclui a nota). */
  group?: number
}

export interface GraphEdge {
  /** A nota que tem o link (a seta aponta para `target`). */
  source: string
  target: string
  /** As duas notas apontam uma para a outra. */
  mutual?: boolean
  /** Cor própria da ligação (ex.: teia diplomática: aliança, guerra…). */
  color?: string
}

export interface GraphGroup {
  query: string
  color: string
}

export interface GraphOptions {
  /** Raiz do espaço (`Notas/`, `Wikis/Mundo/`…) ou vazio para o cofre inteiro. */
  root: string
  /** Busca no formato da busca de notas (`tag:`, `path:`…): só as notas que batem entram. */
  filter: string
  showOrphans: boolean
  showAttachments: boolean
  showMissing: boolean
  groups: GraphGroup[]
  /** Gráfico local: a nota do centro e quantos passos de distância entram. */
  center?: string
  depth?: number
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

const ALL = 1_000_000

export function buildGraph(index: VaultIndex, options: GraphOptions): GraphData {
  const { root } = options
  const filter = options.filter.trim()
  const notes = filter ? index.search(filter, root, ALL).map((hit) => hit.path) : index.notesIn(root).map((note) => note.path)
  const inScope = new Set(notes)
  if (options.center && index.note(options.center)) inScope.add(options.center)

  const nodes = new Map<string, GraphNode>()
  const edges = new Map<string, GraphEdge>()
  const add = (node: Omit<GraphNode, "degree">) => {
    if (!nodes.has(node.id)) nodes.set(node.id, { ...node, degree: 0 })
  }
  for (const path of inScope) add({ id: path, label: noteName(path), kind: "note", path })

  for (const from of inScope) {
    for (const resolved of index.outgoing(from)) {
      const { dest, link } = resolved
      let to: string | null = null
      if (dest && dest !== from) {
        if (extname(dest) !== ".md") {
          if (!options.showAttachments || (root && !dest.startsWith(root))) continue
          add({ id: dest, label: basename(dest), kind: "attachment", path: dest })
          to = dest
        } else if (inScope.has(dest)) {
          to = dest
        } else if (root && !dest.startsWith(root)) {
          // Nota de outro espaço: portal (no cofre inteiro, toda nota já é um nó).
          const id = `portal:${dest}`
          add({ id, label: noteName(dest), kind: "portal", path: dest })
          to = id
        } else {
          // Nota do espaço que a busca deixou de fora.
          continue
        }
      } else if (!dest && link.target && options.showMissing) {
        const id = `missing:${foldName(link.target)}`
        add({ id, label: noteName(link.target), kind: "missing", path: link.target })
        to = id
      }
      if (!to) continue
      const key = from < to ? `${from}\u0000${to}` : `${to}\u0000${from}`
      const existing = edges.get(key)
      if (!existing) edges.set(key, { source: from, target: to })
      else if (existing.source !== from) existing.mutual = true
    }
  }

  let edgeList = [...edges.values()]
  for (const edge of edgeList) {
    nodes.get(edge.source)!.degree++
    nodes.get(edge.target)!.degree++
  }

  let keep: Set<string>
  if (options.center && nodes.has(options.center)) {
    // Gráfico local: busca em largura sem direção, até a profundidade pedida.
    const neighbors = new Map<string, string[]>()
    for (const { source, target } of edgeList) {
      neighbors.set(source, [...(neighbors.get(source) ?? []), target])
      neighbors.set(target, [...(neighbors.get(target) ?? []), source])
    }
    keep = new Set([options.center])
    let frontier = [options.center]
    for (let step = 0; step < Math.max(1, options.depth ?? 1); step++) {
      const next: string[] = []
      for (const id of frontier) for (const other of neighbors.get(id) ?? []) if (!keep.has(other)) (keep.add(other), next.push(other))
      frontier = next
    }
  } else {
    keep = new Set([...nodes.values()].filter((node) => options.showOrphans || node.degree > 0).map((node) => node.id))
  }
  edgeList = edgeList.filter((edge) => keep.has(edge.source) && keep.has(edge.target))

  if (options.groups.length) {
    const members = options.groups.map((group) => new Set(group.query.trim() ? index.search(group.query, "", ALL).map((hit) => hit.path) : []))
    for (const node of nodes.values()) {
      if (node.kind !== "note" && node.kind !== "portal") continue
      const group = members.findIndex((set) => set.has(node.path))
      if (group >= 0) node.group = group
    }
  }

  return { nodes: [...nodes.values()].filter((node) => keep.has(node.id)), edges: edgeList }
}
