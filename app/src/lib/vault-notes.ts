import type { LinkRef } from "../core/parse"
import { scopeOf } from "../core/spaces"
import type { VaultIndex } from "../core/vault-index"
import type { Platform } from "../platform/platform"
import type { NoteSet } from "./note-set"

/** Rota que abre uma nota do cofre no módulo Notas (o caminho vai codificado num segmento só). */
export function vaultRoute(path: string): string {
  return `/notas/${encodeURIComponent(path)}`
}

/** Links do Markdown resolvidos pelo índice do cofre, a partir da nota `from`; anexos pela plataforma. */
export function vaultNoteSet(index: VaultIndex, from: string, handlers: Pick<NoteSet, "onBroken" | "onTag"> = {}, platform?: Pick<Platform, "fileUrl" | "openFile">): NoteSet {
  return {
    notes: [],
    routeOf: (note) => vaultRoute(note.path),
    resolve(target, kind) {
      const link: LinkRef = { kind, embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: false }
      const { dest } = index.resolve(link, from)
      return dest ? { path: dest, route: vaultRoute(dest), cross: scopeOf(dest).root !== scopeOf(from).root } : undefined
    },
    readNote: (path) => index.note(path)?.text,
    fileUrl: (path) => platform?.fileUrl(path) ?? undefined,
    openFile: (path) => void platform?.openFile(path),
    ...handlers,
  }
}
