import { AGENDA_ROOT, parseEvent, type AgendaEvent } from "../core/agenda"
import type { VaultIndex } from "../core/vault-index"

/** Os eventos do cofre: as notas de `Agenda/` no formato do Full Calendar. */
export function agendaEvents(index: VaultIndex): AgendaEvent[] {
  return index
    .notesIn(AGENDA_ROOT)
    .map((note) => parseEvent(note.path, note.text))
    .filter((event): event is AgendaEvent => event !== null)
}
