import { NOTES } from "../data/notes"
import { ARTICLES } from "../data/wiki"
import { CAMPAIGN_NOTES } from "../data/campaigns"
import type { Note, SpaceId } from "../data/types"
import { spaceOfPath } from "./spaces"

export const ALL_NOTES: Note[] = [...NOTES, ...ARTICLES, ...CAMPAIGN_NOTES]

export interface ParsedLink {
  target: string
  heading?: string
  label: string
  embed: boolean
}

const WIKILINK = /(!?)\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g

export function extractLinks(markdown: string): ParsedLink[] {
  const links: ParsedLink[] = []
  for (const match of markdown.matchAll(WIKILINK)) {
    const target = match[2].trim()
    const heading = match[3]?.slice(1)
    links.push({ target, heading, label: match[4] ?? basename(target), embed: match[1] === "!" })
  }
  return links
}

export function basename(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "")
}

const fold = (text: string) => text.normalize("NFC").toLocaleLowerCase("pt-BR")

/**
 * Resolve como o Runas-Codex: caminho completo primeiro; nome curto procura antes no mesmo espaço.
 * (O Obsidian procura no cofre inteiro — o app avisa quando os dois discordam.)
 */
export function resolveLink(target: string, fromSpace: SpaceId | undefined, notes: Note[] = ALL_NOTES): Note | undefined {
  if (!target) return undefined
  const wanted = fold(target.replace(/\.md$/, ""))
  if (wanted.includes("/")) return notes.find((n) => fold(n.path.replace(/\.md$/, "")).endsWith(wanted))
  const matches = notes.filter((n) => fold(n.title) === wanted || n.aliases?.some((a) => fold(a) === wanted))
  return matches.find((n) => n.space === fromSpace) ?? matches[0]
}

export interface Backlink {
  note: Note
  context: string
  crossSpace: boolean
}

export function backlinksOf(note: Note, notes: Note[] = ALL_NOTES): Backlink[] {
  const result: Backlink[] = []
  for (const other of notes) {
    if (other.id === note.id) continue
    for (const line of other.markdown.split("\n")) {
      const hit = extractLinks(line).some((link) => resolveLink(link.target, other.space, notes)?.id === note.id)
      if (hit) {
        result.push({ note: other, context: cleanContext(line), crossSpace: other.space !== note.space })
        break
      }
    }
  }
  return result
}

export function outgoingOf(note: Note, notes: Note[] = ALL_NOTES) {
  const seen = new Set<string>()
  return extractLinks(note.markdown)
    .filter((link) => (seen.has(link.target) ? false : (seen.add(link.target), true)))
    .map((link) => ({ link, note: resolveLink(link.target, note.space, notes) }))
}

/** Links para notas que ainda não existem, por espaço ("a escrever"). */
export function brokenLinks(space: SpaceId, notes: Note[] = ALL_NOTES): { target: string; from: Note[] }[] {
  const map = new Map<string, Note[]>()
  for (const note of notes.filter((n) => n.space === space)) {
    for (const link of extractLinks(note.markdown)) {
      if (!link.target || resolveLink(link.target, space, notes)) continue
      map.set(link.target, [...(map.get(link.target) ?? []), note])
    }
  }
  return [...map].map(([target, from]) => ({ target, from }))
}

export function isCrossSpace(target: string, fromSpace: SpaceId | undefined): boolean {
  const path = target.includes("/") ? spaceOfPath(target) : undefined
  return Boolean(path && fromSpace && path !== fromSpace)
}

function cleanContext(line: string): string {
  return line
    .replace(WIKILINK, (_m, _e, target: string, _h, label?: string) => label ?? basename(target))
    .replace(/^[>\-*\d.\s]+/, "")
    .replace(/[*_=`]/g, "")
    .trim()
}

/** Remove o frontmatter YAML e devolve as propriedades em texto (o editor real usa a lib `yaml`). */
export function splitFrontmatter(markdown: string): { properties: [string, string][]; body: string } {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!match) return { properties: [], body: markdown }
  const properties = match[1]
    .split("\n")
    .map((line) => line.match(/^([\w-]+):\s*(.*)$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")] as [string, string])
  return { properties, body: markdown.slice(match[0].length) }
}
