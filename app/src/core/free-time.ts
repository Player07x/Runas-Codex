import { expandEvents, type AgendaEvent } from "./agenda"

/**
 * Tempo livre na Agenda: as faixas em que a pessoa disse estar disponível, menos a união de tudo que ocupa o tempo
 * (eventos que bloqueiam e tarefas com horário reservado). Sobreposições e encostos são unidos antes de somar, então
 * nenhum minuto conta duas vezes; faixas disponíveis sobrepostas também são unidas. A conta é em instantes reais no
 * fuso escolhido: num dia de troca do horário de verão, 00:00–24:00 tem 23 ou 25 horas.
 */

/** `HH:mm` (de 00:00 a 24:00). */
export interface TimeRange {
  start: string
  end: string
}

export interface FreeTimePrefs {
  /** Faixas disponíveis de cada dia da semana (0 = domingo). */
  weekly: TimeRange[][]
  /** Exceções por data (`AAAA-MM-DD`): a lista substitui a da semana; lista vazia = indisponível. */
  exceptions: Record<string, TimeRange[]>
  /** Pastas de `Agenda/` (calendários) cujos eventos ocupam o tempo; vazia = todas. */
  calendars: string[]
  /** Evento de dia inteiro: ocupa as faixas do dia ou é só anotação. */
  allDay: "block" | "ignore"
  /** Tarefas com horário (`- [ ] 09:00 - 10:30 …`) ocupam o tempo. */
  taskBlocks: boolean
  /** Fuso IANA (vazio = o do aparelho). */
  timeZone: string
}

export const EMPTY_FREE_TIME: FreeTimePrefs = { weekly: [[], [], [], [], [], [], []], exceptions: {}, calendars: [], allDay: "block", taskBlocks: true, timeZone: "" }

/** Sem nenhuma faixa definida: a tela pede para configurar (não presume 24 h livres). */
export function hasAvailability(prefs: FreeTimePrefs): boolean {
  return prefs.weekly.some((day) => day.length > 0) || Object.values(prefs.exceptions).some((day) => day.length > 0)
}

// ---------- Fuso ----------

const pad = (n: number) => String(n).padStart(2, "0")

const formatters = new Map<string, Intl.DateTimeFormat>()

function parts(instant: number, timeZone: string): { y: number; m: number; d: number; hh: number; mm: number } {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: timeZone || undefined, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    formatters.set(timeZone, f)
  }
  const list = f.formatToParts(new Date(instant))
  const get = (type: string) => Number(list.find((p) => p.type === type)?.value)
  return { y: get("year"), m: get("month"), d: get("day"), hh: get("hour"), mm: get("minute") }
}

/** Data e hora de parede (`AAAA-MM-DD`, `HH:mm`) no fuso → instante (ms). Horário que não existe (pulado pelo horário de verão) anda para a frente. */
export function wallToInstant(date: string, time: string, timeZone: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  const [hh, mm] = time.split(":").map(Number) as [number, number]
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  // Duas correções pelo deslocamento do fuso no palpite (resolve as trocas de horário).
  let instant = guess
  for (let i = 0; i < 3; i++) {
    const p = parts(instant, timeZone)
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm)
    const next = instant - (asUtc - guess)
    if (next === instant) break
    instant = next
  }
  return instant
}

/** Instante → `AAAA-MM-DD` e `HH:mm` no fuso. */
export function instantToWall(instant: number, timeZone: string): { date: string; time: string } {
  const p = parts(instant, timeZone)
  return { date: `${p.y}-${pad(p.m)}-${pad(p.d)}`, time: `${pad(p.hh)}:${pad(p.mm)}` }
}

function nextDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

// ---------- Intervalos ----------

export interface Interval {
  start: number
  end: number
}

/** União: ordena e junta os que se sobrepõem ou encostam. */
export function union(list: Interval[]): Interval[] {
  const sorted = list.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start)
  const out: Interval[] = []
  for (const i of sorted) {
    const last = out[out.length - 1]
    if (last && i.start <= last.end) last.end = Math.max(last.end, i.end)
    else out.push({ ...i })
  }
  return out
}

