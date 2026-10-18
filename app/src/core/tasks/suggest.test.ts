import { describe, expect, it } from "vitest"
import { parseTypedDate } from "./date-text"
import { DEFAULT_TASKS_SETTINGS } from "./settings"
import { suggestForTaskLine } from "./suggest"

const NOW = new Date(2026, 9, 18, 10) // domingo
const s = DEFAULT_TASKS_SETTINGS

describe("datas digitadas", () => {
  it("português comum e o inglês do Tasks", () => {
    expect(parseTypedDate("amanhã", NOW)).toBe("2026-10-19")
    expect(parseTypedDate("sexta", NOW)).toBe("2026-10-23")
    expect(parseTypedDate("próxima segunda", NOW)).toBe("2026-10-19")
    expect(parseTypedDate("domingo que vem", NOW)).toBe("2026-10-25")
    expect(parseTypedDate("daqui a 3 dias", NOW)).toBe("2026-10-21")
    expect(parseTypedDate("em 2 semanas", NOW)).toBe("2026-11-01")
    expect(parseTypedDate("tomorrow", NOW)).toBe("2026-10-19")
    expect(parseTypedDate("2026-02-30", NOW)).toBeNull()
    expect(parseTypedDate("blá", NOW)).toBeNull()
  })
})

describe("sugestões ao digitar numa tarefa", () => {
  const at = (line: string, settings = s) => suggestForTaskLine(line, line.length, settings, NOW)

  it("só em linha de tarefa, depois da caixa", () => {
    expect(at("texto comum du")).toBeNull()
    expect(at("- [ ] du")?.options[0]).toEqual({ label: "📅 prazo", apply: "📅 " })
  })

  it("depois de 📅 sugere datas, e o texto digitado vira data", () => {
    const r = at("- [ ] ligar 📅 amanh")!
    expect(r.options[0]!.apply).toBe("2026-10-19 ")
    expect(r.from).toBe("- [ ] ligar 📅 ".length)
  })

  it("depois de 🔁 sugere regras; no formato Dataview fecha o colchete", () => {
    expect(at("- [ ] a 🔁 every w")!.options.map((o) => o.label)).toContain("every week")
    expect(at("- [ ] a [due:: amanhã", { ...s, taskFormat: "dataview" })!.options[0]!.apply).toBe("2026-10-19] ")
  })

  it("respeita autoSuggestInEditor e o mínimo de letras", () => {
    expect(at("- [ ] du", { ...s, autoSuggestInEditor: false })).toBeNull()
    expect(at("- [ ] d")).toBeNull()
    expect(at("- [ ] d", { ...s, autoSuggestMinMatch: 1 })).not.toBeNull()
  })

  it("ids de outras tarefas depois de ⛔", () => {
    const r = suggestForTaskLine("- [ ] b ⛔ av", "- [ ] b ⛔ av".length, s, NOW, [{ id: "aventura", description: "Escrever" }, { id: "x1", description: "outra" }])!
    expect(r.options.map((o) => o.label)).toEqual(["aventura"])
  })
})
