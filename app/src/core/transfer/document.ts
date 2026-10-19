import { newBookText } from "../books"
import { setProperty } from "../properties"
import { VaultIndex } from "../vault-index"
import { publicWikiIndex } from "../wiki-public"

/** Documento temporário para reutilizar o mesmo leitor, paginação e exportadores, sem criar notas no cofre. */
export function prepareDocumentExport(index: VaultIndex, paths: string[], title: string, players: boolean, cover: boolean, id = crypto.randomUUID()) {
  const source = players ? publicWikiIndex(index) : index
  const notes = paths.flatMap(path => source.note(path) ? [source.note(path)!] : [])
  if (!notes.length) throw new Error("Selecione ao menos uma nota disponível para esta versão do documento.")
  if (notes.length > 200) throw new Error("Selecione até 200 notas por documento. Para transportar o cofre inteiro, use um pacote ou ZIP.")
  const name = title.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").slice(0, 100) || "Documento"
  const path = `.exportacao-${id}/${name}.md`
  let text = newBookText(name, notes.map(note => `[[${note.path.replace(/\.md$/i, "")}]]`))
  for (const [key, value] of Object.entries({ tema: "minimalista", pagina: "A4", capitulos_nova_pagina: false, exportar_capa: cover })) text = setProperty(text, key, value)
  const texts = Object.fromEntries(source.allNotes().map(note => [note.path, note.text]))
  const projected = new VaultIndex([...source.allFiles(), { path, size: new TextEncoder().encode(text).length, mtime: 1 }], { ...texts, [path]: text })
  return { index: projected, book: projected.note(path)!, count: notes.length, excluded: paths.length - notes.length }
}
