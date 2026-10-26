import { parseFrontmatter, parseNote } from "./parse"

/**
 * Prévia ao lado do texto (L1): liga a posição do cursor no capítulo à página impressa e o título clicado na página
 * à linha do texto. A ponte são os títulos: aparecem na nota e nas páginas na mesma ordem; entre dois títulos, a
 * página é estimada pela proporção de linhas.
 */

export interface SourceHeading { text: string; line: number }

/** Títulos da nota (linhas a partir de 0, contando o frontmatter); código e comentários não contam. */
export const sourceHeadings = (text: string): SourceHeading[] => parseNote(text).headings.map((h) => ({ text: h.text, line: h.line }))

/** Texto do título sem a marcação: o que a página mostra (`**Fogo**` e `[[Fogo|fogo]]` viram “fogo”). */
export function headingKey(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/!?\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_m, target: string, alias: string | undefined) => alias ?? target)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s\^[\w-]+$/, "")
    .replace(/[*_`~=]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR")
}

/**
 * Para cada título da nota, o índice do título desenhado que corresponde a ele (ou `undefined`). Casa em ordem e
 * pula os desenhados que a nota não tem (títulos de notas transcluídas, de sumários automáticos).
 */
export function matchHeadings(source: readonly string[], rendered: readonly string[]): (number | undefined)[] {
  const keys = rendered.map(headingKey)
  let from = 0
  return source.map((text) => {
    const key = headingKey(text)
    const found = keys.indexOf(key, from)
    if (found < 0) return undefined
    from = found + 1
    return found
  })
}

export interface CursorAnchor {
  /** Título acima do cursor (−1: antes do primeiro título). */
  heading: number
  /** Quanto o cursor já andou até o próximo título (0 a 1), em linhas. */
  fraction: number
}

/** Onde o cursor está em relação aos títulos do capítulo. `lines` é o total de linhas da nota. */
export function cursorAnchor(headings: readonly SourceHeading[], line: number, lines: number): CursorAnchor {
  let heading = -1
  for (let i = 0; i < headings.length; i++) if (headings[i]!.line <= line) heading = i
  const start = heading < 0 ? 0 : headings[heading]!.line
  const end = headings[heading + 1]?.line ?? Math.max(lines, start + 1)
  return { heading, fraction: end > start ? Math.min(1, Math.max(0, (line - start) / (end - start))) : 0 }
}

/**
 * Página (a partir de 0) do cursor, dados as páginas do capítulo e a página de cada título da nota (`undefined`
 * quando o título não foi achado nas páginas).
 */
export function followPage(anchor: CursorAnchor, headingPages: readonly (number | undefined)[], chapter: { start: number; end: number }): number {
  let first = chapter.start
  for (let i = anchor.heading; i >= 0; i--) {
    const page = headingPages[i]
    if (page !== undefined) { first = page; break }
  }
  let last = chapter.end
  for (let i = anchor.heading + 1; i < headingPages.length; i++) {
    const page = headingPages[i]
    if (page !== undefined) { last = page; break }
  }
  if (last < first) last = first
  return Math.min(chapter.end, Math.max(chapter.start, first + Math.round(anchor.fraction * (last - first))))
}

/** Primeira linha depois do frontmatter: o começo do capítulo para quem clica no título do capítulo. */
export function firstBodyLine(text: string): number {
  const end = parseFrontmatter(text)?.end ?? 0
  return end ? text.slice(0, end).split("\n").length - (text.slice(0, end).endsWith("\n") ? 1 : 0) : 0
}

/** Linha da nota para o título desenhado de índice `rendered` (clique na página), ou `undefined`. */
export function lineForRendered(headings: readonly SourceHeading[], match: readonly (number | undefined)[], rendered: number): number | undefined {
  const index = match.indexOf(rendered)
  return index < 0 ? undefined : headings[index]?.line
}
