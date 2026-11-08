import { noteName } from "./text"
import type { VaultIndex } from "./vault-index"
import { linkedNotes, relationEdges, type RelationEdge } from "./wiki"

/**
 * Organograma (U25): quem é membro de uma organização, com cargo, líderes, antigos membros e a hierarquia de
 * `subordinado_a`, e o desenho em árvore (posições sem sobreposição). Só a conta; a tela fica em `WikiRelations`.
 *
 * Formato (nada novo nas notas): o cargo é o texto entre parênteses do link (`membro_de: "[[Ordem]] (tesoureira)"`);
 * antigo membro é o cargo que começa com “ex” (`(ex-tesoureira)`, `(ex membro)`).
 */
export interface OrgPerson {
  path: string
  /** Cargo escrito entre parênteses (sem o “ex”). */
  role?: string
  leader: boolean
  former: boolean
  children: OrgPerson[]
}

export interface OrgStructure {
  org: string
  people: OrgPerson[]
  /** Membros atuais e antigos (cada pessoa conta uma vez). */
  members: number
  former: number
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR").trim()
const FORMER = /^ex(?:[-\s.]+|$)/

/** Separa “ex-tesoureira” em antigo membro + cargo “tesoureira”; “membro” sozinho não é cargo. */
export function parseRole(text: string | undefined): { role?: string; former: boolean } {
  const clean = text?.trim() ?? ""
  const former = FORMER.test(fold(clean))
  const role = (former ? clean.replace(/^ex(?:[-\s.]+|$)/i, "") : clean).trim()
  return { former, ...(role && fold(role) !== "membro" ? { role } : {}) }
}

/** A estrutura de uma organização a partir das relações já lidas (`relationEdges`). */
export function orgStructure(edges: RelationEdge[], org: string, leaderField: string[] = []): OrgStructure {
  const info = new Map<string, { role?: string; leader: boolean; former: boolean }>()
  const touch = (path: string) => info.get(path) ?? { leader: false, former: true }
  for (const edge of edges) {
    if (edge.to !== org || (edge.type.key !== "membro_de" && edge.type.key !== "lider_de")) continue
    const parsed = parseRole(edge.note)
    const current = touch(edge.from)
    // Quem tem um vínculo atual não é antigo membro, mesmo com outro vínculo “ex”.
    info.set(edge.from, {
      ...(current.role ?? parsed.role ? { role: current.role ?? parsed.role } : {}),
      leader: current.leader || (edge.type.key === "lider_de" && !parsed.former),
      former: current.former && parsed.former,
    })
  }
  for (const path of leaderField) info.set(path, { ...touch(path), leader: true, former: false })
  const bossOf = new Map<string, string>()
  for (const edge of edges) if (edge.type.key === "subordinado_a" && info.has(edge.from) && info.has(edge.to) && edge.from !== edge.to && !bossOf.has(edge.from)) bossOf.set(edge.from, edge.to)
  // Ciclos de subordinação (A sob B sob A) não travam: quem fecha o ciclo sobe para o topo.
  for (const path of bossOf.keys()) {
    const seen = new Set([path])
    let boss = bossOf.get(path)
    while (boss && !seen.has(boss)) { seen.add(boss); boss = bossOf.get(boss) }
    if (boss) bossOf.delete(path)
  }
  const order = (a: string, b: string) => {
    const x = info.get(a)!, y = info.get(b)!
    return Number(x.former) - Number(y.former) || Number(y.leader) - Number(x.leader) || noteName(a).localeCompare(noteName(b), "pt-BR")
  }
  const build = (path: string): OrgPerson => ({ path, ...info.get(path)!, children: [...info.keys()].filter((p) => bossOf.get(p) === path).sort(order).map(build) })
  const people = [...info.keys()].filter((p) => !bossOf.has(p)).sort(order).map(build)
  return { org, people, members: info.size, former: [...info.values()].filter((i) => i.former).length }
}

/** A estrutura de `org` lendo o cofre: as relações (lidas uma vez, ou as que vierem) e o campo `lider` da organização. */
export function orgStructureOf(index: VaultIndex, org: string, scope = "", edges = relationEdges(index, scope)): OrgStructure {
  return orgStructure(edges, org, linkedNotes(index, index.note(org)?.meta.frontmatter?.data?.lider, org))
}

// ---------- Desenho ----------

export interface LayoutNode {
  path: string
  kind: "org" | "person"
  person?: OrgPerson
  x: number
  y: number
  w: number
  h: number
  depth: number
  parent?: string
  /** Quantas pessoas abaixo (o ramo pode fechar). */
  childCount: number
  collapsed: boolean
}

export interface OrgLayout {
  nodes: LayoutNode[]
  /** Linhas em ângulo reto, do meio de baixo do chefe ao meio de cima de quem responde a ele. */
  edges: { from: string; to: string; d: string }[]
  width: number
  height: number
}

export const ORG_NODE = { w: 196, h: 64, gapX: 20, gapY: 60, margin: 16 }

/**
 * Árvore arrumada: cada ramo ocupa a largura dos filhos lado a lado e o chefe fica centrado sobre eles, então nenhum
 * cartão cobre outro. Ramos em `collapsed` não desenham os filhos.
 */
export function layoutOrg(structure: OrgStructure, collapsed: ReadonlySet<string> = new Set(), size = ORG_NODE): OrgLayout {
  type Item = { path: string; kind: "org" | "person"; person?: OrgPerson; children: Item[]; all: number }
  const count = (p: OrgPerson): number => p.children.reduce((n, c) => n + 1 + count(c), 0)
  const item = (p: OrgPerson): Item => ({ path: p.path, kind: "person", person: p, children: collapsed.has(p.path) ? [] : p.children.map(item), all: count(p) })
  const root: Item = { path: structure.org, kind: "org", children: collapsed.has(structure.org) ? [] : structure.people.map(item), all: structure.members }
  const widthOf = new Map<Item, number>()
  const measure = (it: Item): number => {
    const inner = it.children.reduce((sum, c) => sum + measure(c), 0) + size.gapX * Math.max(0, it.children.length - 1)
    const w = Math.max(size.w, inner)
    widthOf.set(it, w)
    return w
  }
  measure(root)
  const nodes: LayoutNode[] = []
  const edges: OrgLayout["edges"] = []
  const place = (it: Item, left: number, depth: number, parent?: LayoutNode) => {
    const span = widthOf.get(it)!
    const node: LayoutNode = {
      path: it.path, kind: it.kind, ...(it.person ? { person: it.person } : {}), x: left + (span - size.w) / 2, y: size.margin + depth * (size.h + size.gapY),
      w: size.w, h: size.h, depth, ...(parent ? { parent: parent.path } : {}), childCount: it.all, collapsed: collapsed.has(it.path) && it.all > 0,
    }
    nodes.push(node)
    if (parent) {
      const x1 = parent.x + parent.w / 2, y1 = parent.y + parent.h, x2 = node.x + node.w / 2, y2 = node.y, mid = y1 + size.gapY / 2
      edges.push({ from: parent.path, to: node.path, d: `M${x1} ${y1}V${mid}H${x2}V${y2}` })
    }
    let cursor = left + (span - (it.children.reduce((sum, c) => sum + widthOf.get(c)!, 0) + size.gapX * Math.max(0, it.children.length - 1))) / 2
    for (const child of it.children) { place(child, cursor, depth + 1, node); cursor += widthOf.get(child)! + size.gapX }
  }
  place(root, size.margin, 0)
  const width = widthOf.get(root)! + size.margin * 2
  const height = Math.max(...nodes.map((n) => n.y + n.h)) + size.margin
  return { nodes, edges, width, height }
}

/** Para onde as setas levam a partir de cada nó: chefe, primeiro subordinado e vizinhos da mesma fileira do ramo. */
export function layoutNeighbors(layout: OrgLayout): Map<string, { up?: string; down?: string; left?: string; right?: string }> {
  const map = new Map<string, { up?: string; down?: string; left?: string; right?: string }>()
  const children = new Map<string, LayoutNode[]>()
  for (const node of layout.nodes) if (node.parent) children.set(node.parent, [...(children.get(node.parent) ?? []), node])
  for (const node of layout.nodes) {
    const siblings = node.parent ? children.get(node.parent)! : [node]
    const at = siblings.indexOf(node)
    map.set(node.path, {
      ...(node.parent ? { up: node.parent } : {}),
      ...(children.get(node.path)?.[0] ? { down: children.get(node.path)![0]!.path } : {}),
      ...(at > 0 ? { left: siblings[at - 1]!.path } : {}),
      ...(at < siblings.length - 1 ? { right: siblings[at + 1]!.path } : {}),
    })
  }
  return map
}
