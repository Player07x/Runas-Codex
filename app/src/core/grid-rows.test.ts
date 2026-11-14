import { describe, expect, it } from "vitest"
import { clampPage, fullRows, nextLimit, pageCount, pageNumbers, pageSize } from "./grid-rows"

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

describe("páginas da grade (U71)", () => {
  it("enche fileiras inteiras com 40 a 60 cartões", () => {
    expect(pageSize(8)).toBe(48)
    expect(pageSize(7)).toBe(49)
    expect(pageSize(5)).toBe(50)
    expect(pageSize(2)).toBe(48)
    expect(pageSize(1)).toBe(48)
    expect(pageSize(13)).toBe(52)
    expect(pageSize(25)).toBe(50)
    expect(pageSize(70)).toBe(70)
  })
  it("conta as páginas e corrige a página fora do intervalo", () => {
    expect(pageCount(420, 48)).toBe(9)
    expect(pageCount(0, 48)).toBe(1)
    expect(clampPage(12, 420, 48)).toBe(9)
    expect(clampPage(0, 420, 48)).toBe(1)
    expect(clampPage(Number.NaN, 420, 48)).toBe(1)
  })
  it("mostra a primeira, a última e as vizinhas, com “…” nos buracos", () => {
    expect(pageNumbers(1, 1)).toEqual([1])
    expect(pageNumbers(2, 9)).toEqual([1, 2, 3, null, 9])
    expect(pageNumbers(5, 9)).toEqual([1, null, 4, 5, 6, null, 9])
    expect(pageNumbers(4, 9)).toEqual([1, 2, 3, 4, 5, null, 9])
    expect(pageNumbers(9, 9)).toEqual([1, null, 8, 9])
  })
})
