import type { LinkRef } from "../core/parse"
import { scopeOf } from "../core/spaces"
import type { VaultIndex } from "../core/vault-index"
import type { Platform } from "../platform/platform"
import type { NoteSet } from "./note-set"

/** Rota que abre uma nota do cofre no módulo Notas (o caminho vai codificado num segmento só). */
export function vaultRoute(path: string): string {
  return `/notas/${encodeURIComponent(path)}`
}

/** Rota de uma nota pelo espaço dela: artigos de `Wikis/` abrem na Wiki; o resto, em Notas. */
export function noteRoute(path: string): string {
  // Quadros `.canvas` abrem no editor de quadros, onde quer que estejam.
  if (/\.canvas$/i.test(path)) return `/quadro/${encodeURIComponent(path)}`
  return path.startsWith("Wikis/") ? `/wiki/artigo/${encodeURIComponent(path)}` : vaultRoute(path)
}

/** Links do Markdown resolvidos pelo índice do cofre, a partir da nota `from`; anexos pela plataforma. */
export function vaultNoteSet(index: VaultIndex, from: string, handlers: Pick<NoteSet, "onBroken" | "onTag"> = {}, platform?: Pick<Platform, "fileUrl" | "openFile">): NoteSet {
  return {
    notes: [],
    routeOf: (note) => vaultRoute(note.path),
    resolve(target, kind) {
      const link: LinkRef = { kind, embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: false }
      const { dest } = index.resolve(link, from)
      return dest ? { path: dest, route: noteRoute(dest), cross: scopeOf(dest).root !== scopeOf(from).root } : undefined
    },
    readNote: (path) => index.note(path)?.text,
    fileUrl: (path) => platform?.fileUrl(path) ?? undefined,
    openFile: (path) => void platform?.openFile(path),
    ...handlers,
  }
}

/** O alvo de um link para colar em qualquer nota: o nome quando é único no cofre; senão, o caminho sem `.md`. */
export function copyLinkTarget(index: VaultIndex, path: string): string {
  return index.isNameUnique(path) ? path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/i, "") : path.replace(/\.md$/i, "")
}

/** Título como o Obsidian aceita depois do `#` (sem os caracteres que quebram o link). */
export function headingLinkText(heading: string): string {
  return heading.replace(/[#|^[\]]|%%/g, " ").replace(/\s+/g, " ").trim()
}

/** Copia um texto; devolve `false` se o sistema não deixou. Sem permissão da área de transferência, usa o jeito antigo. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.append(area)
    area.select()
    try {
      return document.execCommand("copy")
    } catch {
      return false
    } finally {
      area.remove()
    }
  }
}