/** `a` menos a união de `b` (as duas já unidas). */
export function subtract(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = []
  for (const range of a) {
    let cursor = range.start
    for (const busy of b) {
      if (busy.end <= cursor || busy.start >= range.end) continue
      if (busy.start > cursor) out.push({ start: cursor, end: busy.start })
      cursor = Math.max(cursor, busy.end)
      if (cursor >= range.end) break
    }
    if (cursor < range.end) out.push({ start: cursor, end: range.end })
  }
  return out
}

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = []
  for (const x of a) for (const y of b) {
    const start = Math.max(x.start, y.start)
    const end = Math.min(x.end, y.end)
    if (end > start) out.push({ start, end })
  }
  return union(out)
}

export const minutes = (list: Interval[]) => Math.round(list.reduce((sum, i) => sum + (i.end - i.start), 0) / 60_000)

// ---------- O dia ----------

/** O que ocupa o tempo: um intervalo com o que é (para a tela explicar). */
export interface Busy extends Interval {
  label: string
  kind: "evento" | "dia-inteiro" | "tarefa"
}

export interface FreeDay {
  date: string
  /** Faixas disponíveis (já unidas) e livres, em instantes. */
  available: Interval[]
  free: Interval[]
  busy: Busy[]
  /** Minutos livres no dia todo. */
  freeMinutes: number
  /** Minutos livres de agora até o fim do dia (só para hoje; `null` nos outros dias). */
  remainingMinutes: number | null
  /** Sem faixa disponível nesse dia. */
  unavailable: boolean
}

/** Faixas disponíveis de um dia, em instantes. */
export function availableOn(date: string, prefs: FreeTimePrefs): Interval[] {
  const ranges = prefs.exceptions[date] ?? prefs.weekly[weekday(date)] ?? []
  const dayEnd = wallToInstant(nextDate(date), "00:00", prefs.timeZone)
  return union(
    ranges.map((r) => ({
      start: wallToInstant(date, r.start, prefs.timeZone),
      end: r.end === "24:00" ? dayEnd : wallToInstant(date, r.end, prefs.timeZone),
    })),
  )
}

/** O evento ocupa o tempo? (calendário escolhido e não marcado como livre). */
export function eventBlocks(event: AgendaEvent, prefs: FreeTimePrefs): boolean {
  if (event.busy === false || event.completed === true) return false
  if (!prefs.calendars.length) return true
  const folder = event.path.slice(0, event.path.lastIndexOf("/"))
  return prefs.calendars.some((c) => folder === c || folder.startsWith(c + "/"))
}

/** Tarefa com horário reservado (formato do plugin Day Planner, que o Obsidian também lê): `09:00 - 10:30 descrição`. */
export interface TimedTask {
  date: string
  start: string
  end: string
  label: string
}

const TIME_BLOCK = /^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s+(.*)$/

export function taskTimeBlock(description: string): { start: string; end: string; label: string } | null {
  const m = TIME_BLOCK.exec(description.trim())
  if (!m) return null
  const norm = (t: string) => {
    const [h, mi] = t.split(":").map(Number) as [number, number]
    return h <= 24 && mi < 60 ? `${pad(h)}:${pad(mi)}` : null
  }
  const start = norm(m[1]!)
  const end = norm(m[2]!)
  return start && end ? { start, end, label: m[3]! } : null
}

/**
 * Tempo livre de um dia. `occurrencesOf(from, to)` dá as ocorrências dos eventos que encostam no intervalo (vem de
 * `expandEvents`, em horário local); `now` é o instante atual (para o "livre restante" de hoje).
 */
