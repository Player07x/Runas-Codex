import type { Element, Root as HastRoot } from "hast"
import type { ListItem, Paragraph, Root } from "mdast"
import { visit } from "unist-util-visit"
import { maskNonContent, parseFrontmatter } from "../core/parse"

/**
 * Caixas de tarefa no leitor, como o Obsidian: qualquer caractere entre os colchetes (`- [/] …`, `- [-] …`) é uma
 * tarefa, com o caractere em `data-task` no item (o snippet e os temas do Obsidian usam o mesmo atributo). O GFM só
 * reconhece `[ ]` e `[x]`; os outros viram caixa marcada aqui.
 */
export function remarkTaskStatus() {
  return (tree: Root) => {
    visit(tree, "listItem", (item: ListItem) => {
      const first = item.children[0]
      if (typeof item.checked === "boolean") {
        item.data = { ...item.data, hProperties: { ...(item.data?.hProperties ?? {}), dataTask: item.checked ? "x" : " " } }
        return
      }
      if (first?.type !== "paragraph") return
      const text = (first as Paragraph).children[0]
      const m = text?.type === "text" ? /^\[([^\]\s])\][ \t]+/.exec(text.value) : null
      if (!m || !text || text.type !== "text") return
      text.value = text.value.slice(m[0].length)
      item.checked = true
      item.data = { ...item.data, hProperties: { ...(item.data?.hProperties ?? {}), dataTask: m[1] } }
    })
  }
}

/** Numera as caixas de tarefa na ordem do documento (`data-task-index`) e guarda o total em `counter`. */
export function rehypeTaskIndex(counter: { total: number }) {
  return () => (tree: HastRoot) => {
    let n = 0
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "input" && node.properties?.type === "checkbox") node.properties = { ...node.properties, dataTaskIndex: n++ }
    })
    counter.total = n
  }
}

/** Linhas (0 = primeira) dos itens de lista com caixa, fora do frontmatter, de código e de comentários. */
export function checkboxLines(text: string): number[] {
  const masked = maskNonContent(text).split("\n")
  const fm = parseFrontmatter(text)
  const start = fm ? text.slice(0, fm.end).split("\n").length - 1 : 0
  const out: number[] = []
  for (let i = start; i < masked.length; i++) if (/^[\s>]*(?:[-*+]|\d+[.)])[ \t]+\[[^\]\r\n]\][ \t]/.test(masked[i]!)) out.push(i)
  return out
}
