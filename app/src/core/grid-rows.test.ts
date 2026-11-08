import { describe, expect, it } from "vitest"
import { fullRows, nextLimit } from "./grid-rows"

describe("fileiras inteiras", () => {
  it("fecha a última fileira sem passar do total", () => {
    expect(fullRows(100, 60, 4)).toBe(60)
    expect(fullRows(100, 60, 7)).toBe(63)
    expect(fullRows(61, 60, 7)).toBe(61)
    expect(fullRows(30, 60, 4)).toBe(30)
    expect(fullRows(100, 2, 5)).toBe(5)
  })
  it("o “Mostrar mais” acrescenta uma página inteira, em fileiras", () => {
    expect(nextLimit(200, 63, 7)).toBe(126)
    expect(nextLimit(100, 60, 4)).toBe(100)
    expect(nextLimit(200, 60, 4, 24)).toBe(84)
  })
})
