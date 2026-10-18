import { eventFileName, eventNote, expandEvents, exportIcs, importIcs, isoDate, nextSession, normalizeTime, occurrences, parseEvent, parseReminder, updateEventNote, upcomingReminders, type AgendaEvent, type EventInput } from "./agenda"
import { parseFrontmatter } from "./parse"

const event = (path: string, yaml: string, body = "") => parseEvent(path, `---\n${yaml}\n---\n${body}`)!
const days = (list: { start: Date }[]) => list.map((o) => isoDate(o.start))
const range = (from: string, to: string) => [new Date(`${from}T00:00`), new Date(`${to}T00:00`)] as const

describe("parseEvent (formato Full Calendar)", () => {
  it("evento de um dia com horário e as chaves do Runas-Codex", () => {
    const e = event("Agenda/2026-10-17 Sessão 12.md", "title: Sessão 12\nallDay: false\nstartTime: 19:30\nendTime: 23:30\ntype: single\ndate: 2026-10-17\nlocal: Casa do Bruno\ncategoria: Sessão\ncor: red\nlembrete: 1440\nsessao: \"[[Campanhas/Valdris/Sessão 12]]\"\ncontagem: true")
    expect(e).toMatchObject({ title: "Sessão 12", allDay: false, date: "2026-10-17", startTime: "19:30", endTime: "23:30", repeat: { kind: "none" }, location: "Casa do Bruno", category: "Sessão", color: "red", reminders: [1440], session: "Campanhas/Valdris/Sessão 12", countdown: true })
  })

  it("título pelo nome do arquivo, dia inteiro, vários dias e horas em am/pm", () => {
    expect(event("Agenda/2026-10-21 Aniversário.md", "allDay: true\ndate: 2026-10-21")).toMatchObject({ title: "Aniversário", allDay: true })
    expect(event("Agenda/Viagem.md", "allDay: true\ndate: 2026-10-01\nendDate: 2026-10-03").endDate).toBe("2026-10-03")
    expect(normalizeTime("7:30 pm")).toBe("19:30")
    expect(normalizeTime("12:05 AM")).toBe("00:05")
    expect(normalizeTime("25:00")).toBeUndefined()
  })

  it("recorrência semanal e por RRULE; nota sem data não é evento", () => {
    expect(event("Agenda/Mesa.md", "type: recurring\ndaysOfWeek: [S]\nstartRecur: 2026-10-03\nstartTime: 19:30").repeat).toEqual({ kind: "weekly", days: [6] })
    expect(event("Agenda/Quinzenal.md", "type: rrule\nstartDate: 2026-10-03\nrrule: FREQ=WEEKLY;INTERVAL=2\nskipDates: [2026-10-17]").repeat).toEqual({ kind: "rrule", rule: "FREQ=WEEKLY;INTERVAL=2" })
    expect(parseEvent("Agenda/x.md", "---\ntitle: sem data\n---\n")).toBeNull()
    expect(parseEvent("Agenda/x.md", "sem frontmatter")).toBeNull()
  })

  it("lembretes em minutos, horas e dias", () => {
    expect([30, "1h", "1d", "15m", "0", "x"].map(parseReminder)).toEqual([30, 60, 1440, 15, 0, undefined])
  })
})

describe("occurrences", () => {
  const weekly = event("Agenda/Mesa.md", "type: recurring\ndaysOfWeek: [S, W]\nstartRecur: 2026-10-03\nendRecur: 2026-10-24\nstartTime: 19:30\nendTime: 23:00")

  it("semanal entre o começo e o fim da recorrência", () => {
    expect(days(occurrences(weekly, ...range("2026-10-01", "2026-11-01")))).toEqual(["2026-10-03", "2026-10-07", "2026-10-10", "2026-10-14", "2026-10-17", "2026-10-21", "2026-10-24"])
  })

  it("RRULE quinzenal pulando uma data", () => {
    const e = event("Agenda/Q.md", "type: rrule\nstartDate: 2026-10-03\nrrule: FREQ=WEEKLY;INTERVAL=2\nskipDates: [2026-10-17]\nallDay: true")
    expect(days(occurrences(e, ...range("2026-10-01", "2026-11-30")))).toEqual(["2026-10-03", "2026-10-31", "2026-11-14", "2026-11-28"])
  })

  it("mensal e anual por RRULE", () => {
    const monthly = event("Agenda/M.md", "type: rrule\nstartDate: 2026-01-31\nrrule: FREQ=MONTHLY;BYMONTHDAY=-1\nallDay: true")
    expect(days(occurrences(monthly, ...range("2026-02-01", "2026-05-01")))).toEqual(["2026-02-28", "2026-03-31", "2026-04-30"])
    const yearly = event("Agenda/A.md", "type: rrule\nstartDate: 2020-10-21\nrrule: FREQ=YEARLY\nallDay: true")
    expect(days(occurrences(yearly, ...range("2026-01-01", "2027-12-31")))).toEqual(["2026-10-21", "2027-10-21"])
  })

  it("evento que passa da meia-noite e evento de vários dias aparecem no intervalo", () => {
    const late = event("Agenda/L.md", "date: 2026-10-17\nstartTime: 22:00\nendTime: 02:00")
    const [o] = occurrences(late, ...range("2026-10-18", "2026-10-19"))
    expect(o!.end.getDate()).toBe(18)
    const trip = event("Agenda/T.md", "allDay: true\ndate: 2026-10-01\nendDate: 2026-10-03")
    expect(occurrences(trip, ...range("2026-10-02", "2026-10-03"))).toHaveLength(1)
  })

  it("próxima sessão (contagem regressiva)", () => {
    const sessions = [event("Agenda/Mesa.md", "type: recurring\ndaysOfWeek: [S]\nstartRecur: 2026-10-03\nstartTime: 19:30\ncategoria: Sessão"), event("Agenda/Dentista.md", "date: 2026-10-15\nstartTime: 09:00")]
    expect(isoDate(nextSession(sessions, new Date("2026-10-14T10:00"))!.start)).toBe("2026-10-17")
  })
})

