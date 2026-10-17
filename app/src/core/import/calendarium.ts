import { dateProblem, dayNumber, defaultAbbr, fromDayNumber, parseCalendar, weekdayIndex, worldDateText, type Calendar, type WorldDate } from "../calendar"
import { flowList, flowMap, yamlDate, yamlScalar } from "./yaml-out"

/**
 * Calendários do Calendarium (`.obsidian/plugins/calendarium/data.json`, e o antigo plugin Fantasy Calendar, com o
 * mesmo formato) e do site Fantasy-Calendar (JSON exportado) viram blocos ```runas-calendario``` (ADR 0010).
 *
 * As contas seguem as do Calendarium: o `firstWeekDay` é o dia da semana do primeiro dia do ano 1, meses intercalares
 * não andam a semana e as luas contam só os dias da semana. O que o motor do app não tem (meses que só aparecem em
 * alguns anos, semana que recomeça a cada mês, mais de um dia bissexto…) vira aviso; nada é descartado em silêncio.
 */

// ---------- Leitura defensiva do JSON ----------

type Json = Record<string, unknown>
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined)
const mod = (n: number, m: number) => ((n % m) + m) % m

// ---------- Formato do Calendarium (só o que a conversão usa) ----------

export interface CmDate {
  year: number | null
  /** Mês a partir de 0, como no Calendarium. */
  month: number | null
  day: number | null
}

interface CmMonth {
  name: string
  length: number
  intercalary: boolean
  interval: number
}

interface CmLeapDay {
  name: string
  intercalary: boolean
  /** Mês (a partir de 0) que ganha o dia. */
  timespan: number
  offset: number
  conditions: { interval: number; exclusive: boolean }[]
}

interface CmEvent {
  name: string
  description: string
  note: string | null
  category: string | null
  /** Ano, mês e dia; `null` (ou um intervalo `[a, b]`) é "todo". */
  date: { year: number | null | [number | null, number | null]; month: number | null | unknown[]; day: number | null | unknown[] }
  end: CmDate | null
}

interface CmSeason {
  name: string
  month?: number
  day?: number
  duration: number
  peak: number
}

export interface CmCalendar {
  id: string
  name: string
  description: string
  firstWeekDay: number
  overflow: boolean
  weekOffset: number
  weekdays: string[]
  months: CmMonth[]
  leapDays: CmLeapDay[]
  moons: { name: string; cycle: number; offset: number; color?: string }[]
  eras: { name: string; start: CmDate | null; endsYear: boolean }[]
  seasons: { type: "Dated" | "Periodic"; offset: number; list: CmSeason[] }
  current: CmDate
  events: CmEvent[]
  categories: Map<string, { name: string; color?: string }>
  /** Formato das datas nas notas (`fc-date`), ex. `YYYY-MM-DD`. */
  dateFormat?: string
  customYears: boolean
  monthWeeks: boolean
}

const cmDate = (v: unknown): CmDate => {
  const o = obj(v)
  const n = (x: unknown) => (num(x) === undefined ? null : num(x)!)
  return { year: n(o.year), month: n(o.month), day: n(o.day) }
}

