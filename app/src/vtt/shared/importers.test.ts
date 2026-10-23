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
})
