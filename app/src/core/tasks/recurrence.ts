import { RRule, type Options } from "rrule"
import { daysBetween, addDays, isValidDate, utcDate, utcIsoDate } from "./dates"

/**
 * Recorrência das tarefas (`🔁 every day`), com a mesma biblioteca (`rrule`) e as mesmas correções do Tasks 8.6.0
 * (`src/Task/Recurrence.ts` e `Occurrence.ts`): a próxima data sai da data de referência (prazo, agendada ou início)
 * ou, com `when done`, do dia da conclusão; as outras datas andam junto, mantendo a distância; "every month" no dia 31
 * cai no último dia do mês seguinte, em vez de pular meses.
 *
 * As datas vão ao rrule como meia-noite UTC com os números do dia local ("horário flutuante"), como o Tasks faz com
 * `moment().utc(true)`.
 */

export interface OccurrenceDates {
  startDate: string | null
  scheduledDate: string | null
  dueDate: string | null
}

export interface Recurrence {
  /** O texto como o Tasks grava (`rrule.toText()` + ` when done`). */
  text: string
  baseOnToday: boolean
  /** A regra pronta (com `dtstart`). */
  rule: RRule
}

function referenceDate(dates: OccurrenceDates, removeScheduledDateOnRecurrence: boolean): string | null {
  const order = removeScheduledDateOnRecurrence ? [dates.dueDate, dates.startDate, dates.scheduledDate] : [dates.dueDate, dates.scheduledDate, dates.startDate]
  return order.find((d): d is string => d !== null && isValidDate(d)) ?? null
}

/** Lê o texto depois de 🔁; `null` se o rrule não entende. `today` é a data local de hoje (`AAAA-MM-DD`). */
export function parseRecurrence(text: string, dates: OccurrenceDates, today: string, removeScheduledDateOnRecurrence = false): Recurrence | null {
  try {
    const match = /^([a-zA-Z0-9, !]+?)( when done)?$/i.exec(text)
    if (!match) return null
    const baseOnToday = match[2] !== undefined
    const options = RRule.parseText(match[1]!.trim())
    if (!options) return null
    const reference = referenceDate(dates, removeScheduledDateOnRecurrence)
    options.dtstart = utcDate(!baseOnToday && reference ? reference : today)
    const rule = new RRule(options)
    return { text: rule.toText() + (baseOnToday ? " when done" : ""), baseOnToday, rule }
  } catch {
    return null
  }
}

function monthIndex(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth()
}

/** Recomeça a regra um dia antes (o Tasks repete isto até não pular meses/anos demais). */
function fromOneDayEarlier(after: Date, options: Partial<Options>): { after: Date; next: Date | null } {
  const day = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), after.getUTCDate() - 1))
  const rule = new RRule({ ...options, dtstart: day })
  return { after: day, next: rule.after(day) }
}

function nextAfter(recurrence: Recurrence, afterDay: string, rule: RRule): string | null {
  let after = utcDate(afterDay, 23, 59, 59, 999)
  let next = rule.after(after)
  if (!next) return null
  const text = recurrence.text
  const month = /every( \d+)? month(s)?(.*)?/.exec(text)
  if (month && !text.includes(" on ")) {
    const skipping = month[1] ? Number.parseInt(month[1].trim(), 10) : 1
    for (let guard = 0; next && monthIndex(next) - monthIndex(after) > skipping && guard < 40; guard++) ({ after, next } = fromOneDayEarlier(after, rule.origOptions))
  }
  const year = /every( \d+)? year(s)?(.*)?/.exec(text)
  if (year && next) {
    const skipping = year[1] ? Number.parseInt(year[1].trim(), 10) : 1
    for (let guard = 0; next && next.getUTCFullYear() - after.getUTCFullYear() > skipping && guard < 400; guard++) ({ after, next } = fromOneDayEarlier(after, rule.origOptions))
  }
  return next ? utcIsoDate(next) : null
}

/** As datas da próxima ocorrência; `null` se a regra acabou (ex.: `until`/`count`). */
export function nextOccurrence(recurrence: Recurrence, dates: OccurrenceDates, today: string, removeScheduledDateOnRecurrence = false): OccurrenceDates | null {
  const reference = referenceDate(dates, removeScheduledDateOnRecurrence)
  let next: string | null
  if (recurrence.baseOnToday) {
    const rule = new RRule({ ...recurrence.rule.origOptions, dtstart: utcDate(today) })
    next = nextAfter(recurrence, today, rule)
  } else {
    next = nextAfter(recurrence, reference ?? today, recurrence.rule)
  }
  if (next === null) return null
  if (reference === null) return { startDate: null, scheduledDate: null, dueDate: null }
  const shift = (date: string | null) => (date === null || !isValidDate(date) ? date : addDays(next!, daysBetween(reference, date)))
  const removeScheduled = removeScheduledDateOnRecurrence && (dates.startDate !== null || dates.dueDate !== null)
  return { startDate: shift(dates.startDate), scheduledDate: removeScheduled ? null : shift(dates.scheduledDate), dueDate: shift(dates.dueDate) }
}
