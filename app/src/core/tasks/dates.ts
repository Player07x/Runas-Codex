/**
 * Datas das tarefas: `AAAA-MM-DD` no fuso local, como o Tasks grava. A conta é sempre por dia do calendário (nada de
 * somar 24 h), para o horário de verão não empurrar uma data para o dia vizinho.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
const pad = (n: number) => String(n).padStart(2, "0")

export function isoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function utcIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

/** A data existe no calendário? (`2026-02-30` não existe: o Tasks a mostra como "data inválida".) */
export function isValidDate(value: string): boolean {
  const m = ISO.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (mo < 1 || mo > 12 || d < 1) return false
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate()
}

/** Meia-noite local da data. */
export function localDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}

/** Meia-noite UTC com os mesmos números (o "horário flutuante" que o rrule usa). */
export function utcDate(value: string, hours = 0, minutes = 0, seconds = 0, ms = 0): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d, hours, minutes, seconds, ms))
}

export function addDays(value: string, days: number): string {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number]
  return utcIsoDate(new Date(Date.UTC(y, m - 1, d + days)))
}

/** Dias de `from` até `to` pelo calendário (positivo se `to` vem depois). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcDate(to).getTime() - utcDate(from).getTime()) / 86_400_000)
}

export function addMonths(value: string, months: number): string {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number]
  const last = new Date(Date.UTC(y, m - 1 + months + 1, 0)).getUTCDate()
  return utcIsoDate(new Date(Date.UTC(y, m - 1 + months, Math.min(d, last))))
}

/** Segunda-feira da semana ISO da data. */
export function startOfIsoWeek(value: string): string {
  const day = utcDate(value).getUTCDay()
  return addDays(value, -((day + 6) % 7))
}

export function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`
}

export function endOfMonth(value: string): string {
  return addDays(addMonths(startOfMonth(value), 1), -1)
}

export function startOfQuarter(value: string): string {
  const month = Number(value.slice(5, 7))
  return `${value.slice(0, 4)}-${pad(Math.floor((month - 1) / 3) * 3 + 1)}-01`
}

export function endOfQuarter(value: string): string {
  return addDays(addMonths(startOfQuarter(value), 3), -1)
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]

export function weekdayName(value: string): string {
  return WEEKDAYS[utcDate(value).getUTCDay()]!
}
