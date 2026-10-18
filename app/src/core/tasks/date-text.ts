import * as chrono from "chrono-node"
import { addDays, addMonths, endOfMonth, endOfQuarter, isoDate, isValidDate, startOfIsoWeek, startOfMonth, startOfQuarter } from "./dates"

/**
 * Datas escritas nas consultas (`due before tomorrow`, `done this week`, `2026-Q4`, `in two weeks`), como o
 * `DateParser` do Tasks 8.6.0: períodos relativos e numerados primeiro, depois o chrono (a mesma versão que o Tasks
 * usa), em inglês.
 */
export interface DateRange {
  start: string
  end: string
}

function range(a: string, b: string): DateRange {
  return a <= b ? { start: a, end: b } : { start: b, end: a }
}

function relative(input: string, today: string): DateRange | null {
  const m = /(last|this|next) (week|month|quarter|year)/.exec(input)
  if (!m) return null
  const unit = m[2] as "week" | "month" | "quarter" | "year"
  const startOf = { week: startOfIsoWeek, month: startOfMonth, quarter: startOfQuarter, year: (d: string) => `${d.slice(0, 4)}-01-01` }[unit]
  const endOf = { week: (d: string) => addDays(startOfIsoWeek(d), 6), month: endOfMonth, quarter: endOfQuarter, year: (d: string) => `${d.slice(0, 4)}-12-31` }[unit]
  const step = m[1] === "last" ? -1 : m[1] === "next" ? 1 : 0
  const moved = unit === "week" ? addDays(today, 7 * step) : addMonths(today, step * (unit === "month" ? 1 : unit === "quarter" ? 3 : 12))
  return { start: startOf(moved), end: endOf(moved) }
}

function numbered(input: string): DateRange | null {
  const value = input.trim()
  let m = /^(\d{4})$/.exec(value)
  if (m) return { start: `${m[1]}-01-01`, end: `${m[1]}-12-31` }
  m = /^(\d{4})-Q([1-4])$/.exec(value)
  if (m) {
    const start = `${m[1]}-${String((Number(m[2]) - 1) * 3 + 1).padStart(2, "0")}-01`
    return { start, end: endOfQuarter(start) }
  }
  m = /^(\d{4})-(\d{2})$/.exec(value)
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return { start: `${m[1]}-${m[2]}-01`, end: endOfMonth(`${m[1]}-${m[2]}-01`) }
  m = /^(\d{4})-W(\d{2})$/.exec(value)
  if (m) {
    // Semana ISO: a que contém a quinta-feira; a semana 1 contém 4 de janeiro.
    const week1 = startOfIsoWeek(`${m[1]}-01-04`)
    const start = addDays(week1, (Number(m[2]) - 1) * 7)
    return { start, end: addDays(start, 6) }
  }
  return null
}

/** Uma data só (o `chrono.parseDate` do Tasks); `null` se não entende. */
export function parseDateText(input: string, now: Date, forwardDate = false): string | null {
  const parsed = chrono.parseDate(input, now, { forwardDate })
  return parsed ? isoDate(parsed) : null
}

/** Um período; `null` se não entende. */
export function parseDateRangeText(input: string, now: Date, forwardDate = false): DateRange | null {
  const today = isoDate(now)
  const found = relative(input, today) ?? numbered(input)
  if (found) return found
  const results = chrono.parse(input, now, { forwardDate })
  if (!results.length) return null
  const first = isoDate(results[0]!.start.date())
  const second = results[1]?.start ? isoDate(results[1].start.date()) : first
  return isValidDate(first) && isValidDate(second) ? range(first, second) : null
}

const PT_WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]

/**
 * Data digitada na janela de tarefa: `AAAA-MM-DD`, português comum ("amanhã", "sexta", "próxima segunda",
 * "daqui a 3 dias", "em 2 semanas") ou o inglês do Tasks ("tomorrow", "next friday"). `forwardOnly` escolhe a próxima
 * data quando o texto é ambíguo (como a opção "só datas futuras" do Tasks).
 */
export function parseTypedDate(input: string, now: Date, forwardOnly = true): string | null {
  const text = input.trim().toLowerCase().normalize("NFC")
  if (!text) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return isValidDate(text) ? text : null
  const today = isoDate(now)
  const simple: Record<string, number> = { hoje: 0, amanhã: 1, amanha: 1, "depois de amanhã": 2, "depois de amanha": 2, ontem: -1, anteontem: -2 }
  if (text in simple) return addDays(today, simple[text]!)
  const span = /^(?:daqui a|em|dentro de) (\d+) (dias?|semanas?|m[eê]s|meses|anos?)$/.exec(text)
  if (span) {
    const n = Number(span[1])
    const unit = span[2]!
    return unit.startsWith("dia") ? addDays(today, n) : unit.startsWith("semana") ? addDays(today, 7 * n) : unit.startsWith("ano") ? addMonths(today, 12 * n) : addMonths(today, n)
  }
  const weekday = /^(?:(?:na |no )?pr[oó]xim[ao] |(?:na |no ))?(domingo|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado)(?:-feira)?(?: que vem)?$/.exec(text)
  if (weekday) {
    const name = weekday[1]!.replace("terca", "terça").replace("sabado", "sábado")
    const target = PT_WEEKDAYS.indexOf(name)
    const current = now.getDay()
    let diff = (target - current + 7) % 7
    if (diff === 0 || /pr[oó]xim|que vem/.test(text)) diff = diff === 0 ? 7 : diff
    return addDays(today, diff)
  }
  const en = chrono.parseDate(input, now, { forwardDate: forwardOnly })
  if (en) return isoDate(en)
  const pt = chrono.pt.parseDate(input, now, { forwardDate: forwardOnly })
  return pt ? isoDate(pt) : null
}
