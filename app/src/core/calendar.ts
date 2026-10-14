import { parse as parseYaml } from "yaml"

/**
 * Calendários fictícios (etapa 6). Um calendário é um bloco ```runas-calendario``` numa nota da wiki, em YAML:
 *
 * ```yaml
 * nome: Calendário de Ordem x Caos
 * sufixo: C.E.                       # depois do ano ("4031 C.E."); sufixo_negativo para anos antes do 0
 * semana: [Pedra, Raiz, Chama, Vento, Maré, Sombra]
 * primeiro_dia: 0                    # dia da semana (índice) de 1/1 do ano 0
 * meses:
 *   - { nome: Gelo, dias: 36, estacao: Inverno }
 *   - { nome: Dias de Logi, dias: 5, intercalar: true }   # fora da semana: não tem dia da semana
 * bissexto: { a_cada: 4, exceto_a_cada: 100, salvo_a_cada: 400, mes: Gelo, dias: 1 }
 * luas:
 *   - { nome: Selene, ciclo: 28, cheia_em: "0000-01-04", cor: "#bec6ff" }
 * eras:
 *   - { nome: Era dos Caçadores, sigla: E.C., inicio: 4027 }
 * equivalentes:                      # o mesmo calendário, contando anos de outra origem
 *   - { nome: Logi, deslocamento: 4027 }
 * feriados:
 *   - { nome: Festa das Cinzas, data: "07-01" }        # todo ano
 *   - { nome: Eclipse de Morr, data: "4030-05-12" }    # uma vez
 * hoje: "4031-07-15"                 # a data atual da campanha
 * correspondencias:                  # o mesmo dia em outro calendário (para converter datas)
 *   - { calendario: "[[Calendário élfico]]", data: "4031-01-01", data_no_outro: "0812-01-01" }
 * ```
 *
 * Datas são `ANO-MM-DD` (o ano pode ser 0 ou negativo, com sinal: `-120-03-01`). Tudo é contado em "dias absolutos"
 * desde 1/1 do ano 0 — é o que permite somar dias, comparar datas e converter entre calendários.
 */

export interface CalendarMonth {
  name: string
  days: number
  season?: string
  /** Dias fora da semana (festivais): não têm dia da semana e não avançam a semana. */
  intercalary: boolean
}

export interface LeapRule {
  every: number
  except?: number
  unless?: number
  /** Índice (0…) do mês que ganha os dias extras. */
  month: number
  days: number
}

export interface Moon {
  name: string
  cycle: number
  /** Dia absoluto de uma lua cheia. */
  fullAt: number
  color?: string
}

export interface Era {
  name: string
  abbr?: string
  start: number
}

export interface Holiday {
  name: string
  /** Mês (1…) e dia; `year` só nos de uma vez. */
  month: number
  day: number
  year?: number
  color?: string
}

export interface Calendar {
  name: string
  suffix: string
  negativeSuffix?: string
  weekdays: string[]
  firstWeekday: number
  months: CalendarMonth[]
  leap?: LeapRule
  moons: Moon[]
  eras: Era[]
  equivalents: { name: string; offset: number }[]
  holidays: Holiday[]
  today?: WorldDate
  /** Dias que este calendário e outro marcam juntos (o outro é o alvo de um link). */
  correspondences: { calendar: string; here: WorldDate; there: WorldDate }[]
}

export interface WorldDate {
  year: number
  month: number
  day: number
}

const mod = (n: number, m: number) => ((n % m) + m) % m

// ---------- Datas em texto ----------

const DATE = /^\s*(-?\d+)-(\d{1,2})-(\d{1,2})\s*$/

export function parseWorldDate(text: unknown): WorldDate | null {
  if (typeof text !== "string" && typeof text !== "number") return null
  const m = DATE.exec(String(text))
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : null
}

