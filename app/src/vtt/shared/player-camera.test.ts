import { describe, expect, it } from "vitest"
import { DEFAULT_CAMERA_RULES, ENTER_SPAN, movedTokens, normalizeCameraRules, pickFocusToken, tokenPixels, zoomForSpan } from "./player-camera"

describe("câmera dos jogadores", () => {
  it("normaliza as regras do mestre e limita o afastamento entre 4 e 30 vezes o token", () => {
    expect(normalizeCameraRules(undefined)).toEqual(DEFAULT_CAMERA_RULES)
    expect(normalizeCameraRules({ lockToToken: true, maxZoomOut: 2 })).toEqual({ lockToToken: true, maxZoomOut: 4 })
    expect(normalizeCameraRules({ lockToToken: "sim", maxZoomOut: 99.6 })).toEqual({ lockToToken: false, maxZoomOut: 30 })
  })

  it("mede o token pela grade e usa 100 px por célula sem grade", () => {
    expect(tokenPixels(1, { type: "square", size: 70 })).toBe(70)
    expect(tokenPixels(2, { type: "hex-rows", size: 50 })).toBe(100)
    expect(tokenPixels(1, { type: "none", size: 70 })).toBe(100)
  })

  it("enquadra 8 vezes o token no lado menor da tela, proporcional ao tamanho dele", () => {
    const screen = { width: 1600, height: 800 }
    expect(zoomForSpan(screen, 100, ENTER_SPAN)).toBe(1)
    // Token Grande (2 células): o dobro de mapa à volta, logo metade da escala.
    expect(zoomForSpan(screen, 200, ENTER_SPAN)).toBe(0.5)
  })

  it("centraliza no último token escolhido; senão no último que se moveu; senão no primeiro", () => {
    const own = [{ id: "a", x: 0, y: 0, size: 1 }, { id: "b", x: 10, y: 0, size: 1 }, { id: "c", x: 20, y: 0, size: 1 }]
    expect(pickFocusToken(own, "c", "b")?.id).toBe("c")
    expect(pickFocusToken(own, "outro", "b")?.id).toBe("b")
    expect(pickFocusToken(own, null, null)?.id).toBe("a")
    expect(pickFocusToken([], "a", null)).toBeNull()
  })

  it("descobre quais tokens andaram desde a última projeção", () => {
    const before = new Map([["a", { x: 0, y: 0 }], ["b", { x: 5, y: 5 }]])
    expect(movedTokens(before, [{ id: "a", x: 0, y: 0, size: 1 }, { id: "b", x: 6, y: 5, size: 1 }, { id: "c", x: 1, y: 1, size: 1 }])).toEqual(["b"])
  })
})
