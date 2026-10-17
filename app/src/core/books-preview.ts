import { bookAppendices, type PrintOptions } from "./books-finish"
import { bookProperties, readBook } from "./books"
import { noteBody } from "./sections"
import type { IndexedNote, VaultIndex } from "./vault-index"

export const BOOK_SIZES = {
  A4: { width: 210, height: 297, margin: 18 },
  Carta: { width: 215.9, height: 279.4, margin: 18 },
  A5: { width: 148, height: 210, margin: 13 },
  "6x9": { width: 152.4, height: 228.6, margin: 14 },
} as const
export const BOOK_THEMES = { manual: "Manual de RPG", pergaminho: "Pergaminho", moderno: "Moderno", minimalista: "Minimalista" } as const
export type BookSize = keyof typeof BOOK_SIZES
export type BookTheme = keyof typeof BOOK_THEMES
export function previewSettings(book: IndexedNote) {
  const data = bookProperties(book)
  const size: BookSize = typeof data.pagina === "string" && Object.hasOwn(BOOK_SIZES, data.pagina) ? data.pagina as BookSize : "A4"
  const theme: BookTheme = typeof data.tema === "string" && Object.hasOwn(BOOK_THEMES, data.tema) ? data.tema as BookTheme : "manual"
  return { size, theme, newChapter: typeof data.capitulos_nova_pagina === "boolean" ? data.capitulos_nova_pagina : theme !== "minimalista" }
}
export interface PreviewChapter { path: string; title: string; kind: string; body: string }
export function previewChapters(index: VaultIndex, book: IndexedNote, draft?: { path: string; text: string }): PreviewChapter[] {
  return [...readBook(index, book).items.map((item) => item.note
    ? { path: item.note.path, title: item.note.name, kind: item.kind, body: noteBody(draft?.path === item.note.path ? draft.text : item.note.text) }
    : { path: item.link, title: "Link quebrado", kind: "secao", body: `Nota não encontrada: ${item.link}` }), ...bookAppendices(index, book, draft)]
}
/** Só valores enumerados e dimensões conhecidas entram no CSS; metadados não viram regras. */
export function pageRules(size: BookSize, options?: PrintOptions): string {
  const page = BOOK_SIZES[size]
  return `@page { size: ${page.width}mm ${page.height}mm; margin: ${options?.margin ?? page.margin}mm; bleed: ${options?.bleed ?? 0}mm; marks: ${options?.crop ? "crop" : "none"};
    @top-left { content: string(book-title); font-size: 8pt; }
    @top-right { content: string(chapter-title); font-size: 8pt; }
    @bottom-center { content: counter(page); font-size: 9pt; }
  }
  @page cover { @top-left { content: none; } @top-right { content: none; } @bottom-center { content: none; } }
  .book-print-title { string-set: book-title content(text); }
  .book-chapter-heading { string-set: chapter-title content(text); }
  .book-print-cover { page: cover; break-after: page; }
  .book-print-credits { break-after: page; }
  .book-print-back { page: cover; break-before: page; }
  .book-print .book-part, .book-print.chapters-new-page .book-chapter { break-before: page; }
  .book-print .quebra-pagina { break-after: page; }
  .book-print .quebra-coluna { break-after: column; }
  .book-print .md-largo { column-span: all; }
  .book-print h1, .book-print h2, .book-print h3 { break-after: avoid; }
  .book-print p { orphans: 3; widows: 3; }
  .book-print tr, .book-print figure, .book-print .callout { break-inside: avoid; }
  `
}
