import { dirname, noteName } from "../text"
import type { IndexedNote, VaultIndex } from "../vault-index"

/** Expressões de Bases/DQL: interpretadas, sem eval, funções do usuário ou acesso ao JavaScript. */
type Expr = { kind: "literal"; value: unknown } | { kind: "name"; name: string } | { kind: "member"; object: Expr; key: Expr } | { kind: "call"; target: Expr; args: Expr[] } | { kind: "binary"; op: string; left: Expr; right: Expr } | { kind: "unary"; op: string; value: Expr }
export interface QueryContext { index: VaultIndex; note: IndexedNote; from?: string; formula?: (name: string) => unknown; values?: unknown[] }
export interface QueryLink { $link: string; label?: string }
const blocked = new Set(["__proto__", "constructor", "prototype"])
const cached = new Map<string, Expr>()
const precedence: Record<string, number> = { "||": 1, or: 1, "&&": 2, and: 2, "=": 3, "==": 3, "!=": 3, ">": 4, "<": 4, ">=": 4, "<=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6 }
export const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
export const list = (value: unknown): unknown[] => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]
export const truth = (value: unknown): boolean => Array.isArray(value) ? value.length > 0 : Boolean(value)
export const isQueryLink = (value: unknown): value is QueryLink => typeof record(value).$link === "string"
export function display(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (Array.isArray(value)) return value.map(display).join(", ")
  if (isQueryLink(value)) return value.label ?? noteName(value.$link)
  if (typeof record(value).$file === "string") return noteName(String(record(value).$file))
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10)
  return typeof value === "object" ? JSON.stringify(value) : String(value)
}

function compile(source: string): Expr {
  const saved = cached.get(source)
  if (saved) return saved
  if (source.length > 8000) throw new Error("Expressão longa demais (máximo 8000 caracteres).")
  const tokens: string[] = []
  const lex = /\s+|\[\[[^\]\n]+\]\]|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\d+(?:\.\d+)?|[\p{L}_$][\p{L}\p{N}_$-]*|==|!=|>=|<=|&&|\|\||[()[\].,!+*/%<>=-]/uy
  let at = 0
  while (at < source.length) {
    lex.lastIndex = at
    const match = lex.exec(source)
    if (!match) throw new Error(`Expressão não reconhecida perto de “${source.slice(at, at + 24)}”.`)
    at = lex.lastIndex
    if (match[0].trim()) tokens.push(match[0])
    if (tokens.length > 1000) throw new Error("Expressão complexa demais.")
  }
  let pos = 0
  const expect = (token: string) => { if (tokens[pos++] !== token) throw new Error(`Esperado “${token}” na expressão.`) }
  const parse = (minimum = 0, depth = 0): Expr => {
    if (depth > 35) throw new Error("Expressão aninhada demais.")
    const token = tokens[pos++]
    if (!token) throw new Error("Expressão incompleta.")
    let left: Expr
    if (token === "!" || token.toLowerCase() === "not" || token === "-") left = { kind: "unary", op: token.toLowerCase(), value: parse(7, depth + 1) }
    else if (token === "(") { left = parse(0, depth + 1); expect(")") }
    else if (/^\d/.test(token)) left = { kind: "literal", value: Number(token) }
    else if (token.startsWith("[[")) left = { kind: "literal", value: { $link: token.slice(2, -2).split("|")[0]! } }
    else if (/^["']/.test(token)) left = { kind: "literal", value: token[0] === '"' ? JSON.parse(token) as unknown : token.slice(1, -1).replace(/\\(['\\])/g, "$1") }
    else if (["true", "false", "null"].includes(token)) left = { kind: "literal", value: token === "null" ? null : token === "true" }
    else if (/^[\p{L}_$]/u.test(token)) left = { kind: "name", name: token }
    else throw new Error(`Símbolo inesperado: ${token}`)
    while (pos < tokens.length) {
      if (tokens[pos] === ".") { pos++; const key = tokens[pos++]; if (!key || !/^[\p{L}_$]/u.test(key)) throw new Error("Propriedade incompleta."); left = { kind: "member", object: left, key: { kind: "literal", value: key } }; continue }
      if (tokens[pos] === "[") { pos++; const key = parse(0, depth + 1); expect("]"); left = { kind: "member", object: left, key }; continue }
      if (tokens[pos] === "(") {
        pos++; const args: Expr[] = []
        while (tokens[pos] !== ")") { args.push(parse(0, depth + 1)); if (tokens[pos] !== ",") break; pos++ }
        expect(")"); left = { kind: "call", target: left, args }; continue
      }
      const op = tokens[pos]!.toLowerCase(), level = precedence[op]
      if (level === undefined || level < minimum) break
      pos++; left = { kind: "binary", op, left, right: parse(level + 1, depth + 1) }
    }
    return left
  }
  const expression = parse()
  if (pos !== tokens.length) throw new Error(`Trecho não suportado: ${tokens.slice(pos).join(" ")}`)
  if (cached.size >= 500) cached.clear()
  cached.set(source, expression)
  return expression
}

