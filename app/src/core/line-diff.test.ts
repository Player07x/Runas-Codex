import { describe, expect, it } from "vitest"
import { diffHunks, lineDiff } from "./line-diff"

describe("lineDiff", () => {
  it("marca as linhas que só existem em cada versão", () => {
    expect(lineDiff("a\nb\nc", "a\nB\nc\nd")).toEqual([
      { kind: "same", text: "a" },
      { kind: "removed", text: "b" },
      { kind: "added", text: "B" },
      { kind: "same", text: "c" },
      { kind: "added", text: "d" },
    ])
  })

  it("trata versões iguais e quebras de linha do Windows", () => {
    expect(lineDiff("x\r\ny", "x\ny").every((line) => line.kind === "same")).toBe(true)
  })

  it("mostra as duas partes inteiras quando o meio é grande demais", () => {
    expect(lineDiff("a\nb", "c\nd", 1).map((line) => line.kind)).toEqual(["removed", "removed", "added", "added"])
  })
})

describe("diffHunks", () => {
  it("esconde os trechos iguais longe das mudanças", () => {
    const before = Array.from({ length: 20 }, (_, i) => `linha ${i}`).join("\n")
    const after = before.replace("linha 10", "linha dez")
    const items = diffHunks(lineDiff(before, after), 1)
    expect(items[0]).toEqual({ kind: "skip", count: 9 })
    expect(items.filter((item) => item.kind !== "skip").map((item) => item.kind)).toEqual(["same", "removed", "added", "same"])
    expect(items.at(-1)).toEqual({ kind: "skip", count: 8 })
  })
})
