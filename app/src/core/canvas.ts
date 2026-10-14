/**
 * Quadros `.canvas` no formato JSON Canvas 1.0 (o do Obsidian): `nodes` (texto, nota, link, grupo) e `edges`.
 * O app só mexe no que entende: campos desconhecidos (de plugins ou de versões novas) ficam como estavam, inclusive
 * nas chaves de topo. Arquivo que não mudou não é regravado, e a indentação do arquivo original é mantida.
 */

export type CanvasSide = "top" | "right" | "bottom" | "left"
export type CanvasNodeType = "text" | "file" | "link" | "group"

export interface CanvasNode {
  id: string
  type: CanvasNodeType | string
  x: number
  y: number
  width: number
  height: number
  color?: string
  /** `text` */
  text?: string
  /** `file`: caminho no cofre. */
  file?: string
  subpath?: string
  /** `link` */
  url?: string
  /** `group` */
  label?: string
  background?: string
  backgroundStyle?: string
  [key: string]: unknown
}

/** O que se informa para criar um nó (o id é gerado). */
export type NodeInput = Pick<CanvasNode, "type" | "x" | "y" | "width" | "height"> & Partial<Pick<CanvasNode, "color" | "text" | "file" | "subpath" | "url" | "label" | "background" | "backgroundStyle">>

export interface CanvasEdge {
  id: string
  fromNode: string
  toNode: string
  fromSide?: CanvasSide
  toSide?: CanvasSide
  fromEnd?: "none" | "arrow"
  toEnd?: "none" | "arrow"
  color?: string
  label?: string
  [key: string]: unknown
}

export interface CanvasDoc {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  [key: string]: unknown
}

/** Cores pré-definidas do Obsidian ("1" a "6"); qualquer outra é `#rrggbb`. */
export const CANVAS_COLORS: { id: string; label: string; css: string }[] = [
  { id: "1", label: "Vermelho", css: "var(--red)" },
  { id: "2", label: "Laranja", css: "#f0a35e" },
  { id: "3", label: "Amarelo", css: "var(--gold)" },
  { id: "4", label: "Verde", css: "var(--green)" },
  { id: "5", label: "Ciano", css: "#7ad3e6" },
  { id: "6", label: "Roxo", css: "var(--violet)" },
]