describe("lembretes", () => {
  it("dispara antes de cada ocorrência, dentro do horizonte", () => {
    const e = event("Agenda/Mesa.md", "type: recurring\ndaysOfWeek: [S]\nstartRecur: 2026-10-03\nstartTime: 19:30\nlembrete: [\"1d\", 60]\nlocal: Casa do Bruno")
    const list = upcomingReminders([e], new Date("2026-10-14T10:00"), 7)
    expect(list.map((r) => r.at.toISOString())).toEqual([new Date("2026-10-16T19:30").toISOString(), new Date("2026-10-17T18:30").toISOString()])
    expect(list[0]!.body).toContain("Casa do Bruno")
  })
})

describe("evento → nota", () => {
  const input: EventInput = { title: "Sessão 13", allDay: false, date: "2026-10-24", startTime: "19:30", endTime: "23:30", repeat: { kind: "none" }, skipDates: [], reminders: [1440], countdown: true, category: "Sessão", color: "red", session: "Campanhas/Valdris/Sessão 13", notes: "- [ ] Imprimir mapas\n" }

  it("grava no formato do Full Calendar e lê de volta igual", () => {
    const text = eventNote(input)
    expect(text).toContain('startTime: "19:30"')
    expect(text).toContain("type: single")
    expect(text).toContain('date: "2026-10-24"')
    expect(text.endsWith("- [ ] Imprimir mapas\n")).toBe(true)
    const { notes, ...rest } = input
    void notes
    expect(parseEvent("Agenda/x.md", text)).toEqual({ path: "Agenda/x.md", ...rest })
  })

  it("mudar a repetição troca as chaves e preserva as que a agenda não conhece", () => {
    const text = eventNote(input).replace("---\n", "---\nautor: João\n")
    const weekly = updateEventNote(text, { ...input, repeat: { kind: "weekly", days: [6] } })
    const data = parseFrontmatter(weekly)!.data!
    expect(data).toMatchObject({ autor: "João", type: "recurring", daysOfWeek: ["S"], startRecur: "2026-10-24" })
    expect(data.date).toBeUndefined()
    expect(updateEventNote(weekly, { ...input, repeat: { kind: "weekly", days: [6] } })).toBe(weekly)
  })

  it("nome do arquivo como o Full Calendar, sem caracteres proibidos", () => {
    expect(eventFileName(input)).toBe("2026-10-24 Sessão 13")
    expect(eventFileName({ title: "Mesa: semanal?", date: "2026-10-03", repeat: { kind: "weekly", days: [6] } })).toBe("Mesa- semanal-")
  })
})

describe(".ics", () => {
  const events: AgendaEvent[] = [
    event("Agenda/2026-10-17 Sessão 12.md", "title: Sessão 12\nstartTime: 19:30\nendTime: 23:30\ndate: 2026-10-17\nlocal: Casa do Bruno\nlembrete: 1440"),
    event("Agenda/Mesa.md", "title: Mesa semanal\ntype: recurring\ndaysOfWeek: [S]\nstartRecur: 2026-10-03\nallDay: true"),
    event("Agenda/Q.md", "title: Quinzenal\ntype: rrule\nstartDate: 2026-10-03\nrrule: FREQ=WEEKLY;INTERVAL=2\nskipDates: [2026-10-17]\nstartTime: 10:00"),
  ]

  it("exporta e importa de volta sem perder nada importante", () => {
    const ics = exportIcs(events.map((e) => ({ event: e, notes: e.title === "Sessão 12" ? "Levar mapas" : "" })), new Date("2026-10-14T12:00Z"))
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=SA")
    expect(ics).toContain("TRIGGER:-P1D")
    const back = importIcs(ics)
    expect(back.map((e) => e.title)).toEqual(["Sessão 12", "Mesa semanal", "Quinzenal"])
    expect(back[0]).toMatchObject({ date: "2026-10-17", startTime: "19:30", endTime: "23:30", location: "Casa do Bruno", reminders: [1440], notes: "Levar mapas" })
    expect(back[1]).toMatchObject({ allDay: true, repeat: { kind: "weekly", days: [6] } })
    expect(back[2]).toMatchObject({ repeat: { kind: "rrule", rule: "FREQ=WEEKLY;INTERVAL=2" }, skipDates: ["2026-10-17"] })
  })

  it("importa horários com fuso e dia inteiro de outro app", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "UID:1",
      "SUMMARY:Reunião",
      "DTSTART:20261020T130000Z",
      "DTEND:20261020T140000Z",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:2",
      "SUMMARY:Feriado",
      "DTSTART;VALUE=DATE:20261102",
      "DTEND;VALUE=DATE:20261103",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n")
    const [meeting, holiday] = importIcs(ics)
    const local = new Date("2026-10-20T13:00:00Z")
    expect(meeting).toMatchObject({ date: isoDate(local), startTime: `${String(local.getHours()).padStart(2, "0")}:00` })
    expect(holiday).toMatchObject({ allDay: true, date: "2026-11-02" })
    expect(holiday!.endDate).toBeUndefined()
  })

  it("expande vários eventos em ordem", () => {
    expect(expandEvents(events, ...range("2026-10-01", "2026-10-11")).map((o) => o.event.title)).toEqual(["Mesa semanal", "Quinzenal", "Mesa semanal"])
  })
})
