import { describe, expect, it } from "vitest"
import { applyExplorationAreas, areaPolygon, fogAreas, setAreaExplored, type FogArea } from "./fog-areas"
import { normalizeRegion } from "./region"
import { normalizeScene, normalizeToken } from "./scene"
import { computeVision, decodeBits, fogLayout, isPointVisible, renderVision, visibleCells } from "./vision"

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
})
