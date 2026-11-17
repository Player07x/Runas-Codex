import type { LinkRef } from "./parse"

/** Um pedaço de texto simples ou um `[[link]]` dele, com o texto que aparece na tela. */
export type InlinePart = { text: string } | { link: LinkRef; label: string }

/**
 * Separa os `[[links]]` de um texto curto que não é Markdown (a nota de um item do Tesouro, como “Recompensa de
 * [[Missão]]”), para a tela desenhá-los como links em vez de mostrar os colchetes (U106). Embeds (`![[…]]`) ficam como
 * texto.
 */
export function wikiLinkParts(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  let last = 0
  for (const match of text.matchAll(/(!?)\[\[([^\]\n]+?)\]\]/g)) {
    if (match[1]) continue
    const start = match.index
    if (start > last) parts.push({ text: text.slice(last, start) })
    const inner = match[2]!
    const bar = inner.indexOf("|")
    const destination = (bar >= 0 ? inner.slice(0, bar) : inner).replace(/\\$/, "")
    const alias = bar >= 0 ? inner.slice(bar + 1).trim() : ""
    const hash = destination.indexOf("#")
    const target = (hash >= 0 ? destination.slice(0, hash) : destination).trim()
    const subpath = hash >= 0 ? destination.slice(hash).trim() : ""
    const end = start + match[0].length
    const link: LinkRef = { kind: "wiki", embed: false, target, start, end, raw: match[0], inFrontmatter: false, ...(subpath ? { subpath } : {}), ...(alias ? { alias } : {}) }
    parts.push({ link, label: alias || target.slice(target.lastIndexOf("/") + 1) || subpath.replace(/^#\^?/, "") })
    last = end
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
