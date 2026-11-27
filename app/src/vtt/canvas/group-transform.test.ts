import { describe, expect, it } from "vitest"
import { groupBounds, scaleBox, scaleDocument } from "./group-transform"
import type { WorldDocument } from "../shared/world"

const doc = (id: string, type: string, data: object) => ({ id, type, parentId: "cena", sort: 0, createdAt: 0, updatedAt: 0, data }) as WorldDocument

describe("redimensionar a seleção junta", () => {
  const wall = doc("p", "wall", { x1: 0, y1: 0, x2: 100, y2: 0, kind: "wall" })
  const region = doc("a", "region", { x: 100, y: 50, width: 100, height: 50, shape: "rectangle" })
  const light = doc("l", "light", { x: 200, y: 100, dim: 6, bright: 3 })

  it("acha a caixa em volta de paredes, áreas e pontos", () => {
    expect(groupBounds([wall, region, light])).toEqual({ x: 0, y: 0, width: 200, height: 100 })
    expect(groupBounds([])).toBeNull()
  })

  it("estica a partir do canto oposto sem virar do avesso e mantém a proporção quando pedido", () => {
    const box = { x: 0, y: 0, width: 200, height: 100 }
    expect(scaleBox(box, "se", { x: 400, y: 150 })).toEqual({ x: 0, y: 0, width: 400, height: 150 })
    expect(scaleBox(box, "nw", { x: 100, y: 50 })).toEqual({ x: 100, y: 50, width: 100, height: 50 })
    expect(scaleBox(box, "se", { x: -50, y: -50 })).toEqual({ x: 0, y: 0, width: 1, height: 1 })
    expect(scaleBox(box, "se", { x: 400, y: 120 }, true)).toEqual({ x: 0, y: 0, width: 400, height: 200 })
    // Paredes todas retas: a altura zero continua zero.
    expect(scaleBox({ x: 0, y: 10, width: 100, height: 0 }, "se", { x: 300, y: 80 })).toEqual({ x: 0, y: 10, width: 300, height: 0 })
  })

  it("leva as pontas das paredes, o tamanho das áreas e só a posição das luzes", () => {
    const from = { x: 0, y: 0, width: 200, height: 100 }, to = { x: 0, y: 0, width: 400, height: 200 }
    expect(scaleDocument(wall, from, to).data).toMatchObject({ x1: 0, y1: 0, x2: 200, y2: 0, kind: "wall" })
    expect(scaleDocument(region, from, to).data).toMatchObject({ x: 200, y: 100, width: 200, height: 100 })
    expect(scaleDocument(light, from, to).data).toMatchObject({ x: 400, y: 200, dim: 6, bright: 3 })
  })

  it("estica os pontos do desenho à mão livre", () => {
    const drawing = doc("d", "drawing", { x: 0, y: 0, width: 10, height: 10, points: [0, 0, 10, 10] })
    expect(scaleDocument(drawing, { x: 0, y: 0, width: 10, height: 10 }, { x: 0, y: 0, width: 20, height: 30 }).data).toMatchObject({ width: 20, height: 30, points: [0, 0, 20, 30] })
  })
})
