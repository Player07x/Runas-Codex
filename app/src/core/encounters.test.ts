import { combatantCount, parseEncounter } from "./encounters"

describe("encontros genéricos (bloco runas-encontro)", () => {
  it("lê os combatentes com quantidade, rolagem, link, aliado e oculto", () => {
    const encounter = parseEncounter('nome: Ponte\njogadores: [Ilsa, Bram]\ncombatentes:\n  - Bandido\n  - { nome: Lobo, quantidade: 1d4, aliado: true }\n  - { nome: Chefe, nota: "[[Chefe Vorn|Vorn]]", ca: "15 (couro)", iniciativa: -1, oculto: true }')
    expect(encounter.players).toEqual(["Ilsa", "Bram"])
    expect(encounter.combatants).toEqual([
      { name: "Bandido", count: 1, hidden: false, ally: false, rollHp: false },
      { name: "Lobo", count: "1d4", hidden: false, ally: true, rollHp: false },
      { name: "Chefe", count: 1, ac: "15 (couro)", initiative: -1, note: "Chefe Vorn", hidden: true, ally: false, rollHp: false },
    ])
    expect(combatantCount(encounter)).toBe(3)
  })

  it("sem jogadores: todos; jogadores: false é nenhum", () => {
    expect(parseEncounter("combatentes: []").players).toBe(true)
    expect(parseEncounter("jogadores: false").players).toBe(false)
  })

  it("explica o erro de YAML ou de formato", () => {
    expect(() => parseEncounter("nome: [quebrado")).toThrow(/YAML inválido/)
    expect(() => parseEncounter("- só uma lista")).toThrow(/mapa YAML/)
  })
})
