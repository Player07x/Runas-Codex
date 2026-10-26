/**
 * Capa, sumário, aberturas de capítulo, cabeçalho e rodapé (L4, ADR 0033). Tudo vem de propriedades simples do livro,
 * conferidas aqui; só valores enumerados e números calculados viram CSS de página.
 */
export const COVER_STYLES = { classica: "Clássica", ilustrada: "Ilustrada", faixa: "Faixa" } as const
export const OPENINGS = { simples: "Simples", faixa: "Faixa", pagina: "Página inteira" } as const
export const NUMBERINGS = { arabico: "Capítulo 1", romano: "Capítulo I", nenhuma: "Sem número" } as const
export const RUNNING_HEADS = { "livro-capitulo": "Livro e capítulo", capitulo: "Só o capítulo", nenhum: "Nenhum" } as const
export const PAGE_NUMBERS = { externo: "Na margem externa", centro: "No centro", nenhum: "Sem número" } as const

export interface BookLayout {
  cover: keyof typeof COVER_STYLES
  /** Sumário depois da capa e dos créditos, com o número da página de cada capítulo e seção. */
  toc: boolean
  opening: keyof typeof OPENINGS
  numbering: keyof typeof NUMBERINGS
  /** Letra capitular no primeiro parágrafo de cada capítulo. */
  dropCap: boolean
  /** Páginas espelhadas: margem interna maior, número e cabeçalho do lado de fora, capítulo abre à direita. */
  mirrored: boolean
  head: keyof typeof RUNNING_HEADS
  pageNumber: keyof typeof PAGE_NUMBERS
}

const pick = <T extends Record<string, string>>(value: unknown, options: T): keyof T | undefined =>
  typeof value === "string" && Object.hasOwn(options, value) ? value : undefined

export function bookLayout(props: Record<string, unknown>): BookLayout {
  const mirrored = props.espelhadas === true
  return {
    cover: pick(props.capa_estilo, COVER_STYLES) ?? "classica",
    toc: props.sumario === true,
    opening: pick(props.abertura, OPENINGS) ?? "simples",
    numbering: pick(props.numeracao, NUMBERINGS) ?? "arabico",
    dropCap: props.capitular === true,
    mirrored,
    head: pick(props.cabecalho, RUNNING_HEADS) ?? "livro-capitulo",
    pageNumber: pick(props.numero_pagina, PAGE_NUMBERS) ?? (mirrored ? "externo" : "centro"),
  }
}

export function roman(n: number): string {
  const table: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]
  let out = "", rest = Math.max(0, Math.floor(n))
  for (const [value, letters] of table) while (rest >= value) { out += letters; rest -= value }
  return out
}

/** “Capítulo 3” (ou “Capítulo III”) na abertura e “Cap. 3” no sumário; `null` sem numeração. */
export function chapterLabel(n: number, numbering: BookLayout["numbering"], short = false): string | null {
  if (numbering === "nenhuma") return null
  return `${short ? "Cap." : "Capítulo"} ${numbering === "romano" ? roman(n) : n}`
}

/** O número de cada capítulo do livro (só os de tipo capítulo contam; partes, seções e apêndices não). */
export function chapterNumbers(kinds: string[]): (number | null)[] {
  let n = 0
  return kinds.map((kind) => (kind === "capitulo" ? ++n : null))
}

export interface TocEntry { id: string; title: string; level: 0 | 1 | 2; label?: string | null }

/** HTML do sumário (o número da página vem do `target-counter` das regras de página). */
export function tocHtml(entries: TocEntry[]): string {
  const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  const items = entries.map((entry) => `<li class="toc-nivel-${entry.level}"><a href="#${esc(entry.id)}">${entry.label ? `<small>${esc(entry.label)}</small>` : ""}<span class="toc-titulo">${esc(entry.title)}</span><span class="toc-pontos" aria-hidden="true"></span></a></li>`)
  return `<h1 class="book-toc-title">Sumário</h1><ol>${items.join("")}</ol>`
}

type Page = { width: number; height: number }
/** Altura da faixa da capa, em fração da página (o mesmo valor está em book-pages.css). */
const BAND = 0.42

/**
 * Regras de página do layout, para o Paged.js. Cabeçalho só nas páginas que não abrem capítulo (página nomeada
 * `capitulo`, que só existe com “capítulos em página nova”); capa, sumário, partes e páginas em branco sem cabeçalho.
 */
export function layoutPageRules(page: Page, margin: number, layout: BookLayout, newChapter: boolean): string {
  const inner = layout.mirrored ? margin + 4 : margin
  const head = "font-size: 7.5pt; letter-spacing: .14em; text-transform: uppercase; color: var(--muted);"
  const number = "font-size: 9pt; font-variant-numeric: oldstyle-nums;"
  const none = ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"].map((box) => `@${box} { content: none; }`).join(" ")
  const noHead = ["top-left", "top-center", "top-right"].map((box) => `@${box} { content: none; }`).join(" ")
  const boxes = (side: "left" | "right" | null) => {
    const out: string[] = []
    const outer = side ?? "right"
    if (layout.pageNumber === "centro") out.push(`@bottom-center { content: counter(page); ${number} }`)
    if (layout.pageNumber === "externo") out.push(`@bottom-${outer} { content: counter(page); ${number} }`)
    if (layout.head === "livro-capitulo" && side !== "right") out.push(`@top-left { content: string(book-title); ${head} }`)
    if (layout.head === "livro-capitulo" && side !== "left") out.push(`@top-right { content: string(chapter-title); ${head} }`)
    if (layout.head === "capitulo") out.push(`@top-${outer} { content: string(chapter-title); ${head} }`)
    return out.join(" ")
  }
  const height = page.height - 2 * margin
  return [
    layout.mirrored
      ? `@page :left { margin-left: ${margin}mm; margin-right: ${inner}mm; ${boxes("left")} } @page :right { margin-left: ${inner}mm; margin-right: ${margin}mm; ${boxes("right")} }`
      : `@page { ${boxes(null)} }`,
    `@page cover { ${none} } @page sumario { ${noHead} } @page parte { ${noHead} } @page :blank { ${none} }`,
    newChapter ? `.book-print.chapters-new-page .book-chapter { page: capitulo; } @page capitulo:first { ${noHead} }` : "",
    `.book-print .book-part { page: parte; } .book-print-toc { page: sumario; break-after: page; }`,
    layout.mirrored ? `.book-print .book-part, .book-print.chapters-new-page .book-chapter { break-before: right; }` : "",
    `.book-print-toc a::after { content: target-counter(attr(href), page); }`,
    // A capa e a abertura em página inteira ocupam a área do texto (um pouco menos, para não empurrar uma página vazia).
    `.book-print .book-print-cover { height: ${(height - 2).toFixed(1)}mm; min-height: 0; }`,
    `.book-print.abertura-pagina .book-chapter > .book-chapter-opening { height: ${(height - 2).toFixed(1)}mm; break-after: page; }`,
    // Capa em faixa: a faixa é o fundo da página (vai até a borda), e o título fica centrado nela.
    layout.cover === "faixa" ? `@page capafaixa { ${none} } .book-print .book-print-cover.capa-faixa { page: capafaixa; padding-top: 0; } .book-print .capa-faixa .book-cover-text { height: ${(page.height * BAND - margin).toFixed(1)}mm; align-content: center; }` : "",
  ].filter(Boolean).join("\n")
}
