import { AGENDA_ROOT, dueTasks, parseEvent, type AgendaEvent, type DueTask } from "../core/agenda"
import type { VaultIndex } from "../core/vault-index"

/** Os eventos do cofre: as notas de `Agenda/` no formato do Full Calendar. */
export function agendaEvents(index: VaultIndex): AgendaEvent[] {
  return index
    .notesIn(AGENDA_ROOT)
    .map((note) => parseEvent(note.path, note.text))
    .filter((event): event is AgendaEvent => event !== null)
}

/** Tarefas com prazo (📅) de todas as notas do cofre. */
export function vaultDueTasks(index: VaultIndex): DueTask[] {
  return dueTasks(index.allNotes())
}
