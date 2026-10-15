import type { IndexedNote } from "./vault-index"

/**
 * Fixar, colorir e arquivar notas (checklist F.1), do jeito que o Obsidian entende: `fixada` e `cor` são propriedades
 * comuns (aparecem no Obsidian e valem nos outros aparelhos), e arquivar é mover para a pasta `Arquivo` do espaço — os
 * links acompanham, e desarquivar devolve para a pasta de onde a nota saiu.
 */

export const NOTE_COLORS = { vermelho: "var(--red)", dourado: "var(--gold)", verde: "var(--green)", ciano: "var(--cyan)", violeta: "var(--violet)" } as const
export type NoteColor = keyof typeof NOTE_COLORS

export const ARCHIVE_FOLDER = "Arquivo"

export interface NoteFlags {
  pinned: boolean
  color?: NoteColor
}

export function noteFlags(note: Pick<IndexedNote, "meta">): NoteFlags {
  const data = note.meta.frontmatter?.data
  const color = typeof data?.cor === "string" ? (data.cor.trim().toLocaleLowerCase("pt-BR") as NoteColor) : undefined
  return { pinned: data?.fixada === true, ...(color && color in NOTE_COLORS ? { color } : {}) }
}

/** As fixadas primeiro; dentro de cada grupo, pelo nome. */
export function sortNotes<T extends Pick<IndexedNote, "meta" | "name">>(notes: T[]): T[] {
  return [...notes].sort((a, b) => Number(noteFlags(b).pinned) - Number(noteFlags(a).pinned) || a.name.localeCompare(b.name, "pt-BR"))
}

/** `Notas/Ideias/X.md` → `Notas/Arquivo/Ideias/X.md`. `null` fora do espaço ou se já está arquivada. */
export function archivePath(path: string, root = "Notas/"): string | null {
  if (!path.startsWith(root) || isArchived(path, root)) return null
  return `${root}${ARCHIVE_FOLDER}/${path.slice(root.length)}`
}

export function unarchivePath(path: string, root = "Notas/"): string | null {
  return isArchived(path, root) ? root + path.slice(root.length + ARCHIVE_FOLDER.length + 1) : null
}

export function isArchived(path: string, root = "Notas/"): boolean {
  return path.startsWith(`${root}${ARCHIVE_FOLDER}/`)
}