/** Um calendário do `data.json` do Calendarium (ou do Fantasy Calendar antigo). */
export function readCalendarium(raw: unknown): CmCalendar {
  const c = obj(raw)
  const s = obj(c.static)
  const seasonal = obj(c.seasonal)
  const categories = new Map<string, { name: string; color?: string }>()
  for (const cat of arr(c.categories)) {
    const o = obj(cat)
    if (str(o.id)) categories.set(str(o.id), { name: str(o.name), ...(str(o.color) ? { color: str(o.color) } : {}) })
  }
  const months = arr(s.months).map((m, i): CmMonth => {
    const o = obj(m)
    return { name: str(o.name) || `Mês ${i + 1}`, length: Math.max(0, Math.round(num(o.length) ?? 0)), intercalary: o.type === "intercalary", interval: num(o.interval) ?? 1 }
  })
  return {
    id: str(c.id),
    name: str(c.name) || "Calendário",
    description: str(c.description),
    firstWeekDay: num(s.firstWeekDay) ?? 0,
    overflow: s.overflow !== false,
    weekOffset: num(s.offset) ?? 0,
    weekdays: arr(s.weekdays).map((d, i) => str(obj(d).name) || `Dia ${i + 1}`),
    months,
    leapDays: arr(s.leapDays).map((l, i): CmLeapDay => {
      const o = obj(l)
      return {
        name: str(o.name) || `Dia bissexto ${i + 1}`,
        intercalary: o.intercalary === true,
        timespan: num(o.timespan) ?? 0,
        offset: num(o.offset) ?? 0,
        conditions: arr(o.interval)
          .map((x) => ({ interval: num(obj(x).interval) ?? 0, exclusive: obj(x).exclusive === true }))
          .filter((x) => x.interval > 0)
          .sort((a, b) => a.interval - b.interval),
      }
    }),
    moons: arr(s.moons).map((m, i) => {
      const o = obj(m)
      return { name: str(o.name) || `Lua ${i + 1}`, cycle: num(o.cycle) ?? 0, offset: num(o.offset) ?? 0, ...(str(o.faceColor) ? { color: str(o.faceColor) } : {}) }
    }),
    eras: arr(s.eras).map((e, i) => {
      const o = obj(e)
      return { name: str(o.name) || `Era ${i + 1}`, start: o.isStartingEra === true ? null : cmDate(o.date), endsYear: o.endsYear === true }
    }),
    seasons: {
      type: seasonal.type === "Dated" ? "Dated" : "Periodic",
      offset: num(seasonal.offset) ?? 0,
      list: arr(seasonal.seasons).map((x, i) => {
        const o = obj(x)
        return { name: str(o.name) || `Estação ${i + 1}`, ...(num(o.month) !== undefined ? { month: num(o.month)! } : {}), ...(num(o.day) !== undefined ? { day: num(o.day)! } : {}), duration: num(o.duration) ?? 0, peak: num(o.peak) ?? 0 }
      }),
    },
    current: cmDate(c.current),
    events: arr(c.events).map((e): CmEvent => {
      const o = obj(e)
      const d = obj(o.date)
      const bit = (x: unknown) => (Array.isArray(x) ? x : num(x) === undefined ? null : num(x)!)
      return {
        name: str(o.name) || "Evento",
        description: str(o.description),
        note: str(o.note) || null,
        category: str(o.category) || null,
        date: { year: bit(d.year) as CmEvent["date"]["year"], month: bit(d.month), day: bit(d.day) },
        end: o.end ? cmDate(o.end) : null,
      }
    }),
    categories,
    ...(str(c.dateFormat) ? { dateFormat: str(c.dateFormat) } : {}),
    customYears: s.useCustomYears === true,
    monthWeeks: arr(s.months).some((m) => arr(obj(m).week).length > 0),
  }
}

/** Os calendários do `data.json` do Calendarium; `null` se o arquivo não é desse plugin. */
export function calendariumData(json: string): { calendars: CmCalendar[]; defaultCalendar: string | null; dateFormat: string; paths: [string, string][] } | null {
  let data: Json
  try {
    data = obj(JSON.parse(json))
  } catch {
    return null
  }
  if (!Array.isArray(data.calendars)) return null
  const dateFormat = str(data.dateFormat) || "YYYY-MM-DD"
  return {
    calendars: data.calendars.map(readCalendarium).map((c) => ({ ...c, dateFormat: c.dateFormat ?? dateFormat })),
    defaultCalendar: str(data.defaultCalendar) || null,
    dateFormat,
    paths: arr(data.paths).flatMap((p) => (Array.isArray(p) && typeof p[0] === "string" && typeof p[1] === "string" ? [[p[0], p[1]] as [string, string]] : [])),
  }
}

