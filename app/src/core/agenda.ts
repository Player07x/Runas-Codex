import ICAL from "ical.js"
import { parseFrontmatter } from "./parse"
import { setProperty, type PropertyValue } from "./properties"
import { noteBody } from "./sections"
import { noteName } from "./text"

/**
 * Agenda real (etapa 5): cada evento é uma nota em `Agenda/` no formato do plugin **Full Calendar** do Obsidian —
 * `title`, `allDay`, `startTime`/`endTime`, `type` (`single`, `recurring` com `daysOfWeek`, `rrule` com `startDate`
 * e `skipDates`) —, então o Obsidian mostra os mesmos eventos se o plugin estiver ligado. O que o Full Calendar não tem
 * vai em chaves próprias que ele ignora: `local`, `categoria`, `cor`, `lembrete` (minutos antes), `sessao` (link para a
 * nota da sessão) e `contagem` (contagem regressiva na tela inicial). O texto da nota é o lugar das anotações e da
 * checklist de preparação.
 */

export const AGENDA_ROOT = "Agenda/"
export const EVENT_COLORS = ["red", "gold", "cyan", "violet", "green"] as const
export type EventColor = (typeof EVENT_COLORS)[number]

/** Dias da semana do Full Calendar: domingo = U, segunda = M, … sábado = S. */
const WEEK_LETTERS = ["U", "M", "T", "W", "R", "F", "S"]
const ICAL_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]

export type Repeat = { kind: "none" } | { kind: "weekly"; days: number[] } | { kind: "rrule"; rule: string }

export interface AgendaEvent {
  path: string
  title: string
  allDay: boolean
  /** Primeiro dia (`YYYY-MM-DD`): a data do evento ou o começo da recorrência. */
  date: string
  /** Último dia de um evento de vários dias. */
  endDate?: string
  startTime?: string
  endTime?: string
  repeat: Repeat
  /** Último dia da recorrência semanal (`endRecur`). */
  until?: string
  /** Datas puladas de uma recorrência (`skipDates`). */
  skipDates: string[]
  /** Tarefa do Full Calendar: `true` feita, `false` por fazer, `undefined` não é tarefa. */
  completed?: boolean
  location?: string
  category?: string
  color?: EventColor
  /** Lembretes, em minutos antes do início. */
  reminders: number[]
  /** Alvo do link da nota da sessão (`[[alvo]]`). */
  session?: string
  countdown: boolean
}

/** O que a tela de evento edita (e o que um `.ics` importado vira). */
export type EventInput = Omit<AgendaEvent, "path"> & { notes?: string }

export interface Occurrence {
  event: AgendaEvent
  start: Date
  end: Date
  /** `caminho@AAAA-MM-DD`: identifica esta ocorrência. */
  key: string
}

// ---------- Datas ----------

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (n: number) => String(n).padStart(2, "0")

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDate(value: string, time?: string): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number]
  const [hh, mm] = (time ?? "00:00").split(":").map(Number) as [number, number]
  return new Date(y, m - 1, d, hh, mm)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes())
}

/** `19:30`, `7:30`, `7:30 pm` (o Full Calendar aceita os dois) → `HH:mm`. */
export function normalizeTime(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) value = String(value)
  if (typeof value !== "string") return undefined
  const m = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?\s*$/i.exec(value)
  if (!m) return undefined
  let hour = Number(m[1])
  const ampm = m[3]?.toLowerCase()
  if (ampm?.startsWith("p") && hour < 12) hour += 12
  if (ampm?.startsWith("a") && hour === 12) hour = 0
  return hour < 24 && Number(m[2]) < 60 ? `${pad(hour)}:${m[2]}` : undefined
}

function dateValue(value: unknown): string | undefined {
  if (value instanceof Date) return isoDate(value)
  return typeof value === "string" && ISO_DATE.test(value.trim()) ? value.trim() : undefined
}

/** `30`, `"1h"`, `"1d"`, `"15m"`, `"0"` → minutos. */
export function parseReminder(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.round(value)
  if (typeof value !== "string") return undefined
  const m = /^\s*(\d+)\s*(m|min|h|d)?\s*$/i.exec(value)
  if (!m) return undefined
  const unit = (m[2] ?? "m").toLowerCase()
  return Number(m[1]) * (unit === "h" ? 60 : unit === "d" ? 1440 : 1)
}

// ---------- Nota → evento ----------

