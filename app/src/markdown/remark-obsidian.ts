import type { FootnoteDefinition, Heading, Paragraph, Parent, PhrasingContent, Root, RootContent, Text } from "mdast"
import { SKIP, visit } from "unist-util-visit"
import { isValidTag } from "../core/parse"
import { noteName } from "../core/text"
import { EMOJI } from "./emoji"

/**
 * Plugin do remark com a sintaxe do Obsidian e os itens estendidos do dialeto (docs/02, seção 5), aplicado sobre a
 * árvore — assim nada acontece dentro de código, matemática ou HTML, e o resto do Markdown já está resolvido:
 *
 * - `[[nota#título|apelido]]` e `![[embed]]` viram links `wiki:` / `embed:` (o componente decide como desenhar);
 * - `#tag` (as mesmas regras do índice), `==destaque==`, `^[nota de rodapé inline]`, `:emoji:`;
 * - `^bloco` no fim do parágrafo (sai do texto e vira âncora) e `{.classe #id}` no fim de parágrafos e títulos;
 * - abreviações `*[RPG]: Role-playing game` e listas de definição (`Termo` / `: definição`).
 */

type Inline = PhrasingContent
type InlineParent = { type: string; children: Inline[] }

const INLINE_PARENTS = new Set(["paragraph", "heading", "tableCell", "emphasis", "strong", "delete", "calloutTitle"])

const TOKEN = /\^\[([^\]\n]+)\]|(!?)\[\[([^[\]\n]+?)\]\]|(?<=^|[\s(])#([\p{L}\p{N}_/-]+)|:([a-z0-9_+-]+):/giu

function text(value: string): Text {
  return { type: "text", value }
}

function link(url: string, children: Inline[], title?: string): Inline {
  return { type: "link", url, title: title ?? null, children: children as never }
}

/** Texto que aparece no lugar de `[[alvo#sub|apelido]]`. */
export function wikiLabel(target: string, subpath: string, alias: string | undefined): string {
  if (alias !== undefined && alias !== "") return alias
  const parts = subpath.split("#").filter(Boolean)
  if (!target) return parts.join(" › ")
  return [noteName(target), ...parts].join(" › ")
}

function wikiNode(embed: boolean, inner: string): Inline {
  const bar = /\\?\|/.exec(inner)
  const pathPart = (bar ? inner.slice(0, bar.index) : inner).trim()
  const alias = bar ? inner.slice(bar.index + bar[0].length) : undefined
  const hash = pathPart.indexOf("#")
  const target = hash < 0 ? pathPart : pathPart.slice(0, hash)
  const subpath = hash < 0 ? "" : pathPart.slice(hash)
  const url = `${embed ? "embed" : "wiki"}:${encodeURIComponent(target + subpath)}`
  // No embed, o "apelido" é o tamanho (`|400`, `|400x300`) ou a legenda: vai no título, para o componente.
  return embed ? link(url, [text(wikiLabel(target, subpath, undefined))], alias) : link(url, [text(wikiLabel(target, subpath, alias))])
}

interface Context {
  footnotes: FootnoteDefinition[]
  abbreviations: Map<string, string>
}

/** Divide um texto em links, tags, notas inline e emoji. */
function splitText(node: Text, atStart: boolean, ctx: Context): Inline[] {
  const out: Inline[] = []
  let last = 0
  const value = node.value
  for (const match of value.matchAll(TOKEN)) {
    const index = match.index
    let replacement: Inline | null = null
    if (match[1] !== undefined) {
      const id = `nota-inline-${ctx.footnotes.length + 1}`
      ctx.footnotes.push({ type: "footnoteDefinition", identifier: id, label: id, children: [{ type: "paragraph", children: [text(match[1])] }] })
      replacement = { type: "footnoteReference", identifier: id, label: id }
    } else if (match[3] !== undefined) {
      replacement = wikiNode(match[2] === "!", match[3])
    } else if (match[4] !== undefined) {
      if ((index > 0 || atStart) && isValidTag(match[4])) replacement = link(`tag:${encodeURIComponent(match[4])}`, [text(`#${match[4]}`)])
    } else if (match[5] !== undefined) {
      const emoji = EMOJI.get(match[5].toLowerCase())
      if (emoji) replacement = text(emoji)
    }
    if (!replacement) continue
    if (index > last) out.push(text(value.slice(last, index)))
    out.push(replacement)
    last = index + match[0].length
  }
  if (!out.length) return [node]
  if (last < value.length) out.push(text(value.slice(last)))
  return out
}

/** `==destaque==`, inclusive em volta de outros trechos (`==**forte**==`). */
function pairHighlights(children: Inline[]): Inline[] {
  type Piece = Inline | { marker: true }
  const pieces: Piece[] = []
  for (const child of children) {
    if (child.type !== "text" || !child.value.includes("==")) {
      pieces.push(child)
      continue
    }
    child.value.split("==").forEach((part, i) => {
      if (i > 0) pieces.push({ marker: true })
      if (part) pieces.push(text(part))
    })
  }
  if (!pieces.some((p) => "marker" in p)) return children
  const out: Inline[] = []
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!
    if (!("marker" in piece)) {
      out.push(piece)
      continue
    }
    const close = pieces.findIndex((p, j) => j > i && "marker" in p)
    const inner = pieces.slice(i + 1, close) as Inline[]
    if (close < 0 || !inner.length) {
      out.push(text("=="))
      continue
    }
    out.push({ type: "highlight", data: { hName: "mark" }, children: inner } as never)
    i = close
  }
  // Junta textos vizinhos (o `==` sem par volta a ser texto).
  return out.reduce<Inline[]>((acc, node) => {
    const prev = acc.at(-1)
    if (prev?.type === "text" && node.type === "text") prev.value += node.value
    else acc.push(node)
    return acc
  }, [])
}

