import { dateProblem, type WorldDate } from "../../core/calendar"
import { syncedTodays } from "../../core/calendar-sync"
import { listCalendars, type CalendarRef } from "../../core/wiki"
import { withWorldToday } from "../../core/world-today"
import { clockProblem, withWorldClock, type WorldClock } from "../../core/world-clock"
import { useVault } from "../../platform/VaultProvider"

/**
 * Grava “hoje no mundo” num calendário e, com `sync`, nos calendários ligados a ele (o mesmo dia, convertido pela
 * correspondência). O Calendário da Wiki e o Painel da campanha usam a mesma gravação.
 */
export function useSetWorldToday() {
  const vault = useVault()
  const write = async (path: string, next: WorldDate) => {
    const note = vault.index!.note(path)
    const text = note ? withWorldToday(note.text, next) : null
    if (note && text !== null && text !== note.text) await vault.save(path, text)
  }
  return async (ref: CalendarRef, next: WorldDate, sync = true, self = true) => {
    const problem = dateProblem(ref.calendar, next)
    if (problem) throw new Error(problem)
    if (self) await write(ref.path, next)
    if (!sync) return
    const root = /^Wikis\/[^/]+\//.exec(ref.path)?.[0] ?? ""
    const refs = listCalendars(vault.index!, root).filter((c): c is CalendarRef => "calendar" in c)
    for (const other of syncedTodays(refs, ref, next)) await write(other.ref.path, other.today)
  }
}

/**
 * Relógio do mundo (U30): grava hora, período e configuração do relógio e, se veio, o `hoje` — tudo numa gravação só
 * do bloco do calendário. Os calendários ligados recebem só o `hoje` (a hora é deste calendário).
 */
export function useSetWorldClock() {
  const vault = useVault()
  const setToday = useSetWorldToday()
  return async (ref: CalendarRef, clock: WorldClock, today?: WorldDate) => {
    const problem = clockProblem(clock) ?? (today ? dateProblem(ref.calendar, today) : null)
    if (problem) throw new Error(problem)
    const note = vault.index!.note(ref.path)
    if (!note) throw new Error("O calendário não está mais no cofre.")
    const dated = today ? withWorldToday(note.text, today) : note.text
    const text = dated === null ? null : withWorldClock(dated, clock)
    if (text === null) throw new Error("A nota do calendário não tem o bloco runas-calendario.")
    if (text !== note.text) await vault.save(ref.path, text)
    // Os ligados: a mesma conta do “hoje no mundo”, sem regravar este calendário (já gravado acima).
    if (today) await setToday(ref, today, true, false)
  }
}
