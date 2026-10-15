import { newBookText } from "../books"
import { nameProblem } from "../names"
import { foldName } from "../text"
import type { ImportedBook } from "./types"

interface ImportWriter {
  createFolder(path: string): Promise<void>
  createNote(folder: string, name: string, content?: string): Promise<string>
  addAttachment(name: string, bytes: Uint8Array, nearNote?: string, folder?: string): Promise<string>
}
export function importName(title: string): string {
  const clean = title.replace(/[[\]#^|\\/:*?"<>\u0000-\u001f]/g, "-").replace(/^[.\s]+|[.\s]+$/g, "").slice(0, 70).replace(/[.\s]+$/, "")
  return !clean || nameProblem(clean) ? "Livro importado" : clean
}
export function importFolder(title: string, existing: string[]): string {
  const name = importName(title)
  const taken = existing.map(foldName)
  for (let n = 0; ; n++) {
    const path = `Livros/${name}${n ? ` ${n + 1}` : ""}`
    if (!taken.some((entry) => entry === foldName(path) || entry.startsWith(foldName(path) + "/"))) return path
  }
}

/** Grava só após confirmar. Toda escrita usa useVault, e o livro é publicado após os capítulos. */
export async function saveImportedBook(book: ImportedBook, folder: string, writer: ImportWriter): Promise<string> {
  const name = folder.slice(folder.lastIndexOf("/") + 1)
  const bookPath = `${folder}/${name}.md`
  let started = false
  try {
    await writer.createFolder(folder)
    started = true
    const imagePaths = new Map<string, string>()
    if (book.images.length) await writer.createFolder(`${folder}/Anexos`)
    for (const image of book.images) imagePaths.set(image.id, await writer.addAttachment(image.name, image.bytes, bookPath, `${folder}/Anexos`))
    const paths: string[] = []
    for (const [i, chapter] of book.chapters.entries()) {
      const chapterName = `${String(i + 1).padStart(2, "0")} — ${importName(chapter.title)}`
      let markdown = chapter.markdown.replace(/!\[([^\]]*)\]\((import-image:\d+)\)/g, (_, _alt: string, id: string) => {
        const path = imagePaths.get(id)
        if (!path) throw new Error("Imagem da importação não encontrada.")
        return `![[${path}]]`
      })
      // Imagens em células mescladas ou parágrafos alinhados permanecem em HTML sanitizado.
      markdown = markdown.replace(/src="(import-image:\d+)"/g, (_, id: string) => {
        const path = imagePaths.get(id)
        if (!path) throw new Error("Imagem da importação não encontrada.")
        return `src="${path.replace(/&/g, "&amp;")}"`
      })
      paths.push(await writer.createNote(folder, chapterName, `---\ntipo: capitulo\nstatus: rascunho\n---\n\n${markdown}\n`))
    }
    return await writer.createNote(folder, name, newBookText(book.title, paths.map((path) => `[[${path.slice(0, -3)}]]`)))
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}${started ? ` As notas e anexos já criados foram preservados em “${folder}”. Confira essa pasta antes de tentar novamente.` : ""}`)
  }
}