export function colorCss(color: string | undefined): string | undefined {
  if (!color) return undefined
  return CANVAS_COLORS.find((c) => c.id === color)?.css ?? (/^#[\da-f]{3,8}$/i.test(color) ? color : undefined)
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)

/** Lê um `.canvas`. Arquivo vazio é um quadro vazio; JSON inválido devolve o erro (e o app não grava por cima). */
export function parseCanvas(text: string): { doc: CanvasDoc } | { error: string } {
  if (!text.trim()) return { doc: { nodes: [], edges: [] } }
  let data: unknown
  try {
    data = JSON.parse(text.replace(/^﻿/, ""))
  } catch (error) {
    return { error: `O quadro não é um JSON válido: ${error instanceof Error ? error.message : String(error)}` }
  }
  if (!isObject(data)) return { error: "O quadro precisa ser um objeto JSON com nodes e edges." }
  const nodes = data.nodes ?? []
  const edges = data.edges ?? []
  if (!Array.isArray(nodes) || !Array.isArray(edges)) return { error: "nodes e edges precisam ser listas." }
  for (const node of nodes) {
    if (!isObject(node) || typeof node.id !== "string" || typeof node.type !== "string") return { error: "Há um nó sem id ou tipo." }
    for (const key of ["x", "y", "width", "height"]) if (typeof node[key] !== "number") return { error: `O nó ${node.id} não tem ${key} numérico.` }
  }
  for (const edge of edges) {
    if (!isObject(edge) || typeof edge.id !== "string" || typeof edge.fromNode !== "string" || typeof edge.toNode !== "string") return { error: "Há uma ligação sem id ou sem as pontas." }
  }
  return { doc: { ...data, nodes: nodes as CanvasNode[], edges: edges as CanvasEdge[] } }
}

/** Indentação do arquivo original (tab no Obsidian; dois espaços em outros editores; nada se for uma linha só). */
function indentOf(original: string | undefined): string | number {
  if (original === undefined) return "\t"
  const m = /\n([ \t]+)"/.exec(original)
  if (!m) return original.includes("\n") ? "\t" : 0
  return m[1]!.startsWith("\t") ? "\t" : m[1]!.length
}

export function serializeCanvas(doc: CanvasDoc, original?: string): string {
  const indent = indentOf(original)
  const eol = original?.includes("\r\n") ? "\r\n" : "\n"
  let text = JSON.stringify(doc, null, indent === 0 ? undefined : indent)
  if (eol === "\r\n") text = text.replace(/\n/g, "\r\n")
  if (original && /\r?\n$/.test(original)) text += eol
  return text
}

/** O texto a gravar, ou `null` se o quadro não mudou (o arquivo fica como está, byte a byte). */
export function canvasToSave(original: string, doc: CanvasDoc): string | null {
  const before = parseCanvas(original)
  if ("doc" in before && JSON.stringify(before.doc) === JSON.stringify(doc)) return null
  return serializeCanvas(doc, original)
}

export function emptyCanvasText(): string {
  return serializeCanvas({ nodes: [], edges: [] })
}

/** Id no estilo do Obsidian: 16 dígitos hexadecimais, sem repetir os que existem. */
export function newCanvasId(doc: CanvasDoc, random: () => number = Math.random): string {
  const taken = new Set([...doc.nodes.map((n) => n.id), ...doc.edges.map((e) => e.id)])
  for (let attempt = 0; ; attempt++) {
    // Um gerador ruim (que repete) não pode travar o app: depois de algumas tentativas, usa o Math.random.
    const draw = attempt < 20 ? random : Math.random
    const id = Array.from({ length: 16 }, () => Math.floor(draw() * 16).toString(16)).join("")
    if (!taken.has(id)) return id
  }
}

const round = (n: number) => Math.round(n)

export function addNode(doc: CanvasDoc, node: NodeInput, random?: () => number): { doc: CanvasDoc; id: string } {
  const id = newCanvasId(doc, random)
  const created = { id, ...node, x: round(node.x), y: round(node.y), width: Math.max(40, round(node.width)), height: Math.max(30, round(node.height)) } as CanvasNode
  // Grupos ficam atrás (primeiros na lista = mais ao fundo).
  const nodes = node.type === "group" ? [created, ...doc.nodes] : [...doc.nodes, created]
  return { doc: { ...doc, nodes }, id }
}

export function updateNode(doc: CanvasDoc, id: string, patch: Partial<CanvasNode>): CanvasDoc {
  return {
    ...doc,
    nodes: doc.nodes.map((n) => {
      if (n.id !== id) return n
      const next: CanvasNode = { ...n, ...patch }
      for (const key of ["x", "y", "width", "height"] as const) next[key] = round(next[key])
      // Campo vazio sai do arquivo (não grava `"color": ""`).
      for (const [key, value] of Object.entries(patch)) if (value === undefined || value === "") delete next[key]
      return next
    }),
  }
}

/** Nós inteiramente dentro do grupo (é assim que o Obsidian decide quem anda junto com ele). */
export function nodesInside(doc: CanvasDoc, group: CanvasNode): string[] {
  return doc.nodes
    .filter((n) => n.id !== group.id && n.x >= group.x && n.y >= group.y && n.x + n.width <= group.x + group.width && n.y + n.height <= group.y + group.height)
    .map((n) => n.id)
}

/** Move os nós (e o que estiver dentro dos grupos movidos). */
export function moveNodes(doc: CanvasDoc, ids: string[], dx: number, dy: number): CanvasDoc {
  const moving = new Set(ids)
  for (const id of ids) {
    const node = doc.nodes.find((n) => n.id === id)
    if (node?.type === "group") for (const inner of nodesInside(doc, node)) moving.add(inner)
  }
  return { ...doc, nodes: doc.nodes.map((n) => (moving.has(n.id) ? { ...n, x: round(n.x + dx), y: round(n.y + dy) } : n)) }
}

/** Apaga os nós e as ligações que tocam neles. */
export function removeNodes(doc: CanvasDoc, ids: string[]): CanvasDoc {
  const gone = new Set(ids)
  return { ...doc, nodes: doc.nodes.filter((n) => !gone.has(n.id)), edges: doc.edges.filter((e) => !gone.has(e.fromNode) && !gone.has(e.toNode)) }
}

/** Lados que ligam dois nós pelo caminho mais curto (o que o Obsidian faz ao ligar sem escolher o lado). */
export function edgeSides(from: CanvasNode, to: CanvasNode): { fromSide: CanvasSide; toSide: CanvasSide } {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2)
  const dy = to.y + to.height / 2 - (from.y + from.height / 2)
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? { fromSide: "right", toSide: "left" } : { fromSide: "left", toSide: "right" }
  return dy >= 0 ? { fromSide: "bottom", toSide: "top" } : { fromSide: "top", toSide: "bottom" }
}

