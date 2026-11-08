import { describe, expect, it } from "vitest"
import { improvisedNpc, improvisedNpcFicha, improvisedNpcNote } from "./improvised-npc"
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

  it("separa a ocupação da ficha e a descrição, sem mudar a nota da Tela do Mestre", () => {
    const npc = { name: "Ana", gender: "f" as const, job: "ferreira", look: "mãos queimadas", trait: "fala pouco", desire: "sair da vila", secret: "uma dívida" }
    const parts = improvisedNpcFicha(npc)
    expect(parts.values).toEqual({ ocupacao: "ferreira" })
    expect(parts.body).toBe("**Aparência:** mãos queimadas.\n**Jeito:** fala pouco.\n**Quer:** sair da vila.\n\n> [!segredo]\n> Esconde uma dívida.")
    const note = improvisedNpcNote(newArticleNote(articleKind("personagem")!, "Ana"), npc)
    expect(note).toContain('ocupacao: "ferreira"')
    expect(note).toContain(`# Ana\n\n${parts.body}\n\n_Improvisado na Tela do Mestre._`)
  })
})
