/**
 * Blocos cercados de uma nota com a posição das cercas, para trocar o bloco inteiro (cercas e conteúdo) por outro
 * texto sem mexer em nenhum outro byte. Blocos dentro de um comentário `%% … %%` não contam (o Obsidian não os mostra,
 * e é onde a migração guarda o bloco original), nem os que estão dentro de citações (`> ```leaflet`): esses só são
 * contados, para o aviso.
 */

export interface FencedBlock {
  language: string
  /** Texto de dentro do bloco (sem as cercas, sem a quebra de linha final). */
  content: string
  /** Do começo da linha da cerca de abertura até o fim da cerca de fechamento (sem a quebra de linha depois dela). */
  start: number
  end: number
  /** Linha (0…) da cerca de abertura. */
  line: number
}

const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)/
const INLINE_CODE = /(`+)[^`\n]*?\1/g

/** `%%` fora de trechos de código: um número ímpar abre (ou fecha) um comentário. */
const commentMarks = (line: string) => (line.replace(INLINE_CODE, "").match(/%%/g) ?? []).length

export function fencedBlocks(text: string): FencedBlock[] {
  const blocks: FencedBlock[] = []
  let open: { char: string; size: number; language: string; start: number; contentStart: number; line: number } | null = null
  let inComment = false
  let offset = 0
  const lines = text.split("\n")
  lines.forEach((raw, index) => {
    const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw
    const fence = FENCE.exec(line)
    if (open) {
      if (fence && fence[1]![0] === open.char && fence[1]!.length >= open.size && !line.slice(fence[0].length - fence[2]!.length).trim()) {
        const contentEnd = Math.max(open.contentStart, offset - (text[offset - 2] === "\r" ? 2 : 1))
        if (open.language) blocks.push({ language: open.language, content: text.slice(open.contentStart, contentEnd), start: open.start, end: offset + line.length, line: open.line })
        open = null
      }
    } else if (!inComment && fence && !(fence[1]![0] === "`" && line.slice(fence[0].length).includes("`"))) {
      open = { char: fence[1]![0]!, size: fence[1]!.length, language: fence[2]!.toLowerCase(), start: offset, contentStart: offset + raw.length + 1, line: index }
    } else if (commentMarks(line) % 2 === 1) {
      inComment = !inComment
    }
    offset += raw.length + 1
  })
  return blocks
}

/** Quantos blocos de cada linguagem estão dentro de citações (`> ```nome`), fora de comentários. */
export function quotedBlocks(text: string, languages: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  const wanted = new Set(languages)
  for (const line of text.split(/\r?\n/)) {
    const m = /^ {0,3}(?:>[ \t]?)+ {0,3}(?:`{3,}|~{3,})[ \t]*([^`\s]+)/.exec(line)
    const language = m?.[1]?.toLowerCase()
    if (language && wanted.has(language)) counts.set(language, (counts.get(language) ?? 0) + 1)
  }
  return counts
}

export interface BlockReplacement {
  block: FencedBlock
  /** Texto novo no lugar do bloco inteiro (com as próprias cercas). */
  text: string
}

/** Troca blocos pelo texto novo, de trás para a frente; as quebras de linha seguem as do arquivo (CRLF continua CRLF). */
export function replaceBlocks(text: string, replacements: BlockReplacement[]): string {
  const eol = /\r\n/.test(text) ? "\r\n" : "\n"
  let out = text
  for (const { block, text: next } of [...replacements].sort((a, b) => b.block.start - a.block.start)) {
    out = out.slice(0, block.start) + next.replace(/\r?\n/g, eol) + out.slice(block.end)
  }
  return out
}

/** O bloco original guardado num comentário, logo depois do novo, para quem ainda usa o plugin no Obsidian. */
export function keepOriginal(text: string, block: FencedBlock, plugin: string): string {
  return `%% Bloco original do ${plugin}, guardado pela migração do Runas-Codex:\n${text.slice(block.start, block.end).replace(/\r\n/g, "\n")}\n%%`
}
