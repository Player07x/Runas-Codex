import { maskNonContent, parseFrontmatter, parseNote } from "./parse"
import { foldName, noteName } from "./text"
import type { VaultIndex } from "./vault-index"

/**
 * Links automáticos (25/11): acha no texto de uma nota os nomes de outras notas, os apelidos (`aliases`) delas e os
 * nomes de notas que ainda não existem mas já foram citadas em algum link, e troca cada trecho escolhido por um link.
 * Nada muda sem o usuário ver a lista antes. O link sai no formato que o Obsidian segue: `[[Nota]]`, ou
 * `[[Nota|como estava escrito]]` quando o texto é um apelido ou está escrito de outro jeito (o Obsidian não resolve
 * `[[apelido]]` sozinho).
 */

export interface AutoLink {
  start: number
  end: number
  /** O trecho como está na nota. */
  text: string
  /** O que vai dentro de `[[…]]`. */
  linkTarget: string
  /** A nota que existe, ou `null` para uma nota citada que ainda não existe. */
  dest: string | null
  /** Achado por um apelido da nota. */
  viaAlias: boolean
  /** A nota já tem link para esse alvo, ou o nome já apareceu antes no texto. */
  repeated: boolean
  /** O texto em volta, para a lista. */
  before: string
  after: string
}

interface NameTarget { linkTarget: string; dest: string | null; viaAlias: boolean }

/** Nomes menores que isto ficam de fora (artigos e preposições viram link à toa). */
const MIN_LENGTH = 3
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Os nomes que viram link nesta nota, pela grafia sem maiúsculas: nomes de notas, apelidos e notas citadas que ainda
 * não existem. Quem decide para onde cada nome leva é a mesma resolução dos links (o nome vale antes do apelido; entre
 * notas de mesmo nome, a mais próxima). A própria nota e os apelidos dela ficam de fora.
 */
export function autoLinkNames(index: VaultIndex, path: string): Map<string, NameTarget> {
  const spelled = new Map<string, string>()
  const add = (name: string) => {
    const clean = name.trim()
    if (clean.length < MIN_LENGTH || /^[\d\s.,:/-]+$/.test(clean) || /[[\]|#^\n]/.test(clean)) return
    const key = foldName(clean)
    if (!spelled.has(key)) spelled.set(key, clean)
  }
  for (const note of index.allNotes()) {
    if (note.path === path) continue
    add(noteName(note.path))
    for (const alias of note.meta.aliases) add(alias)
  }
  // Notas a escrever: só o nome simples (um caminho não aparece assim no texto).
  for (const missing of index.unresolved()) if (!missing.target.includes("/")) add(missing.target)
  const out = new Map<string, NameTarget>()
  for (const [key, name] of spelled) {
    const resolved = index.resolve({ kind: "wiki", embed: false, target: name, start: 0, end: 0, raw: "", inFrontmatter: false }, path)
    if (resolved.dest === path) continue
    if (resolved.dest) {
      // Anexos (imagens, PDFs) não entram: só notas.
      if (!resolved.dest.toLowerCase().endsWith(".md")) continue
      out.set(key, { linkTarget: index.linkTarget(resolved.dest, path), dest: resolved.dest, viaAlias: Boolean(resolved.viaAlias) })
    } else out.set(key, { linkTarget: name, dest: null, viaAlias: false })
  }
  return out
}

/**
 * O texto só com a prosa (mesmo tamanho; o resto vira espaço): fora ficam frontmatter, código, comentários,
 * matemática, links e embeds que já existem, endereços, tags, títulos, HTML e ids de bloco.
 */
function prose(text: string): string {
  const meta = parseFrontmatter(text)
  let masked = maskNonContent(text)
  if (meta) masked = masked.slice(0, meta.end).replace(/[^\r\n]/g, " ") + masked.slice(meta.end)
  const blank = (m: string) => m.replace(/[^\r\n]/g, " ")
  return masked
    .replace(/!?\[\[[^\]\n]*\]\]|!?\[[^\]\n]*\]\([^)\n]*\)|<[^>\n]+>/g, blank)
    .replace(/\b(?:https?|ftp|obsidian|runas):\/\/\S+|\bwww\.\S+/gi, blank)
    .replace(/(^|[\s(])#[\p{L}\p{N}_/-]+/gmu, (m, lead: string) => lead + blank(m.slice(lead.length)))
    .replace(/^ {0,3}#{1,6}[ \t].*$/gm, blank)
    .replace(/\s\^[\w-]+$/gm, blank)
    .replace(/\[![^\]\n]*\][+-]?/g, blank)
}

/** Alvos que a nota já liga (pela nota de destino, ou pelo nome quando ela não existe). */
function linkedKeys(index: VaultIndex, path: string, text: string): Set<string> {
  const keys = new Set<string>()
  for (const link of parseNote(text).links) {
    if (!link.target) continue
    const dest = index.resolve(link, path).dest
    keys.add(dest ?? `?${foldName(link.target)}`)
  }
  return keys
}

/** Menções a outras notas no texto `text` da nota `path` (o texto pode ser o rascunho ainda não gravado). */
export function findAutoLinks(index: VaultIndex, path: string, text: string): AutoLink[] {
  const names = autoLinkNames(index, path)
  if (!names.size) return []
  const spellings = [...names.keys()].sort((a, b) => b.length - a.length).map(escape)
  // Nome inteiro (nem letra nem número colados) e o maior nome primeiro: “Ordem Valknut” antes de “Ordem”.
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${spellings.join("|")})(?![\\p{L}\\p{N}_])`, "giu")
  const seen = linkedKeys(index, path, text)
  const out: AutoLink[] = []
  for (const match of prose(text).matchAll(pattern)) {
    const target = names.get(foldName(match[0]))
    if (!target) continue
    const start = match.index!
    const end = start + match[0].length
    const key = target.dest ?? `?${foldName(target.linkTarget)}`
    const lineStart = text.lastIndexOf("\n", start - 1) + 1
    const lineEnd = text.indexOf("\n", end)
    const before = text.slice(Math.max(lineStart, start - 60), start)
    const after = text.slice(end, Math.min(lineEnd < 0 ? text.length : lineEnd, end + 60)).replace(/\r$/, "")
    out.push({ start, end, text: text.slice(start, end), ...target, repeated: seen.has(key), before: (start - 60 > lineStart ? "…" : "") + before.trimStart(), after })
    seen.add(key)
  }
  return out
}

/** O link que entra no lugar do trecho; numa linha de tabela, a barra do apelido vai escapada (`\|`). */
export function autoLinkText(link: Pick<AutoLink, "text" | "linkTarget">, inTable = false): string {
  if (link.text === link.linkTarget) return `[[${link.linkTarget}]]`
  return `[[${link.linkTarget}${inTable ? "\\|" : "|"}${link.text}]]`
}

/**
 * Troca os trechos escolhidos por links, do fim para o começo. Um trecho que já não está igual no texto (a nota mudou)
 * fica como está; devolve o texto novo e quantos links entraram.
 */
export function applyAutoLinks(text: string, links: readonly AutoLink[]): { text: string; count: number } {
  let next = text
  let count = 0
  for (const link of [...links].sort((a, b) => b.start - a.start)) {
    if (next.slice(link.start, link.end) !== link.text) continue
    const lineStart = next.lastIndexOf("\n", link.start - 1) + 1
    const inTable = next.slice(lineStart, link.start).trimStart().startsWith("|")
    next = next.slice(0, link.start) + autoLinkText(link, inTable) + next.slice(link.end)
    count++
  }
  return { text: next, count }
}
