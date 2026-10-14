import { addDays, addMonths, CalendarError, convert, dateProblem, dayNumber, equivalentYears, eraOf, formatDate, fromDayNumber, holidaysOn, isLeapYear, moons, parseCalendar, parseWorldDate, relative, season, weekday, weekdayIndex, worldDateText, yearsBetween, type Calendar, type WorldDate } from "./calendar"

const GREGORIANO = `
nome: Gregoriano
sufixo: d.C.
sufixo_negativo: a.C.
semana: [domingo, segunda, terça, quarta, quinta, sexta, sábado]
meses:
  - { nome: janeiro, dias: 31 }
  - { nome: fevereiro, dias: 28 }
  - { nome: março, dias: 31 }
  - { nome: abril, dias: 30 }
  - { nome: maio, dias: 31 }
  - { nome: junho, dias: 30 }
  - { nome: julho, dias: 31 }
  - { nome: agosto, dias: 31 }
  - { nome: setembro, dias: 30 }
  - { nome: outubro, dias: 31 }
  - { nome: novembro, dias: 30 }
  - { nome: dezembro, dias: 31 }
bissexto: { a_cada: 4, exceto_a_cada: 100, salvo_a_cada: 400, mes: fevereiro, dias: 1 }
`

const ORDEM_X_CAOS = `
nome: Calendário de Ordem x Caos
sufixo: C.E.
semana: [Pedra, Raiz, Chama, Vento, Maré, Sombra]
meses:
  - { nome: Gelo, dias: 36, estacao: Inverno }
  - { nome: Degelo, dias: 36, estacao: Inverno }
  - { nome: Semeadura, dias: 36, estacao: Primavera }
  - { nome: Brotos, dias: 36, estacao: Primavera }
  - { nome: Sol Alto, dias: 36, estacao: Verão }
  - { nome: Colheita, dias: 36, estacao: Verão }
  - { nome: Cinzas, dias: 36, estacao: Outono }
  - { nome: Brumas, dias: 36, estacao: Outono }
  - { nome: Longa Noite, dias: 36, estacao: Inverno }
  - { nome: Vigília, dias: 36, estacao: Inverno }
intercalares: { nome: Dias de Logi, depois_do_mes: 10, dias: 5 }
bissexto: { a_cada: 7, mes: Dias de Logi, dias: 1 }
luas:
  - { nome: Selene, ciclo: 28, cheia_em: "4031-01-04" }
  - { nome: Morr, ciclo: 45.5, cheia_em: "4031-01-21", cor: "#ffa48e" }
eras:
  - { nome: Era dos Magos, inicio: 3122 }
  - { nome: Era das Migrações, inicio: 3888 }
  - { nome: Era dos Caçadores, sigla: E.C., inicio: 4027 }
equivalente: { nome: Logi, deslocamento: 4027 }
feriados:
  - { nome: Festa das Cinzas, data: "07-01" }
  - { nome: Eclipse de Morr, data: "4030-05-12" }
hoje: "4031-07-15"
correspondencias:
  - { calendario: "[[Élfico]]", data: "4031-01-01", data_no_outro: "0812-01-01" }
`

const date = (text: string) => parseWorldDate(text)!
const utcDays = (y: number, m: number, d: number) => {
  const t = new Date(Date.UTC(2000, m - 1, d))
  t.setUTCFullYear(y)
  return Math.round(t.getTime() / 86_400_000)
}

