import { findBooks, readBook } from "./books"
import { parseNote } from "./parse"
import { setProperty } from "./properties"
import type { VaultIndex } from "./vault-index"

/** Planeja enquanto os destinos ainda existem, sem confundir notas homônimas ou apagar links já quebrados. */
export function bookEditsBeforeTrash(index: VaultIndex, path: string): { path: string; before: string; after: string }[] {
  const removed = (candidate: string) => candidate === path || candidate.startsWith(path + "/")
  return findBooks(index).flatMap(book => {
    if (removed(book.path)) return []
    const structure = readBook(index, book)
    if (structure.error) return []
    const links = structure.items.map(item => item.link)
    const next = links.filter(link => {
      const parsed = parseNote(link).links.find(ref => ref.raw === link && !ref.embed)
      const dest = parsed ? index.resolve(parsed, book.path).dest : null
      return !dest || !removed(dest)
    })
    return next.length === links.length ? [] : [{ path: book.path, before: book.text, after: setProperty(book.text, "estrutura", next) }]
  })
}
