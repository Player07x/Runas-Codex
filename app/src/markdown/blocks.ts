import type { BlockContent, Blockquote, Parent, Paragraph, PhrasingContent, Root, RootContent, Text } from "mdast"

/**
 * Blocos do Obsidian e do dialeto que o remark não conhece, tratados num documento só (notas de rodapé, sumário e
 * abreviações valem para a nota inteira):
 *
 * - `prepareSource`: tira os comentários `%%…%%`, transforma `$$fórmula$$` numa linha em bloco de matemática e deixa
 *   as linhas `::: nome` / `:::` em parágrafos próprios. Nada muda dentro de blocos de código.
 * - `remarkBlocks`: citações que começam com `[!tipo]` viram callouts (com dobra, metadados e aninhamento) e o que
 *   fica entre `::: nome` e `:::` vira um contêiner nomeado.
 */

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const CONTAINER_OPEN = /^ {0,3}:{3,}[ \t]*([\p{L}\p{N}_-]+)[ \t]*$/u
const CONTAINER_CLOSE = /^ {0,3}:{3,}[ \t]*$/

/** Tira `%%comentários%%` fora de blocos e trechos de código (o Obsidian não os mostra na leitura). */
export function stripComments(text: string): string {
  let out = ""
  let fence: { char: string; size: number } | null = null
  let pending = ""
  const flush = () => {
    out += pending.replace(/(`+)[^`\n]*?\1|%%[\s\S]*?(?:%%|$)/g, (m) => (m.startsWith("`") ? m : ""))
    pending = ""
  }
  for (const line of text.split(/(?<=\n)/)) {
    const opener = FENCE.exec(line)
    if (fence) {
      out += line
      if (opener && opener[1]![0] === fence.char && opener[1]!.length >= fence.size && !line.slice(opener[0].length).trim()) fence = null
      continue
    }
    // Um comentário aberto continua valendo dentro de um bloco de código (como no Obsidian).
    if (opener && (pending.match(/%%/g)?.length ?? 0) % 2 === 0) {
      flush()
      fence = { char: opener[1]![0]!, size: opener[1]!.length }
      out += line
      continue
    }
    pending += line
  }
  flush()
  return out
}

export function prepareSource(source: string): string {
  const lines = stripComments(source.replace(/\r\n?/g, "\n")).split("\n")
  const out: string[] = []
  let fence: { char: string; size: number } | null = null
  for (const line of lines) {
    const opener = FENCE.exec(line)
    if (fence) {
      out.push(line)
      if (opener && opener[1]![0] === fence.char && opener[1]!.length >= fence.size && !line.slice(opener[0].length).trim()) fence = null
      continue
    }
    if (opener) {
      fence = { char: opener[1]![0]!, size: opener[1]!.length }
      out.push(line)
      continue
    }
    if (CONTAINER_OPEN.test(line) || CONTAINER_CLOSE.test(line)) {
      // Parágrafo próprio, para o remark não juntar a marca com o texto vizinho.
      if (out.length && out.at(-1)!.trim()) out.push("")
      out.push(line.trim(), "")
      continue
    }
    const math = /^( {0,3})\$\$(.+)\$\$[ \t]*$/.exec(line)
    out.push(math ? `${math[1]}$$\n${math[1]}${math[2]!.trim()}\n${math[1]}$$` : line)
  }
  return out.join("\n")
}

const CALLOUT = /^\[!([^\]|\n]+)(?:\|([^\]\n]*))?\]([+-])?[ \t]*/

function text(value: string): Text {
  return { type: "text", value }
}

/** Separa a primeira linha de um parágrafo (o cabeçalho do callout) do resto. */
function splitFirstLine(children: PhrasingContent[]): [PhrasingContent[], PhrasingContent[]] {
  const head: PhrasingContent[] = []
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!
    if (child.type === "break") return [head, children.slice(i + 1)]
    if (child.type === "text" && child.value.includes("\n")) {
      const at = child.value.indexOf("\n")
      if (at > 0) head.push(text(child.value.slice(0, at)))
      const rest = child.value.slice(at + 1)
      return [head, [...(rest ? [text(rest)] : []), ...children.slice(i + 1)]]
    }
    head.push(child)
  }
  return [head, []]
}

function toCallout(node: Blockquote): RootContent | null {
  const first = node.children[0]
  if (first?.type !== "paragraph" || first.children[0]?.type !== "text") return null
  const match = CALLOUT.exec(first.children[0].value)
  if (!match) return null
  first.children[0] = text(first.children[0].value.slice(match[0].length))
  const [title, rest] = splitFirstLine(first.children)
  const body: RootContent[] = [...(rest.length ? [{ ...first, children: rest } as Paragraph] : []), ...node.children.slice(1)]
  const titleNodes = title.filter((child) => !(child.type === "text" && !child.value.trim()))
  return {
    type: "callout",
    data: {
      hName: "runas-callout",
      hProperties: { dataKind: match[1]!.trim().toLocaleLowerCase("pt-BR"), dataMeta: (match[2] ?? "").trim(), dataFold: match[3] ?? "" },
    },
    children: [{ type: "calloutTitle", data: { hName: "runas-callout-title" }, children: titleNodes } as never, ...body],
  } as never
}

/** Agrupa os irmãos entre `::: nome` e `:::` (com aninhamento) num contêiner. */
function groupContainers(parent: Parent): void {
  const marker = (node: RootContent | undefined): { open?: string; close?: true } | null => {
    if (node?.type !== "paragraph" || node.children.length !== 1 || node.children[0]!.type !== "text") return null
    const value = node.children[0].value
    const open = CONTAINER_OPEN.exec(value)
    if (open) return { open: open[1]!.toLocaleLowerCase("pt-BR") }
    return CONTAINER_CLOSE.test(value) ? { close: true } : null
  }
  const children = parent.children as RootContent[]
  for (let i = children.length - 1; i >= 0; i--) {
    const open = marker(children[i])?.open
    if (!open) continue
    const close = children.findIndex((child, j) => j > i && marker(child)?.close)
    if (close < 0) continue
    const inner = children.slice(i + 1, close) as BlockContent[]
    children.splice(i, close - i + 1, { type: "container", data: { hName: "div", hProperties: { className: ["md-container", open] } }, children: inner } as never)
  }
}

/** De baixo para cima: os callouts de dentro já estão prontos quando o de fora é montado. */
function transform(parent: Parent): void {
  const children = parent.children as RootContent[]
  children.forEach((child, i) => {
    if ("children" in child && child.type !== "paragraph" && child.type !== "heading") transform(child as Parent)
    if (child.type === "blockquote") {
      const callout = toCallout(child)
      if (callout) children[i] = callout
    }
  })
  groupContainers(parent)
}

export function remarkBlocks() {
  return (tree: Root) => transform(tree)
}
