import { describe, expect, it } from "vitest"
import { improvisedNpc, improvisedNpcNote } from "./improvised-npc"
import { NAME_CULTURES } from "./name-cultures"
import { articleKind, newArticleNote } from "./wiki"

describe("NPC improvisado", () => {
  it("sorteia nome pela cultura e preenche o artigo de personagem", () => {
    const culture = NAME_CULTURES[0]!
    const npc = improvisedNpc(() => 0, culture)
    expect([...culture.female, ...culture.male].some((name) => npc.name.includes(name))).toBe(true)
    for (const value of [npc.job, npc.look, npc.trait, npc.desire, npc.secret]) expect(value).toBeTruthy()
    const note = improvisedNpcNote(newArticleNote(articleKind("personagem")!, npc.name), npc)
    expect(note).toMatch(/^---\ntipo: personagem/)
    expect(note).toContain(`ocupacao: ${JSON.stringify(npc.job)}`)
    expect(note).toContain(`# ${npc.name}\n\n**Aparência:**`)
    expect(note).toContain(`> [!segredo]\n> Esconde ${npc.secret}.`)
  })

  it("sem cultura usa os nomes gerais", () => {
    const npc = improvisedNpc(() => 0.5)
    expect(npc.name.split(" ").length).toBeGreaterThanOrEqual(2)
  })
})