function wrapAbbreviations(children: Inline[], ctx: Context): Inline[] {
  if (!ctx.abbreviations.size) return children
  const names = [...ctx.abbreviations.keys()].sort((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(${names.join("|")})(?![\\p{L}\\p{N}])`, "gu")
  return children.flatMap((child) => {
    if (child.type !== "text") return [child]
    const parts: Inline[] = []
    let last = 0
    for (const match of child.value.matchAll(pattern)) {
      if (match.index > last) parts.push(text(child.value.slice(last, match.index)))
      parts.push({ type: "abbr", data: { hName: "abbr", hProperties: { title: ctx.abbreviations.get(match[1]!) } }, children: [text(match[1]!)] } as never)
      last = match.index + match[0].length
    }
    if (!parts.length) return [child]
    if (last < child.value.length) parts.push(text(child.value.slice(last)))
    return parts
  })
}

function transformInline(parent: InlineParent, ctx: Context): void {
  const split = parent.children.flatMap((child, i) => (child.type === "text" ? splitText(child, i === 0, ctx) : [child]))
  parent.children = wrapAbbreviations(pairHighlights(split), ctx)
}

function lastText(node: Parent): Text | undefined {
  const last = node.children.at(-1)
  return last?.type === "text" ? last : undefined
}

function setProps(node: RootContent, props: Record<string, unknown>): void {
  const data = (node.data ??= {}) as { hProperties?: Record<string, unknown> }
  data.hProperties = { ...data.hProperties, ...props }
}

/** `^bloco` e `{.classe #id}` no fim de um parágrafo ou título. */
function blockMarks(node: Paragraph | Heading): void {
  const tail = lastText(node)
  if (!tail) return
  const attrs = /[ \t]*\{((?:[ \t]*[.#][\p{L}\p{N}_-]+)+)[ \t]*\}[ \t]*$/u.exec(tail.value)
  if (attrs) {
    const classes = [...attrs[1]!.matchAll(/\.([\p{L}\p{N}_-]+)/gu)].map((m) => m[1]!)
    const id = /#([\p{L}\p{N}_-]+)/u.exec(attrs[1]!)?.[1]
    tail.value = tail.value.slice(0, attrs.index)
    setProps(node, { ...(classes.length ? { className: classes } : {}), ...(id ? { id } : {}) })
  }
  const block = /(?:^|[ \t])\^([A-Za-z0-9-]+)[ \t]*$/.exec(tail.value)
  if (block) {
    tail.value = tail.value.slice(0, block.index)
    setProps(node, { dataBlock: block[1] })
  }
  if (!tail.value) node.children.pop()
}

/** Parágrafo só com `*[ABBR]: descrição` (uma por linha). */
function abbreviationLines(node: Paragraph): [string, string][] | null {
  if (!node.children.every((c) => c.type === "text")) return null
  const lines = node.children.map((c) => (c as Text).value).join("").split("\n")
  const defs = lines.map((line) => /^\*\[([^\]]+)\]:[ \t]*(.+)$/.exec(line.trim()))
  return defs.every(Boolean) ? defs.map((m) => [m![1]!, m![2]!.trim()]) : null
}

/** Quebra o conteúdo de um parágrafo nas linhas do texto-fonte. */
function phrasingLines(children: Inline[]): Inline[][] {
  const lines: Inline[][] = [[]]
  for (const child of children) {
    if (child.type !== "text" || !child.value.includes("\n")) {
      lines.at(-1)!.push(child)
      continue
    }
    child.value.split("\n").forEach((part, i) => {
      if (i > 0) lines.push([])
      if (part) lines.at(-1)!.push(text(part))
    })
  }
  return lines
}

/** `Termo` seguido de linhas `: definição` vira uma lista de definição. */
function definitionList(node: Paragraph): RootContent | null {
  const lines = phrasingLines(node.children)
  const startsDef = (line: Inline[]) => line[0]?.type === "text" && /^:[ \t]+/.test(line[0].value)
  if (lines.length < 2 || startsDef(lines[0]!) || !lines.slice(1).some(startsDef)) return null
  const items: RootContent[] = []
  for (const line of lines) {
    if (startsDef(line)) {
      const first = line[0] as Text
      first.value = first.value.replace(/^:[ \t]+/, "")
      items.push({ type: "defDescription", data: { hName: "dd" }, children: line } as never)
    } else if (line.length) {
      items.push({ type: "defTerm", data: { hName: "dt" }, children: line } as never)
    }
  }
  return { type: "defList", data: { hName: "dl" }, children: items } as never
}

export function remarkObsidian() {
  return (tree: Root) => {
    const ctx: Context = { footnotes: [], abbreviations: new Map() }

    // Abreviações primeiro: valem para a nota inteira.
    visit(tree, "paragraph", (node, index, parent) => {
      const defs = abbreviationLines(node)
      if (!defs || !parent || index === undefined) return
      for (const [name, title] of defs) ctx.abbreviations.set(name, title)
      parent.children.splice(index, 1)
      return [SKIP, index]
    })

    visit(tree, (node, index, parent) => {
      if (node.type === "code" || node.type === "inlineCode" || node.type === "link" || node.type === "linkReference" || node.type === "html" || node.type === "math" || node.type === "inlineMath") return SKIP
      if (node.type === "paragraph" && parent && index !== undefined) {
        // `^bloco` numa linha própria (depois de tabela ou citação) marca o bloco anterior.
        const only = node.children.length === 1 && node.children[0]!.type === "text" ? /^\^([A-Za-z0-9-]+)[ \t]*$/.exec(node.children[0].value) : null
        const previous = index > 0 ? parent.children[index - 1] : undefined
        if (only && previous) {
          setProps(previous as RootContent, { dataBlock: only[1] })
          parent.children.splice(index, 1)
          return [SKIP, index]
        }
        const list = definitionList(node)
        if (list) {
          parent.children[index] = list as never
          for (const item of (list as Parent).children) transformInline(item as InlineParent, ctx)
          return SKIP
        }
      }
      if (node.type === "paragraph" || node.type === "heading") blockMarks(node)
      if (INLINE_PARENTS.has(node.type)) transformInline(node as InlineParent, ctx)
      return undefined
    })

    tree.children.push(...ctx.footnotes)
  }
}
