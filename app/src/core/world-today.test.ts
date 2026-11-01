import { describe, expect, it } from "vitest"
import { parseCalendar } from "./calendar"
import { withWorldToday, worldDateAhead } from "./world-today"

const CALENDAR = `nome: Ordem x Caos
sigla: OC
semana: [Lua, Fogo, Água]
meses:
  - { nome: Despertar, dias: 30 }
  - { nome: Florada, dias: 30 }
hoje: "0001-01-10"`

describe("hoje no mundo", () => {
  it("troca só a linha hoje do bloco do calendário", () => {
    const text = `# Calendário\n\nTexto antes.\n\n\`\`\`runas-calendario\n${CALENDAR}\n\`\`\`\n\nDepois.\n`
    const next = withWorldToday(text, { year: 1, month: 2, day: 3 })
    expect(next).toContain('hoje: "0001-02-03"')
    expect(next).not.toContain('hoje: "0001-01-10"')
    expect(next!.replace('hoje: "0001-02-03"', 'hoje: "0001-01-10"')).toBe(text)
  })

  it("devolve null quando a nota não tem calendário", () => {
    expect(withWorldToday("# Nota\n", { year: 1, month: 1, day: 1 })).toBeNull()
  })

  it("só sugere avançar para uma data da sessão depois de hoje, no mesmo calendário", () => {
    const calendar = parseCalendar(CALENDAR)
    expect(worldDateAhead(calendar, "0001-01-15")).toEqual({ year: 1, month: 1, day: 15 })
    expect(worldDateAhead(calendar, "0001-01-15 OC")).toEqual({ year: 1, month: 1, day: 15 })
    expect(worldDateAhead(calendar, "0001-01-10")).toBeNull()
    expect(worldDateAhead(calendar, "0001-01-02")).toBeNull()
    expect(worldDateAhead(calendar, "0001-01-15 EL")).toBeNull()
    expect(worldDateAhead(calendar, "ontem")).toBeNull()
    expect(worldDateAhead(null, "0001-01-15")).toBeNull()
    expect(worldDateAhead(calendar, undefined)).toBeNull()
  })
})
