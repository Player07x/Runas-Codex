/**
 * Tamanho e posição de imagens no texto da nota, no formato que o Obsidian entende: `![[mapa.png|direita|300]]`.
 * O Obsidian lê o último trecho depois de `|` como tamanho (`300` ou `300x200`) e o resto como texto alternativo; a
 * posição do Runas-Codex mora nesse texto alternativo, e o snippet `runas-codex.css` faz o Obsidian mostrar igual.
 */

export type ImagePosition = "esquerda" | "centro" | "direita" | "largo"

export const IMAGE_POSITIONS: readonly ImagePosition[] = ["esquerda", "centro", "direita", "largo"]

export interface EmbedOptions {
  position?: ImagePosition
  width?: number
  height?: number
  /** Texto alternativo (o resto do apelido, quando não é posição). */
  caption?: string
}

const SIZE = /^\s*(\d+)(?:\s*x\s*(\d+))?\s*$/

/** Lê o apelido de um embed (`direita|300`, `300x200`, `Legenda|300`…). */
export function parseEmbedOptions(alias: string | undefined): EmbedOptions {
  if (alias === undefined) return {}
  const out: EmbedOptions = {}
  let rest = alias
  const bar = rest.lastIndexOf("|")
  const size = SIZE.exec(bar < 0 ? rest : rest.slice(bar + 1))
  if (size) {
    out.width = Number(size[1])
    if (size[2]) out.height = Number(size[2])
    // Em tabelas o separador vem escapado (`\|`).
    rest = bar < 0 ? "" : rest.slice(0, bar).replace(/\\$/, "")
  }
  const text = rest.trim()
  if (!text) return out
  const position = IMAGE_POSITIONS.find((p) => p === text.toLowerCase())
  if (position) out.position = position
  else out.caption = rest
  return out
}

/** Monta o apelido de volta: a posição (ou o texto alternativo) antes do tamanho. `undefined` = sem apelido. */
export function formatEmbedAlias(options: EmbedOptions, separator = "|"): string | undefined {
  const parts: string[] = []
  if (options.position) parts.push(options.position)
  else if (options.caption) parts.push(options.caption)
  if (options.width) parts.push(options.height ? `${options.width}x${options.height}` : String(options.width))
  return parts.length ? parts.join(separator) : undefined
}

export interface EmbedInText {
  /** Posição no texto procurado. */
  from: number
  to: number
  kind: "wiki" | "markdown"
  /** Alvo como o leitor recebe (wiki: o texto antes de `|`; markdown: o endereço decodificado). */
  target: string
  alias?: string
  /** Partes originais, para regravar sem mexer no resto. */
  raw: { target: string; separator: string }
}

function decode(url: string): string {
  const clean = url.replace(/^<|>$/g, "")
  try {
    return decodeURIComponent(clean)
  } catch {
    return clean
  }
}

/** Embeds (`![[…]]` e `![…](…)`) de um trecho de texto, na ordem. */
export function findEmbeds(text: string): EmbedInText[] {
  const found: EmbedInText[] = []
  for (const match of text.matchAll(/!\[\[([^\]\n]+)\]\]/g)) {
    const inner = match[1]!
    const bar = /\\?\|/.exec(inner)
    const rawTarget = bar ? inner.slice(0, bar.index) : inner
    found.push({
      from: match.index!,
      to: match.index! + match[0].length,
      kind: "wiki",
      target: rawTarget.trim(),
      ...(bar ? { alias: inner.slice(bar.index + bar[0].length) } : {}),
      raw: { target: rawTarget, separator: bar?.[0] ?? "|" },
    })
  }
  for (const match of text.matchAll(/!\[([^\]\n]*)\]\(([^)\n]+)\)/g)) {
    found.push({
      from: match.index!,
      to: match.index! + match[0].length,
      kind: "markdown",
      target: decode(match[2]!.trim()),
      ...(match[1] ? { alias: match[1] } : {}),
      raw: { target: match[2]!, separator: "|" },
    })
  }
  return found.sort((a, b) => a.from - b.from)
}

/** O embed com outro tamanho ou posição; o alvo fica como estava. */
export function rewriteEmbed(embed: EmbedInText, options: EmbedOptions): string {
  const alias = formatEmbedAlias(options, embed.raw.separator)
  if (embed.kind === "markdown") return `![${alias ?? ""}](${embed.raw.target})`
  return `![[${embed.raw.target}${alias === undefined ? "" : embed.raw.separator + alias}]]`
}

/**
 * Troca tamanho e posição do embed `target|alias` dentro de `text` (o primeiro que bate). Devolve o trecho a trocar,
 * ou `null` se o embed não está mais lá (o texto mudou).
 */
export function changeEmbed(text: string, target: string, alias: string | undefined, options: EmbedOptions): { from: number; to: number; insert: string } | null {
  const embeds = findEmbeds(text)
  // O leitor pode normalizar o apelido (texto alternativo); com um só embed daquele alvo, vale ele.
  const sameTarget = embeds.filter((e) => e.target === target)
  const embed = sameTarget.find((e) => e.alias === alias) ?? (sameTarget.length === 1 ? sameTarget[0] : undefined)
  if (!embed) return null
  return { from: embed.from, to: embed.to, insert: rewriteEmbed(embed, options) }
}
