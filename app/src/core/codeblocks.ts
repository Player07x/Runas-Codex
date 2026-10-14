import { parseDocument } from "yaml"

/**
 * Blocos de código cercados (```` ```nome ````) dentro de uma nota: achar, ler e trocar só o conteúdo de um deles,
 * sem mexer no resto do arquivo. É assim que o calendário avança o "hoje" e o mapa grava os pinos.
 */

export interface CodeBlock {
  language: string
  /** Texto de dentro do bloco (sem as cercas). */
  content: string
  /** Onde o conteúdo começa e termina no arquivo (`text.slice(contentStart, contentEnd) === content`). */
  contentStart: number
  contentEnd: number
  /** Linha (0…) da cerca de abertura. */
  line: number
}

export function findCodeBlocks(text: string, language?: string): CodeBlock[] {
  const blocks: CodeBlock[] = []
  const lines = text.split("\n")
  let offset = 0
  let open: { char: string; size: number; language: string; contentStart: number; line: number } | null = null
  lines.forEach((line, index) => {
    const fence = /^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)/.exec(line)
    if (open) {
      if (fence && fence[1]![0] === open.char && fence[1]!.length >= open.size && !line.slice(fence[0].length).trim()) {
        // O conteúdo termina antes da quebra de linha que vem antes da cerca (LF ou CRLF).
        const contentEnd = Math.max(open.contentStart, offset - (text[offset - 2] === "\r" ? 2 : 1))
        blocks.push({ language: open.language, content: text.slice(open.contentStart, contentEnd), contentStart: open.contentStart, contentEnd, line: open.line })
        open = null
      }
    } else if (fence && !(fence[1]![0] === "`" && line.slice(fence[0].length).includes("`"))) {
      open = { char: fence[1]![0]!, size: fence[1]!.length, language: fence[2]!.toLowerCase(), contentStart: offset + line.length + 1, line: index }
    }
    offset += line.length + 1
  })
  return language ? blocks.filter((b) => b.language === language.toLowerCase()) : blocks
}

/** Troca o conteúdo de um bloco, mantendo as quebras de linha do arquivo (CRLF continua CRLF). */
export function replaceCodeBlock(text: string, block: CodeBlock, content: string): string {
  if (text.slice(block.contentStart, block.contentEnd) !== block.content) throw new Error("O bloco mudou; recarregue a nota.")
  const eol = /\r\n/.test(text) ? "\r\n" : "\n"
  const next = content.replace(/\r?\n$/, "").replace(/\r?\n/g, eol)
  // Bloco vazio (cerca logo depois da outra): o conteúdo novo precisa da sua própria quebra de linha.
  const empty = block.contentStart === block.contentEnd
  return text.slice(0, block.contentStart) + next + (empty && next ? eol : "") + text.slice(block.contentEnd)
}

/**
 * Troca o valor de chaves de topo no YAML de um bloco, mantendo comentários, ordem e o estilo das outras chaves.
 * `undefined` remove a chave.
 */
export function setBlockKeys(content: string, values: Record<string, unknown>): string {
  const doc = parseDocument(content)
  if (doc.errors.length) throw new Error(`O YAML do bloco tem erro: ${doc.errors[0]!.message.split("\n")[0]}`)
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) doc.delete(key)
    else doc.set(key, value)
  }
  return doc.toString({ lineWidth: 0 })
}

/** Troca só a linha `chave: valor` de topo (para valores simples, como `hoje`), sem reformatar nada. */
export function setBlockLine(content: string, key: string, value: string): string {
  const pattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:.*$`, "m")
  const line = `${key}: ${value}`
  if (pattern.test(content)) return content.replace(pattern, line)
  const eol = content.includes("\r\n") ? "\r\n" : "\n"
  return content ? `${content.replace(/\r?\n$/, "")}${eol}${line}` : line
}
