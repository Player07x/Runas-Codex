import { extractSection, noteBody } from "./sections"

/**
 * Prévia de link (hover no desktop, toque longo no celular): o que aparece da nota de destino sem abri-la. Um link
 * para `#título` ou `#^bloco` mostra só aquele trecho, como o Obsidian.
 */

/** `Nota#Título#Sub` ou `Nota#^bloco` → alvo e subpath (com o `#`). */
export function splitLinkTarget(raw: string): { target: string; subpath?: string } {
  const hash = raw.indexOf("#")
  return hash < 0 ? { target: raw.trim() } : { target: raw.slice(0, hash).trim(), subpath: raw.slice(hash) }
}

export interface PreviewText {
  markdown: string
  /** O link apontava para um título ou bloco que não existe (aí aparece a nota inteira). */
  missingSection: boolean
  /** Cortado no limite (notas grandes). */
  truncated: boolean
}

/** Corta no fim de um parágrafo antes de `max` caracteres, para a prévia não ficar pesada. */
function cut(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false }
  const slice = text.slice(0, max)
  const end = slice.lastIndexOf("\n\n")
  return { text: (end > max / 2 ? slice.slice(0, end) : slice).trimEnd(), truncated: true }
}

export function previewText(noteText: string, subpath?: string, max = 4000): PreviewText {
  const body = noteBody(noteText)
  const section = subpath ? extractSection(body, subpath) : body
  const { text, truncated } = cut((section ?? body).trim(), max)
  return { markdown: text, missingSection: Boolean(subpath) && section === null, truncated }
}
