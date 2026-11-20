import { dayNumber, dateProblem, fromDayNumber, parseWorldDate, type WorldDate } from "./calendar"
import { birthdayAge } from "./calendar-sync"
import { noteName } from "./text"
import type { VaultIndex } from "./vault-index"
import { calendarFor, calendarListLookup, noteDates, timelineEvents, type CalendarRef } from "./wiki"
import { worldEventMatcher } from "./world-event-recurrence"

interface Mark { label: string; color: string; to: string }
interface Birth { path: string; born: WorldDate; order: number }
interface Birthdays {
  origin: CalendarRef
  offset: number
  dates: Map<string, Birth[]>
}
const monthDay = ({ month, day }: WorldDate) => `${month}:${day}`
const eventMark = (path: string, label: string): Mark => ({ label, color: "var(--violet)", to: path })

/** Os dados mudam com a versão do índice. A grade só consulta as marcações de cada dia. */
export function prepareWikiCalendar(index: VaultIndex, root: string, ref: CalendarRef, offsets: ReadonlyMap<string, number>, players: boolean, list = calendarListLookup(index)) {
  const { calendar } = ref
  const events = timelineEvents(index, root, ref, { list }).flatMap((event) => {
    const data = index.note(event.path)?.meta.frontmatter?.data
    if (data?.recorrencia_mundo || (players && data?.segredo === true)) return []
    return [{ start: event.startDay, end: event.endDay, mark: eventMark(event.path, event.title) }]
  })
  const recurring: { matches(date: WorldDate, day: number): boolean; mark: Mark }[] = []
  const births = new Map<string, Birthdays>()
  let order = 0
  for (const note of index.notesIn(root)) {
    const data = note.meta.frontmatter?.data
    if (data?.recorrencia_mundo && !(players && data.segredo === true)) {
      const matches = worldEventMatcher(data, calendar)
      if (matches) {
        const found = calendarFor(index, note.path, noteDates(data).find((d) => d.key === "data_mundo")?.date, list)
        if (found && "calendar" in found && found.path === ref.path) recurring.push({ matches, mark: eventMark(note.path, note.name) })
      }
    }
    const born = parseWorldDate(data?.nascimento_mundo)
    if (!born) continue
    const found = calendarFor(index, note.path, born, list)
    if (!found || !("calendar" in found)) continue
    const offset = offsets.get(found.path)
    if (offset === undefined) continue
    let group = births.get(found.path)
    if (!group) {
      group = { origin: found, offset, dates: new Map() }
      births.set(found.path, group)
    }
    const key = monthDay(born)
    const birth = { path: note.path, born, order: order++ }
    const onDate = group.dates.get(key)
    if (onDate) onDate.push(birth)
    else group.dates.set(key, [birth])
  }

  return {
    marks(date: WorldDate): Mark[] {
      const day = dayNumber(calendar, date)
      const marks = events.filter((event) => event.start <= day && event.end >= day).map((event) => event.mark)
      if (!dateProblem(calendar, date)) {
        for (const event of recurring) if (event.matches(date, day)) marks.push(event.mark)
      }
      const birthdays: { birth: Birth; age: number; suffix: string }[] = []
      for (const group of births.values()) {
        const local = group.origin.calendar === calendar && group.offset === 0
          ? date
          : fromDayNumber(group.origin.calendar, day - group.offset)
        const suffix = group.origin.path === ref.path ? "" : ` · ${group.origin.calendar.abbr}`
        // O índice por mês:dia só escolhe os candidatos; quem decide é a mesma regra do resto do app.
        for (const birth of group.dates.get(monthDay(local)) ?? []) {
          const age = birthdayAge(calendar, date, group.origin.calendar, group.offset, birth.born)
          if (age !== null) birthdays.push({ birth, age, suffix })
        }
      }
      birthdays.sort((a, b) => a.birth.order - b.birth.order)
      for (const { birth, age, suffix } of birthdays) {
        marks.push({ label: `${noteName(birth.path)} (${age}${suffix})`, color: "var(--gold)", to: birth.path })
      }
      return marks
    },
    upcoming(other: CalendarRef, today: WorldDate, offset: number) {
      const group = births.get(other.path)
      const upcoming: { path: string; age: number; date: WorldDate }[] = []
      if (!group) return upcoming
      const first = dayNumber(calendar, today)
      for (let day = first; day < first + 400 && upcoming.length < 3; day++) {
        const local = fromDayNumber(other.calendar, day - offset)
        const candidates = group.dates.get(monthDay(local))
        if (!candidates) continue
        const date = fromDayNumber(calendar, day)
        for (const birth of candidates) {
          const age = birthdayAge(calendar, date, other.calendar, offset, birth.born)
          if (age === null) continue
          upcoming.push({ path: birth.path, age, date })
          if (upcoming.length === 3) break
        }
      }
      return upcoming
    },
  }
}

export type WikiCalendarData = ReturnType<typeof prepareWikiCalendar>
