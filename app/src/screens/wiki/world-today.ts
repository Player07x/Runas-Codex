import { dateProblem, type WorldDate } from "../../core/calendar"
import { syncedTodays } from "../../core/calendar-sync"
import { listCalendars, type CalendarRef } from "../../core/wiki"
import { withWorldToday } from "../../core/world-today"
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
  return async (ref: CalendarRef, next: WorldDate, sync = true) => {
    const problem = dateProblem(ref.calendar, next)
    if (problem) throw new Error(problem)
    await write(ref.path, next)
    if (!sync) return
    const root = /^Wikis\/[^/]+\//.exec(ref.path)?.[0] ?? ""
    const refs = listCalendars(vault.index!, root).filter((c): c is CalendarRef => "calendar" in c)
    for (const other of syncedTodays(refs, ref, next)) await write(other.ref.path, other.today)
  }
}
