import { maskNonContent, parseFrontmatter } from "./parse"
import { foldName } from "./text"

/**
 * Trechos de uma nota para a transclusão (`![[nota#título]]`, `![[nota#^bloco]]`), com as mesmas regras do Obsidian:
 * - título: da linha do título até o próximo título de nível igual ou maior (o título entra);
 * - `#a#b`: o título `b` dentro da seção de `a`;
 * - bloco: o parágrafo ou o item de lista que termina em `^id`; `^id` sozinho numa linha marca o bloco de cima
 *   (tabela, citação).
 */

/** O texto sem o frontmatter (o que a transclusão da nota inteira mostra). */
export function noteBody(text: string): string {
  const frontmatter = parseFrontmatter(text)
  return frontmatter ? text.slice(frontmatter.end) : text.replace(/^﻿/, "")
}

interface Line {
  text: string
  masked: string
}

function linesOf(body: string): Line[] {
  const masked = maskNonContent(body).split("\n")
  return body.split("\n").map((text, i) => ({ text: text.replace(/\r$/, ""), masked: masked[i] ?? "" }))
}

function headingOf(line: Line): { level: number; text: string } | null {
  const m = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*\r?$/.exec(line.masked)
  return m ? { level: m[1]!.length, text: line.text.replace(/^ {0,3}#{1,6}[ \t]+/, "").replace(/[ \t]+#+[ \t]*$|[ \t]*$/, "") } : null
}

function sectionByHeadings(lines: Line[], path: string[]): string | null {
  let from = 0
  let to = lines.length
  let found: number | null = null
  for (const wanted of path) {
    found = null
    for (let i = from; i < to; i++) {
      const heading = headingOf(lines[i]!)
      if (heading && foldName(heading.text) === foldName(wanted)) {
        found = i
        break
      }
    }
    if (found === null) return null
    const level = headingOf(lines[found]!)!.level
    let end = found + 1
    while (end < to && !(headingOf(lines[end]!) && headingOf(lines[end]!)!.level <= level)) end++
    from = found + 1
    to = end
  }
  return lines.slice(found!, to).map((l) => l.text).join("\n").trimEnd()
}

const LIST_ITEM = /^([ \t]*)(?:[-*+]|\d+[.)])[ \t]/

function sectionByBlock(lines: Line[], id: string): string | null {
  const marker = new RegExp(`(?:^|\\s)\\^${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[ \\t]*$`)
  const at = lines.findIndex((line) => marker.test(line.masked))
  if (at < 0) return null
  const strip = (text: string) => text.replace(marker, "")
  // `^id` sozinho (em geral depois de uma linha em branco): o bloco logo acima.
  if (!strip(lines[at]!.text).trim()) {
    let end = at
    while (end > 0 && !lines[end - 1]!.text.trim()) end--
    let start = end
    while (start > 0 && lines[start - 1]!.text.trim()) start--
    return end > start ? lines.slice(start, end).map((l) => l.text).join("\n") : null
  }
  const item = LIST_ITEM.exec(lines[at]!.text)
  if (item) {
    // O item e os subitens (linhas mais indentadas logo abaixo).
    const indent = item[1]!.length
    let end = at + 1
    while (end < lines.length && lines[end]!.text.trim() && (lines[end]!.text.match(/^[ \t]*/)![0].length > indent)) end++
    return [strip(lines[at]!.text).trimStart(), ...lines.slice(at + 1, end).map((l) => l.text.slice(Math.min(indent, l.text.length)))].join("\n")
  }
  let start = at
  while (start > 0 && lines[start - 1]!.text.trim() && !headingOf(lines[start - 1]!) && !LIST_ITEM.test(lines[start - 1]!.text)) start--
  return [...lines.slice(start, at).map((l) => l.text), strip(lines[at]!.text)].join("\n")
}

/** O trecho de `body` que `subpath` (`#título#sub` ou `#^bloco`) aponta; `null` se não existe. */
export function extractSection(body: string, subpath: string | undefined): string | null {
  if (!subpath || subpath === "#") return body
  const lines = linesOf(body)
  if (subpath.startsWith("#^")) return sectionByBlock(lines, subpath.slice(2))
  const path = subpath.split("#").map((p) => p.trim()).filter(Boolean)
  return path.length ? sectionByHeadings(lines, path) : body
}
