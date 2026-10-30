import { cultureName, NAME_CULTURES } from "./name-cultures"

describe("Nomes por cultura", () => {
  it("cada cultura tem pelo menos 100 nomes e, se usa sobrenome, 100 sobrenomes, sem repetidos", () => {
    expect(NAME_CULTURES.length).toBeGreaterThanOrEqual(20)
    expect(new Set(NAME_CULTURES.map((c) => c.id)).size).toBe(NAME_CULTURES.length)
    for (const c of NAME_CULTURES) {
      expect(c.female.length + c.male.length, c.id).toBeGreaterThanOrEqual(100)
      expect(Math.min(c.female.length, c.male.length), c.id).toBeGreaterThanOrEqual(50)
      for (const [list, values] of [["female", c.female], ["male", c.male], ["surnames", c.surnames]] as const) expect(new Set(values).size, `${c.id}.${list}`).toBe(values.length)
      if (c.surnames.length) expect(c.surnames.length, c.id).toBeGreaterThanOrEqual(100)
    }
  })
  it("põe o sobrenome antes ou depois do nome e monta o patronímico", () => {
    const at = (id: string) => NAME_CULTURES.find((c) => c.id === id)!
    expect(cultureName(at("hispanica"), "f", () => 0)).toBe("Ximena García")
    expect(cultureName(at("japonesa"), "m", () => 0)).toBe("Sato Akira")
    expect(cultureName(at("nordica"), "f", () => 0)).toBe("Astrid Arnesdóttir")
    expect(cultureName(at("arabe"), "m", () => 0)).toBe("Abbas al-Rashid")
    expect(cultureName(at("tupi"), "f", () => 0)).toBe("Abaeté")
  })
})

describe("Geradores com cultura", () => {
  it("usa a cultura e o gênero escolhidos no nome do NPC", async () => {
    const { generateWorld } = await import("./wiki-tools")
    const japonesa = NAME_CULTURES.find((c) => c.id === "japonesa")!
    expect(generateWorld("nome", () => 0, { culture: japonesa, gender: "f" })).toBe("Sato Aiko")
    expect(generateWorld("npc", () => 0, { culture: japonesa, gender: "m" })).toMatch(/^Sato Akira, cartógrafo\./)
  })
})
