/**
 * Estilo do livro (L3, ADR 0033): um modelo é o ponto de partida completo (fontes, cores, colunas, fichas); o livro
 * guarda só o que muda por cima, em propriedades simples que o Obsidian mostra. Ordem: modelo pronto → nota de modelo
 * (`modelo: "[[…]]"`, `tipo: modelo-livro`) → propriedades do livro. Só valores conferidos viram CSS.
 */
export type ModelId = "manual" | "grimorio" | "romance" | "moderno" | "facil"
export type Leading = "justa" | "normal" | "folgada"
export type FichaStyle = "tipografica" | "fundo" | "faixa"
export interface BookStyle {
  model: ModelId
  titleFont: string
  textFont: string
  sizePt: number
  leading: Leading
  justify: boolean
  columns: 1 | 2 | 3
  paper: string
  ink: string
  accent: string
  rule: string
  fichas: FichaStyle
}

export const BOOK_MODELS: Record<ModelId, { label: string; style: Omit<BookStyle, "model"> }> = {
  manual: { label: "Manual de RPG", style: { titleFont: "Cinzel", textFont: "EB Garamond", sizePt: 10.5, leading: "normal", justify: true, columns: 2, paper: "#f6efdf", ink: "#30251e", accent: "#7b251c", rule: "#bea56f", fichas: "tipografica" } },
  grimorio: { label: "Grimório", style: { titleFont: "Uncial Antiqua", textFont: "EB Garamond", sizePt: 10.5, leading: "normal", justify: true, columns: 2, paper: "#e3d0a6", ink: "#3a2716", accent: "#55331a", rule: "#8a6a3a", fichas: "tipografica" } },
  romance: { label: "Romance", style: { titleFont: "Libre Baskerville", textFont: "Libre Baskerville", sizePt: 10, leading: "folgada", justify: true, columns: 1, paper: "#fbf8f1", ink: "#1e1c19", accent: "#1e1c19", rule: "#cfc8ba", fichas: "tipografica" } },
  moderno: { label: "Moderno", style: { titleFont: "Geist", textFont: "Source Serif 4", sizePt: 10, leading: "normal", justify: true, columns: 2, paper: "#ffffff", ink: "#1d2733", accent: "#1f5f8b", rule: "#c2d0dc", fichas: "fundo" } },
  facil: { label: "Leitura fácil", style: { titleFont: "Atkinson Hyperlegible Next", textFont: "Atkinson Hyperlegible Next", sizePt: 12.5, leading: "folgada", justify: false, columns: 1, paper: "#ffffff", ink: "#111111", accent: "#111111", rule: "#8a8a8a", fichas: "tipografica" } },
}
export const LEADING: Record<Leading, number> = { justa: 1.25, normal: 1.4, folgada: 1.6 }

type Props = Record<string, unknown>
const isModel = (v: unknown): v is ModelId => typeof v === "string" && Object.hasOwn(BOOK_MODELS, v)
const color = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : undefined)
/** Nome de fonte só com letras, números, espaço, hífen e sublinhado (vai entre aspas no CSS). */
const font = (v: unknown) => (typeof v === "string" && /^[\p{L}\p{N} _-]{1,60}$/u.test(v.trim()) ? v.trim() : undefined)
const pick = <T extends string>(v: unknown, options: readonly T[]) => (typeof v === "string" && (options as readonly string[]).includes(v) ? (v as T) : undefined)

/** Modelo do livro: `modelo:` pronto, ou o equivalente do `tema:` antigo (pergaminho virou Grimório). */
export function bookModel(props: Props): ModelId {
  if (isModel(props.modelo)) return props.modelo
  return ({ pergaminho: "grimorio", moderno: "moderno", minimalista: "moderno" } as Record<string, ModelId>)[String(props.tema)] ?? "manual"
}

function overrides(props: Props): Partial<Omit<BookStyle, "model">> {
  const size = typeof props.corpo_pt === "number" && Number.isFinite(props.corpo_pt) ? Math.min(16, Math.max(8, props.corpo_pt)) : undefined
  const columns = props.colunas === 1 || props.colunas === 2 || props.colunas === 3 ? props.colunas : undefined
  const align = pick(props.alinhamento, ["esquerda", "justificado"] as const)
  const out: Partial<Omit<BookStyle, "model">> = {
    titleFont: font(props.fonte_titulos), textFont: font(props.fonte_texto), sizePt: size,
    leading: pick(props.entrelinha, ["justa", "normal", "folgada"] as const), justify: align ? align === "justificado" : undefined, columns,
    paper: color(props.cor_papel) ?? color(props.fundo_pagina), ink: color(props.cor_texto), accent: color(props.cor_destaque),
    fichas: pick(props.fichas, ["tipografica", "fundo", "faixa"] as const),
  }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined))
}

/** Estilo final do livro; `modelNote` são as propriedades da nota de modelo, quando `modelo:` aponta para uma. */
export function resolveStyle(book: Props, modelNote?: Props): BookStyle {
  const model = modelNote ? bookModel(modelNote) : bookModel(book)
  const base: BookStyle = { model, ...BOOK_MODELS[model].style }
  // O tema antigo “minimalista” é o Moderno em preto e branco.
  if (!modelNote && !isModel(book.modelo) && book.tema === "minimalista") Object.assign(base, { accent: "#222222", rule: "#bbbbbb", fichas: "tipografica" })
  return { ...base, ...(modelNote ? overrides(modelNote) : {}), ...overrides(book) }
}

/** Variáveis CSS do papel do livro (o restante do desenho fica em book-pages.css). */
export function styleCss(style: BookStyle): string {
  const serif = (name: string, fallback: string) => `"${name}", ${fallback}`
  return `.book-paper{--paper:${style.paper};--panel:${style.paper};--bg:${style.paper};--ink:${style.ink};--text:${style.ink};--accent:${style.accent};--cyan:${style.accent};--rule:${style.rule};` +
    `--font-display:${serif(style.titleFont, "Georgia, serif")};--book-body:${serif(style.textFont, '"EB Garamond", Georgia, serif')};` +
    `--book-size:${style.sizePt}pt;--book-leading:${LEADING[style.leading]};--book-align:${style.justify ? "justify" : "left"};--book-columns:${style.columns}}`
}
