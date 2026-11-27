import { describe, expect, it } from "vitest"
import { applyExplorationAreas, areaPolygon, fogAreas, setAreaExplored, type FogArea } from "./fog-areas"
import { normalizeRegion } from "./region"
import { normalizeScene, normalizeToken } from "./scene"
import { computeVision, decodeBits, fogLayout, isPointVisible, renderVision, visibleCells } from "./vision"
import { VisionService } from "./vision-service"
import type { DocumentDatabase } from "./database"
import type { WorldDocument } from "./world"

const square = (x: number, y: number, size: number) => areaPolygon({ shape: "rectangle", x, y, width: size, height: size })
const area = (patch: Partial<FogArea>): FogArea => ({ id: "a", polygon: square(600, 0, 400), vision: "default", exploration: "default", globalLight: "default", darkness: null, ...patch })
const viewer = { id: "heroi", data: normalizeToken({ x: 100, y: 100, disposition: "player", vision: { enabled: true } }) }
const scene = (vision: object) => normalizeScene({ name: "S", width: 1000, height: 1000, vision })

describe("névoa por área (1.9 C)", () => {
  it("usa só as áreas ativas com névoa própria que mudam alguma coisa", () => {
    const regions = [
      { id: "1", data: normalizeRegion({ fog: { enabled: true, vision: "off" } }) },
      { id: "2", data: normalizeRegion({ fog: { enabled: true } }) },
      { id: "3", data: normalizeRegion({ enabled: false, fog: { enabled: true, darkness: 0.5 } }) },
      { id: "4", data: normalizeRegion({ shape: "ellipse", fog: { enabled: true, darkness: 0.2 } }) },
    ]
    expect(fogAreas(regions).map((item) => item.id)).toEqual(["1", "4"])
    expect(fogAreas(regions)[1]!.polygon).toHaveLength(64)
    expect(normalizeRegion({}).fog).toEqual({ enabled: false, vision: "default", exploration: "default", globalLight: "default", darkness: null })
  })

  it("área sem névoa fica sempre à vista; área com névoa cobre mesmo com a névoa da cena desligada", () => {
    const hidden = { x: 800, y: 200 }
    const covered = computeVision(scene({ enabled: true, globalLight: true }), [], [], [], [area({ vision: "off" })])
    expect(isPointVisible(covered, hidden)).toBe(true)
    expect(isPointVisible(covered, { x: 300, y: 800 })).toBe(false)
    const open = computeVision(scene({ enabled: false, globalLight: true }), [], [], [], [area({ vision: "on" })])
    expect(open.enabled).toBe(true)
    expect(isPointVisible(open, hidden)).toBe(false)
    expect(isPointVisible(open, { x: 300, y: 800 })).toBe(true)
  })

  it("luz do dia por área acende ou apaga a linha de visão dali", () => {
    const night = computeVision(scene({ enabled: true, globalLight: false }), [viewer], [], [], [area({ globalLight: "on" })])
    expect(isPointVisible(night, { x: 800, y: 200 })).toBe(true)
    expect(isPointVisible(night, { x: 300, y: 300 })).toBe(false)
    const day = computeVision(scene({ enabled: true, globalLight: true }), [viewer], [], [], [area({ globalLight: "off" })])
    expect(isPointVisible(day, { x: 800, y: 200 })).toBe(false)
    expect(isPointVisible(day, { x: 300, y: 300 })).toBe(true)
    const layout = fogLayout(scene({}))
    const cells = visibleCells(day, layout)
    const at = (x: number, y: number) => cells[Math.floor(y / layout.cellSize) * layout.cols + Math.floor(x / layout.cellSize)]
    expect([at(800, 200), at(300, 300)]).toEqual([0, 1])
  })

  it("manda aos jogadores só a forma e o que muda, e a escuridão própria", () => {
    const vision = computeVision(scene({ enabled: true }), [viewer], [], [], [area({ vision: "off", darkness: 0.9 }), area({ id: "b", exploration: "off" })])
    const render = renderVision(vision, null, true)
    expect(render.darkAreas).toEqual([{ polygon: square(600, 0, 400), darkness: 0.9 }])
    expect(render.fog?.areas).toEqual([{ polygon: square(600, 0, 400), vision: "off", globalLight: "default" }])
    expect(JSON.stringify(render)).not.toContain("exploration")
  })

  it("exploração por área: “off” esquece, e sem exploração na cena só as áreas com “on” lembram", () => {
    const layout = { cellSize: 100, cols: 10, rows: 10 }
    const cells = new Uint8Array(100).fill(1)
    applyExplorationAreas(cells, layout, true, [area({ exploration: "off" })])
    expect(cells[6]).toBe(0)
    expect(cells[0]).toBe(1)
    const only = new Uint8Array(100).fill(1)
    applyExplorationAreas(only, layout, false, [area({ exploration: "on" })])
    expect(only.reduce((sum, value) => sum + value, 0)).toBe(16)
  })

  it("Revelar agora marca a área como explorada e Cobrir de novo apaga", () => {
    const layout = { cellSize: 100, cols: 10, rows: 10 }
    const revealed = setAreaExplored(null, layout, square(0, 0, 200), true)
    expect(decodeBits(revealed.bits, 100).reduce((sum, value) => sum + value, 0)).toBe(4)
    const covered = setAreaExplored(revealed, layout, square(0, 0, 100), false)
    expect(decodeBits(covered.bits, 100).reduce((sum, value) => sum + value, 0)).toBe(3)
  })

  it("não regrava a névoa explorada quando um aliado vê dentro de uma área que não lembra", () => {
    const documents = new Map<string, WorldDocument>()
    let writes = 0
    const database: DocumentDatabase = {
      get: (id) => documents.get(id) ?? null,
      list: (type, parentId) => [...documents.values()].filter((document) => document.type === type && (parentId === undefined || document.parentId === parentId)),
      put: (document) => { if (document.type === "fog") writes += 1; documents.set(document.id, document) },
      delete: (id) => { documents.delete(id) },
      descendantIds: () => [],
    }
    const add = (id: string, type: WorldDocument["type"], parentId: string | null, data: unknown) => documents.set(id, { id, type, parentId, sort: 0, data, createdAt: 1, updatedAt: 1 } as WorldDocument)
    add("s", "scene", null, scene({ enabled: true, exploration: true, globalLight: true }))
    add("heroi", "token", "s", viewer.data)
    // O herói enxerga dentro da área com a exploração desligada.
    add("a", "region", "s", normalizeRegion({ x: 0, y: 0, width: 400, height: 400, fog: { enabled: true, exploration: "off" } }))
    const service = new VisionService(() => database)
    service.get("s")
    expect(writes).toBe(1)
    for (let index = 0; index < 3; index += 1) { service.clear(); service.get("s") }
    expect(writes).toBe(1)
  })
})
