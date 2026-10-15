import type { VaultIndex } from "../vault-index"
import { display, equal, evaluate, truth, type QueryContext } from "./expression"
import type { QueryResult } from "./bases"

/** Separa colunas sem cortar vírgulas dentro de chamadas, índices e strings. */
export function splitColumns(text: string): string[] {
  const out: string[] = []; let start = 0, depth = 0, quote = ""
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quote) { if (c === "\\") i++; else if (c === quote) quote = ""; continue }
    if (c === '"' || c === "'") quote = c
    else if (c === "(" || c === "[") depth++
    else if (c === ")" || c === "]") depth--
    else if (c === "," && depth === 0) { out.push(text.slice(start, i).trim()); start = i + 1 }
  }
  if (quote || depth) throw new Error("Coluna incompleta na consulta.")
  if (text.slice(start).trim()) out.push(text.slice(start).trim())
  return out
}

function sourcePredicate(source: string): (context: QueryContext) => boolean {
  const tokens: string[] = [], re = /\s+|outgoing\(\s*\[\[[^\]]+\]\]\s*\)|\[\[[^\]]+\]\]|"(?:\\.|[^"\\])*"|#[\p{L}\p{N}_/-]+|AND\b|OR\b|NOT\b|[()!-]/giyu
  let offset = 0
  while (offset < source.length) {
    re.lastIndex = offset; const m = re.exec(source)
    if (!m) throw new Error(`Fonte FROM não suportada: ${source.slice(offset)}`)
    offset = re.lastIndex; if (m[0].trim()) tokens.push(m[0])
  }
  let pos = 0
  const primary = (depth = 0): ((c: QueryContext) => boolean) => {
    if (depth > 30) throw new Error("Fonte aninhada demais.")
    const token = tokens[pos++]
    if (!token) throw new Error("FROM incompleto.")
    if (["!", "-", "NOT"].includes(token.toUpperCase())) { const child = primary(depth + 1); return c => !child(c) }
    if (token === "(") { const child = or(depth + 1); if (tokens[pos++] !== ")") throw new Error("Falta fechar parênteses no FROM."); return child }
    if (token.startsWith("#")) return c => truth(evaluate(`file.hasTag(${JSON.stringify(token)})`, c))
    if (token.startsWith('"')) { const path = JSON.parse(token) as string; return c => c.note.path.startsWith(path.replace(/\/$/, "") + "/") || c.note.path === path || c.note.path === path + ".md" }
    const link = token.match(/\[\[([^\]]+)\]\]/)?.[1]
    if (link) return c => /^outgoing/i.test(token)
      ? c.index.outgoing(c.index.resolve({ kind: "wiki", target: link, embed: false, start: 0, end: 0, raw: "", inFrontmatter: false }, c.from ?? c.note.path).dest ?? "").some(l => l.dest === c.note.path)
      : c.index.outgoing(c.note.path).some(l => equal({ $link: l.dest ?? l.link.target }, { $link: link }, c))
    throw new Error(`Fonte não suportada: ${token}`)
  }
  const and = (depth: number): ((c: QueryContext) => boolean) => { let a = primary(depth); while (tokens[pos]?.toUpperCase() === "AND") { pos++; const before = a, b = primary(depth); a = c => before(c) && b(c) } return a }
  const or = (depth: number): ((c: QueryContext) => boolean) => { let a = and(depth); while (tokens[pos]?.toUpperCase() === "OR") { pos++; const before = a, b = and(depth); a = c => before(c) || b(c) } return a }
  const predicate = or(0)
  if (pos !== tokens.length) throw new Error("Trecho de FROM não reconhecido.")
  return predicate
}

/** DQL declarativo: listas/tabelas, fontes, filtros, ordenação e limite. DataviewJS não é executado. */
export function runDataview(code: string, index: VaultIndex, from?: string): QueryResult {
  if (code.length > 16000) throw new Error("Consulta longa demais.")
  const lines = code.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const header = /^(TABLE|LIST)\b\s*(WITHOUT\s+ID\b)?\s*(.*)$/i.exec(lines.shift() ?? "")
  if (!header) throw new Error("Use uma consulta LIST ou TABLE. DataviewJS, TASK e CALENDAR não são executados.")
  const table = header[1]!.toUpperCase() === "TABLE", withoutId = Boolean(header[2])
  const expressions = splitColumns(header[3]!).map(raw => { const match = /^(.*?)\s+AS\s+(?:"([^"]+)"|'([^']+)'|(.+))$/i.exec(raw); return { expression: match?.[1] ?? raw, label: match?.[2] ?? match?.[3] ?? match?.[4] ?? raw } })
  let contexts: QueryContext[] = index.allNotes().map(note => ({ index, note, from }))
  for (const line of lines) {
    const match = /^(FROM|WHERE|SORT|LIMIT)\s+(.+)$/i.exec(line)
    if (!match) throw new Error(`Comando não suportado: ${line}`)
    const command = match[1]!.toUpperCase(), value = match[2]!
    if (command === "FROM") contexts = contexts.filter(sourcePredicate(value))
    else if (command === "WHERE") contexts = contexts.filter(c => truth(evaluate(value, c)))
    else if (command === "SORT") {
      const sort = splitColumns(value).map(part => { const m = /^(.*?)(?:\s+(ASC|DESC))?$/i.exec(part)!; return { expression: m[1]!, descending: m[2]?.toUpperCase() === "DESC" } })
      contexts.sort((a, b) => { for (const s of sort) { const av = evaluate(s.expression, a), bv = evaluate(s.expression, b), diff = typeof av === "number" && typeof bv === "number" ? av - bv : display(av).localeCompare(display(bv), "pt-BR", { numeric: true }); if (diff) return s.descending ? -diff : diff } return 0 })
    } else if (command === "LIMIT") { if (!/^\d+$/.test(value)) throw new Error("LIMIT precisa de um número inteiro."); contexts = contexts.slice(0, Math.min(1000, Number(value))) }
  }
  const columns = [...(!withoutId ? ["file.link"] : []), ...expressions.map(e => e.expression)]
  return { columns, labels: [...(!withoutId ? ["Nota"] : []), ...expressions.map(e => e.label)], rows: contexts.slice(0, 1000).map(c => ({ path: c.note.path, name: c.note.name, cells: columns.map(e => evaluate(e, c)), group: "" })), summaries: [], total: contexts.length, type: table ? "table" : "list" }
}
