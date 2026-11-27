import type { Point } from "../shared/grid"
import type { DocumentInput } from "../shared/ipc"
import type { DrawingData, TileData, WallData } from "../shared/scene"
import type { RegionData } from "../shared/region"
import type { WorldDocument } from "../shared/world"

/**
 * Redimensionar vários objetos juntos (1.9 B): a caixa em volta da seleção ganha alças nos cantos; arrastar um canto
 * estica a caixa a partir do canto oposto, e cada objeto acompanha. Paredes mudam as pontas, áreas, imagens e desenhos
 * mudam posição e tamanho; tokens, notas, luzes e sons só mudam de lugar (o tamanho deles não é do mapa).
 */

export interface Box { x: number; y: number; width: number; height: number }
export type Corner = "nw" | "ne" | "sw" | "se"
export const CORNERS: readonly Corner[] = ["nw", "ne", "sw", "se"]

/** Caixa ocupada pelo objeto, em coordenadas da cena; um ponto vira caixa de tamanho zero. */
export function documentBounds(document: WorldDocument): Box | null {
  const data = document.data as Record<string, unknown>
  if (document.type === "wall") {
    const wall = data as unknown as WallData
    return { x: Math.min(wall.x1, wall.x2), y: Math.min(wall.y1, wall.y2), width: Math.abs(wall.x2 - wall.x1), height: Math.abs(wall.y2 - wall.y1) }
  }
  if (typeof data.x !== "number" || typeof data.y !== "number") return null
  if (["region", "tile", "drawing"].includes(document.type) && typeof data.width === "number" && typeof data.height === "number") return { x: data.x, y: data.y, width: data.width, height: data.height }
  return { x: data.x, y: data.y, width: 0, height: 0 }
}

/** Caixa em volta de todos os objetos. */
export function groupBounds(documents: readonly WorldDocument[]): Box | null {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
  for (const document of documents) {
    const box = documentBounds(document)
    if (!box) continue
    left = Math.min(left, box.x); top = Math.min(top, box.y)
    right = Math.max(right, box.x + box.width); bottom = Math.max(bottom, box.y + box.height)
  }
  return Number.isFinite(left) ? { x: left, y: top, width: right - left, height: bottom - top } : null
}

export function cornerPoint(box: Box, corner: Corner): Point {
  return { x: corner.endsWith("w") ? box.x : box.x + box.width, y: corner.startsWith("n") ? box.y : box.y + box.height }
}

const OPPOSITE: Record<Corner, Corner> = { nw: "se", ne: "sw", sw: "ne", se: "nw" }

/**
 * Caixa nova ao arrastar `corner` até `point`: o canto oposto fica parado e a caixa não vira do avesso (para no mínimo
 * de 1 unidade). Um lado de tamanho zero (paredes todas retas) continua zero. `keepRatio` mantém a proporção.
 */
export function scaleBox(box: Box, corner: Corner, point: Point, keepRatio = false): Box {
  const fixed = cornerPoint(box, OPPOSITE[corner])
  const signX = corner.endsWith("w") ? -1 : 1
  const signY = corner.startsWith("n") ? -1 : 1
  let width = box.width > 0 ? Math.max(1, (point.x - fixed.x) * signX) : 0
  let height = box.height > 0 ? Math.max(1, (point.y - fixed.y) * signY) : 0
  if (keepRatio && box.width > 0 && box.height > 0) {
    const ratio = Math.max(width / box.width, height / box.height)
    width = box.width * ratio
    height = box.height * ratio
  }
  return { x: signX < 0 ? fixed.x - width : fixed.x, y: signY < 0 ? fixed.y - height : fixed.y, width, height }
}

/** Leva um ponto da caixa antiga para a nova. */
export function mapPoint(point: Point, from: Box, to: Box): Point {
  return {
    x: from.width > 0 ? to.x + (point.x - from.x) * (to.width / from.width) : point.x + (to.x - from.x),
    y: from.height > 0 ? to.y + (point.y - from.y) * (to.height / from.height) : point.y + (to.y - from.y),
  }
}

const round = (value: number) => Math.round(value * 100) / 100

/** O objeto depois de a caixa do grupo ir de `from` para `to`. */
export function scaleDocument(document: WorldDocument, from: Box, to: Box): DocumentInput {
  const base = { id: document.id, type: document.type, parentId: document.parentId }
  const sx = from.width > 0 ? to.width / from.width : 1
  const sy = from.height > 0 ? to.height / from.height : 1
  if (document.type === "wall") {
    const wall = document.data as WallData
    const a = mapPoint({ x: wall.x1, y: wall.y1 }, from, to), b = mapPoint({ x: wall.x2, y: wall.y2 }, from, to)
    return { ...base, data: { ...wall, x1: round(a.x), y1: round(a.y), x2: round(b.x), y2: round(b.y) } }
  }
  const data = document.data as Record<string, unknown>
  const corner = mapPoint({ x: data.x as number, y: data.y as number }, from, to)
  if (document.type === "region" || document.type === "tile" || document.type === "drawing") {
    const rect = data as unknown as RegionData | TileData | DrawingData
    const next: Record<string, unknown> = { ...data, x: round(corner.x), y: round(corner.y), width: round(Math.max(1, rect.width * sx)), height: round(Math.max(1, rect.height * sy)) }
    // Desenho à mão livre: os pontos são relativos ao canto e esticam junto.
    if (document.type === "drawing") next.points = (rect as DrawingData).points.map((value, index) => round(value * (index % 2 === 0 ? sx : sy)))
    return { ...base, data: next }
  }
  return { ...base, data: { ...data, x: round(corner.x), y: round(corner.y) } }
}
