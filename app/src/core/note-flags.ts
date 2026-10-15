import { creationTime } from "./graph-timelapse"
import { basename, dirname, joinPath } from "./text"
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

/** Ordem das notas na árvore (como no explorador do Obsidian), preferência do aparelho. */
export type NoteOrder = "nome" | "nome-desc" | "modificada" | "modificada-antiga" | "criada" | "criada-antiga"

export const NOTE_ORDERS: { order: NoteOrder; label: string }[] = [
  { order: "nome", label: "Nome (A a Z)" },
  { order: "nome-desc", label: "Nome (Z a A)" },
  { order: "modificada", label: "Editadas por último" },
  { order: "modificada-antiga", label: "Editadas há mais tempo" },
  { order: "criada", label: "Criadas por último" },
  { order: "criada-antiga", label: "Criadas há mais tempo" },
]

/** As fixadas primeiro; dentro de cada grupo, na ordem escolhida (empate: pelo nome). */
export function sortNotes<T extends Pick<IndexedNote, "meta" | "name" | "mtime">>(notes: T[], order: NoteOrder = "nome"): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "pt-BR")
  const by: Record<NoteOrder, (a: T, b: T) => number> = {
    nome: byName,
    "nome-desc": (a, b) => byName(b, a),
    modificada: (a, b) => b.mtime - a.mtime,
    "modificada-antiga": (a, b) => a.mtime - b.mtime,
    criada: (a, b) => creationTime(b) - creationTime(a),
    "criada-antiga": (a, b) => creationTime(a) - creationTime(b),
  }
  return [...notes].sort((a, b) => Number(noteFlags(b).pinned) - Number(noteFlags(a).pinned) || by[order](a, b) || byName(a, b))
}

/**
 * Para onde vai `from` (nota ou pasta) solta na pasta `folder` da árvore. `null` = já está lá; erro = não dá (pasta
 * dentro dela mesma, ou já existe um item com o mesmo nome no destino).
 */
export function moveDestination(from: string, folder: string, isFolder: boolean, exists: (path: string) => boolean): { to: string } | { error: string } | null {
  if (dirname(from) === folder || from === folder) return null
  if (isFolder && folder.startsWith(from + "/")) return { error: "Não dá para mover uma pasta para dentro dela mesma." }
  const to = joinPath(folder, basename(from))!
  if (exists(to)) return { error: `Já existe “${basename(from)}” em ${folder || "raiz do cofre"}.` }
  return { to }
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