export function worldDateText(date: WorldDate): string {
  const year = date.year < 0 ? `-${String(-date.year).padStart(4, "0")}` : String(date.year).padStart(4, "0")
  return `${year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
}

// ---------- Leitura do bloco ----------

export class CalendarError extends Error {}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined)

/** Lê o YAML de um bloco ```runas-calendario```. Erros dizem o que corrigir. */
export function parseCalendar(source: string): Calendar {
  let data: unknown
  try {
    data = parseYaml(source)
  } catch (error) {
    throw new CalendarError(`YAML inválido: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`)
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new CalendarError("O calendário precisa ser um mapa YAML (nome:, meses:, semana:…).")
  const d = data as Record<string, unknown>

  const monthsRaw = Array.isArray(d.meses) ? d.meses : []
  const months: CalendarMonth[] = monthsRaw.map((m, i) => {
    const o = (m && typeof m === "object" ? m : {}) as Record<string, unknown>
    const days = num(o.dias)
    if (!days || days < 1 || !Number.isInteger(days)) throw new CalendarError(`O mês ${i + 1} precisa de "dias" (número inteiro maior que zero).`)
    return { name: str(o.nome) || `Mês ${i + 1}`, days, ...(str(o.estacao) ? { season: str(o.estacao) } : {}), intercalary: o.intercalar === true }
  })
  // Atalho do protótipo: `intercalares: { nome, depois_do_mes, dias }`.
  if (d.intercalares && typeof d.intercalares === "object" && !Array.isArray(d.intercalares)) {
    const o = d.intercalares as Record<string, unknown>
    const days = num(o.dias)
    const after = num(o.depois_do_mes) ?? months.length
    if (days && days > 0) months.splice(Math.min(after, months.length), 0, { name: str(o.nome) || "Dias intercalares", days, intercalary: true })
  }
  if (!months.length) throw new CalendarError("Faltam os meses (meses: - { nome: …, dias: … }).")
  if (months.every((m) => m.intercalary)) throw new CalendarError("Pelo menos um mês precisa estar na semana (sem intercalar: true).")

  const weekdays = (Array.isArray(d.semana) ? d.semana : []).map(str).filter(Boolean)
  const monthIndex = (value: unknown): number | undefined => {
    const n = num(value)
    if (n !== undefined) return n >= 1 && n <= months.length ? n - 1 : undefined
    const name = str(value).toLocaleLowerCase("pt-BR")
    const i = months.findIndex((m) => m.name.toLocaleLowerCase("pt-BR") === name)
    return i >= 0 ? i : undefined
  }

  let leap: LeapRule | undefined
  if (d.bissexto && typeof d.bissexto === "object") {
    const o = d.bissexto as Record<string, unknown>
    const every = num(o.a_cada)
    const month = monthIndex(o.mes) ?? months.length - 1
    if (!every || every < 1) throw new CalendarError('O bissexto precisa de "a_cada" (ex.: a_cada: 4).')
    const except = num(o.exceto_a_cada)
    const unless = num(o.salvo_a_cada)
    // As contas de anos bissextos supõem regras encaixadas, como no gregoriano (4 → 100 → 400).
    if (except && except % every !== 0) throw new CalendarError('"exceto_a_cada" precisa ser múltiplo de "a_cada" (ex.: 4 e 100).')
    if (unless && (!except || unless % except !== 0)) throw new CalendarError('"salvo_a_cada" precisa de "exceto_a_cada" e ser múltiplo dele (ex.: 100 e 400).')
    leap = { every, month, days: num(o.dias) ?? 1, ...(num(o.exceto_a_cada) ? { except: num(o.exceto_a_cada) } : {}), ...(num(o.salvo_a_cada) ? { unless: num(o.salvo_a_cada) } : {}) }
  }

  const calendar: Calendar = {
    name: str(d.nome) || "Calendário",
    suffix: str(d.sufixo),
    ...(str(d.sufixo_negativo) ? { negativeSuffix: str(d.sufixo_negativo) } : {}),
    weekdays,
    firstWeekday: weekdays.length ? mod(num(d.primeiro_dia) ?? 0, weekdays.length) : 0,
    months,
    ...(leap ? { leap } : {}),
    moons: [],
    eras: [],
    equivalents: [],
    holidays: [],
    correspondences: [],
  }

  calendar.moons = (Array.isArray(d.luas) ? d.luas : []).map((m, i) => {
    const o = (m && typeof m === "object" ? m : {}) as Record<string, unknown>
    const cycle = num(o.ciclo)
    if (!cycle || cycle <= 0) throw new CalendarError(`A lua ${i + 1} precisa de "ciclo" (dias entre duas cheias).`)
    const full = parseWorldDate(o.cheia_em)
    return { name: str(o.nome) || `Lua ${i + 1}`, cycle, fullAt: full ? dayNumber(calendar, full) : (num(o.cheia_no_dia) ?? 0), ...(str(o.cor) ? { color: str(o.cor) } : {}) }
  })
  calendar.eras = (Array.isArray(d.eras) ? d.eras : [])
    .map((e) => {
      const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>
      return { name: str(o.nome) || "Era", ...(str(o.sigla) ? { abbr: str(o.sigla) } : {}), start: num(o.inicio) ?? 0 }
    })
    .sort((a, b) => a.start - b.start)
  const equivalents = Array.isArray(d.equivalentes) ? d.equivalentes : d.equivalente ? [d.equivalente] : []
  calendar.equivalents = equivalents.flatMap((e) => {
    const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>
    const offset = num(o.deslocamento)
    return offset === undefined ? [] : [{ name: str(o.nome) || "Equivalente", offset }]
  })
  calendar.holidays = (Array.isArray(d.feriados) ? d.feriados : []).flatMap((h) => {
    const o = (h && typeof h === "object" ? h : {}) as Record<string, unknown>
    const text = str(o.data)
    const annual = /^(\d{1,2})-(\d{1,2})$/.exec(text)
    const once = parseWorldDate(text)
    if (annual) return [{ name: str(o.nome) || "Feriado", month: Number(annual[1]), day: Number(annual[2]), ...(str(o.cor) ? { color: str(o.cor) } : {}) }]
    if (once) return [{ name: str(o.nome) || "Evento", month: once.month, day: once.day, year: once.year, ...(str(o.cor) ? { color: str(o.cor) } : {}) }]
    return []
  })
  calendar.correspondences = (Array.isArray(d.correspondencias) ? d.correspondencias : []).flatMap((c) => {
    const o = (c && typeof c === "object" ? c : {}) as Record<string, unknown>
    const target = /\[\[([^\]|#]+)/.exec(str(o.calendario))?.[1]?.trim() ?? str(o.calendario)
    const here = parseWorldDate(o.data)
    const there = parseWorldDate(o.data_no_outro)
    return target && here && there ? [{ calendar: target, here, there }] : []
  })
  const today = parseWorldDate(d.hoje)
  if (today) {
    const problem = dateProblem(calendar, today)
    if (problem) throw new CalendarError(`"hoje" inválido: ${problem}`)
    calendar.today = today
  }
  return calendar
}

// ---------- Anos, meses e dias absolutos ----------

export function isLeapYear(cal: Calendar, year: number): boolean {
  const leap = cal.leap
  if (!leap) return false
  if (mod(year, leap.every) !== 0) return false
  if (leap.except && mod(year, leap.except) === 0) return Boolean(leap.unless && mod(year, leap.unless) === 0)
  return true
}

export function monthLength(cal: Calendar, year: number, month: number): number {
  const m = cal.months[month - 1]
  if (!m) return 0
  return m.days + (cal.leap && cal.leap.month === month - 1 && isLeapYear(cal, year) ? cal.leap.days : 0)
}

const baseYearLength = (cal: Calendar) => cal.months.reduce((sum, m) => sum + m.days, 0)

export function yearLength(cal: Calendar, year: number): number {
  return baseYearLength(cal) + (isLeapYear(cal, year) ? cal.leap!.days : 0)
}

/** Quantos anos bissextos há em [lo, hi). Funciona com anos negativos. */
function leapYearsBetween(cal: Calendar, lo: number, hi: number): number {
  const leap = cal.leap
  if (!leap || hi <= lo) return 0
  const upTo = (n: number) => Math.floor(n / leap.every) - (leap.except ? Math.floor(n / leap.except) : 0) + (leap.except && leap.unless ? Math.floor(n / leap.unless) : 0)
  return upTo(hi - 1) - upTo(lo - 1)
}

/** Dias absolutos de 1/1 do ano 0 até 1/1 de `year` (negativo antes do ano 0). */
function yearStart(cal: Calendar, year: number): number {
  const leapDays = cal.leap?.days ?? 0
  if (year >= 0) return year * baseYearLength(cal) + leapYearsBetween(cal, 0, year) * leapDays
  return -(-year * baseYearLength(cal) + leapYearsBetween(cal, year, 0) * leapDays)
}

/** O que está errado numa data neste calendário (`null` se está certa). */
export function dateProblem(cal: Calendar, date: WorldDate): string | null {
  if (!Number.isInteger(date.year) || !Number.isInteger(date.month) || !Number.isInteger(date.day)) return "use números inteiros"
  if (date.month < 1 || date.month > cal.months.length) return `o mês vai de 1 a ${cal.months.length}`
  const length = monthLength(cal, date.year, date.month)
  if (date.day < 1 || date.day > length) return `${cal.months[date.month - 1]!.name} tem ${length} dias${length !== cal.months[date.month - 1]!.days ? " neste ano" : ""}`
  return null
}

/** Dia absoluto (0 = 1/1 do ano 0). */
export function dayNumber(cal: Calendar, date: WorldDate): number {
  let days = yearStart(cal, date.year)
  for (let m = 1; m < date.month; m++) days += monthLength(cal, date.year, m)
  return days + date.day - 1
}

export function fromDayNumber(cal: Calendar, n: number): WorldDate {
  let year = Math.floor(n / (baseYearLength(cal) + (cal.leap ? cal.leap.days / cal.leap.every : 0)))
  while (yearStart(cal, year) > n) year--
  while (yearStart(cal, year + 1) <= n) year++
  let rest = n - yearStart(cal, year)
  for (let month = 1; month <= cal.months.length; month++) {
    const length = monthLength(cal, year, month)
    if (rest < length) return { year, month, day: rest + 1 }
    rest -= length
  }
  return { year, month: cal.months.length, day: monthLength(cal, year, cal.months.length) }
}

export function addDays(cal: Calendar, date: WorldDate, days: number): WorldDate {
  return fromDayNumber(cal, dayNumber(cal, date) + days)
}

/** Avança meses mantendo o dia (limitado ao tamanho do mês de destino). */
export function addMonths(cal: Calendar, date: WorldDate, months: number): WorldDate {
  const total = date.year * cal.months.length + (date.month - 1) + months
  const year = Math.floor(total / cal.months.length)
  const month = mod(total, cal.months.length) + 1
  return { year, month, day: Math.min(date.day, monthLength(cal, year, month)) }
}

// ---------- Semana, luas, estações, eras ----------

/** Dias na semana (fora os intercalares) de 1/1 do ano 0 até 1/1 de `year`. */
function weekYearStart(cal: Calendar, year: number): number {
  const inWeek = cal.months.filter((m) => !m.intercalary).reduce((sum, m) => sum + m.days, 0)
  const leapInWeek = cal.leap && !cal.months[cal.leap.month]!.intercalary ? cal.leap.days : 0
  if (year >= 0) return year * inWeek + leapYearsBetween(cal, 0, year) * leapInWeek
  return -(-year * inWeek + leapYearsBetween(cal, year, 0) * leapInWeek)
}

/** Índice do dia da semana, ou `null` num dia intercalar (ou num calendário sem semana). */
export function weekdayIndex(cal: Calendar, date: WorldDate): number | null {
  if (!cal.weekdays.length || cal.months[date.month - 1]?.intercalary) return null
  let count = weekYearStart(cal, date.year)
  for (let m = 1; m < date.month; m++) if (!cal.months[m - 1]!.intercalary) count += monthLength(cal, date.year, m)
  return mod(count + date.day - 1 + cal.firstWeekday, cal.weekdays.length)
}

export function weekday(cal: Calendar, date: WorldDate): string | null {
  const index = weekdayIndex(cal, date)
  return index === null ? null : cal.weekdays[index]!
}

export const PHASES = ["nova", "crescente", "quarto crescente", "gibosa crescente", "cheia", "gibosa minguante", "quarto minguante", "minguante"] as const
export type PhaseName = (typeof PHASES)[number]

export interface MoonState {
  moon: Moon
  /** 0 = nova, 0,5 = cheia. */
  age: number
  phase: PhaseName
  /** Hoje é o dia da cheia (o dia mais perto do pico). */
  fullToday: boolean
  newToday: boolean
}

/** O dia (inteiro) mais perto do pico; no empate (ciclo com ,5), o dia anterior. */
function peakDay(day: number, peakAt: number, cycle: number): number {
  return Math.ceil(peakAt + Math.round((day - peakAt) / cycle) * cycle - 0.5)
}

export function moonState(moon: Moon, day: number): MoonState {
  const age = mod(day - moon.fullAt + moon.cycle / 2, moon.cycle) / moon.cycle
  return {
    moon,
    age,
    phase: PHASES[mod(Math.round(age * 8), 8)]!,
    fullToday: day === peakDay(day, moon.fullAt, moon.cycle),
    newToday: day === peakDay(day, moon.fullAt + moon.cycle / 2, moon.cycle),
  }
}

export function moons(cal: Calendar, date: WorldDate): MoonState[] {
  const day = dayNumber(cal, date)
  return cal.moons.map((moon) => moonState(moon, day))
}

export function season(cal: Calendar, date: WorldDate): string | undefined {
  return cal.months[date.month - 1]?.season
}

export function eraOf(cal: Calendar, year: number): { era: Era; year: number } | null {
  const era = [...cal.eras].reverse().find((e) => year >= e.start)
  return era ? { era, year: year - era.start + 1 } : null
}

// ---------- Texto ----------

export function formatYear(cal: Calendar, year: number): string {
  // Anos sem separador de milhar ("4031 C.E."), como se escreve em mundos de RPG.
  if (year < 0 && cal.negativeSuffix) return `${-year} ${cal.negativeSuffix}`
  return `${year}${cal.suffix ? ` ${cal.suffix}` : ""}`
}

/** "15 de Cinzas de 4031 C.E." (nos intercalares, "3º dos Dias de Logi de 4031 C.E."). */
export function formatDate(cal: Calendar, date: WorldDate): string {
  const month = cal.months[date.month - 1]
  if (!month) return worldDateText(date)
  return month.intercalary ? `${date.day}º dos ${month.name} de ${formatYear(cal, date.year)}` : `${date.day} de ${month.name} de ${formatYear(cal, date.year)}`
}

/** A mesma data contada de outra origem (ex.: 4031 C.E. = 4 Logi). */
export function equivalentYears(cal: Calendar, year: number): string[] {
  return cal.equivalents.map((e) => `${year - e.offset} ${e.name}`)
}

// ---------- Intervalos ----------

/** Anos completos de `from` até `to` (idade). */
export function yearsBetween(from: WorldDate, to: WorldDate): number {
  let years = to.year - from.year
  if (to.month < from.month || (to.month === from.month && to.day < from.day)) years--
  return years
}

/** "há 120 anos", "daqui a 3 meses", "hoje". */
export function relative(cal: Calendar, date: WorldDate, now: WorldDate): string {
  const days = dayNumber(cal, now) - dayNumber(cal, date)
  if (days === 0) return "hoje"
  const past = days > 0
  const abs = Math.abs(days)
  const years = Math.abs(past ? yearsBetween(date, now) : yearsBetween(now, date))
  const average = baseYearLength(cal)
  const monthAverage = average / cal.months.length
  const amount =
    years >= 1 ? `${years} ${years === 1 ? "ano" : "anos"}`
    : abs >= monthAverage ? `${Math.floor(abs / monthAverage)} ${Math.floor(abs / monthAverage) === 1 ? "mês" : "meses"}`
    : `${abs} ${abs === 1 ? "dia" : "dias"}`
  return past ? `há ${amount}` : `daqui a ${amount}`
}

/** Converte uma data para outro calendário, dado um dia que os dois marcam (âncora). */
export function convert(from: Calendar, date: WorldDate, to: Calendar, anchor: { from: WorldDate; to: WorldDate }): WorldDate {
  const offset = dayNumber(to, anchor.to) - dayNumber(from, anchor.from)
  return fromDayNumber(to, dayNumber(from, date) + offset)
}

/** Feriados de um dia (os anuais caem todo ano no mesmo mês e dia). */
export function holidaysOn(cal: Calendar, date: WorldDate): Holiday[] {
  return cal.holidays.filter((h) => h.month === date.month && h.day === date.day && (h.year === undefined || h.year === date.year))
}
