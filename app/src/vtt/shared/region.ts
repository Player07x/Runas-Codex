import { cellDistance, measure, type GridConfig, type Point } from "./grid"

/**
 * Regiões simples (Fase 8): áreas do mapa com comportamentos que disparam
 * quando um token entra (teleporte, texto) e terreno difícil, que a régua
 * conta. Os gatilhos rodam no processo principal.
 */

export const REGION_SHAPES = ["rectangle", "ellipse"] as const
export type RegionShape = (typeof REGION_SHAPES)[number]

export const REGION_TRIGGERS = ["friendly", "any"] as const
export type RegionTrigger = (typeof REGION_TRIGGERS)[number]

/** Opção de névoa da área (1.9 C): a da cena (“Usar padrão”), ligada ou desligada só aqui. */
export const FOG_CHOICES = ["default", "on", "off"] as const
export type FogChoice = (typeof FOG_CHOICES)[number]

/** Névoa por área: o que muda dentro dela em relação à cena. */
export interface RegionFog {
  enabled: boolean
  /** Névoa de guerra: “off” deixa a área sempre à vista; “on” cobre a área mesmo com a névoa da cena desligada. */
  vision: FogChoice
  /** Lembrar as áreas exploradas aqui dentro. */
  exploration: FogChoice
  /** Luz do dia: a linha de visão dentro da área está iluminada? */
  globalLight: FogChoice
  /** Escuridão própria (0 a 1); `null` usa a da cena. */
  darkness: number | null
}

export interface RegionData {
  name: string
  shape: RegionShape
  x: number
  y: number
  width: number
  height: number
  color: string
  /** Os jogadores veem a área (e a régua deles conta o terreno difícil). */
  visible: boolean
  /** Desativada: nenhum comportamento dispara, mas a região continua no mapa. */
  enabled: boolean
  /** Quem dispara teleporte e texto: só aliados ou qualquer token. */
  trigger: RegionTrigger
  teleport: { enabled: boolean; sceneId: string | null; regionId: string | null }
  text: { enabled: boolean; message: string; once: boolean }
  terrain: { enabled: boolean; multiplier: number }
  fog: RegionFog
  locked: boolean
}

/** O que os jogadores recebem de uma região visível: só a forma e o terreno. */
export interface PlayerRegion {
  id: string
  shape: RegionShape
  x: number
  y: number
  width: number
  height: number
  color: string
  /** Multiplicador do terreno difícil; 1 sem terreno. */
  terrain: number
}

type Raw = Record<string, unknown>
const record = (value: unknown): Raw => (value && typeof value === "object" && !Array.isArray(value) ? value as Raw : {})
const num = (value: unknown, fallback: number, min: number, max: number) => (typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback)
const str = (value: unknown, fallback: string, max: number) => (typeof value === "string" ? value.slice(0, max) : fallback)
const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback)
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T => (typeof value === "string" && (options as readonly string[]).includes(value) ? value as T : fallback)
const id = (value: unknown) => (typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null)

export function normalizeRegion(value: unknown): RegionData {
  const raw = record(value)
  const teleport = record(raw.teleport)
  const text = record(raw.text)
  const terrain = record(raw.terrain)
  const fog = record(raw.fog)
  return {
    name: str(raw.name, "Região", 80).trim() || "Região",
    shape: oneOf(raw.shape, REGION_SHAPES, "rectangle"),
    x: num(raw.x, 0, -1e6, 1e6),
    y: num(raw.y, 0, -1e6, 1e6),
    width: num(raw.width, 200, 1, 20000),
    height: num(raw.height, 200, 1, 20000),
    color: typeof raw.color === "string" && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color.toLowerCase() : "#927f9c",
    visible: bool(raw.visible, false),
    enabled: bool(raw.enabled, true),
    trigger: oneOf(raw.trigger, REGION_TRIGGERS, "friendly"),
    teleport: { enabled: bool(teleport.enabled, false), sceneId: id(teleport.sceneId), regionId: id(teleport.regionId) },
    text: { enabled: bool(text.enabled, false), message: str(text.message, "", 280), once: bool(text.once, false) },
    terrain: { enabled: bool(terrain.enabled, false), multiplier: num(terrain.multiplier, 2, 1, 10) },
    fog: {
      enabled: bool(fog.enabled, false),
      vision: oneOf(fog.vision, FOG_CHOICES, "default"),
      exploration: oneOf(fog.exploration, FOG_CHOICES, "default"),
      globalLight: oneOf(fog.globalLight, FOG_CHOICES, "default"),
      darkness: typeof fog.darkness === "number" && Number.isFinite(fog.darkness) ? Math.min(1, Math.max(0, fog.darkness)) : null,
    },
    locked: bool(raw.locked, false),
  }
}

type Shape = Pick<RegionData, "shape" | "x" | "y" | "width" | "height">

export function regionContains(region: Shape, point: Point): boolean {
  if (region.shape === "ellipse") {
    const rx = region.width / 2
    const ry = region.height / 2
    const dx = (point.x - (region.x + rx)) / rx
    const dy = (point.y - (region.y + ry)) / ry
    return dx * dx + dy * dy <= 1
  }
  return point.x >= region.x && point.x <= region.x + region.width && point.y >= region.y && point.y <= region.y + region.height
}

export function regionCenter(region: Shape): Point {
  return { x: region.x + region.width / 2, y: region.y + region.height / 2 }
}

/** Quem dispara a região: aliados, ou qualquer token. */
export function triggersRegion(region: Pick<RegionData, "trigger">, disposition: string): boolean {
  return region.trigger === "any" || disposition === "player" || disposition === "friendly"
}

const SAMPLES = 64

/**
 * Distância da régua contando terreno difícil: o trecho dentro de uma região
 * de terreno custa o multiplicador dela (a maior, se houver sobreposição).
 */
export function measureWithTerrain(from: Point, to: Point, grid: GridConfig, terrain: readonly (Shape & { multiplier: number })[]): { distance: number; cells: number; difficult: boolean } {
  const distance = measure(from, to, grid)
  const cells = cellDistance(from, to, grid)
  const active = terrain.filter((region) => region.multiplier > 1)
  if (!active.length || (from.x === to.x && from.y === to.y)) return { distance, cells, difficult: false }
  let factor = 0
  for (let index = 0; index < SAMPLES; index += 1) {
    const t = (index + 0.5) / SAMPLES
    const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
    let multiplier = 1
    for (const region of active) if (regionContains(region, point)) multiplier = Math.max(multiplier, region.multiplier)
    factor += multiplier
  }
  factor /= SAMPLES
  const round = (value: number) => Math.round(value * 100) / 100
  return { distance: round(distance * factor), cells: round(cells * factor), difficult: factor > 1.0001 }
}
