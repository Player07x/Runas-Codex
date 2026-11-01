import { parseCalendar } from "./calendar"
import { moveDate, yearMonths } from "./calendar-year"

const RUNICO = parseCalendar(`
nome: Calendário Rúnico
sufixo: C.R.
semana: [Pedra, Raiz, Chama, Vento, Maré, Sombra]
meses:
  - { nome: Gelo, dias: 36, estacao: Inverno }
  - { nome: Degelo, dias: 30, estacao: Inverno }
  - { nome: Semeadura, dias: 36, estacao: Primavera }
intercalares: { nome: Dias de Logi, depois_do_mes: 3, dias: 5 }
bissexto: { a_cada: 4, mes: Dias de Logi, dias: 1 }
`)

describe("vista do ano do calendário (U9)", () => {
  it("traz todos os meses com tamanho, estação e o dia 1 na semana", () => {
    const months = yearMonths(RUNICO, 1)
    expect(months.map((m) => [m.name, m.length, m.season ?? null])).toEqual([["Gelo", 36, "Inverno"], ["Degelo", 30, "Inverno"], ["Semeadura", 36, "Primavera"], ["Dias de Logi", 5, null]])
    // Seis dias na semana: 36 dias fecham seis semanas, então Degelo começa no mesmo dia da semana que Gelo.
    expect(months[1]!.offset).toBe(months[0]!.offset)
    expect(months[2]!.offset).toBe((months[1]!.offset + 30) % 6)
  })

  it("deixa os dias intercalares fora da semana e conta o bissexto", () => {
    const logi = yearMonths(RUNICO, 4).at(-1)!
    expect(logi).toMatchObject({ intercalary: true, offset: 0, length: 6 })
    expect(yearMonths(RUNICO, 5).at(-1)!.length).toBe(5)
  })

  it("anda pelo teclado entre dias, semanas e meses, virando o ano", () => {
    expect(moveDate(RUNICO, { year: 2, month: 1, day: 1 }, "ArrowLeft")).toEqual({ year: 1, month: 4, day: 5 })
    expect(moveDate(RUNICO, { year: 1, month: 1, day: 1 }, "ArrowLeft")).toEqual({ year: 0, month: 4, day: 6 })
    expect(moveDate(RUNICO, { year: 1, month: 1, day: 1 }, "ArrowDown")).toEqual({ year: 1, month: 1, day: 7 })
    expect(moveDate(RUNICO, { year: 1, month: 2, day: 30 }, "PageDown")).toMatchObject({ year: 1, month: 3 })
    expect(moveDate(RUNICO, { year: 1, month: 2, day: 9 }, "End")).toEqual({ year: 1, month: 2, day: 30 })
    expect(moveDate(RUNICO, { year: 1, month: 2, day: 9 }, "Enter")).toBeNull()
  })
})
