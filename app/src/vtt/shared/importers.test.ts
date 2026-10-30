import { describe, expect, it } from "vitest"
import { importBatchTokens, importFoundryScene, importUniversalVtt } from "./importers"

describe("importadores de mesas", () => {
  it("importa Universal VTT com mapa embutido, grade, paredes e porta", () => {
    const source = { name: "Masmorra", resolution: { map_size: [800, 600], pixels_per_grid: 100 }, image: "data:image/png;base64,aGk=", line_of_sight: [[0, 0, 100, 0]], portals: [{ bounds: [100, 0, 200, 0], closed: false }] }
    const result = importUniversalVtt(source)
    expect(result.scene.data.background).toMatch(/^maps\/[a-f0-9]{64}\.png$/)
    expect(result.documents.map((item) => item.type)).toEqual(["wall", "wall"])
    expect((result.documents[1]!.data as { kind: string; open: boolean })).toMatchObject({ kind: "door", open: true })
    expect(result.assets).toHaveLength(1)
  })

  it("importa cena Foundry com porta, token e luz", () => {
    const result = importFoundryScene({ name: "Sala", width: 1200, height: 800, dimensions: { size: 50 }, walls: [{ c: [0, 0, 100, 0], door: 1, ds: 1 }], tokens: [{ name: "Lia", x: 50, y: 60, disposition: 1 }], lights: [{ x: 100, y: 100, config: { bright: 2, dim: 4 } }] })
    expect(result.scene.data.grid.size).toBe(50)
    expect(result.documents.map((item) => item.type)).toEqual(["wall", "token", "light"])
    expect(result.documents[1]!.data).toMatchObject({ name: "Lia", disposition: "friendly" })
  })

  it("importa tokens em lote e limita a lista", () => {
    const result = importBatchTokens([{ name: "A", disposition: -1 }, { name: "B", disposition: 2 }], "cena")
    expect(result).toHaveLength(2)
    expect(result[0]!.data).toMatchObject({ name: "A", disposition: "hostile" })
    expect(result[1]!.data).toMatchObject({ name: "B", disposition: "player" })
  })

  it("lê o .dd2vtt do Dungeondraft: células a partir da origem, polilinhas, imagem em base64 puro e luzes", () => {
    const png = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0))
    const result = importUniversalVtt({
      format: 0.3,
      resolution: { map_origin: { x: 1, y: 1 }, map_size: { x: 10, y: 8 }, pixels_per_grid: 50 },
      line_of_sight: [[{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }]],
      portals: [{ position: { x: 3.5, y: 3 }, bounds: [{ x: 3, y: 3 }, { x: 4, y: 3 }], rotation: 0, closed: true, freestanding: false }],
      lights: [{ position: { x: 2, y: 2 }, range: 6, intensity: 1, color: "ffeccd8b", shadows: true }],
      image: png,
    })
    expect(result.scene.data).toMatchObject({ width: 500, height: 400 })
    expect(result.scene.data.grid.size).toBe(50)
    expect(result.scene.data.background).toMatch(/^maps\/[a-f0-9]{64}\.png$/)
    expect(result.documents.map((item) => [item.type, item.data])).toEqual([
      ["wall", expect.objectContaining({ x1: 0, y1: 0, x2: 100, y2: 0, kind: "wall" })],
      ["wall", expect.objectContaining({ x1: 100, y1: 0, x2: 100, y2: 100, kind: "wall" })],
      ["wall", expect.objectContaining({ x1: 100, y1: 100, x2: 150, y2: 100, kind: "door", open: false })],
      ["light", expect.objectContaining({ x: 50, y: 50, bright: 3, dim: 6, color: "#eccd8b" })],
    ])
    expect(new Set(result.documents.map((item) => item.id)).size).toBe(4)
    expect(result.warnings).toEqual([])
  })

  it("lê a cena exportada do Foundry v11: grade, margem, porta secreta, token pelo centro e luz em células", () => {
    const result = importFoundryScene({
      name: "Cripta", width: 2000, height: 1000, padding: 0.25,
      grid: { size: 100, type: 1, distance: 5, units: "ft" },
      background: { src: "worlds/mesa/cripta.webp" },
      walls: [{ c: [500, 300, 700, 300], door: 2, ds: 0 }],
      tokens: [{ name: "Lia", x: 600, y: 400, width: 2, height: 2, texture: { src: "tokens/lia.png" }, disposition: 1 }],
      lights: [{ x: 600, y: 300, config: { bright: 10, dim: 20, color: "#ff8800", alpha: 0.5 } }],
    })
    expect(result.scene.data.grid).toMatchObject({ size: 100, type: "square", distance: 5, units: "ft" })
    expect(result.documents[0]!.data).toMatchObject({ x1: 0, y1: 0, x2: 200, y2: 0, kind: "secret" })
    expect(result.documents[1]!.data).toMatchObject({ name: "Lia", x: 200, y: 200, size: 2, image: null, disposition: "friendly" })
    expect(result.documents[2]!.data).toMatchObject({ x: 100, y: 0, bright: 2, dim: 4, color: "#ff8800", alpha: 0.5 })
    expect(result.warnings).toHaveLength(2)
    expect(importFoundryScene({ name: "Hex", grid: { size: 80, type: 2 } }).scene.data.grid.type).toBe("hex-rows")
    expect(importFoundryScene({ name: "Hex", grid: { size: 80, type: 4 } }).scene.data.grid.type).toBe("hex-cols")
  })
})

