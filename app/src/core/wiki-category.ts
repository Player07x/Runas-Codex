import { imageTarget, isCategoryNote } from "./personalization"
import { dirname } from "./text"
import type { IndexedNote, VaultIndex } from "./vault-index"
import { articleKind, articleKinds, customKindOf, RELATION_TYPES, WIKI_ROOT, type ArticleKind, type FieldDef } from "./wiki"
const fold = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")
export const categoryRoute = (folder: string) => `/wiki/categoria/${encodeURIComponent(folder)}`
/** Remove só a marcação dos links; valores continuam sendo texto, sem executar Markdown/HTML. */
export function categoryValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(categoryValue).filter(Boolean).join(" · ")
  if (typeof value !== "string" && typeof value !== "number") return ""
  return String(value).replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias?: string) => alias ?? target.split("/").at(-1)!).trim()
}
export function categoryKind(notes: readonly IndexedNote[], folder: string): ArticleKind | undefined {
  const counts = new Map<string, number>()
  for (const note of notes) { const kind = articleKind(note.meta.frontmatter?.data?.tipo); if (kind) counts.set(kind.id, (counts.get(kind.id) ?? 0) + 1) }
  const id = [...counts].sort((a,b) => b[1] - a[1])[0]?.[0]
  const kinds = articleKinds()
  return kinds.find(kind => kind.id === id) ?? kinds.find(kind => kind.folder.split("/").at(-1) === folder.split("/").at(-1))
}
/** Tipos de artigo definidos pelas notas de categoria de todas as wikis do cofre (`setCustomKinds`). */
export function customKindsIn(index: VaultIndex): ArticleKind[] {
  const kinds: ArticleKind[] = []
  for (const note of index.notesIn(WIKI_ROOT)) {
    if (!isCategoryNote(note)) continue
    const kind = customKindOf(dirname(note.path), note.meta.frontmatter?.data ?? {})
    if (kind && !kinds.some(other => other.id === kind.id && other.root === kind.root)) kinds.push(kind)
  }
  return kinds
}
export function articleCardFields(note: IndexedNote): { summary: string[]; badges: { key: string; label: string; text: string }[] } {
  const data = note.meta.frontmatter?.data ?? {}, fields = (articleKind(data.tipo)?.fields ?? []).filter(field => ["texto","link","links"].includes(field.kind))
    .map(field => ({ ...field, text: categoryValue(data[field.key]) })).filter(field => field.text)
  const summary = fields.slice(0,2)
  const priority = ["status", "afiliacao", "raridade"]
  const badges = fields.slice(2).sort((a,b) => {
    const at = priority.indexOf(a.key), bt = priority.indexOf(b.key)
    return (at < 0 ? 99 : at) - (bt < 0 ? 99 : bt)
  }).slice(0,2)
  return { summary: summary.map(field => field.text), badges }
}
// ---------- Filtros da categoria ----------
// Os filtros saem das propriedades dos artigos. Só servem campos de um valor só, com texto: imagem, número, data ou
// mais de um valor na mesma nota não dão filtro. A nota da categoria guarda quais ficam ativos (`filtros: [especie,
// status]`); sem ela, valem os campos com 2 a 8 valores diferentes.