export function freeDay(date: string, prefs: FreeTimePrefs, events: AgendaEvent[], tasks: TimedTask[], now: number): FreeDay {
  const dayStart = wallToInstant(date, "00:00", prefs.timeZone)
  const dayEnd = wallToInstant(nextDate(date), "00:00", prefs.timeZone)
  const available = availableOn(date, prefs)
  const busy: Busy[] = []
  const blocking = events.filter((e) => eventBlocks(e, prefs))
  // As ocorrências vêm em horário local do aparelho; viram horário de parede e depois instantes no fuso escolhido.
  const localWall = (d: Date) => ({ date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` })
  const [y, m, d] = date.split("-").map(Number) as [number, number, number]
  for (const o of expandEvents(blocking, new Date(y, m - 1, d - 1), new Date(y, m - 1, d + 2))) {
    if (o.event.allDay) {
      if (prefs.allDay === "ignore") continue
      const s = localWall(o.start).date
      const e = localWall(o.end).date
      // Dia inteiro cobre [s, e): ocupa este dia se ele estiver dentro.
      if (s <= date && date < e) busy.push({ start: dayStart, end: dayEnd, label: o.event.title, kind: "dia-inteiro" })
      continue
    }
    const s = localWall(o.start)
    const e = localWall(o.end)
    const start = wallToInstant(s.date, s.time, prefs.timeZone)
    const end = wallToInstant(e.date, e.time, prefs.timeZone)
    if (end > dayStart && start < dayEnd) busy.push({ start: Math.max(start, dayStart), end: Math.min(end, dayEnd), label: o.event.title, kind: "evento" })
  }
  if (prefs.taskBlocks) {
    for (const t of tasks) {
      if (t.date !== date) continue
      const start = wallToInstant(date, t.start, prefs.timeZone)
      let end = t.end === "24:00" ? dayEnd : wallToInstant(date, t.end, prefs.timeZone)
      if (end <= start) end = dayEnd // termina depois da meia-noite: conta até o fim do dia
      busy.push({ start, end, label: t.label, kind: "tarefa" })
    }
  }
  const occupied = union(busy.map(({ start, end }) => ({ start, end })))
  const free = subtract(available, occupied)
  const today = instantToWall(now, prefs.timeZone).date === date
  return {
    date,
    available,
    free,
    busy: busy.sort((a, b) => a.start - b.start),
    freeMinutes: minutes(free),
    remainingMinutes: today ? minutes(intersect(free, [{ start: now, end: dayEnd }])) : null,
    unavailable: available.length === 0,
  }
}

/** `6 h`, `2 h 30 min`, `45 min`, `0 min`. */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`
}

/** Faixa em horas de parede do fuso (`08:00–09:00`); o fim à meia-noite do dia seguinte vira `24:00`. */
export function formatInterval(i: Interval, date: string, timeZone: string): string {
  const s = instantToWall(i.start, timeZone)
  const e = instantToWall(i.end, timeZone)
  return `${s.time}–${e.date !== date && e.time === "00:00" ? "24:00" : e.time}`
}

// ---------- Preferências ----------

const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/

export function validRange(r: TimeRange): boolean {
  return TIME.test(r.start) && TIME.test(r.end) && r.start < r.end
}

/** Lê as preferências guardadas (JSON), completando com o vazio. */
export function parseFreeTimePrefs(json: string | null): FreeTimePrefs {
  if (!json) return EMPTY_FREE_TIME
  try {
    const data = JSON.parse(json) as Partial<FreeTimePrefs>
    const ranges = (list: unknown): TimeRange[] => (Array.isArray(list) ? list.filter((r): r is TimeRange => !!r && typeof r === "object" && validRange(r as TimeRange)) : [])
    return {
      weekly: Array.from({ length: 7 }, (_, i) => ranges(data.weekly?.[i])),
      exceptions: Object.fromEntries(Object.entries(data.exceptions ?? {}).filter(([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k)).map(([k, v]) => [k, ranges(v)])),
      calendars: Array.isArray(data.calendars) ? data.calendars.filter((c): c is string => typeof c === "string") : [],
      allDay: data.allDay === "ignore" ? "ignore" : "block",
      taskBlocks: data.taskBlocks !== false,
      timeZone: typeof data.timeZone === "string" ? data.timeZone : "",
    }
  } catch {
    return EMPTY_FREE_TIME
  }
}
