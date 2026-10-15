import { readFileSync } from "node:fs"
import { join } from "node:path"
import { dayNumber, formatDate, fromDayNumber, holidaysOn, isLeapYear, moons, parseCalendar, season, weekday, type Calendar, type WorldDate } from "../calendar"
import { findCodeBlocks } from "../codeblocks"
import { calendariumData, convertCalendar, parseNoteDate, readFantasyCalendar, type CmCalendar } from "./calendarium"

const fixtures = join(__dirname, "fixtures")
const data = calendariumData(readFileSync(join(fixtures, "cofre/.obsidian/plugins/calendarium/data.json"), "utf8"))!
const [gregorian, tharn] = data.calendars as [CmCalendar, CmCalendar]

/** Conta do Calendarium, escrita à parte para conferir: dias da semana (sem intercalares) desde 1/1 do ano 1. */
function referenceDaysBefore(cal: CmCalendar, year: number, month0: number, day: number): number {
  const leap = (y: number) =>
    cal.leapDays.filter((l) => {
      const c = [...l.conditions].sort((a, b) => a.interval - b.interval)
      if (c.length === 3) return (y % c[0]!.interval === 0 && y % c[1]!.interval !== 0) || y % c[2]!.interval === 0
      return y % c[0]!.interval === 0
    })
  let days = 0
  for (let y = 1; y < year; y++) days += cal.months.filter((m) => !m.intercalary).reduce((s, m) => s + m.length, 0) + leap(y).length
  for (let m = 0; m < month0; m++) if (!cal.months[m]!.intercalary) days += cal.months[m]!.length
  days += leap(year).filter((l) => l.timespan < month0).length
  return days + day - 1
}

const referenceWeekday = (cal: CmCalendar, year: number, month0: number, day: number) => cal.weekdays[(cal.firstWeekDay + referenceDaysBefore(cal, year, month0, day)) % cal.weekdays.length]

/** Fase do Calendarium (24 fases; 0 = nova, 12 = cheia) num dia. */
const referencePosition = (moon: { cycle: number; offset: number }, daysBefore: number) => {
  const data = (daysBefore - moon.offset) / moon.cycle
  return data - Math.floor(data)
}