export function addEdge(doc: CanvasDoc, fromNode: string, toNode: string, label?: string, random?: () => number): { doc: CanvasDoc; id: string } | null {
  const from = doc.nodes.find((n) => n.id === fromNode)
  const to = doc.nodes.find((n) => n.id === toNode)
  if (!from || !to || fromNode === toNode) return null
  if (doc.edges.some((e) => e.fromNode === fromNode && e.toNode === toNode)) return null
  const id = newCanvasId(doc, random)
  const edge: CanvasEdge = { id, fromNode, ...edgeSides(from, to), toNode, ...(label ? { label } : {}) }
  // Ordem dos campos como o Obsidian grava.
  const ordered: CanvasEdge = { id, fromNode, fromSide: edge.fromSide, toNode, toSide: edge.toSide, ...(label ? { label } : {}) }
  return { doc: { ...doc, edges: [...doc.edges, ordered] }, id }
}

export function updateEdge(doc: CanvasDoc, id: string, patch: Partial<CanvasEdge>): CanvasDoc {
  return {
    ...doc,
    edges: doc.edges.map((e) => {
      if (e.id !== id) return e
      const next: CanvasEdge = { ...e, ...patch }
      for (const [key, value] of Object.entries(patch)) if (value === undefined || value === "") delete next[key]
      return next
    }),
  }
}

export function removeEdge(doc: CanvasDoc, id: string): CanvasDoc {
  return { ...doc, edges: doc.edges.filter((e) => e.id !== id) }
}

/** Ponto da borda de um nó onde a ligação encosta. */
export function anchorPoint(node: CanvasNode, side: CanvasSide | undefined): { x: number; y: number } {
  switch (side) {
    case "top":
      return { x: node.x + node.width / 2, y: node.y }
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height }
    case "left":
      return { x: node.x, y: node.y + node.height / 2 }
    case "right":
      return { x: node.x + node.width, y: node.y + node.height / 2 }
    default:
      return { x: node.x + node.width / 2, y: node.y + node.height / 2 }
  }
}

/** Retângulo que contém todos os nós (para enquadrar o quadro na tela). */
export function canvasBounds(doc: CanvasDoc): { x: number; y: number; width: number; height: number } {
  if (!doc.nodes.length) return { x: 0, y: 0, width: 800, height: 500 }
  const minX = Math.min(...doc.nodes.map((n) => n.x))
  const minY = Math.min(...doc.nodes.map((n) => n.y))
  const maxX = Math.max(...doc.nodes.map((n) => n.x + n.width))
  const maxY = Math.max(...doc.nodes.map((n) => n.y + n.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
