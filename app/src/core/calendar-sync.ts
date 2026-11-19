import { isMap, isSeq, parseDocument, Scalar } from "yaml"
import { dayNumber, fromDayNumber, parseWorldDate, worldDateText, type Calendar, type Moon, type WorldDate } from "./calendar"
import { noteName } from "./text"
import type { CalendarRef } from "./wiki"

/**
 * Calendários sincronizados. Uma correspondência (`correspondencias:` no bloco) diz que um dia de um calendário é o
 * mesmo dia de outro; daí sai a diferença em dias absolutos entre os dois. A ligação vale nos dois sentidos e passa
 * por calendários intermediários (A ↔ B ↔ C), então basta ligar cada calendário a um outro.
 */

/** O calendário que uma correspondência cita (pelo nome da nota ou pelo `nome:` do bloco). */
export function findCalendar(refs: CalendarRef[], target: string): CalendarRef | undefined {
  const wanted = target.replace(/^\[\[|\]\]$/g, "").split("/").pop()!.trim().toLocaleLowerCase("pt-BR")
  return refs.find((r) => noteName(r.path).toLocaleLowerCase("pt-BR") === wanted || r.calendar.name.toLocaleLowerCase("pt-BR") === wanted)
}

/**
 * Deslocamento de cada calendário ligado (direta ou indiretamente) a `base`: `dia em base = dia no calendário + deslocamento`.
 * A própria base tem deslocamento 0; calendários sem ligação não aparecem.
 */
export function calendarOffsets(refs: CalendarRef[], base: string): Map<string, number> {
  const edges = new Map<string, { to: string; offset: number }[]>()
  const add = (from: string, to: string, offset: number) => edges.set(from, [...(edges.get(from) ?? []), { to, offset }])
  for (const ref of refs) {
    for (const c of ref.calendar.correspondences) {
      const other = findCalendar(refs, c.calendar)
      if (!other || other.path === ref.path) continue
      // dia no outro = dia aqui + d
      const d = dayNumber(other.calendar, c.there) - dayNumber(ref.calendar, c.here)
      add(ref.path, other.path, d)
      add(other.path, ref.path, -d)
    }
  }
  // offsets[X] = dia em base − dia em X. Percorre a partir da base: se base → X soma d, então dia em X = dia em base + d.
  const offsets = new Map<string, number>([[base, 0]])
  const queue = [base]
  while (queue.length) {
    const current = queue.shift()!
    for (const { to, offset } of edges.get(current) ?? []) {
      if (offsets.has(to)) continue
      offsets.set(to, offsets.get(current)! - offset)
      queue.push(to)
    }
  }
  return offsets
}

/** A mesma data em outro calendário ligado (ou `null` se não há ligação). */
export function convertBetween(refs: CalendarRef[], from: CalendarRef, date: WorldDate, to: CalendarRef): WorldDate | null {
  const offset = calendarOffsets(refs, from.path).get(to.path)
  if (offset === undefined) return null
  return fromDayNumber(to.calendar, dayNumber(from.calendar, date) - offset)
}

/** O "hoje" de cada calendário ligado quando `source` passa a estar em `today`. */
export function syncedTodays(refs: CalendarRef[], source: CalendarRef, today: WorldDate): { ref: CalendarRef; today: WorldDate }[] {
  return refs.flatMap((ref) => {
    if (ref.path === source.path) return []
    const date = convertBetween(refs, source, today, ref)
    return date ? [{ ref, today: date }] : []
  })
}

/** Acrescenta uma correspondência ao YAML do bloco `runas-calendario`, sem mexer no resto do texto. */
export function addCorrespondence(content: string, calendarNote: string, here: WorldDate, there: WorldDate): string {
  const eol = content.includes("\r\n") ? "\r\n" : "\n"
  const item = `  - { calendario: "[[${calendarNote}]]", data: "${worldDateText(here)}", data_no_outro: "${worldDateText(there)}" }`
  const lines = content.replace(/\r?\n$/, "").split(/\r?\n/)
  const at = lines.findIndex((l) => /^correspondencias\s*:/.test(l))
  if (at < 0) return [...lines, "correspondencias:", item].join(eol)
  if (/^correspondencias\s*:\s*\[\s*\]\s*$/.test(lines[at]!)) lines[at] = "correspondencias:"
  let end = at + 1
  while (end < lines.length && /^\s+\S/.test(lines[end]!)) end++
  lines.splice(end, 0, item)
  return lines.join(eol)
}

// ---------- Aniversários entre calendários ligados ----------

/** O mesmo dia em outro calendário, pelo deslocamento de `calendarOffsets(refs, base)`: dia na base = dia no outro + offset. */
export function dayIn(base: Calendar, date: WorldDate, other: Calendar, offset: number): WorldDate {
  return fromDayNumber(other, dayNumber(base, date) - offset)
}

/**
 * A idade que alguém faz em `date` (um dia de `base`), se for o aniversário dele. O aniversário é comemorado no
 * calendário em que a pessoa nasceu (`origin`): com os dois sincronizados, ele cai no dia de `base` que corresponde ao
 * mesmo dia e mês de lá. No próprio calendário de nascimento, o deslocamento é 0.
 */
export function birthdayAge(base: Calendar, date: WorldDate, origin: Calendar, offset: number, born: WorldDate): number | null {
  const there = offset === 0 && base === origin ? date : dayIn(base, date, origin, offset)
  return there.month === born.month && there.day === born.day && there.year >= born.year ? there.year - born.year : null
}

// ---------- Conferir a sincronização: luas ----------

const nameKey = (name: string) => name.trim().toLocaleLowerCase("pt-BR")
const nearestFull = (fullAt: number, cycle: number, day: number) => fullAt + Math.round((day - fullAt) / cycle) * cycle

