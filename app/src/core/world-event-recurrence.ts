import { dayNumber, dateProblem, parseWorldDate, type Calendar, type WorldDate } from "./calendar"

/** Prepara a regra uma vez, para consultar vários dias no mesmo calendário. */
export function worldEventMatcher(data: Record<string, unknown>, calendar: Calendar) {
  const start = parseWorldDate(data.data_mundo)
  if (!start || dateProblem(calendar, start)) return null
  const first = dayNumber(calendar, start)
  const until = parseWorldDate(data.fim_recorrencia_mundo)
  const last = until && !dateProblem(calendar, until) ? dayNumber(calendar, until) : Infinity
  const step = data.intervalo_mundo
  const interval = typeof step === "number" && Number.isSafeInteger(step) && step > 0 ? step : 1
  const rule = data.recorrencia_mundo
  return (date: WorldDate, day: number): boolean => {
    if (day < first || day > last) return false
    if (rule === "dias") return (day - first) % interval === 0
    if (rule === "meses") return date.day === start.day && ((date.year - start.year) * calendar.months.length + date.month - start.month) % interval === 0
    if (rule === "anos") return date.day === start.day && date.month === start.month && (date.year - start.year) % interval === 0
    return day === first
  }
}

export function worldEventOn(data: Record<string, unknown>, calendar: Calendar, date: WorldDate): boolean {
  if (dateProblem(calendar, date)) return false
  return worldEventMatcher(data, calendar)?.(date, dayNumber(calendar, date)) ?? false
}
