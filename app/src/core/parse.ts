import { parse as parseYaml } from "yaml"

/**
 * Leitura de uma nota no dialeto do Obsidian: frontmatter, links, tags, títulos e blocos. Um só leitor para o índice,
 * o renomear e o painel de links, sempre sobre o texto original (posições valem no arquivo como ele está no disco).
 */

export interface LinkRef {
  kind: "wiki" | "markdown"
  embed: boolean
  /** Caminho ou nome, já decodificado e sem `#…` (vazio em `[[#título]]`). */
  target: string
  /** `#título#subtítulo` ou `#^bloco`. */
  subpath?: string
  /** Texto depois de `|` (wiki) ou entre colchetes (markdown). */
  alias?: string
  /** Trecho exato no arquivo: `raw === text.slice(start, end)`. */
  start: number
  end: number
  raw: string
  inFrontmatter: boolean
  /** Links markdown: caminho entre `<…>` ou com `%20`, para regravar no mesmo estilo. */
  angle?: boolean
  encoded?: boolean
}

export interface Heading {
  level: number
  text: string
  line: number
}

export interface Frontmatter {
  /** Trecho de `---` a `---`, inclusive. */
  start: number
  end: number
  /** Só o YAML, entre as linhas `---`. */
  yamlStart: number
  yamlEnd: number
  data: Record<string, unknown> | null
  error?: string
}

export interface NoteMeta {
  frontmatter: Frontmatter | null
  links: LinkRef[]
  /** Tags como escritas (sem `#`), do frontmatter e do texto, sem repetir (comparação sem maiúsculas). */
  tags: string[]
  aliases: string[]
  headings: Heading[]
  blocks: string[]
}

const FRONTMATTER = /^(﻿?)---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?---[ \t]*(?:\r?\n|$)/

export function parseFrontmatter(text: string): Frontmatter | null {
  const match = FRONTMATTER.exec(text)
  if (!match) return null
  const yamlStart = match[1]!.length + text.slice(match[1]!.length).indexOf("\n") + 1
  const yamlText = match[2] ?? ""
  const frontmatter: Frontmatter = { start: 0, end: match[0].length, yamlStart, yamlEnd: yamlStart + yamlText.length, data: null }
  try {
    const data = yamlText.trim() ? (parseYaml(yamlText) as unknown) : {}
    if (data === null || typeof data !== "object" || Array.isArray(data)) frontmatter.error = "O frontmatter não é um mapa de propriedades."
    else frontmatter.data = data as Record<string, unknown>
  } catch (error) {
    frontmatter.error = error instanceof Error ? error.message.split("\n")[0] : String(error)
  }
  return frontmatter
}

/** Substitui por espaços (mesmo tamanho) o que não pode ter links nem tags: código, comentários e matemática. */
export function maskNonContent(text: string): string {
  const chars = text.split("")
  const blank = (start: number, end: number) => {
    for (let i = start; i < end; i++) if (chars[i] !== "\n" && chars[i] !== "\r") chars[i] = " "
  }
  // Blocos de código cercados (``` ou ~~~, a cerca de fechamento igual ou maior).
  let fence: { char: string; size: number; start: number } | null = null
  let offset = 0
  for (const line of text.split("\n")) {
    const opener = /^ {0,3}(`{3,}|~{3,})/.exec(line)
    if (fence) {
      if (opener && opener[1]![0] === fence.char && opener[1]!.length >= fence.size && !line.slice(opener[0].length).trim()) {
        blank(fence.start, offset + line.length)
        fence = null
      }
    } else if (opener && !(opener[1]![0] === "`" && line.slice(opener[0].length).includes("`"))) {
      fence = { char: opener[1]![0]!, size: opener[1]!.length, start: offset }
    }
    offset += line.length + 1
  }
  if (fence) blank(fence.start, text.length)
  let masked = chars.join("")
  for (const pattern of [/%%[\s\S]*?(?:%%|$)/g, /<!--[\s\S]*?(?:-->|$)/g, /\$\$[\s\S]*?\$\$/g, /(`+)[^\n]*?(?<!`)\1(?!`)/g]) {
    masked = masked.replace(pattern, (m) => m.replace(/[^\r\n]/g, " "))
  }
  return masked
}

function splitSubpath(value: string): { target: string; subpath?: string } {
  const i = value.indexOf("#")
  return i < 0 ? { target: value } : { target: value.slice(0, i), subpath: value.slice(i) }
}