const linkTarget = (value: unknown) => (typeof value === "string" ? /^\s*\[\[([^\]|#]+)/.exec(value)?.[1]?.trim() ?? (value.trim() || undefined) : undefined)

/** Lê uma nota de evento (formato Full Calendar); `null` se a nota não é um evento válido. */
export function parseEvent(path: string, text: string): AgendaEvent | null {
  const data = parseFrontmatter(text)?.data
  if (!data) return null
  const type = typeof data.type === "string" ? data.type : Array.isArray(data.daysOfWeek) ? "recurring" : typeof data.rrule === "string" ? "rrule" : "single"
  const startTime = normalizeTime(data.startTime)
  const allDay = data.allDay === true || !startTime
  let date: string | undefined
  let repeat: Repeat = { kind: "none" }
  let until: string | undefined
  if (type === "recurring") {
    const days = (Array.isArray(data.daysOfWeek) ? data.daysOfWeek : []).map((d) => WEEK_LETTERS.indexOf(String(d).toUpperCase())).filter((d) => d >= 0)
    if (!days.length) return null
    repeat = { kind: "weekly", days: [...new Set(days)].sort() }
    date = dateValue(data.startRecur) ?? "1970-01-01"
    until = dateValue(data.endRecur)
  } else if (type === "rrule") {
    if (typeof data.rrule !== "string" || !data.rrule.trim()) return null
    repeat = { kind: "rrule", rule: data.rrule.trim().replace(/^RRULE:/i, "") }
    date = dateValue(data.startDate) ?? dateValue(data.date)
  } else {
    date = dateValue(data.date)
  }
  if (!date) return null
  const color = EVENT_COLORS.find((c) => c === data.cor)
  const reminders = (Array.isArray(data.lembrete) ? data.lembrete : data.lembrete === undefined || data.lembrete === null ? [] : [data.lembrete]).map(parseReminder).filter((m): m is number => m !== undefined)
  const completed = data.completed === undefined ? undefined : data.completed === true || (typeof data.completed === "string" && data.completed.trim() !== "" && data.completed !== "false")
  return {
    path,
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : noteName(path).replace(/^\d{4}-\d{2}-\d{2}\s+/, ""),
    allDay,
    date,
    ...(type === "single" && dateValue(data.endDate) && dateValue(data.endDate)! > date ? { endDate: dateValue(data.endDate) } : {}),
    ...(allDay ? {} : { startTime, ...(normalizeTime(data.endTime) ? { endTime: normalizeTime(data.endTime) } : {}) }),
    repeat,
    ...(until ? { until } : {}),
    skipDates: (Array.isArray(data.skipDates) ? data.skipDates : []).map(dateValue).filter((d): d is string => Boolean(d)),
    ...(completed === undefined ? {} : { completed }),
    ...(typeof data.local === "string" && data.local.trim() ? { location: data.local.trim() } : {}),
    ...(typeof data.categoria === "string" && data.categoria.trim() ? { category: data.categoria.trim() } : {}),
    ...(color ? { color } : {}),
    reminders: [...new Set(reminders)].sort((a, b) => a - b),
    ...(linkTarget(data.sessao) ? { session: linkTarget(data.sessao) } : {}),
    countdown: data.contagem === true,
  }
}

// ---------- Ocorrências ----------

/** Início e fim de uma ocorrência que começa no dia `day`. */
function span(event: AgendaEvent, day: string): { start: Date; end: Date } {
  const days = event.endDate ? Math.round((parseDate(event.endDate).getTime() - parseDate(event.date).getTime()) / 86_400_000) : 0
  if (event.allDay) {
    const start = parseDate(day)
    return { start, end: addDays(start, days + 1) }
  }
  const start = parseDate(day, event.startTime)
  let end = event.endTime ? addDays(parseDate(day, event.endTime), days) : new Date(start.getTime() + 3_600_000)
  if (end <= start) end = addDays(end, 1) // termina depois da meia-noite
  return { start, end }
}

const MAX_OCCURRENCES = 5000

/** Ocorrências de um evento que encostam em [from, to). */
export function occurrences(event: AgendaEvent, from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = []
  const push = (day: string) => {
    if (event.skipDates.includes(day)) return
    const { start, end } = span(event, day)
    if (end > from && start < to) out.push({ event, start, end, key: `${event.path}@${day}` })
  }
  const length = span(event, event.date)
  const reach = length.end.getTime() - length.start.getTime()
  if (event.repeat.kind === "none") {
    push(event.date)
  } else if (event.repeat.kind === "weekly") {
    const first = parseDate(event.date)
    let day = new Date(Math.max(first.getTime(), from.getTime() - reach))
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate())
    const last = event.until ? parseDate(event.until) : null
    for (let i = 0; day < to && i < MAX_OCCURRENCES; i++, day = addDays(day, 1)) {
      if (last && day > last) break
      if (event.repeat.days.includes(day.getDay())) push(isoDate(day))
    }
  } else {
    let recur: ICAL.Recur
    try {
      recur = ICAL.Recur.fromString(event.repeat.rule)
    } catch {
      return out
    }
    const [y, m, d] = event.date.split("-").map(Number) as [number, number, number]
    const [hh, mm] = (event.startTime ?? "00:00").split(":").map(Number) as [number, number]
    const dtstart = ICAL.Time.fromData({ year: y, month: m, day: d, hour: event.allDay ? 0 : hh, minute: event.allDay ? 0 : mm, second: 0, isDate: event.allDay })
    const iterator = recur.iterator(dtstart)
    for (let i = 0, next = iterator.next(); next && i < MAX_OCCURRENCES; i++, next = iterator.next()) {
      const day = `${next.year}-${pad(next.month)}-${pad(next.day)}`
      if (parseDate(day) >= to) break
      if (parseDate(day).getTime() + reach + 86_400_000 < from.getTime()) continue
      push(day)
    }
  }
  return out
}

export function expandEvents(events: AgendaEvent[], from: Date, to: Date): Occurrence[] {
  return events.flatMap((event) => occurrences(event, from, to)).sort((a, b) => a.start.getTime() - b.start.getTime() || a.event.title.localeCompare(b.event.title, "pt-BR"))
}

/** A próxima ocorrência de uma sessão com contagem regressiva (ou de qualquer evento da categoria Sessão). */
export function nextSession(events: AgendaEvent[], now: Date): Occurrence | undefined {
  const candidates = events.filter((e) => e.countdown || /^sess/i.test(e.category ?? "") || e.session)
  return expandEvents(candidates, now, addDays(now, 400)).find((o) => o.start >= now)
}

// ---------- Lembretes ----------

export interface Reminder {
  id: string
  at: Date
  title: string
  body: string
  /** Caminho da nota do evento (abrir ao tocar na notificação). */
  path: string
}

function describeWhen(occurrence: Occurrence): string {
  const day = occurrence.start.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
  return occurrence.event.allDay ? day : `${day}, ${pad(occurrence.start.getHours())}:${pad(occurrence.start.getMinutes())}`
}

/** Lembretes que disparam entre `now` e `now + horizonDays`. */
export function upcomingReminders(events: AgendaEvent[], now: Date, horizonDays = 14): Reminder[] {
  const withReminders = events.filter((e) => e.reminders.length && e.completed !== true)
  const maxBefore = Math.max(0, ...withReminders.flatMap((e) => e.reminders))
  const list: Reminder[] = []
  for (const occurrence of expandEvents(withReminders, now, new Date(now.getTime() + horizonDays * 86_400_000 + maxBefore * 60_000))) {
    for (const minutes of occurrence.event.reminders) {
      const at = new Date(occurrence.start.getTime() - minutes * 60_000)
      if (at < now || at.getTime() > now.getTime() + horizonDays * 86_400_000) continue
      const where = occurrence.event.location ? ` · ${occurrence.event.location}` : ""
      list.push({ id: `${occurrence.key}#${minutes}`, at, title: occurrence.event.title, body: `${describeWhen(occurrence)}${where}`, path: occurrence.event.path })
    }
  }
  return list.sort((a, b) => a.at.getTime() - b.at.getTime())
}

// ---------- Evento → nota ----------

/** Chaves que a agenda grava (as demais da nota ficam como estão). */
const MANAGED = ["title", "allDay", "startTime", "endTime", "type", "date", "endDate", "daysOfWeek", "startRecur", "endRecur", "startDate", "rrule", "skipDates", "completed", "local", "categoria", "cor", "lembrete", "sessao", "contagem"]

function eventProperties(input: EventInput): Record<string, PropertyValue> {
  const props: Record<string, PropertyValue> = { title: input.title, allDay: input.allDay }
  if (!input.allDay && input.startTime) {
    props.startTime = input.startTime
    if (input.endTime) props.endTime = input.endTime
  }
  if (input.repeat.kind === "none") {
    props.type = "single"
    props.date = input.date
    if (input.endDate && input.endDate > input.date) props.endDate = input.endDate
  } else if (input.repeat.kind === "weekly") {
    props.type = "recurring"
    props.daysOfWeek = input.repeat.days.map((d) => WEEK_LETTERS[d]!)
    props.startRecur = input.date
    if (input.until) props.endRecur = input.until
  } else {
    props.type = "rrule"
    props.startDate = input.date
    props.rrule = input.repeat.rule
    props.skipDates = input.skipDates
  }
  if (input.completed !== undefined) props.completed = input.completed
  if (input.location) props.local = input.location
  if (input.category) props.categoria = input.category
  if (input.color) props.cor = input.color
  if (input.reminders.length === 1) props.lembrete = input.reminders[0]!
  else if (input.reminders.length > 1) props.lembrete = input.reminders.map(String)
  if (input.session) props.sessao = `[[${input.session}]]`
  if (input.countdown) props.contagem = true
  return props
}

/** Texto de uma nota de evento nova. */
export function eventNote(input: EventInput): string {
  let text = `---\n---\n${input.notes ?? ""}`
  for (const [key, value] of Object.entries(eventProperties(input))) text = setProperty(text, key, value)
  return text
}

/** Aplica a edição de um evento numa nota que já existe, mexendo só nas chaves da agenda. */
export function updateEventNote(text: string, input: EventInput): string {
  const props = eventProperties(input)
  let next = text
  for (const key of MANAGED) {
    const current = parseFrontmatter(next)?.data?.[key]
    if (key in props) {
      if (JSON.stringify(current) !== JSON.stringify(props[key])) next = setProperty(next, key, props[key]!)
    } else if (current !== undefined) next = setProperty(next, key, undefined)
  }
  return next
}

/** Nome do arquivo de um evento (o Full Calendar usa `AAAA-MM-DD Título` para eventos de um dia). */
export function eventFileName(input: Pick<EventInput, "title" | "date" | "repeat">): string {
  const title = input.title.replace(/[[\]#^|\\/:*?"<>]/g, "-").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "") || "Evento"
  return input.repeat.kind === "none" ? `${input.date} ${title}` : title
}

// ---------- Anotações ----------

// A checklist de preparação é lida e marcada pelo motor do plugin Tasks (core/tasks/), o mesmo das notas.

/** O texto da nota sem o frontmatter (anotações do evento). */
export function eventNotes(text: string): string {
  return noteBody(text)
}

// ---------- iCalendar (.ics) ----------

function icalTime(day: string, time: string | undefined, allDay: boolean): ICAL.Time {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number]
  const [hh, mm] = (time ?? "00:00").split(":").map(Number) as [number, number]
  return ICAL.Time.fromData({ year: y, month: m, day: d, hour: allDay ? 0 : hh, minute: allDay ? 0 : mm, second: 0, isDate: allDay })
}

/** Exporta eventos para iCalendar (horário local "flutuante", como as notas). */
export function exportIcs(events: { event: AgendaEvent; notes: string }[], now = new Date()): string {
  const calendar = new ICAL.Component(["vcalendar", [], []])
  calendar.updatePropertyWithValue("prodid", "-//Runas-Codex//Agenda//PT-BR")
  calendar.updatePropertyWithValue("version", "2.0")
  for (const { event, notes } of events) {
    const vevent = new ICAL.Component("vevent")
    vevent.updatePropertyWithValue("uid", `${encodeURIComponent(event.path)}@runas-codex`)
    vevent.updatePropertyWithValue("dtstamp", ICAL.Time.fromJSDate(now, true))
    vevent.updatePropertyWithValue("summary", event.title)
    const { end } = span(event, event.date)
    vevent.updatePropertyWithValue("dtstart", icalTime(event.date, event.startTime, event.allDay))
    vevent.updatePropertyWithValue("dtend", event.allDay ? icalTime(isoDate(end), undefined, true) : icalTime(isoDate(end), `${pad(end.getHours())}:${pad(end.getMinutes())}`, false))
    if (event.repeat.kind === "weekly") {
      const until = event.until ? `;UNTIL=${event.until.replace(/-/g, "")}${event.allDay ? "" : "T235959"}` : ""
      vevent.updatePropertyWithValue("rrule", ICAL.Recur.fromString(`FREQ=WEEKLY;BYDAY=${event.repeat.days.map((d) => ICAL_DAYS[d]).join(",")}${until}`))
    } else if (event.repeat.kind === "rrule") {
      vevent.updatePropertyWithValue("rrule", ICAL.Recur.fromString(event.repeat.rule))
    }
    for (const skip of event.skipDates) vevent.addPropertyWithValue("exdate", icalTime(skip, event.startTime, event.allDay))
    if (event.location) vevent.updatePropertyWithValue("location", event.location)
    if (event.category) vevent.updatePropertyWithValue("categories", event.category)
    if (notes.trim()) vevent.updatePropertyWithValue("description", notes.trim())
    for (const minutes of event.reminders) {
      const alarm = new ICAL.Component("valarm")
      alarm.updatePropertyWithValue("action", "DISPLAY")
      alarm.updatePropertyWithValue("description", event.title)
      alarm.updatePropertyWithValue("trigger", ICAL.Duration.fromSeconds(-minutes * 60))
      vevent.addSubcomponent(alarm)
    }
    calendar.addSubcomponent(vevent)
  }
  return calendar.toString().replace(/\r?\n/g, "\r\n") + "\r\n"
}

/** Lê um `.ics`: cada VEVENT vira um evento (sem caminho ainda). Fusos horários do arquivo são respeitados. */
export function importIcs(text: string): EventInput[] {
  const root = new ICAL.Component(ICAL.parse(text))
  for (const zone of root.getAllSubcomponents("vtimezone")) ICAL.TimezoneService.register(zone)
  const events: EventInput[] = []
  for (const vevent of root.getAllSubcomponents("vevent")) {
    // Exceções de uma recorrência (RECURRENCE-ID) ficam de fora: o evento principal já cobre a série.
    if (vevent.hasProperty("recurrence-id")) continue
    const startValue = vevent.getFirstPropertyValue("dtstart") as ICAL.Time | null
    if (!startValue) continue
    const allDay = startValue.isDate
    const start = allDay ? parseDate(`${startValue.year}-${pad(startValue.month)}-${pad(startValue.day)}`) : startValue.toJSDate()
    const endValue = vevent.getFirstPropertyValue("dtend") as ICAL.Time | null
    const durationValue = vevent.getFirstPropertyValue("duration") as ICAL.Duration | null
    let end = endValue ? (endValue.isDate ? parseDate(`${endValue.year}-${pad(endValue.month)}-${pad(endValue.day)}`) : endValue.toJSDate()) : durationValue ? new Date(start.getTime() + durationValue.toSeconds() * 1000) : null
    if (allDay && end) end = addDays(end, -1) // DTEND de dia inteiro é exclusivo
    const rrule = vevent.getFirstPropertyValue("rrule") as ICAL.Recur | null
    let repeat: Repeat = { kind: "none" }
    if (rrule) {
      const rule = rrule.toString()
      const weekly = /^FREQ=WEEKLY;BYDAY=([A-Z,]+)$/.exec(rule)
      repeat = weekly ? { kind: "weekly", days: weekly[1]!.split(",").map((d) => ICAL_DAYS.indexOf(d)).filter((d) => d >= 0) } : { kind: "rrule", rule }
    }
    const skipDates = vevent.getAllProperties("exdate").flatMap((p) => p.getValues() as ICAL.Time[]).map((t) => `${t.year}-${pad(t.month)}-${pad(t.day)}`)
    const reminders = vevent
      .getAllSubcomponents("valarm")
      .map((alarm) => alarm.getFirstPropertyValue("trigger"))
      .filter((t): t is ICAL.Duration => t instanceof ICAL.Duration)
      .map((t) => Math.max(0, Math.round(-t.toSeconds() / 60)))
    const categories = vevent.getFirstPropertyValue("categories")
    const date = isoDate(start)
    events.push({
      title: String(vevent.getFirstPropertyValue("summary") ?? "").trim() || "Evento",
      allDay,
      date,
      ...(end && isoDate(end) > date ? { endDate: isoDate(end) } : {}),
      ...(allDay ? {} : { startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`, ...(end ? { endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}` } : {}) }),
      repeat: repeat.kind === "weekly" && !repeat.days.length ? { kind: "none" } : repeat,
      skipDates,
      ...(vevent.getFirstPropertyValue("location") ? { location: String(vevent.getFirstPropertyValue("location")) } : {}),
      ...(categories ? { category: String(categories) } : {}),
      reminders: [...new Set(reminders)].sort((a, b) => a - b),
      countdown: false,
      notes: String(vevent.getFirstPropertyValue("description") ?? ""),
    })
  }
  return events
}
