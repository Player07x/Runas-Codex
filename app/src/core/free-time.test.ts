import { describe, expect, it } from "vitest"
import { importIcs, parseEvent, type AgendaEvent } from "./agenda"
import { EMPTY_FREE_TIME, formatInterval, formatMinutes, freeDay, hasAvailability, parseFreeTimePrefs, taskTimeBlock, union, wallToInstant, type FreeTimePrefs, type TimedTask } from "./free-time"

const TZ = "America/Sao_Paulo"
const ev = (path: string, yaml: string): AgendaEvent => parseEvent(path, `---\n${yaml}\n---\n`)!
const prefs = (patch: Partial<FreeTimePrefs> = {}): FreeTimePrefs => ({ ...EMPTY_FREE_TIME, weekly: Array.from({ length: 7 }, () => [{ start: "08:00", end: "18:00" }]), timeZone: TZ, ...patch })
const NOON = wallToInstant("2026-10-20", "12:00", TZ)
const ranges = (day: ReturnType<typeof freeDay>, tz = TZ) => day.free.map((i) => formatInterval(i, day.date, tz))

describe("tempo livre", () => {
  it("caso de aceitação: 08–18 menos 09–11, 10–12 e 15–16 dá 6 h em três faixas", () => {
    const events = [
      ev("Agenda/a.md", 'title: A\ndate: "2026-10-20"\nstartTime: "09:00"\nendTime: "11:00"'),
      ev("Agenda/b.md", 'title: B\ndate: "2026-10-20"\nstartTime: "10:00"\nendTime: "12:00"'),
      ev("Agenda/c.md", 'title: C\ndate: "2026-10-20"\nstartTime: "15:00"\nendTime: "16:00"'),
      // Fora da disponibilidade: não muda o total.
      ev("Agenda/d.md", 'title: D\ndate: "2026-10-20"\nstartTime: "19:00"\nendTime: "21:00"'),
    ]
    const day = freeDay("2026-10-20", prefs(), events, [], NOON - 86_400_000)
    expect(formatMinutes(day.freeMinutes)).toBe("6 h")
    expect(ranges(day)).toEqual(["08:00–09:00", "12:00–15:00", "16:00–18:00"])
    expect(day.remainingMinutes).toBeNull()
  })

  it("tarefa sem horário não ocupa; com horário (Day Planner) ocupa, sem contar duas vezes com o evento", () => {
    const events = [ev("Agenda/a.md", 'title: A\ndate: "2026-10-20"\nstartTime: "09:00"\nendTime: "11:00"')]
    const tasks: TimedTask[] = [
      { date: "2026-10-20", start: "10:00", end: "12:00", label: "Revisar" },
      { date: "2026-10-21", start: "08:00", end: "18:00", label: "outro dia" },
    ]
    expect(freeDay("2026-10-20", prefs(), events, tasks, 0).freeMinutes).toBe(7 * 60)
    expect(freeDay("2026-10-20", prefs({ taskBlocks: false }), events, tasks, 0).freeMinutes).toBe(8 * 60)
    expect(taskTimeBlock("09:30 - 10:15 Ligar")).toEqual({ start: "09:30", end: "10:15", label: "Ligar" })
    expect(taskTimeBlock("Ligar às 09:30")).toBeNull()
  })

  it("faixas disponíveis sobrepostas não inflam o total; várias faixas no dia", () => {
    const p = prefs({ weekly: Array.from({ length: 7 }, () => [{ start: "08:00", end: "12:00" }, { start: "10:00", end: "13:00" }, { start: "14:00", end: "16:00" }]) })
    expect(freeDay("2026-10-20", p, [], [], 0).freeMinutes).toBe(7 * 60)
  })

  it("dia sem faixa e dia todo ocupado", () => {
    const p = prefs({ exceptions: { "2026-10-20": [] } })
    const empty = freeDay("2026-10-20", p, [], [], 0)
    expect(empty.unavailable).toBe(true)
    expect(empty.freeMinutes).toBe(0)
    const full = freeDay("2026-10-21", prefs(), [ev("Agenda/x.md", 'title: X\ndate: "2026-10-21"\nstartTime: "07:00"\nendTime: "19:00"')], [], 0)
    expect(full.freeMinutes).toBe(0)
    expect(full.unavailable).toBe(false)
  })

  it("dia inteiro: bloqueia as faixas ou é só anotação, conforme a escolha", () => {
    const events = [ev("Agenda/f.md", 'title: Feriado\ndate: "2026-10-20"\nallDay: true')]
    expect(freeDay("2026-10-20", prefs(), events, [], 0).freeMinutes).toBe(0)
    expect(freeDay("2026-10-20", prefs({ allDay: "ignore" }), events, [], 0).freeMinutes).toBe(10 * 60)
    const multi = [ev("Agenda/v.md", 'title: Viagem\ndate: "2026-10-19"\nendDate: "2026-10-21"\nallDay: true')]
    expect(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22"].map((d) => freeDay(d, prefs(), multi, [], 0).freeMinutes)).toEqual([0, 0, 0, 600])
  })

  it("evento que atravessa a meia-noite ocupa os dois dias", () => {
    const p = prefs({ weekly: Array.from({ length: 7 }, () => [{ start: "00:00", end: "24:00" }]) })
    const events = [ev("Agenda/n.md", 'title: Noite\ndate: "2026-10-20"\nstartTime: "22:00"\nendTime: "02:00"')]
    expect(freeDay("2026-10-20", p, events, [], 0).freeMinutes).toBe(22 * 60)
    expect(freeDay("2026-10-21", p, events, [], 0).freeMinutes).toBe(22 * 60)
  })

  it("recorrência com data pulada, evento marcado como livre e calendários escolhidos", () => {
    const weekly = ev("Agenda/Trabalho/r.md", 'title: Reunião\ntype: rrule\nstartDate: "2026-10-01"\nrrule: "FREQ=DAILY"\nskipDates: ["2026-10-21"]\nstartTime: "09:00"\nendTime: "10:00"')
    const free = ev("Agenda/l.md", 'title: Lembrete\ndate: "2026-10-20"\nstartTime: "13:00"\nendTime: "14:00"\nocupado: false')
    expect(free.busy).toBe(false)
    expect(freeDay("2026-10-20", prefs(), [weekly, free], [], 0).freeMinutes).toBe(9 * 60)
    expect(freeDay("2026-10-21", prefs(), [weekly], [], 0).freeMinutes).toBe(10 * 60)
    expect(freeDay("2026-10-20", prefs({ calendars: ["Agenda/Pessoal"] }), [weekly], [], 0).freeMinutes).toBe(10 * 60)
    expect(freeDay("2026-10-20", prefs({ calendars: ["Agenda/Trabalho"] }), [weekly], [], 0).freeMinutes).toBe(9 * 60)
  })

  it("hoje: livre no dia e livre restante (só o que vem depois de agora)", () => {
    const events = [ev("Agenda/a.md", 'title: A\ndate: "2026-10-20"\nstartTime: "13:00"\nendTime: "14:00"')]
    const day = freeDay("2026-10-20", prefs(), events, [], NOON)
    expect(day.freeMinutes).toBe(9 * 60)
    expect(day.remainingMinutes).toBe(5 * 60)
  })

  it("horário de verão: o dia tem 23 ou 25 horas e nada é contado como 24 h", () => {
    const allDay = { weekly: Array.from({ length: 7 }, () => [{ start: "00:00", end: "24:00" }]) }
    const ny = prefs({ ...allDay, timeZone: "America/New_York" })
    expect(freeDay("2026-03-08", ny, [], [], 0).freeMinutes).toBe(23 * 60)
    expect(freeDay("2026-11-01", ny, [], [], 0).freeMinutes).toBe(25 * 60)
    expect(freeDay("2026-11-02", ny, [], [], 0).freeMinutes).toBe(24 * 60)
    // 01:00–03:00 no dia em que o relógio volta: 3 horas reais.
    expect(freeDay("2026-11-01", prefs({ weekly: Array.from({ length: 7 }, () => [{ start: "01:00", end: "03:00" }]), timeZone: "America/New_York" }), [], [], 0).freeMinutes).toBe(3 * 60)
  })

  it("sem faixas configuradas, a tela pede configuração", () => {
    expect(hasAvailability(EMPTY_FREE_TIME)).toBe(false)
    expect(hasAvailability(prefs())).toBe(true)
    expect(parseFreeTimePrefs('{"weekly":[[{"start":"09:00","end":"08:00"}],[{"start":"08:00","end":"12:00"}]],"allDay":"ignore"}').weekly.slice(0, 2)).toEqual([[], [{ start: "08:00", end: "12:00" }]])
  })

  it("união junta sobreposições e encostos", () => {
    expect(union([{ start: 5, end: 7 }, { start: 1, end: 3 }, { start: 3, end: 4 }, { start: 6, end: 9 }])).toEqual([{ start: 1, end: 4 }, { start: 5, end: 9 }])
  })
})

describe(".ics para o tempo livre", () => {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:serie",
    "DTSTART:20261019T120000Z",
    "DTEND:20261019T130000Z",
    "RRULE:FREQ=WEEKLY;BYDAY=MO,TU",
    "SUMMARY:Aula",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:serie",
    "RECURRENCE-ID:20261020T120000Z",
    "DTSTART:20261020T170000Z",
    "DTEND:20261020T180000Z",
    "SUMMARY:Aula (mudou de hora)",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:serie",
    "RECURRENCE-ID:20261026T120000Z",
    "STATUS:CANCELLED",
    "DTSTART:20261026T120000Z",
    "SUMMARY:Aula",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:livre",
    "DTSTART:20261021T120000Z",
    "DTEND:20261021T130000Z",
    "TRANSP:TRANSPARENT",
    "SUMMARY:Pode marcar por cima",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:cancelado",
    "STATUS:CANCELLED",
    "DTSTART:20261022T120000Z",
    "SUMMARY:Cancelado",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  it("ocorrência alterada vira evento próprio e pula a data; cancelados somem; transparente não ocupa", () => {
    const list = importIcs(ics)
    expect(list.map((e) => e.title)).toEqual(["Aula", "Pode marcar por cima", "Aula (mudou de hora)"])
    const serie = list[0]!
    expect(serie.repeat.kind).toBe("rrule")
    expect(serie.skipDates.length).toBe(2)
    expect(list[1]!.busy).toBe(false)
    expect(list[2]!.repeat.kind).toBe("none")
  })
})
