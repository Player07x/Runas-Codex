import { describe, expect, it } from "vitest"
import { requestedThumbWidth, thumbWidth } from "./thumbnails"

describe("larguras de miniatura (U86)", () => {
  it("escolhe a menor largura fixa que cobre o quadro na densidade da tela", () => {
    expect(thumbWidth(32)).toBe(64)
    expect(thumbWidth(32, 2)).toBe(64)
    expect(thumbWidth(44, 2)).toBe(128)
    expect(thumbWidth(270, 2)).toBe(640)
    expect(thumbWidth(600, 2)).toBe(1280)
  })

  it("pede a imagem inteira quando nenhuma miniatura cobre o quadro", () => {
    expect(thumbWidth(1000, 2)).toBeNull()
  })

  it("aceita na URL só as larguras fixas", () => {
    expect(requestedThumbWidth("640")).toBe(640)
    expect(requestedThumbWidth("641")).toBeNull()
    expect(requestedThumbWidth("abc")).toBeNull()
    expect(requestedThumbWidth(null)).toBeNull()
  })
})
