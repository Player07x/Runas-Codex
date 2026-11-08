/**
 * Conta dos pinos e das áreas do mapa (U18, U20). Os pontos ficam como no bloco `runas-mapa`: frações da largura e da
 * altura da imagem, de 0 a 1. Só a conta; a tela fica em `MapCanvas`.
 */
export interface MapPoint { x: number; y: number }

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const round = (n: number) => Math.round(n * 10_000) / 10_000

/** Retângulo entre dois cantos quaisquer (de cima à esquerda, no sentido do relógio). */
export function rectPolygon(a: MapPoint, b: MapPoint): MapPoint[] {
  const [x1, x2] = [Math.min(a.x, b.x), Math.max(a.x, b.x)].map(clamp01) as [number, number]
  const [y1, y2] = [Math.min(a.y, b.y), Math.max(a.y, b.y)].map(clamp01) as [number, number]
  return [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x2, y: y2 }, { x: x1, y: y2 }].map((p) => ({ x: round(p.x), y: round(p.y) }))
}

/** Elipse dentro do retângulo entre dois cantos, como polígono de `sides` lados (dá para editar os vértices depois). */
export function ellipsePolygon(a: MapPoint, b: MapPoint, sides = 24): MapPoint[] {
  const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, rx = Math.abs(b.x - a.x) / 2, ry = Math.abs(b.y - a.y) / 2
  return Array.from({ length: sides }, (_, i) => {
    const t = (i / sides) * Math.PI * 2 - Math.PI / 2
    return { x: round(clamp01(cx + rx * Math.cos(t))), y: round(clamp01(cy + ry * Math.sin(t))) }
  })
}

/** Ponto novo depois do vértice `after` (a alça do meio da aresta vira vértice). */
export function insertVertex(points: MapPoint[], after: number, point: MapPoint = midpoint(points, after)): MapPoint[] {
  return [...points.slice(0, after + 1), { x: round(clamp01(point.x)), y: round(clamp01(point.y)) }, ...points.slice(after + 1)]
}

/** O meio da aresta que sai do vértice `i` (a última aresta fecha no primeiro). */
export function midpoint(points: MapPoint[], i: number): MapPoint {
  const a = points[i]!, b = points[(i + 1) % points.length]!
  return { x: round((a.x + b.x) / 2), y: round((a.y + b.y) / 2) }
}

/** Tira um vértice sem deixar a forma com menos de `min` pontos (3 na área, 2 na rota). */
export function removeVertex(points: MapPoint[], i: number, min = 3): MapPoint[] {
  return points.length <= min ? points : points.filter((_, n) => n !== i)
}

/** Arrasta a forma inteira; para na borda da imagem sem deformar. */
export function translatePoints(points: MapPoint[], dx: number, dy: number): MapPoint[] {
  if (!points.length) return points
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y)
  const sx = Math.min(1 - Math.max(...xs), Math.max(-Math.min(...xs), dx))
  const sy = Math.min(1 - Math.max(...ys), Math.max(-Math.min(...ys), dy))
  return points.map((p) => ({ x: round(p.x + sx), y: round(p.y + sy) }))
}

/** Move um ponto pelas setas: `step` é a fração (0,005 = 0,5 %), sem sair da imagem. */
export function nudgePoint(point: MapPoint, dx: number, dy: number, step = 0.005): MapPoint {
  return { x: round(clamp01(point.x + dx * step)), y: round(clamp01(point.y + dy * step)) }
}

/** O ponto está dentro do polígono (regra par-ímpar)? Para escolher a área com um toque. */
export function pointInPolygon(point: MapPoint, polygon: MapPoint[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!, b = polygon[j]!
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export type Direction = "up" | "down" | "left" | "right"

/**
 * Para onde a seta leva a partir do pino `from`: o mais perto naquela direção (dentro de um cone de 45° para cada
 * lado; perto do eixo pesa mais). Sem nenhum, fica onde está.
 */
export function nearestInDirection(points: MapPoint[], from: number, direction: Direction): number {
  const origin = points[from]
  if (!origin) return from
  let best = from, score = Infinity
  for (const [i, p] of points.entries()) {
    if (i === from) continue
    const dx = p.x - origin.x, dy = p.y - origin.y
    const along = direction === "right" ? dx : direction === "left" ? -dx : direction === "down" ? dy : -dy
    const across = Math.abs(direction === "left" || direction === "right" ? dy : dx)
    if (along <= 0 || across > along) continue
    const s = along + across * 2
    if (s < score) { score = s; best = i }
  }
  return best
}

/** Limites da forma (para pôr o popover ao lado e centralizar a vista). */
export function bounds(points: MapPoint[]): { x: number; y: number; w: number; h: number } {
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y)
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, w: round(Math.max(...xs) - x), h: round(Math.max(...ys) - y) }
}
