import { addSpark, parseSparks, removeSpark, removeUsedSparks, SPARKS_HEADER, toggleSpark } from "./sparks"

const at = new Date("2026-10-22T10:12")

describe("Centelhas na nota de entrada", () => {
  it("a primeira ideia cria o cabeçalho; as próximas vão para o fim com a hora", () => {
    const one = addSpark(null, "Um lobo que fala\ncom a voz da Ilsa", at)
    expect(one).toBe(`${SPARKS_HEADER}\n- Um lobo que fala com a voz da Ilsa — 2026-10-22 10:12\n`)
    const two = addSpark(one, "Torre com sino rachado", new Date("2026-10-22T11:00"))
    expect(parseSparks(two).map((s) => s.text)).toEqual(["Torre com sino rachado", "Um lobo que fala com a voz da Ilsa"])
    expect(parseSparks(two)[0]!.at).toBe("2026-10-22 11:00")
  })

  it("riscar marca como usada e desriscar volta", () => {
    const text = addSpark(null, "Ideia", at)
    const line = parseSparks(text)[0]!.line
    const used = toggleSpark(text, line)
    expect(used).toContain("- ~~Ideia~~ — 2026-10-22 10:12")
    expect(parseSparks(used)[0]!.used).toBe(true)
    expect(toggleSpark(used, line)).toBe(text)
  })

  it("remove uma ideia ou todas as usadas, sem mexer no resto da nota", () => {
    let text = addSpark(addSpark(addSpark(null, "A", at), "B", at), "C", at)
    const [c, b] = parseSparks(text)
    text = toggleSpark(text, b!.line)
    expect(parseSparks(removeUsedSparks(text)).map((s) => s.text)).toEqual(["C", "A"])
    expect(parseSparks(removeSpark(text, c!.line)).map((s) => s.text)).toEqual(["B", "A"])
    expect(removeUsedSparks(text).startsWith(SPARKS_HEADER)).toBe(true)
  })

  it("ignora caixas de tarefa e linhas que não são itens; ideia escrita à mão também vale", () => {
    const text = "# Entrada\n\n- [ ] tarefa\nparágrafo\n- escrita no Obsidian\n"
    expect(parseSparks(text)).toEqual([{ line: 4, text: "escrita no Obsidian", used: false }])
    expect(removeSpark(text, 3)).toBe(text)
  })
})
