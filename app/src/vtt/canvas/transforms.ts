import type { Point } from "../shared/grid"
import type { DocumentInput } from "../shared/ipc"
import type { LightData, TileData, TokenData } from "../shared/scene"
import type { WorldDocument } from "../shared/world"

export type TransformHandle = "size" | "rotation" | "bright" | "dim"
export function transformCenter(document: WorldDocument): Point {
  const data = document.data as TokenData | TileData | LightData
  return document.type === "tile" ? { x: data.x + (data as TileData).width / 2, y: data.y + (data as TileData).height / 2 } : { x: data.x, y: data.y }
}
/** Alças preservam centro e proporção. O resultado só é gravado ao soltar. */
export function transformObject(document: WorldDocument, handle: TransformHandle, origin: Point, point: Point, cell: number, free: boolean): DocumentInput {
  const center = transformCenter(document)
  const data = document.data as TokenData | TileData | LightData
  let patch: object = {}
  const distance = Math.hypot(point.x - center.x, point.y - center.y)
  const initial = Math.max(1, Math.hypot(origin.x - center.x, origin.y - center.y))
  if (handle === "rotation" && (document.type === "token" || document.type === "tile")) {
    const delta = (Math.atan2(point.y - center.y, point.x - center.x) - Math.atan2(origin.y - center.y, origin.x - center.x)) * 180 / Math.PI
    const rotation = (data as TokenData | TileData).rotation + delta
    patch = { rotation: ((free ? rotation : Math.round(rotation / 15) * 15) % 360 + 360) % 360 }
  } else if (document.type === "token") {
    const size = Math.max(0.5, Math.min(20, (data as TokenData).size * distance / initial))
    patch = { size: free ? size : Math.round(size * 2) / 2 }
  } else if (document.type === "tile") {
    const before = data as TileData
    const ratio = Math.max(0.02, Math.min(100, distance / initial))
    const width = Math.max(1, before.width * ratio), height = Math.max(1, before.height * ratio)
    patch = { width, height, x: center.x - width / 2, y: center.y - height / 2 }
  } else if (document.type === "light") {
    const before = data as LightData
    let radius = Math.max(0, Math.min(1000, before[handle === "bright" ? "bright" : "dim"] + (distance - initial) / cell))
    if (!free) radius = Math.round(radius * 2) / 2
    patch = handle === "bright" ? { bright: radius, dim: Math.max(radius, before.dim) } : { dim: radius, bright: Math.min(radius, before.bright) }
  }
  return { id: document.id, type: document.type, parentId: document.parentId, data: { ...data, ...patch } }
}
