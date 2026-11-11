import { dayNumber, parseCalendar, weekday } from "./calendar"
import { applyCalendarForm, calendarFormFromYaml, calendarFormProblem, calendarNoteBody, calendarTemplate, yearDays } from "./calendar-form"

const SOURCE = `nome: Calendário de Ordem x Caos
sigla: OC # vai depois das datas
semana: [Pedra, Raiz, Chama]
meses:
  - { nome: Gelo, dias: 36, estacao: Inverno }
  - { nome: Dias de Logi, dias: 5, intercalar: true }
luas:
  - { nome: Selene, ciclo: 28, cheia_em: "0000-01-04", cor: "#bec6ff" }
hoje: "4031-01-15"
hora: "07:30"
correspondencias:
  - { calendario: "[[Calendário élfico]]", data: "4031-01-01", data_no_outro: "0812-01-01" }
`

describe("configurar o calendário sem código (U35)", () => {
  it("lê o bloco para o formulário", () => {
    const form = calendarFormFromYaml(SOURCE)
    expect(form.nome).toBe("Calendário de Ordem x Caos")
    expect(form.semana).toEqual(["Pedra", "Raiz", "Chama"])
    expect(form.meses).toEqual([{ nome: "Gelo", dias: 36, estacao: "Inverno", intercalar: false }, { nome: "Dias de Logi", dias: 5, estacao: "", intercalar: true }])
    expect(form.luas[0]).toEqual({ nome: "Selene", ciclo: 28, cheia_em: "0000-01-04", cor: "#bec6ff" })
  })

  it("gravar sem mudar nada mantém o bloco igual", () => {
    expect(applyCalendarForm(SOURCE, calendarFormFromYaml(SOURCE))).toBe(SOURCE)
  })

  it("muda só o que o formulário mexe e mantém comentários, hoje, hora e correspondências", () => {
    const form = calendarFormFromYaml(SOURCE)
    form.meses.push({ nome: "Brasa", dias: 30, estacao: "Verão", intercalar: false })
    form.feriados.push({ nome: "Festa das Cinzas", data: "02-01", cor: "" })
    const out = applyCalendarForm(SOURCE, form)
    expect(out).toContain("sigla: OC # vai depois das datas")
    expect(out).toContain('hoje: "4031-01-15"')
    expect(out).toContain('hora: "07:30"')
    expect(out).toContain("[[Calendário élfico]]")
    expect(out).toContain("  - { nome: Brasa, dias: 30, estacao: Verão }")
    expect(out).toContain('  - { nome: Festa das Cinzas, data: "02-01" }')
    expect(parseCalendar(out).months).toHaveLength(3)
  })

  it("aponta o que impede de gravar", () => {
    const form = calendarFormFromYaml(SOURCE)
    expect(calendarFormProblem(SOURCE, { ...form, nome: " " })).toMatch(/nome/)
    expect(calendarFormProblem(SOURCE, { ...form, meses: [] })).toMatch(/mês/)
    expect(calendarFormProblem(SOURCE, form)).toBeNull()
  })

  it("o modelo gregoriano acerta o dia da semana", () => {
    const form = calendarTemplate("gregoriano", "Calendário Comum")
    expect(yearDays(form)).toBe(365)
    const body = calendarNoteBody(form, "2026-11-11")
    const yaml = body.slice(body.indexOf("```runas-calendario\n") + 20, body.lastIndexOf("```"))
    const calendar = parseCalendar(yaml)
    expect(weekday(calendar, { year: 2026, month: 11, day: 11 })).toBe("Quarta")
    expect(weekday(calendar, { year: 2024, month: 3, day: 1 })).toBe("Sexta")
    expect(dayNumber(calendar, { year: 2025, month: 1, day: 1 }) - dayNumber(calendar, { year: 2024, month: 1, day: 1 })).toBe(366)
    expect(yaml).toContain('hoje: "2026-11-11"')
  })

  it("12×30 e 13×28 têm 360 e 364 dias", () => {
    expect(yearDays(calendarTemplate("12x30", "A"))).toBe(360)
    expect(yearDays(calendarTemplate("13x28", "B"))).toBe(364)
  })
})
