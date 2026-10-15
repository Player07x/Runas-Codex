import { foldName } from "./text"
import type { IndexedNote, SearchHit, VaultIndex } from "./vault-index"

/**
 * Busca com os operadores do Obsidian (checklist A.3): termos (todos precisam aparecer), `"frase exata"`, `-termo`
 * para excluir, `OR` entre alternativas, `path:`, `file:`, `tag:`, `content:`, `line:(a b)` (na mesma linha),
 * `section:(a b)` (no mesmo trecho de título), `[propriedade]`, `[propriedade:valor]` e `/expressão regular/`.
 * Sem diferenciar maiúsculas (a regex segue as regras do JavaScript: use `(?i:…)` para ignorar maiúsculas nela).
 */

type Term =
  | { kind: "text"; value: string; negate: boolean; scope: "all" | "content" }
  | { kind: "regex"; re: RegExp; negate: boolean }
  | { kind: "field"; field: "path" | "file" | "tag"; value: string; negate: boolean }
  | { kind: "group"; within: "line" | "section"; terms: Term[]; negate: boolean }
  | { kind: "prop"; key: string; value?: string; negate: boolean }

export interface ParsedQuery {
  /** Alternativas (`OR`); cada uma é uma lista de termos que precisam bater juntos. */
  alternatives: Term[][]
  error?: string
}

const OPERATORS = new Set(["path", "file", "tag", "content", "line", "section"])

