import type { DocumentChange } from "./ipc"
import { normalizeFog, type FogData, type LightData, type SceneData, type TokenData, type WallData } from "./scene"
import { computeVision, decodeBits, encodeBits, fogLayout, mergeExplored, visibleCells, type SceneVision } from "./vision"
import { applyExplorationAreas, fogAreas, remembersExploration } from "./fog-areas"
import type { RegionData } from "./region"
import type { WorldDocument } from "./world"
import type { DocumentDatabase } from "./database"

export interface SceneVisionState {
  vision: SceneVision
  /** Áreas exploradas; `null` com a névoa ou a exploração desligadas. */
  fog: FogData | null
}

// Áreas mudam a névoa por área (1.9 C); o documento `fog` muda com “Revelar agora” e “Cobrir de novo”.
const VISION_TYPES = new Set(["scene", "token", "wall", "light", "region", "fog"])
const fogId = (sceneId: string) => `fog-${sceneId}`

/**
 * Visão de cada cena, calculada no processo principal. A exploração acumula
 * a cada mudança de token, parede, luz ou cena, com ou sem transmissão, e
 * fica gravada no mundo (documento `fog`, filho da cena).
 */
export class VisionService {
  private readonly cache = new Map<string, SceneVisionState>()

  constructor(private readonly database: () => DocumentDatabase | null) {}

  onDocumentChange(change: DocumentChange): void {
    if (change.kind === "delete") { this.cache.clear(); return }
    const { document } = change
    if (!VISION_TYPES.has(document.type)) return
    const sceneId = document.type === "scene" ? document.id : document.parentId
    if (!sceneId) return
    this.cache.delete(sceneId)
    this.get(sceneId)
  }

  /** Visão atual da cena (calculada na hora se preciso). */
  get(sceneId: string): SceneVisionState | null {
    const cached = this.cache.get(sceneId)
    if (cached) return cached
    const database = this.database()
    const scene = database?.get(sceneId)
    if (!database || !scene || scene.type !== "scene") return null
    const data = scene.data as SceneData
    const tokens = (database.list("token", sceneId) as WorldDocument<TokenData>[]).map((token) => ({ id: token.id, data: token.data }))
    const walls = (database.list("wall", sceneId) as WorldDocument<WallData>[]).map((wall) => wall.data)
    const lights = (database.list("light", sceneId) as WorldDocument<LightData>[]).map((light) => light.data)
    const areas = fogAreas((database.list("region", sceneId) as WorldDocument<RegionData>[]).map((region) => ({ id: region.id, data: region.data })))
    const vision = computeVision(data, tokens, walls, lights, areas)
    let fog: FogData | null = null
    if (vision.enabled && remembersExploration(data.vision.exploration, areas)) {
      const stored = database.get(fogId(sceneId))
      const before = stored ? normalizeFog(stored.data) : null
      const layout = fogLayout(data)
      const merged = mergeExplored(before, layout, visibleCells(vision, layout))
      fog = merged.fog
      let changed = merged.changed
      if (areas.length) {
        // Exploração por área: “off” esquece o que está dentro; sem exploração na cena, só as áreas com “on” lembram.
        const cells = decodeBits(fog.bits, layout.cols * layout.rows)
        applyExplorationAreas(cells, layout, data.vision.exploration, areas)
        fog = { ...fog, bits: encodeBits(cells) }
        // O que um aliado vê numa área “off” entra no merge e sai de novo: só grava se o resultado mudou.
        changed = !before || fog.bits !== before.bits || fog.cols !== before.cols || fog.rows !== before.rows || fog.cellSize !== before.cellSize
      }
      if (changed) this.writeFog(database, sceneId, fog, stored?.createdAt)
    }
    const state = { vision, fog }
    this.cache.set(sceneId, state)
    return state
  }

  /** Apaga as áreas exploradas; o que está visível agora volta a contar. */
  resetExploration(sceneId: string): void {
    const database = this.database()
    if (!database) return
    database.delete(fogId(sceneId))
    this.cache.delete(sceneId)
  }

  clear(): void {
    this.cache.clear()
  }

  private writeFog(database: DocumentDatabase, sceneId: string, fog: FogData, createdAt?: number): void {
    const now = Date.now()
    database.put({ id: fogId(sceneId), type: "fog", parentId: sceneId, sort: 0, data: fog, createdAt: createdAt ?? now, updatedAt: now })
  }
}
