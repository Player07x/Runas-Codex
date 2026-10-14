import { createContext, useContext } from "react"
import type { Note } from "../data/types"
import { ALL_NOTES } from "./links"
import { routeOfNote } from "./navigation"

/**
 * Conjunto de notas em que links, backlinks e o gráfico local procuram, e a rota que abre cada uma.
 * Por padrão, as notas de exemplo; o leitor do cofre real troca pelas notas do disco.
 */
export interface NoteSet {
  notes: Note[]
  routeOf: (note: Note) => string
}

export const NoteSetContext = createContext<NoteSet>({ notes: ALL_NOTES, routeOf: routeOfNote })

export function useNoteSet(): NoteSet {
  return useContext(NoteSetContext)
}