const WIKILINK = /(!?)\[\[([^[\]\n]+?)\]\]/g
const MDLINK = /(!?)\[((?:[^[\]\n]|\[[^\]\n]*\])*)\]\((<[^>\n]+>|[^()\s]+(?:\([^()\s]*\)[^()\s]*)*)(?:\s+"[^"\n]*")?\)/g
const SCHEME = /^[a-z][a-z0-9+.-]*:/i

function wikiLink(match: RegExpExecArray, inFrontmatter: boolean): LinkRef {
  const inner = match[2]!
  // Em tabelas o Obsidian escreve `[[nota\|apelido]]`.
  const bar = /\\?\|/.exec(inner)
  const pathPart = bar ? inner.slice(0, bar.index) : inner
  const { target, subpath } = splitSubpath(pathPart.trim())
  return {
    kind: "wiki",
    embed: match[1] === "!",
    target,
    ...(subpath ? { subpath } : {}),
    ...(bar ? { alias: inner.slice(bar.index + bar[0].length) } : {}),
    start: match.index,
    end: match.index + match[0].length,
    raw: match[0],
    inFrontmatter,
  }
}

function markdownLink(match: RegExpExecArray): LinkRef | null {
  let href = match[3]!
  const angle = href.startsWith("<")
  if (angle) href = href.slice(1, -1)
  if (SCHEME.test(href) || href.startsWith("//")) return null
  const encoded = /%[0-9a-f]{2}/i.test(href)
  let decoded = href
  try {
    decoded = decodeURIComponent(href)
  } catch {
    /* fica como está */
  }
  const { target, subpath } = splitSubpath(decoded)
  return {
    kind: "markdown",
    embed: match[1] === "!",
    target,
    ...(subpath ? { subpath } : {}),
    alias: match[2]!,
    start: match.index,
    end: match.index + match[0].length,
    raw: match[0],
    inFrontmatter: false,
    ...(angle ? { angle } : {}),
    ...(encoded ? { encoded } : {}),
  }
}

/** Tag válida no Obsidian: letras, números, `_`, `-` e `/`, com pelo menos um caractere que não seja número. */
export function isValidTag(tag: string): boolean {
  return /^[\p{L}\p{N}_/-]+$/u.test(tag) && /[^\d/]/.test(tag)
}

function listValue(value: unknown, splitComma: boolean): string[] {
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== undefined).map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === "string") return (splitComma ? value.split(/[,\s]+/) : value.split(",")).map((v) => v.trim()).filter(Boolean)
  if (typeof value === "number") return [String(value)]
  return []
}

export function parseNote(text: string): NoteMeta {
  const frontmatter = parseFrontmatter(text)
  const bodyStart = frontmatter?.end ?? (text.startsWith("﻿") ? 1 : 0)
  // O frontmatter vira espaços, mas as quebras de linha ficam: posições e números de linha batem com o arquivo.
  const masked = text.slice(0, bodyStart).replace(/[^\r\n]/g, " ") + maskNonContent(text.slice(bodyStart))
  const links: LinkRef[] = []

  if (frontmatter) {
    const yamlText = text.slice(0, frontmatter.yamlEnd)
    for (const match of yamlText.matchAll(WIKILINK)) if (match.index >= frontmatter.yamlStart) links.push(wikiLink(match as RegExpExecArray, true))
  }
  // Fora de código o texto mascarado é igual ao original, então os trechos encontrados valem no arquivo.
  for (const match of masked.matchAll(WIKILINK)) links.push(wikiLink(match as RegExpExecArray, false))
  // Links markdown: procura sem os trechos que já são wikilinks.
  let maskedNoWiki = masked
  for (const link of links) if (!link.inFrontmatter) maskedNoWiki = maskedNoWiki.slice(0, link.start) + " ".repeat(link.end - link.start) + maskedNoWiki.slice(link.end)
  for (const match of maskedNoWiki.matchAll(MDLINK)) {
    const link = markdownLink(match as RegExpExecArray)
    if (link) links.push(link)
  }
  links.sort((a, b) => a.start - b.start)

  const seen = new Set<string>()
  const tags: string[] = []
  const addTag = (raw: string) => {
    const tag = raw.replace(/^#/, "")
    const key = tag.toLocaleLowerCase("pt-BR")
    if (!isValidTag(tag) || seen.has(key)) return
    seen.add(key)
    tags.push(tag)
  }
  const data = frontmatter?.data ?? {}
  for (const tag of listValue(data.tags ?? data.tag, true)) addTag(tag)
  for (const match of masked.matchAll(/(?<=^|\s)#([\p{L}\p{N}_/-]+)/gu)) addTag(match[1]!)

  const headings: Heading[] = []
  const blocks: string[] = []
  const lines = text.split("\n")
  masked.split("\n").forEach((line, index) => {
    const heading = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*\r?$/.exec(line)
    if (heading) headings.push({ level: heading[1]!.length, text: lines[index]!.replace(/^ {0,3}#{1,6}[ \t]+/, "").replace(/[ \t]+#+[ \t]*\r?$|[ \t]*\r?$/, ""), line: index })
    const block = /(?:^|\s)\^([A-Za-z0-9-]+)[ \t]*\r?$/.exec(line)
    if (block) blocks.push(block[1]!)
  })

  return { frontmatter, links, tags, aliases: listValue(data.aliases ?? data.alias, false), headings, blocks }
}
