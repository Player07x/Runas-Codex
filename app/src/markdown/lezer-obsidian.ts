import type { MarkdownConfig } from "@lezer/markdown"
import { tags } from "@lezer/highlight"
import { isValidTag } from "../core/parse"

/**
 * Sintaxe do Obsidian para o parser do editor (CodeMirror/Lezer): `[[wikilinks]]`, `![[embeds]]`, `==destaque==`,
 * `#tags` e `%%comentários%%`. O live preview esconde as marcas e desenha links e embeds a partir destes nós.
 */

const BRACKET = 91 // [
const BANG = 33 // !
const EQUALS = 61 // =
const HASH = 35 // #
const PERCENT = 37 // %

const Punctuation = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~¡-¿‐-‧]/

const HighlightDelim = { resolve: "Highlight", mark: "HighlightMark" }

export const obsidianSyntax: MarkdownConfig = {
  defineNodes: [
    { name: "WikiLink", style: tags.link },
    { name: "Embed", style: tags.link },
    { name: "WikiLinkMark", style: tags.processingInstruction },
    { name: "Highlight", style: tags.special(tags.content) },
    { name: "HighlightMark", style: tags.processingInstruction },
    { name: "HashTag", style: tags.labelName },
    { name: "ObsidianComment", style: tags.comment },
  ],
  parseInline: [
    {
      name: "WikiLink",
      parse(cx, next, pos) {
        const embed = next === BANG
        const open = embed ? pos + 1 : pos
        if ((embed && cx.char(open) !== BRACKET) || (!embed && next !== BRACKET) || cx.char(open + 1) !== BRACKET) return -1
        const rest = cx.slice(open + 2, cx.end)
        const close = rest.search(/\]\]|\n|\[\[/)
        if (close <= 0 || rest.slice(close, close + 2) !== "]]") return -1
        const end = open + 2 + close + 2
        return cx.addElement(cx.elt(embed ? "Embed" : "WikiLink", pos, end, [cx.elt("WikiLinkMark", pos, open + 2), cx.elt("WikiLinkMark", end - 2, end)]))
      },
      before: "Link",
    },
    {
      name: "Highlight",
      parse(cx, next, pos) {
        if (next !== EQUALS || cx.char(pos + 1) !== EQUALS || cx.char(pos + 2) === EQUALS) return -1
        const before = cx.slice(pos - 1, pos)
        const after = cx.slice(pos + 2, pos + 3)
        const sBefore = /\s|^$/.test(before)
        const sAfter = /\s|^$/.test(after)
        const pBefore = Punctuation.test(before)
        const pAfter = Punctuation.test(after)
        return cx.addDelimiter(HighlightDelim, pos, pos + 2, !sAfter && (!pAfter || sBefore || pBefore), !sBefore && (!pBefore || sAfter || pAfter))
      },
      after: "Emphasis",
    },
    {
      name: "HashTag",
      parse(cx, next, pos) {
        if (next !== HASH || (pos > cx.offset && !/[\s(]/.test(cx.slice(pos - 1, pos)))) return -1
        const match = /^[\p{L}\p{N}_/-]+/u.exec(cx.slice(pos + 1, cx.end))
        if (!match || !isValidTag(match[0])) return -1
        return cx.addElement(cx.elt("HashTag", pos, pos + 1 + match[0].length))
      },
    },
    {
      name: "ObsidianComment",
      parse(cx, next, pos) {
        if (next !== PERCENT || cx.char(pos + 1) !== PERCENT) return -1
        const close = cx.slice(pos + 2, cx.end).indexOf("%%")
        const end = close < 0 ? cx.end : pos + 2 + close + 2
        return cx.addElement(cx.elt("ObsidianComment", pos, end))
      },
      before: "Emphasis",
    },
  ],
}