function linkValue(value: unknown, context: QueryContext): unknown {
  const target = isQueryLink(value) ? value.$link : typeof record(value).$file === "string" ? String(record(value).$file) : typeof value === "string" && /^\[\[.*\]\]$/.test(value) ? value.slice(2, -2).split("|")[0]! : null
  if (target === null) return value instanceof Date ? value.getTime() : value
  return context.index.resolve({ kind: "wiki", embed: false, target, raw: "", start: 0, end: 0, inFrontmatter: false }, context.from ?? context.note.path).dest ?? target
}
export const equal = (a: unknown, b: unknown, context: QueryContext): boolean => {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => equal(v, b[i], context))
  if (a instanceof Date && typeof b === "string" && /^\d{4}-\d{2}-\d{2}/.test(b)) return a.getTime() === Date.parse(b)
  if (b instanceof Date && typeof a === "string" && /^\d{4}-\d{2}-\d{2}/.test(a)) return b.getTime() === Date.parse(a)
  return linkValue(a, context) === linkValue(b, context)
}
function fileData(note: IndexedNote): Record<string, unknown> {
  return { $file: note.path, name: note.name, basename: note.name, path: note.path, folder: dirname(note.path), ext: "md", extension: "md", size: note.size, mtime: new Date(note.mtime), ctime: new Date(String(note.meta.frontmatter?.data?.criado ?? note.meta.frontmatter?.data?.created ?? new Date(note.mtime).toISOString())), tags: note.meta.tags.map(t => `#${t}`), link: { $link: note.path } }
}
export function column(name: string, context: QueryContext): unknown {
  if (name.startsWith("formula.")) return context.formula?.(name.slice(8))
  if (name.startsWith("file.")) return fileData(context.note)[name.slice(5)]
  return context.note.meta.frontmatter?.data?.[name.replace(/^note\./, "")]
}
export function evaluate(source: string, context: QueryContext): unknown {
  const contains = (values: unknown, value: unknown) => Array.isArray(values) ? values.some(v => equal(v, value, context)) : display(values).includes(display(value))
  const aggregate = (name: string, values: unknown[]) => {
    const numbers = values.filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    if (name === "count" || name === "length") return values.length
    if (name === "sum") return numbers.reduce((s, n) => s + n, 0)
    if (name === "min") return numbers.length ? Math.min(...numbers) : null
    if (name === "max") return numbers.length ? Math.max(...numbers) : null
    if (name === "average" || name === "mean") return numbers.length ? numbers.reduce((s, n) => s + n, 0) / numbers.length : null
    throw new Error(`Função não suportada: ${name}`)
  }
  const call = (name: string, args: unknown[], receiver?: unknown): unknown => {
    if (blocked.has(name)) throw new Error("Propriedade não permitida.")
    if (receiver !== undefined) {
      const file = typeof record(receiver).$file === "string" ? context.index.note(String(record(receiver).$file)) : undefined
      if (file && name === "inFolder") { const folder = display(args[0]).replace(/\/$/, ""); return file.path.startsWith(folder + "/") }
      if (file && name === "hasTag") return args.every(tag => file.meta.tags.some(t => t === display(tag).replace(/^#/, "") || t.startsWith(display(tag).replace(/^#/, "") + "/")))
      if (file && name === "hasProperty") return Object.hasOwn(file.meta.frontmatter?.data ?? {}, display(args[0]))
      if (file && name === "hasLink") return context.index.outgoing(file.path).some(l => equal({ $link: l.dest ?? l.link.target }, args[0], context))
      if (file && name === "asLink") return { $link: file.path, ...(args[0] ? { label: display(args[0]) } : {}) }
      if (name === "contains") return contains(receiver, args[0])
      if (name === "containsAll") return args.every(v => contains(receiver, v))
      if (name === "containsAny") return args.some(v => contains(receiver, v))
      if (name === "isEmpty") return !truth(receiver)
      if (name === "length") return Array.isArray(receiver) ? receiver.length : display(receiver).length
      if (name === "lower" || name === "toLowerCase") return display(receiver).toLowerCase()
      if (name === "upper" || name === "toUpperCase") return display(receiver).toUpperCase()
      if (name === "startsWith") return display(receiver).startsWith(display(args[0]))
      if (name === "endsWith") return display(receiver).endsWith(display(args[0]))
      if (name === "split") return display(receiver).split(display(args[0]))
      if (name === "toString") return display(receiver)
      if (name === "unique") return list(receiver).filter((v, i, all) => all.findIndex(a => equal(a, v, context)) === i)
      if (["sum", "min", "max", "average", "mean", "count"].includes(name)) return aggregate(name, list(receiver))
      throw new Error(`Método não suportado: ${name}`)
    }
    if (name === "list") return args.length > 1 ? args : list(args[0])
    if (name === "contains" || name === "econtains") return contains(args[0], args[1])
    if (name === "length") return Array.isArray(args[0]) ? args[0].length : display(args[0]).length
    if (name === "lower") return display(args[0]).toLowerCase()
    if (name === "upper") return display(args[0]).toUpperCase()
    if (name === "string") return display(args[0])
    if (name === "number") return Number(args[0])
    if (name === "link") return { $link: display(args[0]), ...(args[1] ? { label: display(args[1]) } : {}) }
    if (name === "round") return Math.round(Number(args[0]) * 10 ** Number(args[1] ?? 0)) / 10 ** Number(args[1] ?? 0)
    if (name === "if" || name === "choice") return truth(args[0]) ? args[1] : args[2]
    if (name === "default") return args[0] ?? args[1]
    if (name === "date") return new Date(display(args[0]) === "today" ? new Date().toLocaleDateString("sv-SE") : display(args[0]))
    if (name === "today") return new Date(new Date().toLocaleDateString("sv-SE"))
    if (name === "now") return new Date()
    if (["sum", "min", "max", "average", "mean"].includes(name)) return aggregate(name, list(args[0]))
    throw new Error(`Função não suportada: ${name}`)
  }
  let budget = 5000
  const visit = (expr: Expr): unknown => {
    if (--budget < 0) throw new Error("Limite de cálculo da expressão atingido.")
    switch (expr.kind) {
      case "literal": return expr.value
      case "name": {
        if (expr.name === "file") return fileData(context.note)
        if (expr.name === "note") return context.note.meta.frontmatter?.data ?? {}
        if (expr.name === "this") return context.index.note(context.from ?? "") ? { ...context.index.note(context.from!)!.meta.frontmatter?.data, ...fileData(context.index.note(context.from!)!) } : null
        if (expr.name === "formula") return { $formula: true }
        if (expr.name === "values") return context.values ?? []
        if (expr.name === "today" && !Object.hasOwn(context.note.meta.frontmatter?.data ?? {}, "today")) return "today"
        return context.note.meta.frontmatter?.data?.[expr.name]
      }
      case "member": {
        const key = display(visit(expr.key)); if (blocked.has(key)) throw new Error("Propriedade não permitida.")
        const object = visit(expr.object)
        if (record(object).$formula) return context.formula?.(key)
        if (Array.isArray(object)) return key === "length" ? object.length : object[Number(key)]
        return record(object)[key]
      }
      case "call": {
        const args = expr.args.map(visit)
        if (expr.target.kind === "name") return call(expr.target.name, args)
        if (expr.target.kind === "member") return call(display(visit(expr.target.key)), args, visit(expr.target.object))
        throw new Error("Chamada não suportada.")
      }
      case "unary": { const v = visit(expr.value); return expr.op === "-" ? -Number(v) : !truth(v) }
      case "binary": {
        const a = visit(expr.left)
        if (expr.op === "&&" || expr.op === "and") return truth(a) && truth(visit(expr.right))
        if (expr.op === "||" || expr.op === "or") return truth(a) || truth(visit(expr.right))
        const b = visit(expr.right)
        if (expr.op === "=" || expr.op === "==") return equal(a, b, context)
        if (expr.op === "!=") return !equal(a, b, context)
        if (a instanceof Date && typeof b === "string" && ["+", "-"].includes(expr.op)) {
          const duration = /^(-?\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|m|minutes?|h|hours?|d|days?|w|weeks?)$/.exec(b)
          if (!duration) throw new Error(`Duração não suportada: ${b}`)
          const unit = duration[2]!, factor = unit.startsWith("ms") || unit.startsWith("millisecond") ? 1 : unit.startsWith("s") ? 1000 : unit.startsWith("m") ? 60000 : unit.startsWith("h") ? 3600000 : unit.startsWith("d") ? 86400000 : 604800000
          return new Date(a.getTime() + Number(duration[1]) * factor * (expr.op === "-" ? -1 : 1))
        }
        const x = a instanceof Date ? a.getTime() : b instanceof Date && typeof a === "string" && /^\d{4}-\d{2}-\d{2}/.test(a) ? Date.parse(a) : a
        const y = b instanceof Date ? b.getTime() : a instanceof Date && typeof b === "string" && /^\d{4}-\d{2}-\d{2}/.test(b) ? Date.parse(b) : b
        if (expr.op === "+") return typeof x === "string" || typeof y === "string" ? display(x) + display(y) : Number(x) + Number(y)
        if (expr.op === "-") return Number(x) - Number(y)
        if (expr.op === "*") return Number(x) * Number(y)
        if (expr.op === "/") return Number(y) ? Number(x) / Number(y) : null
        if (expr.op === "%") return Number(y) ? Number(x) % Number(y) : null
        const cmp = typeof x === "number" && typeof y === "number" ? x - y : display(x).localeCompare(display(y), "pt-BR", { numeric: true })
        return expr.op === ">" ? cmp > 0 : expr.op === "<" ? cmp < 0 : expr.op === ">=" ? cmp >= 0 : cmp <= 0
      }
    }
  }
  return visit(compile(source))
}