describe("calendário gregoriano (conferido com o Date do JavaScript)", () => {
  const cal = parseCalendar(GREGORIANO)
  // Alinha a semana: 14/10/2026 é quarta-feira.
  cal.firstWeekday = ((3 - (dayNumber(cal, date("2026-10-14")) % 7)) % 7 + 7) % 7

  it("conta dias, anos bissextos e dias da semana como o calendário real", () => {
    const origin = utcDays(2026, 10, 14) - dayNumber(cal, date("2026-10-14"))
    for (const [y, m, d] of [[2000, 2, 29], [1900, 3, 1], [1600, 12, 31], [1, 1, 1], [9999, 12, 31], [2024, 2, 29], [1582, 10, 15], [400, 3, 1]] as const) {
      expect(dayNumber(cal, { year: y, month: m, day: d }) + origin).toBe(utcDays(y, m, d))
      const real = new Date(Date.UTC(2000, m - 1, d))
      real.setUTCFullYear(y)
      expect(weekdayIndex(cal, { year: y, month: m, day: d })).toBe(real.getUTCDay())
    }
    expect([1900, 2000, 2023, 2024, 2100].map((y) => isLeapYear(cal, y))).toEqual([false, true, false, true, false])
    expect(dateProblem(cal, date("2023-02-29"))).toContain("fevereiro tem 28 dias")
    expect(dateProblem(cal, date("2024-02-29"))).toBeNull()
  })

  it("ida e volta entre data e dia absoluto, inclusive antes do ano 0", () => {
    for (let n = -800_000; n <= 800_000; n += 997) {
      const d = fromDayNumber(cal, n)
      expect(dateProblem(cal, d)).toBeNull()
      expect(dayNumber(cal, d)).toBe(n)
    }
    expect(fromDayNumber(cal, -1)).toEqual({ year: -1, month: 12, day: 31 })
    expect(formatDate(cal, { year: -44, month: 3, day: 15 })).toBe("15 de março de 44 a.C.")
  })
})

describe("calendário de Ordem x Caos (intercalares, bissexto, luas, eras)", () => {
  const cal = parseCalendar(ORDEM_X_CAOS)

  it("os Dias de Logi ficam depois de Vigília, fora da semana, e a semana continua no ano seguinte", () => {
    expect(cal.months.map((m) => m.name).at(-1)).toBe("Dias de Logi")
    expect(weekday(cal, date("4031-11-02"))).toBeNull()
    const lastOfYear = weekdayIndex(cal, date("4031-10-36"))!
    expect(weekdayIndex(cal, date("4032-01-01"))).toBe((lastOfYear + 1) % 6)
    // Dias de Logi contam como dias (para idades e luas), só não têm dia da semana.
    expect(dayNumber(cal, date("4032-01-01")) - dayNumber(cal, date("4031-10-36"))).toBe(1 + 5 + (isLeapYear(cal, 4031) ? 1 : 0))
  })

  it("bissexto a cada 7 anos acrescenta um Dia de Logi", () => {
    expect(isLeapYear(cal, 4032)).toBe(4032 % 7 === 0)
    const leapYear = 4032 - (4032 % 7)
    expect(dateProblem(cal, { year: leapYear, month: 11, day: 6 })).toBeNull()
    expect(dateProblem(cal, { year: leapYear + 1, month: 11, day: 6 })).toContain("Dias de Logi tem 5 dias")
  })

  it("luas: cheia na data marcada e de novo depois de um ciclo; fases no meio", () => {
    const [selene, morr] = moons(cal, date("4031-01-04"))
    expect(selene!.fullToday).toBe(true)
    expect(moons(cal, addDays(cal, date("4031-01-04"), 28))[0]!.fullToday).toBe(true)
    expect(moons(cal, addDays(cal, date("4031-01-04"), 14))[0]!.phase).toBe("nova")
    expect(moons(cal, addDays(cal, date("4031-01-04"), 7))[0]!.phase).toBe("quarto minguante")
    expect(morr!.moon.color).toBe("#ffa48e")
    // Ciclo fracionário: a cheia cai no dia mais perto do pico.
    const fulls = Array.from({ length: 200 }, (_, i) => addDays(cal, date("4031-01-21"), i)).filter((d) => moons(cal, d)[1]!.fullToday)
    expect(fulls.map((d) => dayNumber(cal, d) - dayNumber(cal, date("4031-01-21")))).toEqual([0, 45, 91, 136, 182])
  })

  it("idade, tempo relativo, era, estação, equivalente e feriados", () => {
    const today = cal.today!
    expect(yearsBetween(date("3999-02-12"), today)).toBe(32)
    expect(yearsBetween(date("3999-07-16"), today)).toBe(31)
    expect(relative(cal, date("3911-01-01"), today)).toBe("há 120 anos")
    expect(relative(cal, date("4031-07-18"), today)).toBe("daqui a 3 dias")
    expect(relative(cal, today, today)).toBe("hoje")
    expect(eraOf(cal, 4031)).toMatchObject({ era: { name: "Era dos Caçadores" }, year: 5 })
    expect(eraOf(cal, 3000)).toBeNull()
    expect(season(cal, today)).toBe("Outono")
    expect(equivalentYears(cal, 4031)).toEqual(["4 Logi"])
    expect(formatDate(cal, today)).toBe("15 de Cinzas de 4031 C.E.")
    expect(formatDate(cal, date("4031-11-03"))).toBe("3º dos Dias de Logi de 4031 C.E.")
    expect(holidaysOn(cal, date("4035-07-01")).map((h) => h.name)).toEqual(["Festa das Cinzas"])
    expect(holidaysOn(cal, date("4030-05-12")).map((h) => h.name)).toEqual(["Eclipse de Morr"])
    expect(holidaysOn(cal, date("4031-05-12"))).toEqual([])
    expect(cal.correspondences).toEqual([{ calendar: "Élfico", here: date("4031-01-01"), there: date("0812-01-01") }])
  })

  it("somar meses mantém o dia dentro do mês de destino", () => {
    expect(addMonths(cal, date("4031-10-36"), 1)).toEqual({ year: 4031, month: 11, day: 5 })
    expect(addMonths(cal, date("4031-07-15"), -7)).toEqual({ year: 4030, month: 11, day: 5 })
  })
})

