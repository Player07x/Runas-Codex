import { compareOrder, type QuestInfo, type QuestStatus } from "./campaigns"
import type { CanvasDoc, CanvasEdge, CanvasNode } from "./canvas"

/**
 * Mapa de missões: arcos (missões-mãe, pela propriedade `parte_de`) que contêm missões, e setas de pré-requisito
 * (`requer`). Sem `parte_de`, a missão `2.1` fica dentro da `2` pela ordem (ligação “deduzida”, que a tela oferece
 * gravar). Tudo aqui é cálculo: a tela desenha e o `.canvas` gerado abre igual no Obsidian.
 */

export interface QuestMapNode {
  path: string
  title: string
  status: QuestStatus
  order: string
  /** Arco onde a missão aparece (caminho da missão-mãe) ou `null` para as soltas. */
  arc: string | null
  /** O arco veio só da ordem (`2.1` dentro de `2`), sem `parte_de` na nota. */
  inferred: boolean
  requires: string[]
  /** Algum pré-requisito ainda não concluído. */
  blocked: boolean
  /** Coluna dentro do arco (profundidade dos pré-requisitos) e linha dentro da coluna. */
  layer: number
  row: number
  x: number
  y: number
}

export interface QuestMapArc {
  /** Caminho da missão-mãe, ou `null` para o grupo das missões soltas. */
  path: string | null
  title: string
  status?: QuestStatus
  order: string
  nodes: QuestMapNode[]
  done: number
  x: number
  y: number
  width: number
  height: number
}

export interface QuestMapEdge { from: string; to: string }

export interface QuestMap {
  arcs: QuestMapArc[]
  nodes: QuestMapNode[]
  edges: QuestMapEdge[]
  /** Ciclos de pré-requisito e links que não levam a nenhuma missão, para a tela avisar. */
  warnings: string[]
  width: number
  height: number
}

export const QUEST_CARD = { width: 220, height: 64, gapX: 56, gapY: 16, pad: 20, head: 44, arcGap: 32 }

/** O arco de cada missão: `parte_de` resolvido; sem ele, a missão com a ordem “mãe” (`2` para `2.1`). */
function arcsOf(quests: QuestInfo[]): Map<string, { arc: string | null; inferred: boolean }> {
  const byOrder = new Map(quests.filter((q) => q.order).map((q) => [q.order, q.path]))
  const paths = new Set(quests.map((q) => q.path))
  const out = new Map<string, { arc: string | null; inferred: boolean }>()
  for (const quest of quests) {
    const explicit = quest.parent?.dest && paths.has(quest.parent.dest) && quest.parent.dest !== quest.path ? quest.parent.dest : null
    if (explicit) { out.set(quest.path, { arc: explicit, inferred: false }); continue }
    const parentOrder = quest.order.includes(".") ? quest.order.slice(0, quest.order.lastIndexOf(".")) : ""
    const inferred = parentOrder ? byOrder.get(parentOrder) : undefined
    out.set(quest.path, inferred && inferred !== quest.path ? { arc: inferred, inferred: true } : { arc: null, inferred: false })
  }
  // Um arco é sempre uma missão de topo: a mãe de uma mãe sobe até a raiz (o mapa mostra um nível de arco).
  for (const [path, info] of out) {
    const seen = new Set([path])
    let arc = info.arc
    while (arc && out.get(arc)?.arc && !seen.has(arc)) { seen.add(arc); arc = out.get(arc)!.arc }
    if (arc !== info.arc) out.set(path, { ...info, arc })
  }
  return out
}

