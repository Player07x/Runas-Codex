import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseEncounter } from "../encounters"
import { convertEncounter, readCreature } from "./encounter"

const source = /```encounter\n([\s\S]*?)\n```/.exec(readFileSync(join(__dirname, "fixtures/cofre/Encontros/Emboscada.md"), "utf8"))![1]!

describe("Initiative Tracker → runas-encontro", () => {
  it("lê as formas de combatente que o plugin aceita", () => {
    expect(readCreature({ 3: "Goblin" })).toMatchObject({ name: "Goblin", count: 3 })
    expect(readCreature("Hobgoblin, 11, 18, 1, 100")).toMatchObject({ name: "Hobgoblin", count: 1, hp: 11, ac: 18, mod: 1, xp: 100 })
    expect(readCreature({ "1d4": "Lobo, friend" })).toMatchObject({ name: "Lobo", count: "1d4", ally: true })
    expect(readCreature([["Hobgoblin", "Capitão Vorn"], 52, 17, 3])).toMatchObject({ name: "Hobgoblin", display: "Capitão Vorn", hp: 52, ac: 17, mod: 3 })
    expect(readCreature(["Hobgoblin", "Jim", "hidden"])).toMatchObject({ name: "Hobgoblin", display: "Jim", hidden: true })
    expect(readCreature({ creature: "Ogro", name: "Grok", hp: 59, ac: 11, hidden: true })).toMatchObject({ name: "Ogro", display: "Grok", hp: 59, ac: 11, hidden: true })
    expect(readCreature("3: Goblin, 7, 15 (couro)")).toMatchObject({ name: "Goblin", count: 3, hp: 7, ac: "15 (couro)" })
    expect(readCreature("")).toBeNull()
  })

  it("converte os dois encontros do bloco, com o link da nota da criatura", () => {
    const result = convertEncounter(source, (name) => (name === "Goblin" ? "Goblin" : null))
    expect(result.blocks).toEqual([
      [
        "nome: Emboscada na estrada",
        "jogadores: true",
        "combatentes:",
        '  - { nome: Goblin, quantidade: 3, nota: "[[Goblin]]" }',
        "  - { nome: Hobgoblin, pv: 11, ca: 18, iniciativa: 1, xp: 100 }",
        '  - { nome: Lobo, quantidade: "1d4", aliado: true }',
        "  - { nome: Hobgoblin, apelido: Capitão Vorn, pv: 52, ca: 17, iniciativa: 3 }",
        "  - { nome: Ogro, apelido: Grok, pv: 59, ca: 11, oculto: true }",
      ].join("\n"),
      ["nome: Reforços", "jogadores: false", "combatentes:", '  - { nome: Goblin, quantidade: 2, nota: "[[Goblin]]", oculto: true }'].join("\n"),
    ])
    expect(result.combatants).toBe(3 + 1 + 1 + 1 + 1 + 2)
    expect(result.warnings).toEqual([])
  })

  it("o bloco gerado é lido pelo leitor de encontros", () => {
    const [first] = convertEncounter(source).blocks
    const encounter = parseEncounter(first!)
    expect(encounter.name).toBe("Emboscada na estrada")
    expect(encounter.players).toBe(true)
    expect(encounter.combatants.map((c) => [c.name, c.count, c.display ?? "", c.ally, c.hidden])).toEqual([
      ["Goblin", 3, "", false, false],
      ["Hobgoblin", 1, "", false, false],
      ["Lobo", "1d4", "", true, false],
      ["Hobgoblin", 1, "Capitão Vorn", false, false],
      ["Ogro", 1, "Grok", false, true],
    ])
  })

  it("leva grupo, o que esconder, XP e rolar PV", () => {
    const [block] = convertEncounter("name: A\nparty: Os Cinzentos\nhide: players\nxp: 450\nrollHP: true\ncreatures:\n  - Lobo\n  - Urso, 34").blocks
    expect(block).toBe(["nome: A", "grupo: Os Cinzentos", "esconder: [jogadores]", "xp: 450", "combatentes:", "  - { nome: Lobo, rolar_pv: true }", "  - { nome: Urso, pv: 34 }"].join("\n"))
    expect(parseEncounter(block!)).toMatchObject({ party: "Os Cinzentos", hide: ["jogadores"], xp: 450 })
  })
})
