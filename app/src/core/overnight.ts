/**
 * U105: o horário de um evento visto de um dia da agenda. Um evento das 23:00 às 07:30 aparece nos dois dias; sem
 * isto, as duas partes mostravam o mesmo “23:00–07:30” e pareciam dois eventos. Na noite: “23:00 até 07:30 de
 * amanhã”; na manhã: “continua de ontem, até 07:30”. Fim à meia-noite conta como fim do dia anterior.
 */
export function timeOnDay(start: Date, end: Date, hasEnd: boolean, day: Date): string {
  const today = dayStart(day).getTime()
  const startDay = dayStart(start)
  const lastDay = dayStart(new Date(Math.max(start.getTime(), end.getTime() - 1)))
  const startsToday = startDay.getTime() === today
  const endsToday = lastDay.getTime() === today
  const s = hhmm(start), e = hhmm(end)
  if (startsToday && (endsToday || !hasEnd)) return hasEnd ? `${s}–${e}` : s
  const endText = lastDay.getTime() === addDays(day, 1).getTime() ? `${e} de amanhã` : `${e} de ${shortDate(lastDay)}`
  if (startsToday) return `${s} até ${endText}`
  const yesterday = startDay.getTime() === addDays(day, -1).getTime()
  if (!hasEnd) return yesterday ? `ontem às ${s}` : `${shortDate(startDay)} às ${s}`
  const from = yesterday ? "continua de ontem" : `continua desde ${shortDate(startDay)}`
  return `${from}, até ${endsToday ? e : endText}`
}

const pad = (n: number) => String(n).padStart(2, "0")
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const shortDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
