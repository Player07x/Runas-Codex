import { sha256 } from "@noble/hashes/sha256"
import { bytesToHex } from "@noble/hashes/utils"
import { normalizeLight, normalizeScene, normalizeToken, normalizeWall, type SceneData, type TokenData } from "./scene"
import type { DocumentType } from "./world"

export interface ImportedVttAsset { kind: "maps" | "tokens"; name: string; bytes: Uint8Array; path: string }
export interface ImportedVttDocument { id: string; type: Exclude<DocumentType, "scene">; parentId: string; sort: number; data: unknown }
export interface ImportedVtt { scene: { id: string; data: SceneData }; documents: ImportedVttDocument[]; assets: ImportedVttAsset[]; warnings: string[] }

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const number = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback
const string = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback
const id = (prefix: string, index: number) => `${prefix}-${index + 1}`
const assetPath = (kind: "maps" | "tokens", bytes: Uint8Array, name: string) => `${kind}/${bytesToHex(sha256(bytes))}.${name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin"}`

function json(value: string | unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? JSON.parse(value) as unknown : value
  const result = object(parsed)
  if (!Object.keys(result).length) throw new Error("O arquivo da mesa não contém um objeto JSON.")
  return result
}

/** Bytes de uma imagem em `data:…;base64,` ou em base64 puro (o `.dd2vtt` grava assim), com a extensão pelo conteúdo. */
function decodeImage(value: string): { bytes: Uint8Array; extension: string } | null {
  const data = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(value)
  const raw = data ? data[2]! : value.length >= 16 && /^[A-Za-z0-9+/=\s]+$/.test(value) ? value : null
  if (!raw || typeof atob !== "function") return null
  let text: string
  try { text = atob(raw.replace(/\s/g, "")) } catch { return null }
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i)
  const magic = (offset: number, ...values: number[]) => values.every((byte, i) => bytes[offset + i] === byte)
  const extension = magic(0, 0x89, 0x50, 0x4e, 0x47) ? "png" : magic(0, 0xff, 0xd8) ? "jpg" : magic(0, 0x52, 0x49, 0x46, 0x46) && magic(8, 0x57, 0x45, 0x42, 0x50) ? "webp"
    : (data?.[1]?.split("/")[1] ?? "png").replace("jpeg", "jpg")
  return { bytes, extension }
}

function imageAsset(value: unknown, warnings: string[]): ImportedVttAsset | null {
  if (typeof value !== "string") return null
  const image = decodeImage(value)
  if (!image) { if (value) warnings.push("A imagem da fonte não está embutida; importe o mapa manualmente."); return null }
  const name = `mapa.${image.extension}`
  return { kind: "maps", name, bytes: image.bytes, path: assetPath("maps", image.bytes, name) }
}

function document<T extends ImportedVttDocument["type"]>(type: T, parentId: string, index: number, data: unknown): ImportedVttDocument {
  return { id: id(type, index), type, parentId, sort: index, data }
}

function coordinates(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length < 4) return null
  const values = value.slice(0, 4).map((item) => number(item, NaN))
  return values.every(Number.isFinite) ? values as [number, number, number, number] : null
}

type Point = [number, number]

/** Segmentos de uma linha de visão: `[x1, y1, x2, y2]` em pixels ou uma lista de pontos `{x, y}` em células. */
function segments(value: unknown, toPixels: (point: unknown) => Point | null): [number, number, number, number][] {
  const legacy = coordinates(value)
  if (legacy) return [legacy]
  if (!Array.isArray(value)) return []
  const points = value.map(toPixels).filter((point): point is Point => point !== null)
  const result: [number, number, number, number][] = []
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1]!, [x2, y2] = points[i]!
    if (x1 !== x2 || y1 !== y2) result.push([x1, y1, x2, y2])
  }
  return result
}