/** Por que um campo não serve de filtro. */
export type FieldProblem = "imagem" | "numero" | "data" | "varios" | "vazio"
export const FIELD_PROBLEMS: Record<FieldProblem, string> = { imagem: "é imagem", numero: "é número", data: "é data", varios: "tem mais de um valor numa nota", vazio: "ainda sem valores" }
export interface CategoryField { key: string; label: string; values: { text: string; count: number }[]; problem?: FieldProblem; /** Artigo que mostra o problema. */ example?: string }
/** Propriedades que organizam a nota e não descrevem o artigo. */
const NOT_FILTERS = new Set(["tipo","aliases","alias","tags","tag","cssclasses","cssclass","calendario","segredo","exemplo_runas","publish","permalink","cor","icone","capa","descricao","filtros"])
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i
const humanize = (key: string) => { const text = key.replace(/_/g, " ").trim(); return text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1) }
/** Texto de um valor de um só item (lista de um item conta como o item); `null` se não serve de filtro. */
function single(value: unknown): { text: string; problem?: FieldProblem } {
  if (value === null || value === undefined) return { text: "" }
  if (Array.isArray(value)) {
    const items = value.filter(item => item !== null && item !== undefined && String(item).trim() !== "")
    return items.length > 1 ? { text: "", problem: "varios" } : items.length ? single(items[0]) : { text: "" }
  }
  if (typeof value === "boolean") return { text: value ? "Sim" : "Não" }
  if (typeof value === "number") return { text: String(value), problem: "numero" }
  if (typeof value !== "string") return { text: "", problem: "varios" }
  const raw = value.trim()
  if (!raw) return { text: "" }
  if (IMAGE.test(imageTarget(raw) ?? "")) return { text: raw, problem: "imagem" }
  if (/^\d{1,6}-\d{1,2}-\d{1,2}(?:[ T].*)?$/.test(raw)) return { text: raw, problem: "data" }
  if (/^[-+]?\d+(?:[.,]\d+)?$|^\d{1,2}:\d{2}$/.test(raw)) return { text: raw, problem: "numero" }
  return { text: categoryValue(raw) }
}
/** O texto com que um artigo entra num filtro (o mesmo que aparece nas pílulas). */
export const fieldText = (value: unknown): string => single(value).text
export function categoryFields(notes: readonly IndexedNote[]): CategoryField[] {
  const defs = new Map<string, FieldDef>(), order: string[] = []
  for (const note of notes) for (const field of articleKind(note.meta.frontmatter?.data?.tipo)?.fields ?? []) if (!defs.has(field.key)) { defs.set(field.key, field); order.push(field.key) }
  const keys = new Set(order)
  for (const note of notes) for (const key of Object.keys(note.meta.frontmatter?.data ?? {})) if (!NOT_FILTERS.has(key)) keys.add(key)
  const rank = (key: string) => { const i = order.indexOf(key); return i < 0 ? order.length : i }
  const PRIORITY: FieldProblem[] = ["imagem", "data", "numero", "varios"]
  return [...keys].filter(key => !NOT_FILTERS.has(key)).map(key => {
    const def = defs.get(key), counts = new Map<string, number>()
    let problem: FieldProblem | undefined = def?.kind === "imagem" ? "imagem" : def?.kind === "data" || key.endsWith("_mundo") ? "data" : def?.kind === "numero" ? "numero" : undefined, example: string | undefined
    for (const note of notes) {
      const value = single(note.meta.frontmatter?.data?.[key])
      if (value.problem && (!problem || PRIORITY.indexOf(value.problem) < PRIORITY.indexOf(problem))) { problem = value.problem; example = note.name }
      if (value.text && !value.problem) counts.set(value.text, (counts.get(value.text) ?? 0) + 1)
    }
    if (!problem && !counts.size) problem = "vazio"
    const values = problem ? [] : [...counts].map(([text, count]) => ({ text, count })).sort((a, b) => a.text.localeCompare(b.text, "pt-BR", { numeric: true }))
    return { key, label: def?.label ?? RELATION_TYPES.find(type => type.key === key)?.label ?? humanize(key), values, ...(problem ? { problem } : {}), ...(example ? { example } : {}) }
  }).sort((a, b) => rank(a.key) - rank(b.key) || a.label.localeCompare(b.label, "pt-BR"))
}
/** A escolha gravada na nota da categoria (`filtros`), ou `null` quando não há escolha (filtros automáticos). */
export function chosenFilters(data: Record<string, unknown> | null | undefined): string[] | null {
  const value = data?.filtros
  if (value === undefined || value === null) return null
  return (Array.isArray(value) ? value : [value]).filter((key): key is string => typeof key === "string" && key.trim() !== "").map(key => key.trim())
}
/** Os filtros mostrados: os escolhidos que servem, na ordem da escolha, ou os automáticos (2 a 8 valores). */
export function activeFilters(fields: readonly CategoryField[], chosen: readonly string[] | null): CategoryField[] {
  if (chosen) return chosen.map(key => fields.find(field => field.key === key && !field.problem)).filter((field): field is CategoryField => Boolean(field))
  return fields.filter(field => !field.problem && field.values.length >= 2 && field.values.length <= 8)
}
export function categorySubfolders(notes: readonly IndexedNote[], folder: string): string[] {
  const root = folder.replace(/\/$/, "") + "/", choices = new Set<string>()
  for (const note of notes) {
    const relative = dirname(note.path).slice(root.length)
    if (!note.path.startsWith(root) || !relative) continue
    const parts = relative.split("/")
    parts.forEach((_, i) => choices.add(parts.slice(0,i+1).join("/")))
  }
  return [...choices].sort((a,b) => a.localeCompare(b,"pt-BR"))
}
export interface CategoryQuery { text: string; order: "name" | "recent"; fields: Record<string,string>; subfolder: string }
export function filterCategory(notes: readonly IndexedNote[], folder: string, query: CategoryQuery): IndexedNote[] {
  const root = folder.replace(/\/$/, ""), term = fold(query.text.trim())
  const matches = notes.filter(note => {
    const data = note.meta.frontmatter?.data ?? {}, parent = dirname(note.path)
    if (query.subfolder === "." && parent !== root) return false
    if (query.subfolder && query.subfolder !== "." && parent !== root + "/" + query.subfolder && !parent.startsWith(root + "/" + query.subfolder + "/")) return false
    if (Object.entries(query.fields).some(([key,value]) => value && fieldText(data[key]) !== value)) return false
    if (!term) return true
    const fields = articleKind(data.tipo)?.fields ?? []
    return fold([note.name,...note.meta.aliases,...fields.map(field => categoryValue(data[field.key]))].join(" ")).includes(term)
  })
  return matches.sort((a,b) => (query.order === "recent" ? b.mtime - a.mtime : 0) || a.name.localeCompare(b.name,"pt-BR",{sensitivity:"base",numeric:true}) || a.path.localeCompare(b.path,"pt-BR"))
}
/** A categoria raiz representa só artigos soltos; subpastas têm seus próprios cards na página inicial. */
export function categoryNotes(notes: readonly IndexedNote[], folder: string, wikiRoot: string, home?: string): IndexedNote[] {
  const root = folder.replace(/\/$/, ""), base = wikiRoot.replace(/\/$/, "")
  if (root !== base && !root.startsWith(base + "/")) return []
  return notes.filter(note => note.path !== home && (root === base ? dirname(note.path) === root : note.path.startsWith(root + "/")))
}
