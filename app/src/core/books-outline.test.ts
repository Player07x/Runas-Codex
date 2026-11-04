import { describe, expect, it } from "vitest"
import { blockOf, bookOutline, canIndent, canOutdent, copyName, moveInOutline, moveRange, retitle, visibleRows } from "./books-outline"

// Introdução, Runas (+ Runas de Reforço), Parte II, Magias (+ Fogo, Água)
const kinds = ["capitulo", "capitulo", "secao", "parte", "capitulo", "secao", "secao"]

describe("sumário em árvore", () => {
  it("põe cada seção no último capítulo acima dela", () => {
    const rows = bookOutline(kinds)
    expect(rows.map((r) => r.level)).toEqual([1, 1, 2, 1, 1, 2, 2])
    expect(rows[1]!.children).toEqual([2])
    expect(rows[4]!.children).toEqual([5, 6])
    expect(rows[6]!.parent).toBe(4)
  })
  it("seção sem capítulo acima (logo após uma Parte ou no começo) fica no primeiro nível", () => {
    expect(bookOutline(["secao", "parte", "secao"]).map((r) => r.level)).toEqual([1, 1, 1])
  })
  it("o capítulo anda com as seções", () => {
    const rows = bookOutline(kinds)
    expect(blockOf(rows, 4)).toEqual([4, 7])
    expect(blockOf(rows, 5)).toEqual([5, 6])
    expect(moveInOutline(rows, 4, -1)).toEqual([0, 1, 2, 4, 5, 6, 3])
    expect(moveInOutline(rows, 1, -1)).toEqual([1, 2, 0, 3, 4, 5, 6])
    expect(moveInOutline(rows, 1, 1)).toEqual([0, 3, 1, 2, 4, 5, 6])
    expect(moveInOutline(rows, 0, -1)).toBeNull()
    expect(moveInOutline(rows, 4, 1)).toBeNull()
  })
  it("a seção anda uma linha e troca de capítulo ao passar por um", () => {
    const rows = bookOutline(kinds)
    expect(moveInOutline(rows, 5, 1)).toEqual([0, 1, 2, 3, 4, 6, 5])
    expect(moveInOutline(rows, 2, 1)).toEqual([0, 1, 3, 2, 4, 5, 6])
  })
  it("move um intervalo para antes de uma posição", () => {
    expect(moveRange(["a", "b", "c", "d", "e"], [1, 3], 4)).toEqual(["a", "d", "b", "c", "e"])
    expect(moveRange(["a", "b", "c", "d", "e"], [3, 5], 0)).toEqual(["d", "e", "a", "b", "c"])
    expect(moveRange(["a", "b", "c"], [1, 2], 2)).toEqual(["a", "b", "c"])
  })
  it("só recua capítulo com capítulo acima, e só tira o recuo de seção", () => {
    const rows = bookOutline(kinds)
    expect(canIndent(rows, 0)).toBe(false)
    expect(canIndent(rows, 1)).toBe(true)
    expect(canIndent(rows, 4)).toBe(false) // logo depois de uma Parte
    expect(canIndent(rows, 3)).toBe(false) // a Parte não vira seção
    expect(canOutdent(rows, 5)).toBe(true)
    expect(canOutdent(rows, 4)).toBe(false)
  })
  it("esconde as seções dos capítulos fechados", () => {
    const rows = bookOutline(kinds)
    expect(visibleRows(rows, new Set([4])).map((r) => r.index)).toEqual([0, 1, 2, 3, 4])
  })
  it("dá nome de cópia sem repetir e troca o título da nota", () => {
    const taken = new Set(["Magias (cópia)"])
    expect(copyName("Magias", (name) => taken.has(name))).toBe("Magias (cópia 2)")
    expect(retitle("---\ntipo: secao\n---\n# Magias\n\nTexto # Magias", "Magias", "Magias (cópia)")).toBe("---\ntipo: secao\n---\n# Magias (cópia)\n\nTexto # Magias")
  })
})
