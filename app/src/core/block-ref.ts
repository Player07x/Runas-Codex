import { maskNonContent, parseFrontmatter } from "./parse"

/**
 * Referências de bloco como o Obsidian grava: `^id` no fim do parágrafo ou do item de lista; em citações, callouts e
 * tabelas, `^id` numa linha própria depois do bloco (com uma linha em branco antes). Copiar o link de um bloco cria o
 * `^id` sozinho quando ele ainda não existe.
 */

const LIST_ITEM = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]/
const HEADING = /^ {0,3}#{1,6}[ \t]/
const QUOTE = /^ {0,3}>/
const TABLE = /^ {0,3}\|/
const ID_AT_END = /(?:^|\s)\^([A-Za-z0-9-]+)[ \t]*$/

/** Seis letras e números, como os ids que o Obsidian cria. */
export function randomBlockId(): string {
  return Array.from({ length: 6 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")
}

export interface BlockRef {
  /** O texto da nota (com o `^id` novo, se foi criado). */
  text: string
  id: string
  created: boolean
}

/** O `^id` do bloco na posição `pos`; `null` em linha vazia, título, código ou frontmatter. */
export function blockRefAt(text: string, pos: number, newId: () => string = randomBlockId): BlockRef | null {
  const frontmatter = parseFrontmatter(text)
  if (frontmatter && pos < frontmatter.end) return null
  const eol = text.includes("\r\n") ? "\r\n" : "\n"
  const raw = text.split("\n")
  const lines = raw.map((l) => l.replace(/\r$/, ""))
  const masked = maskNonContent(text).split("\n").map((l) => l.replace(/\r$/, ""))
  let at = 0
  for (let offset = 0; at < raw.length - 1 && offset + raw[at]!.length < pos; at++) offset += raw[at]!.length + 1
  const line = lines[at]!
  // Linha vazia, título ou dentro de bloco de código (o mascarado some, o texto não).
  if (!line.trim() || HEADING.test(line) || (!masked[at]!.trim() && line.trim())) return null

  const blank = (i: number) => !lines[i]?.trim()
  const kind = QUOTE.test(line) ? QUOTE : TABLE.test(line) ? TABLE : null
  let end = at
  if (kind) {
    // Citação ou tabela inteira: `^id` numa linha própria logo depois.
    while (end + 1 < lines.length && kind.test(lines[end + 1]!)) end++
    let next = end + 1
    while (next < lines.length && blank(next)) next++
    const existing = ID_AT_END.exec(lines[next] ?? "")
    if (existing && lines[next]!.trim().startsWith("^")) return { text, id: existing[1]!, created: false }
  } else if (!LIST_ITEM.test(line)) {
    // Parágrafo: até a linha em branco, um título ou um item de lista.
    while (end + 1 < lines.length && !blank(end + 1) && !HEADING.test(lines[end + 1]!) && !LIST_ITEM.test(lines[end + 1]!) && masked[end + 1]!.trim()) end++
  }
  if (!kind) {
    const existing = ID_AT_END.exec(lines[end]!)
    if (existing) return { text, id: existing[1]!, created: false }
  }

  const taken = new Set([...text.matchAll(/(?:^|\s)\^([A-Za-z0-9-]+)[ \t]*\r?$/gm)].map((m) => m[1]!))
  let id = newId()
  for (let tries = 0; taken.has(id) && tries < 50; tries++) id = newId()
  const endOffset = raw.slice(0, end + 1).reduce((sum, l) => sum + l.length + 1, 0) - 1 - (raw[end]!.endsWith("\r") ? 1 : 0)
  const insert = kind ? `${eol}${eol}^${id}` : ` ^${id}`
  return { text: text.slice(0, endOffset) + insert + text.slice(endOffset), id, created: true }
}
