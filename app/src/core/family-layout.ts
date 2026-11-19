import { familyTree, type FamilyTree } from "./wiki"
import type { VaultIndex } from "./vault-index"

export interface FamilyNode { path: string; generation: number; x: number; y: number; w: number; h: number; relation?: string }
/**
 * Linha já posicionada: filiação sai do meio do casal (ou do pai/mãe sozinho); casamento liga os dois lado a lado;
 * parentesco é uma curva da pessoa no centro até o parente (`d`), com o nome em `label` no ponto (`lx`, `ly`).
 */
export interface FamilyLine { kind: "filiacao" | "casamento" | "parentesco"; x1: number; y1: number; x2: number; y2: number; d?: string; label?: string; lx?: number; ly?: number }
export interface FamilyLayout { nodes: FamilyNode[]; lines: FamilyLine[]; width: number; height: number }

/** A árvore com `up` gerações acima e `down` abaixo da pessoa (U25). */
export function familyGraph(index: VaultIndex, center: string, up = 2, down = up, scope = ""): FamilyTree {
  const tree = familyTree(index, center, Math.max(up, down), scope)
  const generations = new Map([...tree.generations].filter(([g]) => g >= -up && g <= down))
  const kept = new Set([...generations.values()].flat())
  return { center, generations, edges: tree.edges.filter((e) => kept.has(e.from) && kept.has(e.to)) }
}

/**
 * Layout por geração (U25): casais lado a lado, cada fileira ordenada pelo meio dos pais (os filhos ficam embaixo de
 * quem os teve), filhos de um casal saindo do meio dele. Determinístico e sem laços: ciclos nos dados não travam.
 */