describe("Calendarium → runas-calendario", () => {
  describe("calendário gregoriano (preset do Calendarium)", () => {
    const result = convertCalendar(gregorian)
    const cal = result.calendar

    it("o dia da semana bate com o calendário do JavaScript", () => {
      expect(weekday(cal, { year: 2026, month: 10, day: 15 })).toBe("Thursday")
      const js = new Date(Date.UTC(2000, 0, 1))
      for (let n = dayNumber(cal, { year: 1, month: 1, day: 1 }); n < dayNumber(cal, { year: 2100, month: 1, day: 1 }); n += 397) {
        const date = fromDayNumber(cal, n)
        js.setUTCFullYear(date.year, date.month - 1, date.day)
        expect(weekday(cal, date)).toBe(gregorian.weekdays[js.getUTCDay()])
      }
    })

    it("o bissexto é o 4/100/400 em fevereiro", () => {
      expect([1900, 2000, 2024, 2026].map((y) => isLeapYear(cal, y))).toEqual([false, true, true, false])
      expect(result.yaml).toContain("bissexto: { a_cada: 4, exceto_a_cada: 100, salvo_a_cada: 400, mes: 2, dias: 1 }")
    })

    it("a lua tem as mesmas fases que o Calendarium mostra, perto da data atual", () => {
      const moon = gregorian.moons[0]!
      for (let offset = -3650; offset <= 3650; offset += 7) {
        const date = fromDayNumber(cal, dayNumber(cal, { year: 2026, month: 10, day: 15 }) + offset)
        const ours = moons(cal, date)[0]!.age
        const theirs = referencePosition(moon, referenceDaysBefore(gregorian, date.year, date.month - 1, date.day))
        const diff = Math.min(Math.abs(ours - theirs), 1 - Math.abs(ours - theirs))
        expect(diff).toBeLessThanOrEqual(0.5 / moon.cycle + 1e-9)
      }
    })

    it("traz hoje, estações, eras e eventos", () => {
      expect(cal.today).toEqual({ year: 2026, month: 10, day: 15 })
      expect(season(cal, { year: 2026, month: 1, day: 10 })).toBe("Winter")
      expect(season(cal, { year: 2026, month: 7, day: 10 })).toBe("Summer")
      expect(cal.eras.map((e) => [e.name, e.start])).toEqual([["Anno Domini", 1]])
      expect(holidaysOn(cal, { year: 2030, month: 12, day: 25 }).map((h) => h.name)).toEqual(["Christmas"])
      expect(result.warnings.some((w) => w.includes("Before Christ"))).toBe(true)
      expect(result.warnings.some((w) => w.includes("Summer Solstice"))).toBe(true)
    })

    it("a nota tem o bloco, a descrição e os eventos que só cabem em texto", () => {
      const [block] = findCodeBlocks(result.note, "runas-calendario")
      expect(block!.content).toBe(result.yaml)
      expect(result.note).toMatch(/^---\ntipo: calendario\n---\n\n# Gregorian Calendar\n\nA calendar for the real world\./)
      expect(result.note).toContain("- **Christmas** (todo 25 de December): Christmas is a holiday celebrating the birth of Jesus.")
      expect(result.note).toContain("- **Summer Solstice**: The longest day of the year.")
    })
  })

  describe("calendário de fantasia (intercalares, duas luas, eras)", () => {
    const result = convertCalendar(tharn)
    const cal: Calendar = result.calendar

    it("o dia da semana bate com a conta do Calendarium (intercalares fora da semana)", () => {
      for (const year of [1, 2, 3, 4, 5, 999, 1000, 4027, 4031, 4032]) {
        tharn.months.forEach((m, month0) => {
          for (const day of [1, 2, Math.ceil(m.length / 2), m.length]) {
            const ours = weekday(cal, { year, month: month0 + 1, day })
            if (m.intercalary) expect(ours).toBeNull()
            else expect(ours).toBe(referenceWeekday(tharn, year, month0, day))
          }
        })
      }
    })

    it("o dia bissexto entra na Noite Longa a cada 4 anos", () => {
      expect(cal.leap).toEqual({ every: 4, month: 6, days: 1 })
      expect(weekday(cal, { year: 4032, month: 7, day: 29 })).toBe(referenceWeekday(tharn, 4032, 6, 29))
    })

    it("as duas luas batem com o Calendarium nos próximos dois meses", () => {
      for (const [i, moon] of tharn.moons.entries()) {
        for (let offset = 0; offset < 60; offset++) {
          const date = fromDayNumber(cal, dayNumber(cal, { year: 4031, month: 5, day: 15 }) + offset)
          const ours = moons(cal, date)[i]!.age
          const theirs = referencePosition(moon, referenceDaysBefore(tharn, date.year, date.month - 1, date.day))
          const diff = Math.min(Math.abs(ours - theirs), 1 - Math.abs(ours - theirs))
          expect(diff).toBeLessThanOrEqual(0.5 / moon.cycle + 1e-9)
        }
      }
      expect(cal.moons.map((m) => m.color)).toEqual(["#bec6ff", "#c06060"])
    })

    it("estações pelo meio do mês, eras e feriados com a cor da categoria", () => {
      expect(cal.months.map((m) => m.season)).toEqual(["Inverno", "Inverno", "Primavera", "Primavera", "Verão", "Verão", "Outono"])
      expect(cal.eras.map((e) => [e.name, e.start])).toEqual([["Era das Brasas", 1000], ["Era dos Caçadores", 4027]])
      expect(holidaysOn(cal, { year: 4031, month: 4, day: 1 })).toEqual([{ name: "Festa das Cinzas", month: 4, day: 1, color: "#d4a017" }])
      expect(holidaysOn(cal, { year: 4030, month: 2, day: 12 }).map((h) => h.name)).toEqual(["Eclipse de Morr"])
      expect(holidaysOn(cal, { year: 4031, month: 2, day: 12 })).toEqual([])
      expect(formatDate(cal, cal.today!)).toBe("15 de Colheita de 4031")
    })

    it("avisa do que não tem equivalente e não perde os eventos", () => {
      const text = result.warnings.join("\n")
      expect(text).toContain("Tempos Antigos")
      expect(text).toContain("A era “Era dos Caçadores” começa no meio do ano 4027")
      expect(text).toContain("O evento “Cerco de Myrr” vai até 4012-05-03")
      expect(text).toContain("O evento “Lenda do Lobo de Cinzas” não tem dia e mês fixos")
      expect(text).toContain("não anda as luas nos dias intercalares")
      // O evento ligado a uma nota fica na nota (data_mundo), não vira feriado.
      expect(result.yaml).not.toContain("A Coroação")
      expect(result.note).toContain("- **Lenda do Lobo de Cinzas**: Ninguém sabe quando foi.")
      expect(result.note).toContain("- **Cerco de Myrr** (4012-05-01 a 4012-05-03): Três dias de fogo.")
    })

    it("o YAML gerado é o do estilo do app", () => {
      expect(result.yaml.split("\n").slice(0, 6)).toEqual([
        "# Convertido do Calendarium pela migração do Runas-Codex.",
        "nome: Calendário de Tharn",
        "semana: [Pedra, Raiz, Chama, Vento, Maré]",
        `primeiro_dia: ${parseCalendar(result.yaml).firstWeekday}`,
        "meses:",
        "  - { nome: Geada, dias: 30, estacao: Inverno }",
      ])
      expect(result.yaml).toContain("  - { nome: Festival das Cinzas, dias: 5, estacao: Primavera, intercalar: true }")
      expect(result.yaml).toMatch(/hoje: "4031-05-15"$/)
    })
  })

  it("lê as datas das notas como o Calendarium (número ou nome do mês)", () => {
    expect(parseNoteDate("4031-03-12", tharn)).toEqual({ year: 4031, month: 3, day: 12 })
    expect(parseNoteDate("4012-Colheita-01", tharn)).toEqual({ year: 4012, month: 5, day: 1 })
    expect(parseNoteDate("-120-Geada-03", tharn)).toEqual({ year: -120, month: 1, day: 3 })
    expect(parseNoteDate({ year: 4031, month: 2, day: 7 }, tharn)).toEqual({ year: 4031, month: 2, day: 7 })
    expect(parseNoteDate("*-04-01", tharn)).toBeNull()
    expect(parseNoteDate("12-03-4031", { ...tharn, dateFormat: "DD-MM-YYYY" })).toEqual({ year: 4031, month: 3, day: 12 })
  })
})

describe("Fantasy-Calendar (JSON do site) → runas-calendario", () => {
  const cal = readFantasyCalendar(JSON.parse(readFileSync(join(fixtures, "fantasy-calendar.json"), "utf8")))!
  const result = convertCalendar(cal, "Fantasy-Calendar")
  const engine = result.calendar

  it("lê como o importador do Calendarium: first_day a partir de 1, luas com shift", () => {
    expect(cal.firstWeekDay).toBe(2)
    expect(cal.moons).toEqual([{ name: "Lua Prata", cycle: 32, offset: 4, color: "#ccccff" }])
    expect(cal.current).toEqual({ year: 812, month: 3, day: 7 })
    const first: WorldDate = { year: 1, month: 1, day: 1 }
    expect(weekday(engine, first)).toBe("Três")
    expect(weekday(engine, { year: 812, month: 4, day: 7 })).toBe(referenceWeekday(cal, 812, 3, 7))
  })

  it("converte eventos por condição e por data, estações e o bissexto", () => {
    expect(holidaysOn(engine, { year: 900, month: 5, day: 10 }).map((h) => h.name)).toEqual(["Festival da Colheita"])
    expect(holidaysOn(engine, { year: 790, month: 4, day: 2 }).map((h) => h.name)).toEqual(["Grande Enchente"])
    expect(engine.months.map((m) => m.season)).toEqual(["Seca", "Seca", "Seca", "Chuvas", "Chuvas", "Chuvas"])
    expect(engine.leap).toEqual({ every: 5, month: 1, days: 1 })
    expect(result.note).toContain("- **Festival da Colheita** (todo 10 de Quarta Lua): Danças e pão doce.")
  })

  it("avisa do mês que só aparece em alguns anos", () => {
    expect(result.warnings.join("\n")).toContain("O mês “Lua Rara” só aparece a cada 3 anos")
  })
})
