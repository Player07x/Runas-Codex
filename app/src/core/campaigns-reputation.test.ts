import { describe, expect, it } from "vitest"
import { reputationOf, withReputation } from "./campaigns"

describe("reputação das facções", () => {
  it("troca o número e preserva o texto extra", () => {
    expect(withReputation("+1, Ordem antiga", -2)).toBe("-2, Ordem antiga")
    expect(withReputation("Ordem antiga", 2)).toBe("+2, Ordem antiga")
    expect(reputationOf(withReputation("+1, Ordem antiga", -2))).toBe(-2)
  })
})