export interface MoonCheck {
  other: CalendarRef
  here: Moon
  there: Moon
  /** Deslocamento usado (dia aqui = dia lá + offset), já com o ajuste pedido. */
  offset: number
  /** Dias entre a cheia mais perto de `reference` aqui e a de lá (positivo: lá vem depois). */
  diff: number
  sameCycle: boolean
}

/**
 * As luas com o mesmo nome em `current` e nos calendários ligados a ele, com a diferença entre as cheias perto do dia
 * `reference` (dia absoluto de `current`). `shift` simula a ligação movida: lá fica `shift` dias depois.
 */
export function moonChecks(refs: CalendarRef[], current: CalendarRef, reference: number, shift = 0, only?: string): MoonCheck[] {
  const offsets = calendarOffsets(refs, current.path)
  return refs.flatMap((other) => {
    const base = offsets.get(other.path)
    if (other.path === current.path || base === undefined || (only && other.path !== only)) return []
    const offset = base - shift
    return current.calendar.moons.flatMap((here) => {
      const there = other.calendar.moons.find((m) => nameKey(m.name) === nameKey(here.name))
      if (!there) return []
      const sameCycle = here.cycle === there.cycle
      let diff = nearestFull(there.fullAt + offset, there.cycle, reference) - nearestFull(here.fullAt, here.cycle, reference)
      // Mesmo ciclo: a diferença é circular, então fica entre meio ciclo para trás e meio para a frente.
      if (sameCycle) diff = ((((diff + here.cycle / 2) % here.cycle) + here.cycle) % here.cycle) - here.cycle / 2
      return [{ other, here, there, offset, diff: Math.round(diff * 10) / 10, sameCycle }]
    })
  })
}

/** A data de `cheia_em` que faz a lua de `to` ficar cheia no mesmo dia que `moon` (`offset`: dia de `moon` = dia em `to` + offset). */
export function alignedFull(moon: Moon, to: CalendarRef, offset: number): WorldDate {
  return fromDayNumber(to.calendar, Math.round(moon.fullAt) - offset)
}

const quoted = (value: string) => {
  const node = new Scalar(value)
  node.type = Scalar.QUOTE_DOUBLE
  return node
}
const blockText = (doc: ReturnType<typeof parseDocument>) => doc.toString({ lineWidth: 0, flowCollectionPadding: true }).replace(/\[ ([^[\]\n"]*?) \]/g, "[$1]")

/** Regrava o `cheia_em` da lua `name` no YAML do bloco, sem mexer no resto. */
export function withMoonFull(content: string, name: string, date: WorldDate): string {
  const doc = parseDocument(content)
  const moons = doc.get("luas")
  const moon = isSeq(moons) ? moons.items.find((item) => isMap(item) && nameKey(String(item.get("nome") ?? "")) === nameKey(name)) : undefined
  if (!isMap(moon)) throw new Error(`A lua “${name}” não está no bloco do calendário.`)
  moon.set("cheia_em", quoted(worldDateText(date)))
  moon.delete("cheia_no_dia")
  return blockText(doc)
}

// ---------- Conferir a sincronização: a ligação ----------

export interface DirectLink {
  /** O calendário em cujo bloco está a correspondência. */
  owner: CalendarRef
  /** O outro calendário, citado nela. */
  target: CalendarRef
  /** O texto de `calendario:` como o bloco o escreve (para achar o item). */
  cited: string
  here: WorldDate
  there: WorldDate
}

/** A correspondência que liga `a` e `b` diretamente (no bloco de qualquer um dos dois), se houver. */
export function directLink(refs: CalendarRef[], a: CalendarRef, b: CalendarRef): DirectLink | null {
  for (const [owner, target] of [[a, b], [b, a]] as const) {
    const c = owner.calendar.correspondences.find((item) => findCalendar(refs, item.calendar)?.path === target.path)
    if (c) return { owner, target, cited: c.calendar, here: c.here, there: c.there }
  }
  return null
}

/** O calendário ligado diretamente a `current` por onde passa a ligação com `other` (quando ela é indireta). */
export function linkVia(refs: CalendarRef[], current: CalendarRef, other: CalendarRef): CalendarRef | null {
  return refs.find((r) => r.path !== current.path && r.path !== other.path && directLink(refs, current, r) && calendarOffsets(refs, r.path).has(other.path)) ?? null
}

/** A nova `data_no_outro` da correspondência para que, visto de `current`, o outro calendário fique `days` dias depois. */
export function shiftedThere(link: DirectLink, current: CalendarRef, days: number): WorldDate {
  // No bloco de `current`, `data_no_outro` é do outro: anda junto. No bloco do outro, é de `current`: anda ao contrário.
  const step = link.owner.path === current.path ? days : -days
  return fromDayNumber(link.target.calendar, dayNumber(link.target.calendar, link.there) + step)
}

/** Regrava a `data_no_outro` da correspondência que cita `cited` com `data: here`, sem mexer no resto do bloco. */
export function withCorrespondenceDate(content: string, cited: string, here: WorldDate, there: WorldDate): string {
  const doc = parseDocument(content)
  const list = doc.get("correspondencias")
  const target = (text: unknown) => (/\[\[([^\]|#]+)/.exec(String(text ?? ""))?.[1] ?? String(text ?? "")).trim()
  const item = isSeq(list) ? list.items.find((node) => {
    if (!isMap(node)) return false
    const date = parseWorldDate(node.get("data"))
    return target(node.get("calendario")) === cited.trim() && date !== null && worldDateText(date) === worldDateText(here)
  }) : undefined
  if (!isMap(item)) throw new Error("A correspondência não está mais no bloco do calendário; abra a aba de novo.")
  item.set("data_no_outro", quoted(worldDateText(there)))
  return blockText(doc)
}