/** Cor `AARRGGBB` do Dungeondraft (ou `#RRGGBB`) em `#RRGGBB`. */
function hexColor(value: unknown, fallback: string): string {
  const hex = string(value).replace(/^#/, "")
  return /^[0-9a-f]{8}$/i.test(hex) ? `#${hex.slice(2)}` : /^[0-9a-f]{6}$/i.test(hex) ? `#${hex}` : fallback
}

/**
 * Importa o JSON Universal VTT (`.dd2vtt`/`.uvtt`/`.df2vtt`) sem buscar recursos na internet. No formato real
 * (Dungeondraft, DungeonFog) `map_size`, paredes, portas e luzes vêm em células, a partir de `map_origin`, e a imagem
 * em base64 puro; `map_size` em lista e paredes `[x1, y1, x2, y2]` em pixels também são aceitos.
 */
export function importUniversalVtt(source: string | unknown, sceneId = "cena-importada"): ImportedVtt {
  const raw = json(source), warnings: string[] = [], resolution = object(raw.resolution)
  const pixels = number(resolution.pixels_per_grid, 100)
  const origin = object(resolution.map_origin), ox = number(origin.x, 0), oy = number(origin.y, 0)
  const toPixels = (value: unknown): Point | null => {
    const point = object(value), x = number(point.x, NaN), y = number(point.y, NaN)
    return Number.isFinite(x) && Number.isFinite(y) ? [(x - ox) * pixels, (y - oy) * pixels] : null
  }
  const mapSize = resolution.map_size
  const [width, height] = Array.isArray(mapSize)
    ? [number(mapSize[0], 3000), number(mapSize[1], 2000)]
    : [number(object(mapSize).x, number(raw.width, 30)) * pixels, number(object(mapSize).y, number(raw.height, 20)) * pixels]
  const scene = normalizeScene({ name: string(raw.name, "Cena importada"), width, height, backgroundColor: "#1b1f2a", grid: { size: pixels }, vision: { enabled: false, globalLight: true } })
  const result: ImportedVtt = { scene: { id: sceneId, data: scene }, documents: [], assets: [], warnings }
  const image = imageAsset(raw.image, warnings)
  if (image) { result.assets.push(image); result.scene.data = { ...scene, background: image.path } }
  let index = 0
  const lines = [...(Array.isArray(raw.line_of_sight) ? raw.line_of_sight : []), ...(Array.isArray(raw.objects_line_of_sight) ? raw.objects_line_of_sight : [])]
  for (const line of lines) {
    for (const c of segments(line, toPixels)) result.documents.push(document("wall", sceneId, index++, normalizeWall({ x1: c[0], y1: c[1], x2: c[2], y2: c[3], kind: "wall", open: false })))
  }
  const portals = Array.isArray(raw.portals) ? raw.portals : []
  for (const portal of portals) {
    const value = object(portal)
    const bounds = Array.isArray(value.bounds) && !coordinates(value.bounds) ? segments(value.bounds.slice(0, 2), toPixels)[0] : coordinates(value.bounds ?? value)
    if (bounds) result.documents.push(document("wall", sceneId, index++, normalizeWall({ x1: bounds[0], y1: bounds[1], x2: bounds[2], y2: bounds[3], kind: "door", open: value.closed !== true })))
  }
  if (!index) warnings.push("O arquivo não contém paredes ou portais; a cena foi importada sem bloqueios.")
  const lights = Array.isArray(raw.lights) ? raw.lights : []
  for (const entry of lights) {
    const value = object(entry), position = toPixels(value.position)
    if (!position) continue
    const range = number(value.range, 4)
    result.documents.push(document("light", sceneId, index++, normalizeLight({ x: position[0], y: position[1], bright: range / 2, dim: range, color: hexColor(value.color, "#ffd58a") })))
  }
  return result
}

function foundryDisposition(value: unknown): TokenData["disposition"] {
  return value === -1 ? "hostile" : value === 1 ? "friendly" : value === 2 ? "player" : "neutral"
}

/** Tipo de grade do Foundry (`grid.type` ou `gridType`): 0 sem grade, 1 quadrada, 2–3 hexágonos em fileiras, 4–5 em colunas. */
function foundryGridType(value: unknown): "square" | "hex-rows" | "hex-cols" | "none" {
  if (value === 0) return "none"
  if (value === 2 || value === 3) return "hex-rows"
  if (value === 4 || value === 5 || value === "hex") return "hex-cols"
  return "square"
}

/**
 * Importa uma cena JSON do Foundry VTT (“Exportar dados”, v9 a v12), preservando grade, paredes, portas, tokens e
 * luzes. O Foundry guarda as posições com a margem da cena (`padding`); aqui elas voltam para o canto do mapa, os
 * tokens ficam pelo centro e os raios das luzes passam de unidades (pés, metros) para células.
 */
export function importFoundryScene(source: string | unknown, sceneId = "cena-importada"): ImportedVtt {
  const raw = json(source), warnings: string[] = [], grid = object(raw.grid), dimensions = object(raw.dimensions)
  const size = number(grid.size, number(raw.grid, number(dimensions.size, 100)))
  const distance = number(grid.distance, number(raw.gridDistance, 5))
  const units = string(grid.units, string(raw.gridUnits, "m"))
  const width = number(raw.width, 3000), height = number(raw.height, 2000)
  const padding = number(raw.padding, 0)
  const padX = number(dimensions.sceneX, Math.ceil((width * padding) / size) * size)
  const padY = number(dimensions.sceneY, Math.ceil((height * padding) / size) * size)
  const scene = normalizeScene({ name: string(raw.name, "Cena importada"), width, height, backgroundColor: string(raw.backgroundColor, "#1b1f2a"), grid: { size, type: foundryGridType(grid.type ?? raw.gridType), distance, units } })
  const result: ImportedVtt = { scene: { id: sceneId, data: scene }, documents: [], assets: [], warnings }
  const background = string(object(raw.background).src, string(raw.img))
  if (background) warnings.push(`O mapa “${background}” foi referenciado; escolha a imagem depois em Trocar mapa.`)
  let index = 0
  const walls = Array.isArray(raw.walls) ? raw.walls : []
  for (const entry of walls) {
    const value = object(entry), c = coordinates(value.c)
    if (!c) continue
    const door = number(value.door, 0), open = number(value.ds, 0) === 1
    result.documents.push(document("wall", sceneId, index++, normalizeWall({ x1: c[0] - padX, y1: c[1] - padY, x2: c[2] - padX, y2: c[3] - padY, kind: door === 2 ? "secret" : door ? "door" : "wall", open: door ? open : false })))
  }
  const tokens = Array.isArray(raw.tokens) ? raw.tokens : []
  let withImage = 0
  tokens.forEach((entry, i) => {
    const value = object(entry), cells = Math.max(number(value.width, 1), number(value.height, 1))
    if (string(object(value.texture).src, string(value.img))) withImage++
    result.documents.push(document("token", sceneId, index++, normalizeToken({ name: string(value.name, `Token ${i + 1}`), x: number(value.x, 0) - padX + (cells * size) / 2, y: number(value.y, 0) - padY + (cells * size) / 2, size: cells, image: null, hidden: value.hidden === true, disposition: foundryDisposition(value.disposition) })))
  })
  if (withImage) warnings.push(`${withImage} ${withImage === 1 ? "token tem imagem" : "tokens têm imagem"} no Foundry; escolha as imagens depois na mesa.`)
  const lights = Array.isArray(raw.lights) ? raw.lights : []
  for (const entry of lights) {
    const value = object(entry), config = object(value.config)
    const cells = (amount: number) => (distance > 0 ? amount / distance : amount)
    result.documents.push(document("light", sceneId, index++, normalizeLight({ x: number(value.x, 0) - padX, y: number(value.y, 0) - padY, bright: cells(number(config.bright, number(value.bright, 1))), dim: cells(number(config.dim, number(value.dim, 2))), color: string(config.color, string(value.tintColor)) || "#ffffff", alpha: number(config.alpha, number(value.tintAlpha, 0.35)), hidden: value.hidden === true })))
  }
  return result
}

/** Converte uma lista JSON de tokens em documentos prontos para inserção em uma cena. */
export function importBatchTokens(source: string | unknown, sceneId: string): ImportedVttDocument[] {
  const parsed = typeof source === "string" ? JSON.parse(source) as unknown : source
  const values: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(object(parsed).tokens) ? object(parsed).tokens as unknown[] : []
  if (!values.length) throw new Error("A lista de tokens está vazia.")
  return values.slice(0, 500).map((entry, index) => {
    const value = object(entry)
    return document("token", sceneId, index, normalizeToken({ name: string(value.name, `Token ${index + 1}`), x: number(value.x, 0), y: number(value.y, 0), size: number(value.size, 1), hidden: value.hidden === true, disposition: foundryDisposition(value.disposition) }))
  })
}
