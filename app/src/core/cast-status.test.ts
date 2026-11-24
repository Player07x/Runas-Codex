import { describe, expect, it } from "vitest"
import { goneStatus } from "./cast-status"

describe("situação do personagem no Elenco", () => {
  it("reconhece morto pela situação ou pela data da morte", () => {
    expect(goneStatus({ status: "morto" })).toBe("Morto")
    expect(goneStatus({ status: "Falecida em 4030" })).toBe("Falecida em 4030")
    expect(goneStatus({ situacao: "extinta" })).toBe("Extinta")
    expect(goneStatus({ morte_mundo: "4031-02-01" })).toBe("Morto")
    expect(goneStatus({ status: "vivo" })).toBeNull()
    expect(goneStatus({ status: "mortal" })).toBeNull()
    expect(goneStatus(undefined)).toBeNull()
  })
})
