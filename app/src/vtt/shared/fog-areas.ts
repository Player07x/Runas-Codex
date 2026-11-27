import type { FogData } from "./scene"
import type { FogChoice, RegionData } from "./region"
import { decodeBits, encodeBits, fillPolygon, type FogLayout, type Polygon } from "./vision"

/**
 * Névoa por área (1.9 C): uma Área com “Névoa própria” muda, só dentro dela, a névoa de guerra, a exploração, a luz
 * do dia e a escuridão da cena. Tudo é calculado onde a visão já é calculada (mestre e processo da sala); os jogadores
 * recebem só a névoa pronta e a forma das áreas que mudam o desenho.
 */
export interface FogArea {
  id: string
  polygon: Polygon
  vision: FogChoice
  exploration: FogChoice
  globalLight: FogChoice
  darkness: number | null
}

/** Contorno da área como polígono (a elipse vira 32 lados). */
export function areaPolygon(data: Pick<RegionData, "shape" | "x" | "y" | "width" | "height">): Polygon {
  if (data.shape !== "ellipse") return [data.x, data.y, data.x + data.width, data.y, data.x + data.width, data.y + data.height, data.x, data.y + data.height]
  const rx = data.width / 2, ry = data.height / 2, cx = data.x + rx, cy = data.y + ry
  const polygon: Polygon = []
  for (let index = 0; index < 32; index += 1) {
    const angle = (index / 32) * Math.PI * 2
    polygon.push(Math.round((cx + Math.cos(angle) * rx) * 10) / 10, Math.round((cy + Math.sin(angle) * ry) * 10) / 10)
  }
  return polygon
}

/** Áreas ativas com névoa própria que mudam alguma coisa, na ordem do mapa (a de cima vale nas sobreposições). */
export function fogAreas(regions: readonly { id: string; data: RegionData }[]): FogArea[] {
  return regions
    .filter(({ data }) => data.enabled && data.fog.enabled && (data.fog.vision !== "default" || data.fog.exploration !== "default" || data.fog.globalLight !== "default" || data.fog.darkness !== null))
    .map(({ id, data }) => ({ id, polygon: areaPolygon(data), vision: data.fog.vision, exploration: data.fog.exploration, globalLight: data.fog.globalLight, darkness: data.fog.darkness }))
}

/** Alguma área lembra a exploração por conta própria (então a cena guarda as áreas exploradas). */
export function remembersExploration(sceneExploration: boolean, areas: readonly FogArea[]): boolean {
  return sceneExploration || areas.some((area) => area.exploration === "on")
}

/**
 * Aplica a exploração por área nas células exploradas: “off” apaga o que está dentro; sem exploração na cena, só
 * fica o que está dentro das áreas com “on”.
 */
export function applyExplorationAreas(cells: Uint8Array, layout: FogLayout, sceneExploration: boolean, areas: readonly FogArea[]): void {
  if (!sceneExploration) {
    const keep = new Uint8Array(cells.length)
    for (const area of areas) if (area.exploration === "on") fillPolygon(keep, layout, area.polygon)
    for (let index = 0; index < cells.length; index += 1) if (!keep[index]) cells[index] = 0
  }
  for (const area of areas) if (area.exploration === "off") fillPolygon(cells, layout, area.polygon, 0)
}

/** “Revelar agora” (marca a área como explorada) ou “Cobrir de novo” (apaga a exploração dentro dela). */
export function setAreaExplored(current: FogData | null, layout: FogLayout, polygon: Polygon, explored: boolean): FogData {
  const count = layout.cols * layout.rows
  const same = current && current.cellSize === layout.cellSize && current.cols === layout.cols && current.rows === layout.rows
  const cells = same && current.bits ? decodeBits(current.bits, count) : new Uint8Array(count)
  fillPolygon(cells, layout, polygon, explored ? 1 : 0)
  return { ...layout, bits: encodeBits(cells) }
}