export function buildQuestMap(quests: QuestInfo[]): QuestMap {
  const byPath = new Map(quests.map((q) => [q.path, q]))
  const arcOf = arcsOf(quests)
  const warnings: string[] = []
  const arcPaths = new Set([...arcOf.values()].map((a) => a.arc).filter((a): a is string => Boolean(a)))
  const edges: QuestMapEdge[] = []
  for (const quest of quests) {
    for (const req of quest.requires) {
      if (!req.dest || !byPath.has(req.dest)) warnings.push(`“${quest.title}” requer “${req.target}”, que não é uma missão desta campanha.`)
      else if (req.dest !== quest.path) edges.push({ from: req.dest, to: quest.path })
    }
  }
  // Profundidade pelos pré-requisitos do mesmo arco (caminho mais longo); um ciclo vira aviso e é cortado.
  const layer = new Map<string, number>()
  const visiting = new Set<string>()
  const depth = (path: string): number => {
    const known = layer.get(path)
    if (known !== undefined) return known
    if (visiting.has(path)) { warnings.push(`Ciclo de pré-requisitos passando por “${byPath.get(path)?.title ?? path}”.`); return 0 }
    visiting.add(path)
    const arc = arcOf.get(path)?.arc ?? null
    const before = edges.filter((e) => e.to === path && (arcOf.get(e.from)?.arc ?? null) === arc && !arcPaths.has(e.from)).map((e) => depth(e.from) + 1)
    visiting.delete(path)
    const value = Math.max(0, ...before)
    layer.set(path, value)
    return value
  }
  const done = (path: string) => byPath.get(path)?.status === "concluida"
  // Missões que são arcos aparecem como o cabeçalho do grupo, não como cartão dentro dele.
  const members = quests.filter((q) => !arcPaths.has(q.path))
  const groups = new Map<string | null, QuestInfo[]>()
  for (const quest of members) {
    const arc = arcOf.get(quest.path)?.arc ?? null
    groups.set(arc, [...(groups.get(arc) ?? []), quest])
  }
  for (const arc of arcPaths) if (!groups.has(arc)) groups.set(arc, [])
  const order = (path: string | null) => (path ? byPath.get(path)?.order || "999" : "9999")
  const sortedArcs = [...groups.keys()].sort((a, b) => (a === null ? 1 : b === null ? -1 : compareOrder(order(a), order(b)) || (byPath.get(a)?.title ?? "").localeCompare(byPath.get(b)?.title ?? "", "pt-BR")))
  const { width: W, height: H, gapX, gapY, pad, head, arcGap } = QUEST_CARD
  const arcs: QuestMapArc[] = []
  const nodes: QuestMapNode[] = []
  let y = 0
  let maxWidth = 0
  for (const arcPath of sortedArcs) {
    const list = groups.get(arcPath)!.sort((a, b) => compareOrder(a.order || "999", b.order || "999") || a.title.localeCompare(b.title, "pt-BR"))
    const columns = new Map<number, QuestInfo[]>()
    for (const quest of list) { const l = depth(quest.path); columns.set(l, [...(columns.get(l) ?? []), quest]) }
    // Sem pré-requisitos entre elas, muitas missões numa coluna só viram uma grade (a coluna não diz nada ali).
    const flat = columns.size === 1 && list.length > 4
    const gridCols = flat ? Math.min(4, Math.ceil(Math.sqrt(list.length))) : 1
    const cols = flat ? gridCols : Math.max(1, columns.size ? Math.max(...columns.keys()) + 1 : 1)
    const rows = flat ? Math.ceil(list.length / gridCols) : Math.max(1, ...[...columns.values()].map((c) => c.length))
    const width = pad * 2 + cols * W + (cols - 1) * gapX
    const height = head + pad + rows * H + (rows - 1) * gapY + pad
    const arcNodes: QuestMapNode[] = []
    for (const [l, column] of columns) column.forEach((quest, index) => {
      const row = flat ? Math.floor(index / gridCols) : index, col = flat ? index % gridCols : l
      const node: QuestMapNode = {
        path: quest.path, title: quest.title, status: quest.status, order: quest.order,
        arc: arcPath, inferred: arcOf.get(quest.path)?.inferred ?? false,
        requires: quest.requires.map((r) => r.dest).filter((d): d is string => Boolean(d && byPath.has(d))),
        blocked: quest.requires.some((r) => r.dest && byPath.has(r.dest) && !done(r.dest)),
        layer: l, row, x: pad + col * (W + gapX), y: y + head + pad + row * (H + gapY),
      }
      arcNodes.push(node)
    })
    arcNodes.sort((a, b) => a.layer - b.layer || a.row - b.row || a.x - b.x)
    nodes.push(...arcNodes)
    const arcQuest = arcPath ? byPath.get(arcPath) : undefined
    arcs.push({
      path: arcPath, title: arcQuest?.title ?? "Missões soltas", ...(arcQuest ? { status: arcQuest.status } : {}), order: arcQuest?.order ?? "",
      nodes: arcNodes, done: arcNodes.filter((n) => n.status === "concluida").length, x: 0, y, width, height,
    })
    maxWidth = Math.max(maxWidth, width)
    y += height + arcGap
  }
  return { arcs, nodes, edges: edges.filter((e) => !arcPaths.has(e.from) && !arcPaths.has(e.to)), warnings: [...new Set(warnings)], width: maxWidth, height: Math.max(0, y - arcGap) }
}

/** Ids dos itens que o gerador cria no `.canvas`: atualizar troca só esses e guarda o que o mestre acrescentou. */
const GENERATED = "runas-missao-"
const hash = (text: string) => { let h = 0; for (const ch of text) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0; return (h >>> 0).toString(16).padStart(8, "0") }
const STATUS_COLOR: Record<QuestStatus, string> = { ideia: "6", ativa: "5", pausada: "3", concluida: "4", falhou: "1" }

/**
 * O mapa como `.canvas` do Obsidian: grupos para os arcos, nós de arquivo para as missões e setas para `requer`. Com
 * `existing`, os nós e setas que o mestre pôs à mão continuam; os gerados antes são trocados pelos novos.
 */
export function questMapCanvas(map: QuestMap, existing?: CanvasDoc): CanvasDoc {
  const kept = existing ? { nodes: existing.nodes.filter((n) => !n.id.startsWith(GENERATED)), edges: existing.edges.filter((e) => !e.id.startsWith(GENERATED)) } : { nodes: [], edges: [] }
  const keptIds = new Set(kept.nodes.map((n) => n.id))
  const nodes: CanvasNode[] = []
  for (const arc of map.arcs) {
    nodes.push({ id: `${GENERATED}g-${hash(arc.path ?? "soltas")}`, type: "group", x: arc.x, y: arc.y, width: arc.width, height: arc.height, label: arc.order ? `${arc.order} · ${arc.title}` : arc.title, ...(arc.status ? { color: STATUS_COLOR[arc.status] } : {}) })
  }
  for (const node of map.nodes) {
    nodes.push({ id: `${GENERATED}q-${hash(node.path)}`, type: "file", file: node.path, x: node.x, y: node.y, width: QUEST_CARD.width, height: QUEST_CARD.height, color: STATUS_COLOR[node.status] })
  }
  const edges: CanvasEdge[] = map.edges.map((edge) => ({ id: `${GENERATED}e-${hash(`${edge.from}>${edge.to}`)}`, fromNode: `${GENERATED}q-${hash(edge.from)}`, fromSide: "right", toNode: `${GENERATED}q-${hash(edge.to)}`, toSide: "left", toEnd: "arrow" }))
  // As setas que o mestre ligou a missões geradas continuam valendo (o id do nó da missão não muda).
  const ids = new Set([...keptIds, ...nodes.map((n) => n.id)])
  return { ...(existing ?? {}), nodes: [...nodes, ...kept.nodes], edges: [...edges, ...kept.edges.filter((e) => ids.has(e.fromNode) && ids.has(e.toNode))] }
}
