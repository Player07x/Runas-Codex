import { dayNumber, fromDayNumber, worldDateText, type WorldDate } from "./calendar"
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
