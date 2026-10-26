import { bookProperties, readBook } from "./books"
import { maskNonContent, parseNote } from "./parse"
import { noteBody } from "./sections"
import type { IndexedNote, VaultIndex } from "./vault-index"

export interface BookReference { path: string; title: string; kind: string; summary: string; chapters: number[] }
/** Usa os links do mesmo leitor do cofre; código/comentários não viram referências. */
export function bookReferences(index: VaultIndex, book: IndexedNote, draft?: { path: string; text: string }): BookReference[] {
  const result = new Map<string, BookReference>()
  readBook(index, book).items.forEach((item, chapter) => {
    if (!item.note) return
    for (const link of parseNote(draft?.path === item.note.path ? draft.text : item.note.text).links) {
      if (link.inFrontmatter) continue
      const dest = index.resolve(link, item.note.path).dest
      const note = dest ? index.note(dest) : undefined
      if (!note?.path.startsWith("Wikis/")) continue
      const props = bookProperties(note)
      const found = result.get(note.path) ?? { path: note.path, title: note.name, kind: String(props.tipo ?? "artigo"), summary: String(props.resumo ?? ""), chapters: [] }
      if (!found.chapters.includes(chapter)) found.chapters.push(chapter)
      result.set(note.path, found)
    }
  })
  return [...result.values()].sort((a,b) => a.title.localeCompare(b.title, "pt-BR"))
}
export function indexEntries(index: VaultIndex, book: IndexedNote, draft?: { path: string; text: string }) {
  const terms = bookProperties(book).indice_termos
  const items = readBook(index, book).items
  const refs = bookReferences(index, book, draft).map(r => ({ term: r.title, chapters: r.chapters }))
  for (const term of Array.isArray(terms) ? terms.filter((v): v is string => typeof v === "string" && Boolean(v.trim())) : []) {
    if (refs.some(r => r.term.toLocaleLowerCase("pt-BR") === term.toLocaleLowerCase("pt-BR"))) continue
    const chapters = items.flatMap((item,i) => item.note && maskNonContent(noteBody(draft?.path === item.note.path ? draft.text : item.note.text)).toLocaleLowerCase("pt-BR").includes(term.toLocaleLowerCase("pt-BR")) ? [i] : [])
    if (chapters.length) refs.push({ term, chapters })
  }
  return refs.sort((a,b) => a.term.localeCompare(b.term, "pt-BR"))
}
export function bookAppendices(index: VaultIndex, book: IndexedNote, draft?: { path: string; text: string }) {
  const props = bookProperties(book)
  return [
    ...(props.indice_remissivo === true ? [{ path: book.path, title: "Índice remissivo", kind: "indice", body: indexEntries(index,book,draft).map(r => `- **${r.term}**: ${r.chapters.map(i => `[${i+1}](#book-chapter-${i})`).join(", ")}`).join("\n") || "Nenhuma referência. Acrescente links para a Wiki ou termos nos metadados." }] : []),
    ...(props.glossario === true ? [{ path: book.path, title: "Glossário", kind: "glossario", body: bookReferences(index,book,draft).map(r => `### ${r.title}\n\n${r.summary || "Artigo citado; acrescente a propriedade resumo na Wiki."}`).join("\n\n") || "Nenhum artigo da Wiki citado." }] : []),
  ]
}
export interface PrintOptions { margin?: number; bleed: number; crop: boolean; background: string; texture: string; watermark: string; css: string }
export function printOptions(book: IndexedNote): PrintOptions {
  const p = bookProperties(book)
  const dimension = (v: unknown, fallback: number, max: number) => typeof v === "number" && Number.isFinite(v) ? Math.max(0,Math.min(max,v)) : fallback
  return { margin: typeof p.margem_mm === "number" ? dimension(p.margem_mm,18,40) : undefined, bleed: dimension(p.sangria_mm,0,10), crop: p.marcas_corte === true,
    background: typeof p.fundo_pagina === "string" && /^#[0-9a-f]{6}$/i.test(p.fundo_pagina) ? p.fundo_pagina : "",
    texture: p.textura === "linho" || p.textura === "papel" ? p.textura : "nenhuma",
    watermark: typeof p.marca_agua === "string" ? p.marca_agua.slice(0,100) : "", css: typeof p.css_livro === "string" ? p.css_livro : "" }
}
/** CSS de livro deliberadamente limitado: sem at-rules, URLs ou seletores fora do papel. */
export function scopeBookCss(input: string): string {
  if (input.length > 30000 || /[\\@<>]|url\s*\(|image-set\s*\(|expression\s*\(|\/\*/i.test(input)) throw new Error("CSS do livro: use regras simples, sem @, comentários, URLs ou recursos externos.")
  if (input.replace(/[^{}]/g, "").match(/^(?:\{\})*$/) === null) throw new Error("CSS do livro: blocos aninhados ou incompletos não são aceitos.")
  const rules = [...input.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  if (input.replace(/[^{}]+\{[^{}]*\}/g, "").trim()) throw new Error("CSS do livro incompleto.")
  return rules.map(([,selectors,body]) => {
    if (!/^[\w\s.#,:>+~*()\[\]="'-]+$/.test(selectors!)) throw new Error("Seletor CSS não suportado.")
    if (/(?:position|z-index|content|behavior|binding)\s*:/i.test(body!)) throw new Error("CSS do livro: posição, conteúdo e scripts não são aceitos.")
    return selectors!.split(",").map(s => `.book-paper .book-print ${s.trim()}`).join(",") + `{${body}}`
  }).join("\n")
}

export function bookDecorationCss(book: IndexedNote): string {
  const o = printOptions(book)
  const texture = o.texture === "linho" ? "repeating-linear-gradient(90deg, #00000006 0 1px, transparent 1px 3px),repeating-linear-gradient(0deg,#00000006 0 1px,transparent 1px 3px)" : o.texture === "papel" ? "radial-gradient(#00000012 .5px, transparent .5px)" : "none"
  // A cor do papel (`fundo_pagina`, hoje `cor_papel`) vem do estilo do livro (core/book-style.ts, L3).
  return `.book-paper .pagedjs_sheet,.book-paper .book-print {background-image:${texture};background-size:${o.texture === "papel"?"5px 5px":"auto"}} .book-paper .pagedjs_pagebox::after,body.book-paper > .book-print::before {content:${JSON.stringify(o.watermark).replace(/</g,"\\3c ")}; position:absolute;inset:40% 0 auto;text-align:center;transform:rotate(-30deg);font:40pt serif;opacity:.12;pointer-events:none} ${scopeBookCss(o.css)}`
}
