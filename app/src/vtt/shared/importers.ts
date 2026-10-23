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

function base64(value: string): Uint8Array | null {
  const match = /^data:[^;,]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(value)
  if (!match || typeof atob !== "function") return null
  const raw = atob(match[1]!.replace(/\s/g, "")), bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function imageAsset(value: unknown, warnings: string[]): ImportedVttAsset | null {
  if (typeof value !== "string") return null
  const bytes = base64(value)
  if (!bytes) { if (value) warnings.push("A imagem da fonte não está embutida; importe o mapa manualmente."); return null }
  const name = value.match(/^data:image\/([a-z0-9+.-]+)/i)?.[1] ?? "png"
  return { kind: "maps", name: `mapa.${name.replace("jpeg", "jpg")}`, bytes, path: assetPath("maps", bytes, `mapa.${name}`) }
}

function document<T extends ImportedVttDocument["type"]>(type: T, parentId: string, index: number, data: unknown): ImportedVttDocument {
  return { id: id(type, index), type, parentId, sort: index, data }
}

function coordinates(value: unknown): [number, number, number, number] | null {
  if (!Array.isArray(value) || value.length < 4) return null
  const values = value.slice(0, 4).map((item) => number(item, NaN))
  return values.every(Number.isFinite) ? values as [number, number, number, number] : null
}

/** Importa o JSON Universal VTT (`.dd2vtt`/`.uvtt`) sem buscar recursos na internet. */
export function importUniversalVtt(source: string | unknown, sceneId = "cena-importada"): ImportedVtt {
  const raw = json(source), warnings: string[] = [], resolution = object(raw.resolution)
  const mapSize = Array.isArray(resolution.map_size) ? resolution.map_size : []
  const pixels = number(resolution.pixels_per_grid, 100)
  const width = number(mapSize[0], number(raw.width, 3000) * pixels), height = number(mapSize[1], number(raw.height, 2000) * pixels)
  const scene = normalizeScene({ name: string(raw.name, "Cena importada"), width, height, backgroundColor: "#1b1f2a", grid: { size: pixels }, vision: { enabled: false, globalLight: true } })
  const result: ImportedVtt = { scene: { id: sceneId, data: scene }, documents: [], assets: [], warnings }
  const image = imageAsset(raw.image, warnings)
  if (image) { result.assets.push(image); result.scene.data = { ...scene, background: image.path } }
  const lines = Array.isArray(raw.line_of_sight) ? raw.line_of_sight : []
  lines.forEach((line, index) => { const c = coordinates(line); if (c) result.documents.push(document("wall", sceneId, index, normalizeWall({ x1: c[0], y1: c[1], x2: c[2], y2: c[3], kind: "wall", open: false }))) })
  const portals = Array.isArray(raw.portals) ? raw.portals : []
  portals.forEach((portal, index) => { const value = object(portal), c = coordinates(value.bounds ?? value); if (c) result.documents.push(document("wall", sceneId, lines.length + index, normalizeWall({ x1: c[0], y1: c[1], x2: c[2], y2: c[3], kind: "door", open: value.closed !== true }))) })
  if (!lines.length && !portals.length) warnings.push("O arquivo não contém paredes ou portais; a cena foi importada sem bloqueios.")
  return result
}

function foundryDisposition(value: unknown): TokenData["disposition"] {
  return value === -1 ? "hostile" : value === 1 ? "friendly" : value === 2 ? "player" : "neutral"
}

/** Importa uma cena JSON do Foundry VTT, preservando mapa, paredes, portas, tokens e luzes. */
export function importFoundryScene(source: string | unknown, sceneId = "cena-importada"): ImportedVtt {
  const raw = json(source), warnings: string[] = [], dimensions = object(raw.dimensions), grid = object(dimensions)
  const scene = normalizeScene({ name: string(raw.name, "Cena importada"), width: number(raw.width, 3000), height: number(raw.height, 2000), backgroundColor: "#1b1f2a", grid: { size: number(grid.size, 100), type: grid.type === "hex" ? "hex-columns" : "square" } })
  const result: ImportedVtt = { scene: { id: sceneId, data: scene }, documents: [], assets: [], warnings }
  const background = object(raw.background)
  if (string(background.src)) warnings.push(`O mapa “${string(background.src)}” foi referenciado; copie o arquivo para a pasta de assets.`)
  const walls = Array.isArray(raw.walls) ? raw.walls : []
  walls.forEach((entry, index) => {
    const value = object(entry), c = coordinates(value.c)
    if (!c) return
    const door = number(value.door, 0), open = number(value.ds, 0) === 1
    result.documents.push(document("wall", sceneId, index, normalizeWall({ x1: c[0], y1: c[1], x2: c[2], y2: c[3], kind: door ? "door" : "wall", open: door ? open : false })))
  })
  const tokens = Array.isArray(raw.tokens) ? raw.tokens : []
  tokens.forEach((entry, index) => { const value = object(entry); result.documents.push(document("token", sceneId, index, normalizeToken({ name: string(value.name, `Token ${index + 1}`), x: number(value.x, 0), y: number(value.y, 0), size: Math.max(number(value.width, 1), number(value.height, 1)), image: null, hidden: value.hidden === true, disposition: foundryDisposition(value.disposition) }))) })
  const lights = Array.isArray(raw.lights) ? raw.lights : []
  lights.forEach((entry, index) => { const value = object(entry), config = object(value.config); result.documents.push(document("light", sceneId, index, normalizeLight({ x: number(value.x, 0), y: number(value.y, 0), bright: number(config.bright, 1), dim: number(config.dim, 2), color: string(config.color, "#ffffff"), alpha: number(config.alpha, 1), hidden: value.hidden === true }))) })
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