/**
 * JSON exportado do site Fantasy-Calendar, no formato do Calendarium (a mesma leitura que o importador dele faz):
 * `first_day` conta a partir de 1, intervalos de bissexto em texto (`"400,!100,4"`), luas com `shift`.
 */
export function readFantasyCalendar(raw: unknown): CmCalendar | null {
  const data = obj(raw)
  const s = obj(data.static_data)
  const year = obj(s.year_data)
  if (!Array.isArray(year.timespans) || !Array.isArray(year.global_week)) return null
  const seasons = obj(s.seasons)
  const periodic = obj(seasons.global_settings).periodic_seasons !== false
  const dynamic = obj(data.dynamic_data)
  const categories = arr(data.categories).map((c) => ({ id: str(obj(c).id), name: str(obj(c).name), color: str(obj(obj(c).event_settings).color) }))
  return readCalendarium({
    name: str(data.name) || "Calendário importado",
    static: {
      firstWeekDay: Math.max((num(year.first_day) ?? 1) - 1, 0),
      overflow: year.overflow !== false,
      weekdays: year.global_week.map((name) => ({ name: str(name) })),
      months: year.timespans.map((t) => {
        const o = obj(t)
        return { name: str(o.name), type: o.type === "intercalary" ? "intercalary" : "month", length: num(o.length), interval: num(o.interval) ?? 1 }
      }),
      leapDays: arr(year.leap_days).map((l) => {
        const o = obj(l)
        return {
          name: str(o.name),
          intercalary: o.intercalary === true,
          timespan: num(o.timespan) ?? 0,
          offset: num(o.offset) ?? 0,
          interval: str(o.interval || "1")
            .split(",")
            .map((part) => ({ interval: Number(/\d+/.exec(part)?.[0] ?? 0), exclusive: part.includes("!") })),
        }
      }),
      moons: arr(s.moons).map((m) => ({ name: str(obj(m).name), cycle: num(obj(m).cycle), offset: num(obj(m).shift) ?? 0, faceColor: str(obj(m).color) })),
      eras: arr(s.eras).map((e) => {
        const o = obj(e)
        const d = obj(o.date)
        return { name: str(o.name), endsYear: o.endsYear === true, date: { year: num(d.year) ?? 1, month: num(d.timespan) ?? 0, day: num(d.day) ?? 1 } }
      }),
    },
    seasonal: {
      type: periodic ? "Periodic" : "Dated",
      offset: 0,
      seasons: arr(seasons.data).map((x) => {
        const o = obj(x)
        return periodic ? { name: str(o.name), duration: (num(o.length) ?? 0) - (num(o.duration) ?? 0), peak: num(o.duration) ?? 0 } : { name: str(o.name), month: num(o.timespan) ?? 0, day: num(o.day) ?? 1 }
      }),
    },
    current: { year: Math.max(1, num(dynamic.year) ?? 1), month: num(dynamic.timespan) ?? 0, day: num(dynamic.day) ?? 1 },
    categories: categories.map((c) => ({ id: c.id, name: c.name, color: /^#[0-9a-f]{3,8}$/i.test(c.color) ? c.color : undefined })),
    events: arr(data.events).map((e) => {
      const o = obj(e)
      const d = obj(o.data)
      const date = { year: null as number | null, month: null as number | null, day: null as number | null }
      const list = arr(d.date)
      if (list.length >= 3) [date.year, date.month, date.day] = list.map((x) => num(x) ?? null) as [number | null, number | null, number | null]
      else {
        // Condições simples ("Month" 11 e "Day" 25): o mesmo atalho do importador do Calendarium.
        for (const cond of arr(d.conditions)) {
          if (!Array.isArray(cond) || typeof cond[0] !== "string") continue
          const value = num(arr(cond[2])[0])
          if (value === undefined) continue
          if (cond[0] === "Year") date.year = value
          if (cond[0] === "Month") date.month = value
          if (cond[0] === "Day") date.day = value
        }
      }
      return { name: str(o.name), description: str(o.description).replace(/<[^>]+>/g, "").trim(), category: str(o.event_category_id) || null, date }
    }),
  })
}

// ---------- Contas do Calendarium ----------

/** O dia bissexto cai no ano? (as condições em ordem crescente, como o Calendarium testa) */
function leapOccurs(leap: CmLeapDay, year: number): boolean {
  const y = year - leap.offset
  return leap.conditions.some(({ interval, exclusive }, i, list) => {
    if (exclusive && i === 0) return mod(y, interval) !== 0
    if (exclusive) return false
    const next = list[i + 1]
    if (next?.exclusive) return mod(y, interval) === 0 && mod(y, next.interval) !== 0
    return mod(y, interval) === 0
  })
}

/** Dias da semana (sem os intercalares) de 1/1 do ano 1 até a data (anos a partir de 1), como o Calendarium conta as luas. */
function calendariumDaysBefore(cal: CmCalendar, date: { year: number; month: number; day: number }): number {
  const weekMonths = cal.months.filter((m) => !m.intercalary)
  const perYear = weekMonths.reduce((sum, m) => sum + m.length, 0)
  const leaps = cal.leapDays.filter((l) => !l.intercalary)
  let days = (date.year - 1) * perYear
  for (let y = 1; y < date.year; y++) days += leaps.filter((l) => leapOccurs(l, y)).length
  cal.months.slice(0, date.month).forEach((m) => {
    if (!m.intercalary) days += m.length
  })
  days += leaps.filter((l) => l.timespan < date.month && leapOccurs(l, date.year)).length
  return days + date.day - 1
}

// ---------- Conversão ----------

export interface CalendarConversion {
  name: string
  /** Conteúdo do bloco ```runas-calendario```. */
  yaml: string
  /** Nota inteira (frontmatter, descrição, bloco e os eventos que só cabem em texto). */
  note: string
  warnings: string[]
  /** O calendário já lido pelo motor do app (para conferir datas). */
  calendar: Calendar
}

const MONTH_DAY = (month: number, day: number) => `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

/** Converte um calendário do Calendarium (ou do Fantasy-Calendar, já lido) para o bloco do app. */
export function convertCalendar(cal: CmCalendar, origin = "Calendarium"): CalendarConversion {
  const warnings: string[] = []
  const lines: string[] = [`# Convertido do ${origin} pela migração do Runas-Codex.`, `nome: ${yamlScalar(cal.name)}`, `sigla: ${yamlScalar(defaultAbbr(cal.name))}`]
  if (!cal.months.length) throw new Error(`O calendário “${cal.name}” não tem meses.`)

  if (cal.weekdays.length) lines.push(`semana: ${flowList(cal.weekdays)}`)
  if (!cal.overflow) warnings.push("No Calendarium cada mês recomeça a semana; aqui a semana corre direto de um mês para o outro.")
  if (cal.weekOffset) warnings.push(`O deslocamento da semana (offset ${cal.weekOffset}) não foi levado: confira o dia da semana.`)
  if (cal.monthWeeks) warnings.push("Alguns meses têm semana própria; aqui todos usam a mesma semana.")
  if (cal.customYears) warnings.push("Os nomes de ano personalizados não foram levados (aqui os anos são números).")
  if (cal.eras.some((e) => e.endsYear)) warnings.push("Há era que encerra o ano antes da hora; aqui os anos têm sempre todos os meses.")

  // Estação de cada mês: a que vale no meio dele.
  const seasonOf = seasonPicker(cal, warnings)

  // Bissexto: um só, com regras encaixadas (4 → 100 → 400).
  const [leap, ...otherLeaps] = cal.leapDays
  let leapLine: string | undefined
  if (leap) {
    if (otherLeaps.length) warnings.push(`Só o primeiro dia bissexto (“${leap.name}”) foi levado; ficaram de fora: ${otherLeaps.map((l) => `“${l.name}”`).join(", ")}.`)
    if (leap.offset) warnings.push(`O bissexto “${leap.name}” começa a contar do ano ${leap.offset}; aqui conta do ano 0.`)
    if (leap.intercalary) warnings.push(`O bissexto “${leap.name}” fica fora da semana no Calendarium; aqui ele conta na semana.`)
    const c = leap.conditions
    const pattern = c.map((x) => (x.exclusive ? "!" : "+")).join("")
    const month = cal.months[leap.timespan] ? leap.timespan + 1 : cal.months.length
    if (pattern === "+") leapLine = flowMap({ a_cada: c[0]!.interval, mes: month, dias: 1 })
    else if (pattern === "+!" && c[1]!.interval % c[0]!.interval === 0) leapLine = flowMap({ a_cada: c[0]!.interval, exceto_a_cada: c[1]!.interval, mes: month, dias: 1 })
    else if (pattern === "+!+" && c[1]!.interval % c[0]!.interval === 0 && c[2]!.interval % c[1]!.interval === 0) leapLine = flowMap({ a_cada: c[0]!.interval, exceto_a_cada: c[1]!.interval, salvo_a_cada: c[2]!.interval, mes: month, dias: 1 })
    else {
      const first = c.find((x) => !x.exclusive)
      if (first) leapLine = flowMap({ a_cada: first.interval, mes: month, dias: 1 })
      warnings.push(`A regra do bissexto “${leap.name}” (${c.map((x) => `${x.exclusive ? "não " : ""}a cada ${x.interval}`).join(", ")}) não cabe no app${first ? `; ficou “a cada ${first.interval} anos”` : " e ficou de fora"}.`)
    }
  }

  lines.push("meses:")
  cal.months.forEach((m, i) => {
    if (m.interval > 1) warnings.push(`O mês “${m.name}” só aparece a cada ${m.interval} anos no Calendarium; aqui ele está em todos os anos.`)
    const season = seasonOf(i)
    lines.push(`  - ${flowMap({ nome: m.name, dias: Math.max(1, m.length), ...(season ? { estacao: season } : {}), ...(m.intercalary ? { intercalar: true } : {}) })}`)
  })
  if (leapLine) lines.push(`bissexto: ${leapLine}`)

  // Primeiro rascunho, para calcular o dia da semana do ano 1 e as luas no motor do app.
  const draft = parseCalendar(lines.join("\n"))
  const firstWeekMonth = cal.months.findIndex((m) => !m.intercalary)
  if (cal.weekdays.length && firstWeekMonth >= 0) {
    const w0 = weekdayIndex(draft, { year: 1, month: firstWeekMonth + 1, day: 1 }) ?? 0
    const first = mod(cal.firstWeekDay - w0, cal.weekdays.length)
    lines.splice(lines.findIndex((l) => l.startsWith("semana:")) + 1, 0, `primeiro_dia: ${first}`)
  }

  // Data atual da campanha (o Calendarium conta o mês a partir de 0).
  const current = cal.current.year !== null && cal.current.month !== null && cal.current.day !== null ? { year: cal.current.year, month: cal.current.month + 1, day: cal.current.day } : null
  const today = current && !dateProblem(draft, current) ? current : null
  if (current && !today) warnings.push(`A data atual (${worldDateText(current)}) não existe no calendário convertido e ficou de fora.`)

  // Luas: uma cheia perto da data atual, contada como o Calendarium conta (só os dias da semana).
  const anchor = today && today.year >= 1 ? today : { year: 1, month: Math.max(firstWeekMonth, 0) + 1, day: 1 }
  const moons = cal.moons.filter((m) => {
    if (m.cycle > 0) return true
    warnings.push(`A lua “${m.name}” não tem ciclo e ficou de fora.`)
    return false
  })
  if (moons.length) {
    lines.push("luas:")
    const db = calendariumDaysBefore(cal, { year: anchor.year, month: anchor.month - 1, day: anchor.day })
    for (const moon of moons) {
      const k = Math.round((db - moon.offset) / moon.cycle - 0.5)
      const delta = moon.offset + (k + 0.5) * moon.cycle - db
      const full = fromDayNumber(draft, Math.round(dayNumber(draft, anchor) + delta))
      lines.push(`  - ${flowMap({ nome: moon.name, ciclo: moon.cycle, cheia_em: worldDateText(full), ...(moon.color ? { cor: moon.color } : {}) })}`)
    }
    if (cal.months.some((m) => m.intercalary)) warnings.push("O Calendarium não anda as luas nos dias intercalares; as fases batem perto da data atual e podem se afastar em séculos distantes.")
  }

  // Eras: o ano em que começam (a era inicial, sem data, não tem equivalente).
  const eras = cal.eras.filter((e) => {
    if (e.start?.year != null) return true
    warnings.push(`A era inicial “${e.name}” (antes de todas as outras) não tem ano de início e ficou só nos avisos.`)
    return false
  })
  if (eras.length) {
    lines.push("eras:")
    for (const era of eras) {
      if ((era.start!.month ?? 0) > 0 || (era.start!.day ?? 1) > 1) warnings.push(`A era “${era.name}” começa no meio do ano ${era.start!.year}; aqui ela vale desde o começo desse ano.`)
      lines.push(`  - ${flowMap({ nome: era.name, inicio: era.start!.year! })}`)
    }
  }

  // Eventos: com data fixa ou todo ano viram feriados; os ligados a notas ficam nas notas (data_mundo).
  const holidays: string[] = []
  const textEvents: string[] = []
  const describe = (e: CmEvent, when: string) => {
    if (e.description) textEvents.push(`- **${e.name}** (${when}): ${e.description.replace(/\s*\n\s*/g, " ")}`)
  }
  for (const e of cal.events) {
    if (e.note) continue
    const { year, month, day } = e.date
    const color = e.category ? cal.categories.get(e.category)?.color : undefined
    if (typeof month === "number" && typeof day === "number" && cal.months[month]) {
      if (typeof year === "number") {
        const when = worldDateText({ year, month: month + 1, day })
        holidays.push(`  - ${flowMap({ nome: e.name, data: when, ...(color ? { cor: color } : {}) })}`)
        if (e.end && e.end.year !== null && e.end.month !== null && e.end.day !== null) {
          const end = worldDateText({ year: e.end.year, month: e.end.month + 1, day: e.end.day })
          warnings.push(`O evento “${e.name}” vai até ${end}; aqui ele marca só o primeiro dia.`)
          describe(e, `${when} a ${end}`)
        } else describe(e, when)
      } else {
        if (Array.isArray(year)) warnings.push(`O evento “${e.name}” vale só de ${year[0] ?? "…"} a ${year[1] ?? "…"}; aqui ele cai todo ano.`)
        holidays.push(`  - ${flowMap({ nome: e.name, data: MONTH_DAY(month + 1, day), ...(color ? { cor: color } : {}) })}`)
        describe(e, `todo ${day} de ${cal.months[month]!.name}`)
      }
    } else {
      textEvents.push(`- **${e.name}**${e.description ? `: ${e.description.replace(/\s*\n\s*/g, " ")}` : ""}`)
      warnings.push(`O evento “${e.name}” não tem dia e mês fixos (${year === null && month === null && day === null ? "sem data" : "repete de um jeito que o app não tem"}); ficou só no texto da nota.`)
    }
  }
  if (holidays.length) lines.push("feriados:", ...holidays)
  if (today) lines.push(`hoje: ${yamlDate(worldDateText(today))}`)

  const yaml = lines.join("\n")
  const calendar = parseCalendar(yaml)
  const body = [
    "---\ntipo: calendario\n---",
    `# ${cal.name}`,
    ...(cal.description ? [cal.description] : []),
    "```runas-calendario\n" + yaml + "\n```",
    ...(textEvents.length ? ["## Eventos do " + origin, textEvents.join("\n")] : []),
  ]
  return { name: cal.name, yaml, note: body.join("\n\n") + "\n", warnings, calendar }
}

/** Estação de cada mês (índice a partir de 0): a que vale no dia do meio do mês, no ano 1. */
function seasonPicker(cal: CmCalendar, warnings: string[]): (month: number) => string | undefined {
  const list = cal.seasons.list
  if (!list.length) return () => undefined
  warnings.push("As estações do Calendarium mudam em qualquer dia; aqui cada mês fica com a estação do meio dele.")
  if (cal.seasons.type === "Dated") {
    const dated = list.filter((s) => s.month !== undefined).sort((a, b) => a.month! - b.month! || (a.day ?? 1) - (b.day ?? 1))
    return (month) => {
      const middle = Math.ceil(Math.max(1, cal.months[month]!.length) / 2)
      const found = [...dated].reverse().find((s) => s.month! < month || (s.month === month && (s.day ?? 1) <= middle))
      return (found ?? dated[dated.length - 1])?.name
    }
  }
  const total = list.reduce((sum, s) => sum + s.duration + s.peak, 0)
  if (total <= 0) return () => undefined
  return (month) => {
    const middle = Math.ceil(Math.max(1, cal.months[month]!.length) / 2)
    let passed = mod(calendariumDaysBefore(cal, { year: 1, month, day: middle }) - cal.seasons.offset, total)
    for (const s of list) {
      if (passed <= s.duration + s.peak) return s.name
      passed -= s.duration + s.peak
    }
    return list[list.length - 1]!.name
  }
}

// ---------- Datas nas notas (fc-date) ----------

export interface NoteDateConversion {
  /** `data_mundo` (e `data_fim_mundo`), entre aspas no frontmatter. */
  start: string
  end?: string
}

/**
 * Lê uma data do Calendarium escrita numa nota (`fc-date`, `fc-start`, `fc-end`): texto na ordem do `dateFormat`
 * (`2023-03-14`, `2023-March-14`) ou mapa `{ year, month, day }`. O mês conta a partir de 1. Datas que repetem (`*`)
 * não têm equivalente: devolve `null`.
 */
export function parseNoteDate(value: unknown, cal: CmCalendar): WorldDate | null {
  const monthOf = (bit: unknown): number | null => {
    const n = num(bit)
    if (n !== undefined) return n >= 1 && n <= cal.months.length ? n : null
    const name = str(bit).toLocaleLowerCase()
    if (!name) return null
    const i = cal.months.findIndex((m) => m.name.toLocaleLowerCase().startsWith(name))
    return i >= 0 ? i + 1 : null
  }
  let parts: { year: unknown; month: unknown; day: unknown }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const o = value as Json
    parts = { year: o.year, month: o.month, day: o.day }
  } else if (typeof value === "string") {
    const bits = value.trim().split(/(?!^)[-–—](?![^[]*])/)
    const order = (cal.dateFormat ?? "YYYY-MM-DD").toUpperCase().replace(/[^YMD]/g, "").replace(/(.)\1+/g, "$1")
    const at = (letter: string) => bits[order.indexOf(letter)]
    parts = { year: at("Y"), month: at("M"), day: at("D") }
  } else return null
  const year = num(parts.year)
  const month = monthOf(parts.month)
  const day = num(parts.day)
  if (year === undefined || month === null || day === undefined || !Number.isInteger(year) || !Number.isInteger(day)) return null
  return { year, month, day }
}