/** Lê a busca; uma regex inválida vira `error` (a busca mostra o aviso em vez de quebrar). */
export function parseQuery(query: string): ParsedQuery {
  let at = 0
  let error: string | undefined
  const peek = () => query[at] ?? ""
  const readUntil = (close: string): string => {
    const start = at
    while (at < query.length && query[at] !== close) at += query[at] === "\\" && close === "/" ? 2 : 1
    const value = query.slice(start, at)
    at++
    return value
  }
  const readWord = () => {
    const start = at
    while (at < query.length && !/\s/.test(query[at]!) && query[at] !== ")") at++
    return query.slice(start, at)
  }
  const regex = (source: string): RegExp | null => {
    try {
      return new RegExp(source, "m")
    } catch (e) {
      error = `Expressão regular inválida: /${source}/ (${e instanceof Error ? e.message : String(e)})`
      return null
    }
  }
  const parseTerms = (inGroup: boolean): Term[][] => {
    const alternatives: Term[][] = [[]]
    while (at < query.length) {
      while (/\s/.test(peek())) at++
      if (at >= query.length) break
      if (inGroup && peek() === ")") {
        at++
        break
      }
      if (query.startsWith("OR", at) && /\s/.test(query[at + 2] ?? " ") && (at === 0 || /\s/.test(query[at - 1]!))) {
        at += 2
        alternatives.push([])
        continue
      }
      let negate = false
      if (peek() === "-" && query[at + 1] && !/\s/.test(query[at + 1]!)) {
        negate = true
        at++
      }
      const current = alternatives[alternatives.length - 1]!
      if (peek() === '"') {
        at++
        const value = foldName(readUntil('"'))
        if (value) current.push({ kind: "text", value, negate, scope: "all" })
        continue
      }
      if (peek() === "/") {
        at++
        const re = regex(readUntil("/"))
        if (re) current.push({ kind: "regex", re, negate })
        continue
      }
      if (peek() === "[") {
        at++
        const inner = readUntil("]")
        const colon = inner.indexOf(":")
        const key = (colon < 0 ? inner : inner.slice(0, colon)).trim()
        const value = colon < 0 ? undefined : inner.slice(colon + 1).trim().replace(/^"(.*)"$/, "$1")
        if (key) current.push({ kind: "prop", key: foldName(key), ...(value ? { value: foldName(value) } : {}), negate })
        continue
      }
      const op = /^([a-z]+):/.exec(query.slice(at))
      if (op && OPERATORS.has(op[1]!)) {
        at += op[0].length
        const name = op[1]!
        if (name === "line" || name === "section") {
          let terms: Term[]
          if (peek() === "(") {
            at++
            terms = parseTerms(true)[0] ?? []
          } else {
            const value = peek() === '"' ? (at++, readUntil('"')) : readWord()
            terms = value ? [{ kind: "text", value: foldName(value), negate: false, scope: "content" }] : []
          }
          if (terms.length) current.push({ kind: "group", within: name, terms, negate })
          continue
        }
        let value: string
        if (peek() === "(") {
          at++
          value = readUntil(")")
        } else if (peek() === '"') {
          at++
          value = readUntil('"')
        } else value = readWord()
        value = foldName(value.trim()).replace(/^#/, "")
        if (!value) continue
        if (name === "content") current.push({ kind: "text", value, negate, scope: "content" })
        else current.push({ kind: "field", field: name as "path" | "file" | "tag", value, negate })
        continue
      }
      const word = foldName(readWord())
      if (word) current.push({ kind: "text", value: word, negate, scope: "all" })
    }
    return alternatives.filter((a) => a.length)
  }
  const alternatives = parseTerms(false)
  return { alternatives, ...(error ? { error } : {}) }
}

interface Context {
  note: IndexedNote
  name: string
  aliases: string[]
  body: string
  lines: string[]
  sections: string[]
}

function sections(text: string): string[] {
  const out: string[] = []
  let current: string[] = []
  for (const line of text.split("\n")) {
    if (/^ {0,3}#{1,6}\s/.test(line) && current.length) {
      out.push(current.join("\n"))
      current = []
    }
    current.push(line)
  }
  out.push(current.join("\n"))
  return out
}

function propertyMatches(data: Record<string, unknown> | null | undefined, key: string, value?: string): boolean {
  if (!data) return false
  const entry = Object.entries(data).find(([k]) => foldName(k) === key)
  if (!entry) return false
  if (value === undefined) return true
  const values = Array.isArray(entry[1]) ? entry[1] : [entry[1]]
  return values.some((v) => v !== null && v !== undefined && foldName(String(v)).includes(value))
}

/** O termo bate na nota (sem olhar `negate`). `text` restringe a uma linha ou trecho, nos grupos. */
function matches(term: Term, ctx: Context, text?: string): boolean {
  switch (term.kind) {
    case "text":
      if (text !== undefined) return text.includes(term.value)
      return term.scope === "content" ? ctx.body.includes(term.value) : ctx.name.includes(term.value) || ctx.aliases.some((a) => a.includes(term.value)) || ctx.body.includes(term.value)
    case "regex":
      return term.re.test(text ?? ctx.note.text)
    case "field":
      if (term.field === "path") return foldName(ctx.note.path).includes(term.value)
      if (term.field === "file") return ctx.name.includes(term.value)
      return ctx.note.meta.tags.some((t) => {
        const tag = t.toLocaleLowerCase("pt-BR")
        return tag === term.value || tag.startsWith(term.value + "/")
      })
    case "prop":
      return propertyMatches(ctx.note.meta.frontmatter?.data, term.key, term.value)
    case "group": {
      const pieces = term.within === "line" ? ctx.lines : ctx.sections
      return pieces.some((piece) => {
        const folded = foldName(piece)
        return term.terms.every((t) => (t.kind === "regex" ? t.re.test(piece) : matches(t, ctx, folded)) !== t.negate)
      })
    }
  }
}

function snippet(text: string, term: Term | undefined): string {
  if (!term) return ""
  let index = -1
  let length = 0
  if (term.kind === "text") {
    index = foldName(text).indexOf(term.value)
    length = term.value.length
  } else if (term.kind === "regex") {
    const m = term.re.exec(text)
    if (m) [index, length] = [m.index, m[0].length]
  } else if (term.kind === "group") {
    const first = term.terms.find((t) => !t.negate)
    return first ? snippet(text, first) : ""
  }
  if (index < 0) return ""
  const start = Math.max(0, index - 50)
  return (start > 0 ? "…" : "") + text.slice(start, index + length + 70).replace(/\s+/g, " ").trim()
}

/** Busca no cofre (ou num espaço): as notas que batem com alguma alternativa, as mais relevantes primeiro. */
export function searchNotes(index: VaultIndex, query: string, root = "", limit = 50): SearchHit[] & { error?: string } {
  const parsed = parseQuery(query)
  const hits: SearchHit[] & { error?: string } = []
  if (parsed.error) hits.error = parsed.error
  if (!parsed.alternatives.length) return hits
  for (const note of index.notesIn(root)) {
    let ctx: Context | null = null
    const context = (): Context => {
      if (ctx) return ctx
      const body = foldName(note.text)
      ctx = { note, name: foldName(note.name), aliases: note.meta.aliases.map(foldName), body, lines: note.text.split("\n"), sections: sections(note.text) }
      return ctx
    }
    let best: { score: number; terms: Term[] } | null = null
    for (const terms of parsed.alternatives) {
      if (!terms.every((t) => matches(t, context()) !== t.negate)) continue
      let score = 0
      for (const t of terms) {
        if (t.negate) continue
        if (t.kind === "text" && t.scope === "all") {
          const { name, aliases } = context()
          score += name === t.value ? 100 : name.startsWith(t.value) ? 50 : name.includes(t.value) ? 30 : aliases.some((a) => a.includes(t.value)) ? 20 : 1
        } else score += 5
      }
      if (!best || score > best.score) best = { score, terms }
    }
    if (!best) continue
    const first = best.terms.find((t) => !t.negate && (t.kind === "text" || t.kind === "regex" || t.kind === "group"))
    hits.push({ path: note.path, score: best.score, snippet: snippet(note.text, first) })
  }
  hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path, "pt-BR"))
  if (hits.length > limit) hits.length = limit
  return hits
}