export function layoutFamily(tree: FamilyTree, size = { w: 170, h: 52, gapX: 24, gapY: 76, margin: 24 }): FamilyLayout {
  const levels = [...tree.generations.keys()].sort((a, b) => a - b)
  const spouses = new Map<string, string[]>()
  for (const e of tree.edges) if (e.kind === "casamento") {
    spouses.set(e.from, [...(spouses.get(e.from) ?? []), e.to])
    spouses.set(e.to, [...(spouses.get(e.to) ?? []), e.from])
  }
  const parents = new Map<string, string[]>()
  for (const e of tree.edges) if (e.kind === "filiacao") parents.set(e.to, [...(parents.get(e.to) ?? []), e.from])
  const generationOf = new Map<string, number>()
  for (const [g, people] of tree.generations) for (const p of people) generationOf.set(p, g)

  // Ordem de cada fileira: de cima para baixo, pelo meio dos pais já postos; cônjuges logo ao lado.
  const order = new Map<number, string[]>()
  const slot = new Map<string, number>()
  for (const g of levels) {
    const people = tree.generations.get(g) ?? []
    const key = (p: string) => {
      const placed = (parents.get(p) ?? []).filter((q) => slot.has(q)).map((q) => slot.get(q)!)
      return placed.length ? placed.reduce((a, b) => a + b, 0) / placed.length : Number.POSITIVE_INFINITY
    }
    const sorted = people.map((p, i) => ({ p, i, k: key(p) })).sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.p)
    const row: string[] = []
    for (const person of sorted) {
      if (row.includes(person)) continue
      row.push(person)
      for (const spouse of spouses.get(person) ?? []) if (generationOf.get(spouse) === g && !row.includes(spouse)) row.push(spouse)
    }
    order.set(g, row)
    row.forEach((p, i) => slot.set(p, i - (row.length - 1) / 2))
  }

  const widest = Math.max(2, ...[...order.values()].map((row) => row.length))
  const width = widest * size.w + (widest - 1) * size.gapX + size.margin * 2
  const nodes: FamilyNode[] = []
  const at = new Map<string, FamilyNode>()
  levels.forEach((g, rowIndex) => {
    const row = order.get(g) ?? []
    const rowWidth = row.length * size.w + Math.max(0, row.length - 1) * size.gapX
    const left = (width - rowWidth) / 2
    row.forEach((path, i) => {
      const node = { path, generation: g, x: left + i * (size.w + size.gapX), y: size.margin + rowIndex * (size.h + size.gapY), w: size.w, h: size.h }
      nodes.push(node)
      at.set(path, node)
    })
  })

  const lines: FamilyLine[] = []
  const seenCouples = new Set<string>()
  for (const e of tree.edges) {
    if (e.kind !== "casamento") continue
    const [a, b] = [at.get(e.from), at.get(e.to)].sort((m, n) => (m?.x ?? 0) - (n?.x ?? 0))
    const id = [e.from, e.to].sort().join("|")
    if (!a || !b || seenCouples.has(id)) continue
    seenCouples.add(id)
    lines.push({ kind: "casamento", x1: a.x + a.w, y1: a.y + a.h / 2, x2: b.x, y2: b.y + b.h / 2 })
  }
  for (const [child, ps] of parents) {
    const c = at.get(child)
    const placed = [...new Set(ps)].map((p) => at.get(p)).filter((n): n is FamilyNode => Boolean(n))
    if (!c || !placed.length) continue
    // Pai e mãe casados e lado a lado: uma linha só, do meio do casal.
    const [a, b] = placed
    const couple = a && b && placed.length === 2 && (spouses.get(a.path) ?? []).includes(b.path) && a.y === b.y
    const sources = couple ? [{ x: (Math.min(a.x, b.x) + Math.max(a.x, b.x) + a.w) / 2, y: a.y + a.h / 2 }] : placed.map((n) => ({ x: n.x + n.w / 2, y: n.y + n.h }))
    for (const s of sources) lines.push({ kind: "filiacao", x1: s.x, y1: s.y, x2: c.x + c.w / 2, y2: c.y })
  }
  for (const e of tree.edges) {
    if (e.kind !== "parentesco") continue
    const a = at.get(e.from), b = at.get(e.to)
    if (!a || !b) continue
    if (e.label) b.relation = e.label
    if (a.y === b.y) {
      // Mesma geração: a curva passa por baixo da fileira, sem cruzar as caixas do meio.
      const [x1, x2, y] = [a.x + a.w / 2, b.x + b.w / 2, a.y + a.h], dip = size.gapY * 0.6
      lines.push({ kind: "parentesco", x1, y1: y, x2, y2: y, d: `M${x1},${y} C${x1},${y + dip} ${x2},${y + dip} ${x2},${y}`, label: e.label, lx: (x1 + x2) / 2, ly: y + dip * 0.75 })
    } else {
      // Gerações diferentes: sai da borda de cima ou de baixo de cada caixa, como a filiação.
      const down = b.y > a.y
      const [x1, y1, x2, y2] = [a.x + a.w / 2, down ? a.y + a.h : a.y, b.x + b.w / 2, down ? b.y : b.y + b.h]
      const mid = (y1 + y2) / 2
      lines.push({ kind: "parentesco", x1, y1, x2, y2, d: `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`, label: e.label, lx: (x1 + x2) / 2, ly: mid })
    }
  }
  // A curva entre parentes da última fileira passa abaixo dela: a altura cresce para caber a etiqueta.
  const lowest = Math.max(0, ...lines.map((l) => (l.ly ?? 0) + 12))
  const height = Math.max(size.margin * 2 + levels.length * size.h + Math.max(0, levels.length - 1) * size.gapY, lowest + size.margin)
  return { nodes, lines, width, height }
}

/** A geração em palavras, para o leitor de tela (U48): “centro”, “1 geração acima”, “2 gerações abaixo”. */
export function generationLabel(generation: number, isCenter = false): string {
  if (isCenter) return "centro"
  if (generation === 0) return "mesma geração"
  const n = Math.abs(generation)
  return `${n} ${n === 1 ? "geração" : "gerações"} ${generation < 0 ? "acima" : "abaixo"}`
}
