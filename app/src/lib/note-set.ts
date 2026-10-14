import { createContext, useContext } from "react"
import type { Note, SpaceId } from "../data/types"
import { ALL_NOTES } from "./links"
import { routeOfNote } from "./navigation"

/** Destino de um link já resolvido, para o Markdown desenhar e abrir. */
export interface LinkTarget {
  /** Caminho no cofre (aparece no título do link). */
  path: string
  route: string
  /** Nota de outro espaço (desenhada como "portal"). */
  cross: boolean
}

/**
 * Conjunto de notas em que links, backlinks e o gráfico local procuram, e a rota que abre cada uma.
 * Por padrão, as notas de exemplo; o leitor do cofre troca `resolve` pelo índice do cofre.
 */
export interface NoteSet {
  notes: Note[]
  routeOf: (note: Note) => string
  /** Resolve um link do texto (wikilink ou link markdown interno). Sem isto, procura nas notas de exemplo. */
  resolve?: (target: string, kind: "wiki" | "markdown") => LinkTarget | undefined
  /** Clique num link para nota que não existe (criar a nota). */
  onBroken?: (target: string) => void
  /** Clique numa tag. */
  onTag?: (tag: string) => void
  /** Texto de uma nota (para a transclusão `![[nota]]`), pelo caminho que `resolve` devolveu. */
  readNote?: (path: string) => string | undefined
  /** Endereço que a interface carrega para um anexo do cofre (imagem, áudio, vídeo); sem isto, só o nome aparece. */
  fileUrl?: (path: string) => string | undefined
  /** Abre um anexo no programa padrão do sistema (PDF, por exemplo). */
  openFile?: (path: string) => void
}

export const NoteSetContext = createContext<NoteSet>({ notes: ALL_NOTES, routeOf: routeOfNote })

export function useNoteSet(): NoteSet {
  return useContext(NoteSetContext)
}

export type { SpaceId }
