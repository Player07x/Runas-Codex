import { maskNonContent, parseFrontmatter } from "./parse"
import { noteName } from "./text"
import type { VaultIndex } from "./vault-index"

/**
 * Menções não linkadas: notas que citam o nome (ou um apelido) de outra nota sem link, como o painel do Obsidian.
 * Código, comentários, matemática, frontmatter e links que já existem não contam. "Linkar" troca só aquele trecho.
 */

export interface Mention {
  /** Nota que cita. */
  path: string
  start: number
  end: number
  /** O texto como está na nota ("aldren", "o Cinzento"…). */
  text: string
  /** A linha da menção, para mostrar no painel. */
  context: string
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Os nomes que contam como menção da nota: o nome do arquivo e os apelidos (os mais longos primeiro). */
export function mentionNames(index: VaultIndex, target: string): string[] {
  const note = index.note(target)
  const names = [noteName(target), ...(note?.meta.aliases ?? [])].map((n) => n.trim()).filter((n) => n.length >= 2)
  return [...new Set(names)].sort((a, b) => b.length - a.length)
}

/** Texto com o que não é prosa trocado por espaços (mesmo tamanho): código, comentários, frontmatter e links. */
function prose(text: string): string {
  const meta = parseFrontmatter(text)
  let masked = maskNonContent(text)
  if (meta) masked = " ".repeat(meta.end) + masked.slice(meta.end)
  // Links (wiki e Markdown) e embeds já existentes, inclusive os que apontam para outra nota.
  masked = masked.replace(/!?\[\[[^\]\n]*\]\]|!?\[[^\]\n]*\]\([^)\n]*\)/g, (m) => " ".repeat(m.length))
  return masked
}

export function unlinkedMentions(index: VaultIndex, target: string, limit = 200): Mention[] {
  const names = mentionNames(index, target)
  if (!names.length) return []
  // Nome inteiro: nem letra nem número colados antes ou depois.
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${names.map(escape).join("|")})(?![\\p{L}\\p{N}_])`, "giu")
  const out: Mention[] = []
  for (const note of index.allNotes()) {
    if (note.path === target) continue
    const masked = prose(note.text)
    for (const m of masked.matchAll(pattern)) {
      const start = m.index!
      const end = start + m[0].length
      const lineStart = note.text.lastIndexOf("\n", start) + 1
      const lineEnd = note.text.indexOf("\n", end)
      const line = note.text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).replace(/\r$/, "").trim()
      out.push({ path: note.path, start, end, text: note.text.slice(start, end), context: line.length > 160 ? line.slice(0, 157) + "…" : line })
      if (out.length >= limit) return out
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path, "pt-BR") || a.start - b.start)
}

/**
 * Troca a menção por um link: `[[alvo]]` quando o texto é igual ao alvo do link, `[[alvo|texto]]` quando é um
 * apelido, está escrito de outro jeito ou o link leva o caminho (o que se lê não muda). `null` se o texto da nota mudou naquele ponto.
 */
export function linkMention(text: string, mention: Pick<Mention, "start" | "end" | "text">, linkTarget: string): string | null {
  if (text.slice(mention.start, mention.end) !== mention.text) return null
  // Com caminho (`Pasta/Nota`), o link mostraria o caminho: o texto original vira o apelido.
  const link = mention.text === linkTarget ? `[[${linkTarget}]]` : `[[${linkTarget}|${mention.text}]]`
  return text.slice(0, mention.start) + link + text.slice(mention.end)
}
