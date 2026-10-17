import { stringify } from "yaml"
import { maskNonContent, parseFrontmatter, parseNote } from "./parse"
import { dirname } from "./text"
import type { IndexedNote, VaultIndex } from "./vault-index"

export const bookRoute = (path: string) => `/livros/${encodeURIComponent(path)}`
export const bookProperties = (note: IndexedNote) => note.meta.frontmatter?.data ?? {}
export function countWords(text: string): number {
  const body = text.slice(parseFrontmatter(text)?.end ?? 0)
  const visible = maskNonContent(body.replace(/^(?: {4}|\t).*$/gm, ""))
    .replace(/<[^>]*>/g, "")
    .replace(/!?\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, target: string, alias: string | undefined) => alias ?? target)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[![^\]]+\]|\{[^}]*\}|\[\^[^\]]+\]/g, "")
  return visible.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0
}
export function findBooks(index: VaultIndex): IndexedNote[] {
  return index.notesIn("Livros/").filter((n) => bookProperties(n).tipo === "livro").sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}
export interface BookItem {
  link: string
  note?: IndexedNote
  words: number
  kind: string
  status: string
  summary: string
}
export function readBook(index: VaultIndex, book: IndexedNote) {
  const data = bookProperties(book)
  const raw = data.estrutura
  const error = raw !== undefined && (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) ? "A estrutura precisa ser uma lista de links. Corrija a nota do livro em Notas." : undefined
  const links: string[] = Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : []
  const items: BookItem[] = links.map((link) => {
    const parsed = parseNote(link).links.find((l) => l.raw === link && !l.embed)
    const resolved = parsed ? index.resolve(parsed, book.path) : undefined
    const note = resolved?.dest && !resolved.viaAlias && !resolved.subpathMissing ? index.note(resolved.dest) : undefined
    const props = note ? bookProperties(note) : {}
    return { link, note, words: note ? countWords(note.text) : 0, kind: typeof props.tipo === "string" ? props.tipo : "capitulo", status: typeof props.status === "string" ? props.status : "rascunho", summary: typeof props.resumo === "string" ? props.resumo : "" }
  })
  return {
    items, error, words: items.reduce((sum, item) => sum + item.words, 0), chapters: items.filter((item) => item.note && item.kind === "capitulo").length,
    outside: index.notesIn(dirname(book.path) + "/").filter((n) => n.path !== book.path && !items.some((i) => i.note?.path === n.path))
  }
}
export function moveBookItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items]
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= items.length || to >= items.length) return next
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}
export function newBookText(title: string, links: string[] = [], subtitle = ""): string {
  return `---\n${stringify({ tipo: "livro", subtitulo: subtitle, autor: "", estrutura: links })}---\n# ${title}\n\nAnotações do livro.\n`
}
