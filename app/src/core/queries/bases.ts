import { parse } from "yaml"
import type { IndexedNote, VaultIndex } from "../vault-index"
import { column, display, evaluate, list, record, truth, type QueryContext } from "./expression"

export interface BaseView { name: string; type: "table" | "cards" | "list"; order: string[]; filters?: unknown; sort: { property: string; direction: string }[]; groupBy?: string; summaries: Record<string, string>; limit: number }
export interface BaseDefinition { filters?: unknown; formulas: Record<string, string>; properties: Record<string, string>; views: BaseView[]; summaries: Record<string, string> }
export interface QueryRow { path: string; name: string; cells: unknown[]; group: string }
export interface QueryResult { columns: string[]; labels: string[]; rows: QueryRow[]; summaries: string[]; type: BaseView["type"]; total: number }
const strings = (value: unknown): Record<string, string> => Object.fromEntries(Object.entries(record(value)).filter((e): e is [string, string] => typeof e[1] === "string"))

export function parseBase(text: string): BaseDefinition {
  if (text.length > 1_000_000) throw new Error("A base passa do limite de 1 MB.")
  const data = record(parse(text, { maxAliasCount: 30 }))
  if (!Array.isArray(data.views) || !data.views.length) throw new Error("A base precisa de pelo menos uma visão em views.")
  const properties = Object.fromEntries(Object.entries(record(data.properties)).map(([key, value]) => [key, String(record(value).displayName ?? key.replace(/^(note|file|formula)\./, ""))]))
  const views = data.views.map((raw, i): BaseView => {
    const v = record(raw)
    if (!["table", "cards", "list"].includes(String(v.type))) throw new Error(`Visão não suportada: ${String(v.type)}. Use table, cards ou list.`)
    return { name: String(v.name ?? `Visão ${i + 1}`), type: v.type as BaseView["type"], filters: v.filters, order: list(v.order).filter((p): p is string => typeof p === "string"), sort: list(v.sort).map(s => ({ property: String(record(s).property ?? "file.name"), direction: String(record(s).direction ?? "ASC") })), ...(v.groupBy ? { groupBy: String(record(v.groupBy).property ?? v.groupBy) } : {}), summaries: strings(v.summaries), limit: typeof v.limit === "number" ? Math.max(0, Math.min(1000, Math.floor(v.limit))) : 1000 }
  })
  return { filters: data.filters, formulas: strings(data.formulas), properties, views, summaries: strings(data.summaries) }
}

export function matchesFilter(filter: unknown, context: QueryContext, depth = 0): boolean {
  if (depth > 20) throw new Error("Filtro aninhado demais.")
  if (filter === undefined || filter === null) return true
  if (typeof filter === "string") return truth(evaluate(filter, context))
  const object = record(filter), keys = Object.keys(object)
  if (keys.length !== 1 || !["and", "or", "not"].includes(keys[0]!)) throw new Error("Filtro inválido: use uma expressão ou and/or/not.")
  const key = keys[0]!, entries = list(object[key])
  if (key === "and") return entries.every(f => matchesFilter(f, context, depth + 1))
  if (key === "or") return entries.some(f => matchesFilter(f, context, depth + 1))
  return !entries.every(f => matchesFilter(f, context, depth + 1))
}

function contextFor(definition: BaseDefinition, index: VaultIndex, note: IndexedNote, from?: string): QueryContext {
  const pending = new Set<string>(), cache = new Map<string, unknown>()
  const context: QueryContext = { index, note, from, formula(name) {
    if (cache.has(name)) return cache.get(name)
    if (pending.has(name) || pending.size > 20) throw new Error(`Fórmula circular: ${name}`)
    const expression = definition.formulas[name]
    if (expression === undefined) throw new Error(`Fórmula inexistente: ${name}`)
    pending.add(name)
    const value = evaluate(expression, context)
    pending.delete(name); cache.set(name, value)
    return value
  } }
  return context
}

export function summarize(name: string, values: unknown[], expression?: string, context?: QueryContext): string {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v))
  const clean = values.filter(v => v !== null && v !== undefined && v !== "")
  switch (name.toLowerCase().replace(/[ _-]/g, "")) {
    case "sum": return display(nums.reduce((s, n) => s + n, 0))
    case "average": case "mean": return nums.length ? display(nums.reduce((s, n) => s + n, 0) / nums.length) : ""
    case "min": return nums.length ? display(Math.min(...nums)) : ""
    case "max": return nums.length ? display(Math.max(...nums)) : ""
    case "count": case "countall": return String(values.length)
    case "countempty": case "empty": return String(values.length - clean.length)
    case "countfilled": case "filled": return String(clean.length)
    case "unique": case "countunique": return String(new Set(clean.map(display)).size)
    default: if (expression && context) return display(evaluate(expression, { ...context, values })); throw new Error(`Resumo não suportado: ${name}`)
  }
}

export function runBase(definition: BaseDefinition, index: VaultIndex, viewName?: string, from?: string): QueryResult {
  const view = viewName ? definition.views.find(v => v.name === viewName.replace(/^#/, "")) : definition.views[0]
  if (!view) throw new Error(`Visão não encontrada: ${viewName}`)
  const columns = view.order.length ? view.order : ["file.name", ...Object.keys(definition.properties).filter(p => p !== "file.name")]
  const contexts = index.allNotes().map(note => contextFor(definition, index, note, from)).filter(c => matchesFilter(definition.filters, c) && matchesFilter(view.filters, c))
  const sort = [...(view.groupBy ? [{ property: view.groupBy, direction: "ASC" }] : []), ...view.sort]
  contexts.sort((a, b) => {
    for (const item of sort) {
      const av = column(item.property, a), bv = column(item.property, b)
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : display(av).localeCompare(display(bv), "pt-BR", { numeric: true })
      if (cmp) return /DESC/i.test(item.direction) ? -cmp : cmp
    }
    return a.note.path.localeCompare(b.note.path, "pt-BR")
  })
  const allRows = contexts.map(c => ({ path: c.note.path, name: c.note.name, cells: columns.map(name => column(name, c)), group: view.groupBy ? display(column(view.groupBy, c)) || "Sem valor" : "" }))
  return { columns, labels: columns.map(c => definition.properties[c] ?? definition.properties[`note.${c}`] ?? c.replace(/^(note|file|formula)\./, "")), rows: allRows.slice(0, view.limit), type: view.type, total: allRows.length, summaries: columns.map((name, i) => view.summaries[name] ? summarize(view.summaries[name]!, allRows.map(row => row.cells[i]), definition.summaries[view.summaries[name]!], contexts[0]) : "") }
}
