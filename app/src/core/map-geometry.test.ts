import { describe, expect, it } from "vitest"
import { bounds, ellipsePolygon, insertVertex, midpoint, nearestInDirection, nudgePoint, pointInPolygon, rectPolygon, removeVertex, translatePoints } from "./map-geometry"

describe("geometria do mapa: formas", () => {
  it("monta o retângulo de qualquer par de cantos, sem sair da imagem", () => {
    expect(rectPolygon({ x: 0.6, y: 0.8 }, { x: 0.2, y: 0.4 })).toEqual([{ x: 0.2, y: 0.4 }, { x: 0.6, y: 0.4 }, { x: 0.6, y: 0.8 }, { x: 0.2, y: 0.8 }])
    expect(rectPolygon({ x: -0.2, y: 0.5 }, { x: 1.4, y: 0.6 })[1]).toEqual({ x: 1, y: 0.5 })
  })

  it("monta a elipse dentro do retângulo, começando no alto", () => {
    const e = ellipsePolygon({ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.4 }, 4)
    expect(e).toEqual([{ x: 0.4, y: 0.2 }, { x: 0.6, y: 0.3 }, { x: 0.4, y: 0.4 }, { x: 0.2, y: 0.3 }])
    expect(ellipsePolygon({ x: 0, y: 0 }, { x: 1, y: 1 })).toHaveLength(24)
  })
})

describe("geometria do mapa: vértices", () => {
  const square = rectPolygon({ x: 0.2, y: 0.2 }, { x: 0.4, y: 0.4 })

  it("insere o vértice no meio da aresta, também na que fecha a forma", () => {
    expect(midpoint(square, 3)).toEqual({ x: 0.2, y: 0.3 })
    expect(insertVertex(square, 0)).toEqual([square[0], { x: 0.3, y: 0.2 }, square[1], square[2], square[3]])
    expect(insertVertex(square, 3)).toHaveLength(5)
  })

  it("não deixa a área com menos de três pontos nem a rota com menos de dois", () => {
    expect(removeVertex(square, 1)).toHaveLength(3)
    expect(removeVertex(square.slice(0, 3), 0)).toHaveLength(3)
    expect(removeVertex(square.slice(0, 2), 0, 2)).toHaveLength(2)
  })

  it("arrasta a forma inteira e para na borda sem deformar", () => {
    expect(translatePoints(square, 0.1, 0)).toEqual(rectPolygon({ x: 0.3, y: 0.2 }, { x: 0.5, y: 0.4 }))
    const moved = translatePoints(square, 0.9, -0.9)
    expect(bounds(moved)).toEqual({ x: 0.8, y: 0, w: 0.2, h: 0.2 })
  })

  it("move pelas setas 0,5 % (ou o passo pedido) sem sair da imagem", () => {
    expect(nudgePoint({ x: 0.5, y: 0.5 }, 1, 0)).toEqual({ x: 0.505, y: 0.5 })
    expect(nudgePoint({ x: 0.5, y: 0.5 }, 0, -1, 0.05)).toEqual({ x: 0.5, y: 0.45 })
    expect(nudgePoint({ x: 0.999, y: 0 }, 1, -1)).toEqual({ x: 1, y: 0 })
  })

  it("sabe se o toque caiu dentro da área", () => {
    expect(pointInPolygon({ x: 0.3, y: 0.3 }, square)).toBe(true)
    expect(pointInPolygon({ x: 0.5, y: 0.3 }, square)).toBe(false)
  })
})

describe("geometria do mapa: setas entre pinos", () => {
  const pins = [{ x: 0.5, y: 0.5 }, { x: 0.8, y: 0.52 }, { x: 0.6, y: 0.1 }, { x: 0.2, y: 0.5 }, { x: 0.52, y: 0.9 }]

  it("vai ao pino mais perto na direção da seta", () => {
    expect(nearestInDirection(pins, 0, "right")).toBe(1)
    expect(nearestInDirection(pins, 0, "up")).toBe(2)
    expect(nearestInDirection(pins, 0, "left")).toBe(3)
    expect(nearestInDirection(pins, 0, "down")).toBe(4)
  })

  it("fica onde está quando não há pino daquele lado", () => {
    expect(nearestInDirection(pins, 1, "right")).toBe(1)
    expect(nearestInDirection([], 0, "up")).toBe(0)
  })
})