describe("conversão e erros", () => {
  it("converte entre calendários por um dia em comum", () => {
    const humano = parseCalendar(ORDEM_X_CAOS)
    const elfico: Calendar = parseCalendar("nome: Élfico\nsemana: [a, b, c]\nmeses:\n  - { nome: Folha, dias: 100 }\n  - { nome: Raiz, dias: 100 }\n")
    const anchor = { from: date("4031-01-01"), to: date("812-01-01") }
    expect(worldDateText(convert(humano, date("4031-01-11"), elfico, anchor))).toBe("0812-01-11")
    expect(convert(elfico, date("0812-02-01"), humano, { from: anchor.to, to: anchor.from })).toEqual(date("4031-03-29"))
  })

  it("explica o que está errado no bloco", () => {
    expect(() => parseCalendar("nome: x")).toThrow(CalendarError)
    expect(() => parseCalendar("meses:\n  - { nome: A }")).toThrow('precisa de "dias"')
    expect(() => parseCalendar("meses:\n  - { nome: A, dias: 10, intercalar: true }")).toThrow("Pelo menos um mês")
    expect(() => parseCalendar("meses: [{ nome: A, dias: 10 }]\nbissexto: { a_cada: 4, exceto_a_cada: 10 }")).toThrow("múltiplo")
    expect(() => parseCalendar("meses: [{ nome: A, dias: 10 }]\nhoje: \"2000-01-11\"")).toThrow('"hoje" inválido')
    expect(() => parseCalendar("meses: [{ nome: A, dias: 10 }]\nluas: [{ nome: L }]")).toThrow("ciclo")
    expect(() => parseCalendar("[1, 2")).toThrow("YAML inválido")
  })
})

describe("datas em texto", () => {
  it("lê e escreve AAAA-MM-DD com ano negativo", () => {
    expect(parseWorldDate("-120-03-01")).toEqual({ year: -120, month: 3, day: 1 } satisfies WorldDate)
    expect(worldDateText({ year: -120, month: 3, day: 1 })).toBe("-0120-03-01")
    expect(parseWorldDate("15 de março")).toBeNull()
  })
})
