/**
 * Motor mínimo de calendário fictício, só para o protótipo mostrar as datas calculadas.
 * O motor de verdade (etapa 6) lê a definição do bloco ```runas-calendario``` da nota.
 */
export interface MoonDef {
  name: string
  cycle: number
  /** Dia (contado do ano 0) em que a lua está cheia. */
  fullAt: number
  color: string
}

export interface CalendarDef {
  name: string
  months: { name: string; days: number; season: string }[]
  intercalary: { name: string; afterMonth: number; days: number }
  weekdays: string[]
  moons: MoonDef[]
  eras: { name: string; start: number; end?: number }[]
  /** Outro calendário que conta o mesmo tempo com outra origem (C.E. → Logi). */
  alias: { name: string; offset: number; suffix: string }
  suffix: string
}

export interface WorldDate {
  year: number
  month: number
  day: number
}

export const ORDEM_X_CAOS: CalendarDef = {
  name: "Calendário de Ordem x Caos",
  months: [
    { name: "Gelo", days: 36, season: "Inverno" },
    { name: "Degelo", days: 36, season: "Inverno" },
    { name: "Semeadura", days: 36, season: "Primavera" },
    { name: "Brotos", days: 36, season: "Primavera" },
    { name: "Sol Alto", days: 36, season: "Verão" },
    { name: "Colheita", days: 36, season: "Verão" },
    { name: "Cinzas", days: 36, season: "Outono" },
    { name: "Brumas", days: 36, season: "Outono" },
    { name: "Longa Noite", days: 36, season: "Inverno" },
    { name: "Vigília", days: 36, season: "Inverno" },
  ],
  intercalary: { name: "Dias de Logi", afterMonth: 10, days: 5 },
  weekdays: ["Pedra", "Raiz", "Chama", "Vento", "Maré", "Sombra"],
  moons: [
    { name: "Selene", cycle: 28, fullAt: 3, color: "var(--cyan)" },
    { name: "Morr", cycle: 45, fullAt: 20, color: "var(--red)" },
  ],
  eras: [
    { name: "Era dos Magos", start: 3122, end: 3888 },
    { name: "Era das Migrações", start: 3888, end: 4027 },
    { name: "Era dos Caçadores", start: 4027 },
  ],
  alias: { name: "Logi", offset: 4027, suffix: "Logi" },
  suffix: "C.E.",
}

export const yearLength = (cal: CalendarDef) =>
  cal.months.reduce((sum, m) => sum + m.days, 0) + cal.intercalary.days

export function parseWorldDate(text: string): WorldDate {
  const match = text.match(/^(-?\d+)-(\d{2})-(\d{2})$/)
  if (!match) throw new Error(`Data fictícia inválida: ${text}`)
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** Dias desde 1 de Gelo do ano 0 (negativo antes disso). */
export function dayNumber(cal: CalendarDef, date: WorldDate): number {
  let doy = 0
  for (let m = 1; m < date.month; m += 1) doy += cal.months[m - 1].days
  return date.year * yearLength(cal) + doy + (date.day - 1)
}

const mod = (n: number, m: number) => ((n % m) + m) % m

export function weekday(cal: CalendarDef, date: WorldDate): string {
  return cal.weekdays[mod(dayNumber(cal, date), cal.weekdays.length)]
}

export type MoonPhase = "nova" | "crescente" | "cheia" | "minguante"

export function moonPhase(moon: MoonDef, day: number): { phase: MoonPhase; fraction: number } {
  const age = mod(day - moon.fullAt, moon.cycle) / moon.cycle
  const phase: MoonPhase = age < 0.07 || age > 0.93 ? "cheia" : age < 0.43 ? "minguante" : age < 0.57 ? "nova" : "crescente"
  return { phase, fraction: age }
}

export function eraOf(cal: CalendarDef, year: number): string {
  const era = [...cal.eras].reverse().find((e) => year >= e.start && (e.end === undefined || year < e.end))
  return era?.name ?? "Era desconhecida"
}

export function seasonOf(cal: CalendarDef, date: WorldDate): string {
  return cal.months[date.month - 1]?.season ?? cal.intercalary.name
}

/** Anos completos entre duas datas (idade). */
export function yearsBetween(from: WorldDate, to: WorldDate): number {
  let years = to.year - from.year
  if (to.month < from.month || (to.month === from.month && to.day < from.day)) years -= 1
  return years
}

export function formatWorldDate(cal: CalendarDef, date: WorldDate, withAlias = false): string {
  const month = cal.months[date.month - 1]?.name ?? cal.intercalary.name
  const base = `${date.day} de ${month} de ${date.year.toLocaleString("pt-BR")} ${cal.suffix}`
  if (!withAlias) return base
  return `${base} · ${(date.year - cal.alias.offset).toLocaleString("pt-BR")} ${cal.alias.suffix}`
}

/** "Hoje" no mundo da campanha ativa (o mestre avança com +1 dia / +1 semana). */
export const CAMPAIGN_TODAY: WorldDate = { year: 4031, month: 7, day: 15 }

/** Inverso de `dayNumber`. O mês `months.length + 1` representa os dias intercalares. */
export function fromDayNumber(cal: CalendarDef, n: number): WorldDate {
  const length = yearLength(cal)
  const year = Math.floor(n / length)
  let rest = n - year * length
  for (let m = 0; m < cal.months.length; m += 1) {
    if (rest < cal.months[m].days) return { year, month: m + 1, day: rest + 1 }
    rest -= cal.months[m].days
  }
  return { year, month: cal.months.length + 1, day: rest + 1 }
}

export function addDays(cal: CalendarDef, date: WorldDate, days: number): WorldDate {
  return fromDayNumber(cal, dayNumber(cal, date) + days)
}

export function monthLength(cal: CalendarDef, month: number): number {
  return cal.months[month - 1]?.days ?? cal.intercalary.days
}

/** Dia exato da lua cheia (para marcar no calendário só uma vez por ciclo). */
export function isFullMoonDay(moon: MoonDef, day: number): boolean {
  return mod(day - moon.fullAt, moon.cycle) === 0
}
