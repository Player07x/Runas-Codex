import { describe, expect, it } from "vitest"
import { centerOn, clampView, fitView, initialView, KEEP_VISIBLE, MAX_SCALE, MIN_SCALE, panBy, reveal, zoomAt } from "./pan-zoom"

const region = { width: 800, height: 500 }

describe("câmera do organograma e da árvore", () => {
  it("abre o desenho pequeno centrado, sem aumentar além de 100 %", () => {
    const view = fitView({ width: 300, height: 120 }, region)
    expect(view).toEqual({ x: 250, y: 190, scale: 1 })
  })

  it("enquadra o desenho grande reduzindo, também centrado", () => {
    const view = fitView({ width: 1536, height: 468 }, region)
    expect(view.scale).toBe(0.5)
    expect(view.x).toBe(16)
    expect(view.y).toBeCloseTo((500 - 234) / 2)
  })

  it("abre a 100 % com o topo no meio quando enquadrar deixaria tudo pequeno demais", () => {
    const view = initialView({ width: 4000, height: 600 }, region)
    expect(view.scale).toBe(1)
    expect(view.y).toBe(16)
    expect(view.x).toBe((800 - 4000) / 2)
  })

  it("arrasta para qualquer lado, mas deixa parte do desenho à vista", () => {
    const drawing = { width: 300, height: 120 }
    const start = fitView(drawing, region)
    expect(panBy(start, -100, 60, drawing, region)).toEqual({ x: 150, y: 250, scale: 1 })
    const far = panBy(start, 5000, 5000, drawing, region)
    expect(far.x).toBe(800 - KEEP_VISIBLE)
    expect(far.y).toBe(500 - KEEP_VISIBLE)
    const away = panBy(start, -5000, -5000, drawing, region)
    expect(away.x).toBe(KEEP_VISIBLE - 300)
    expect(away.y).toBe(KEEP_VISIBLE - 120)
  })

  it("aproxima mantendo parado o ponto escolhido e respeita os limites", () => {
    const drawing = { width: 1000, height: 1000 }
    const view = { x: 0, y: 0, scale: 1 }
    const next = zoomAt(view, 1.25, 400, 250, drawing, region)
    expect(next.scale).toBe(1.25)
    // O ponto (400, 250) da região continua sobre o mesmo ponto do desenho.
    expect((400 - next.x) / next.scale).toBeCloseTo(400)
    expect((250 - next.y) / next.scale).toBeCloseTo(250)
    expect(zoomAt({ ...view, scale: MAX_SCALE }, 2, 0, 0, drawing, region).scale).toBe(MAX_SCALE)
    expect(zoomAt({ ...view, scale: MIN_SCALE }, 0.5, 0, 0, drawing, region).scale).toBe(MIN_SCALE)
  })

  it("põe um nó no meio e mostra um nó fora da vista movendo o mínimo", () => {
    const drawing = { width: 2000, height: 1200 }
    const view = { x: 0, y: 0, scale: 1 }
    expect(centerOn(view, { x: 1000, y: 600, w: 200, h: 60 }, drawing, region)).toEqual({ x: 800 / 2 - 1100, y: 500 / 2 - 630, scale: 1 })
    const shown = reveal(view, { x: 900, y: 100, w: 200, h: 60 }, drawing, region)
    expect(shown).toEqual({ x: 800 - 16 - 1100, y: 0, scale: 1 })
    expect(reveal(view, { x: 100, y: 100, w: 200, h: 60 }, drawing, region)).toBe(view)
  })

  it("um desenho menor que a margem não sai inteiro da região", () => {
    const tiny = { width: 40, height: 30 }
    const view = clampView({ x: -500, y: 900, scale: 1 }, tiny, region)
    expect(view.x).toBe(0)
    expect(view.y).toBe(500 - 30)
  })
})
