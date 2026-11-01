import type { CanvasDoc, CanvasEdge, CanvasNode } from "./canvas"
import { relationsOf } from "./wiki"
import type { VaultIndex } from "./vault-index"

/**
 * Mapa de relações do Elenco (ideia da revisão das Campanhas): os personagens, NPCs e facções acompanhados na
 * campanha, ligados pelas relações que as notas da wiki já declaram (`aliados`, `inimigos`, `membro_de`…), e “o grupo”
 * no centro, ligado a cada NPC pela atitude e a cada facção pela reputação. Vira um `.canvas` que abre no Obsidian.
 */

export type RelationMember = { path: string; title: string; kind: "pj" | "npc" | "faccao"; toParty?: string }

export interface RelationMapEdge {
  from: string
  to: string
  label: string
}

export interface RelationMap {
  members: (RelationMember & { x: number; y: number })[]
  edges: RelationMapEdge[]
}

export const RELATION_CARD = { width: 240, height: 64, ring: 340, ringGap: 200, slot: 290 }
/** Nó do grupo no centro do mapa. */
export const PARTY = "runas:grupo"

export function buildRelationMap(index: VaultIndex, members: RelationMember[], scope = ""): RelationMap {
  const byPath = new Map(members.map((m) => [m.path, m]))
  const edges: RelationMapEdge[] = []
  const seen = new Set<string>()
  for (const member of members) {
    for (const relation of relationsOf(index, member.path, scope)) {
      if (relation.inverse || !relation.other || !byPath.has(relation.other) || relation.other === member.path) continue
      // As simétricas (aliados, inimigos…) aparecem uma vez só, escritas de um lado ou dos dois.
      const pair = relation.type.symmetric ? [member.path, relation.other].sort().join("|") : `${member.path}|${relation.other}`
      const key = `${relation.type.key}|${pair}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push({ from: member.path, to: relation.other, label: relation.note ? `${relation.type.label} (${relation.note})` : relation.type.label })
    }
  }
  for (const member of members) if (member.toParty) edges.push({ from: PARTY, to: member.path, label: member.toParty })
  // Anéis em volta do grupo: cada anel cabe tantos cartões quanto o perímetro permite.
  const placed: RelationMap["members"] = []
  let ring = RELATION_CARD.ring
  let start = 0
  while (start < members.length) {
    const capacity = Math.max(6, Math.floor((2 * Math.PI * ring) / RELATION_CARD.slot))
    const slice = members.slice(start, start + capacity)
    slice.forEach((member, i) => {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / slice.length
      placed.push({ ...member, x: Math.round(Math.cos(angle) * ring * 1.4 - RELATION_CARD.width / 2), y: Math.round(Math.sin(angle) * ring - RELATION_CARD.height / 2) })
    })
    start += capacity
    ring += RELATION_CARD.ringGap
  }
  return { members: placed, edges }
}

const GENERATED = "runas-relacao-"
const hash = (text: string) => {
  let h = 0
  for (const ch of text) h = (Math.imul(31, h) + ch.charCodeAt(0)) | 0
  return (h >>> 0).toString(16).padStart(8, "0")
}
const nodeId = (path: string) => `${GENERATED}n-${hash(path)}`

/** Cor do cartão: verde para aliados, vermelho para hostis, laranja para desconfiados, roxo para facções. */
function colorOf(member: RelationMember): string | undefined {
  if (member.kind === "faccao") return "6"
  if (member.kind === "pj") return "5"
  const attitude = (member.toParty ?? "").toLocaleLowerCase("pt-BR")
  if (attitude.startsWith("alia") || attitude.startsWith("amig")) return "4"
  if (attitude.startsWith("host") || attitude.startsWith("inim")) return "1"
  if (attitude.startsWith("desconf")) return "2"
  return undefined
}

/**
 * O mapa como `.canvas`. Com `existing`, o que o mestre acrescentou à mão continua, e os cartões gerados antes ficam
 * onde ele os arrastou; só entram os novos e as ligações são refeitas.
 */
export function relationMapCanvas(map: RelationMap, existing?: CanvasDoc): CanvasDoc {
  const old = new Map((existing?.nodes ?? []).filter((n) => n.id.startsWith(GENERATED)).map((n) => [n.id, n]))
  const kept = existing ? { nodes: existing.nodes.filter((n) => !n.id.startsWith(GENERATED)), edges: existing.edges.filter((e) => !e.id.startsWith(GENERATED)) } : { nodes: [], edges: [] }
  const at = (id: string, x: number, y: number) => {
    const before = old.get(id)
    return before ? { x: before.x, y: before.y } : { x, y }
  }
  const party = `${GENERATED}grupo`
  const nodes: CanvasNode[] = [
    { id: party, type: "text", text: "## O grupo", ...at(party, -RELATION_CARD.width / 2, -RELATION_CARD.height / 2), width: RELATION_CARD.width, height: RELATION_CARD.height, color: "5" },
    ...map.members.map((member): CanvasNode => {
      const id = nodeId(member.path)
      const color = colorOf(member)
      return { id, type: "file", file: member.path, ...at(id, member.x, member.y), width: RELATION_CARD.width, height: RELATION_CARD.height, ...(color ? { color } : {}) }
    }),
  ]
  const edges: CanvasEdge[] = map.edges.map((edge) => ({
    id: `${GENERATED}e-${hash(`${edge.from}>${edge.to}>${edge.label}`)}`,
    fromNode: edge.from === PARTY ? party : nodeId(edge.from),
    toNode: nodeId(edge.to),
    toEnd: "arrow",
    label: edge.label,
  }))
  const ids = new Set([...kept.nodes.map((n) => n.id), ...nodes.map((n) => n.id)])
  return { ...(existing ?? {}), nodes: [...nodes, ...kept.nodes], edges: [...edges, ...kept.edges.filter((e) => ids.has(e.fromNode) && ids.has(e.toNode))] }
}
