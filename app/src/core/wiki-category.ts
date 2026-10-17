import { dirname } from "./text"
import type { IndexedNote } from "./vault-index"
import { ARTICLE_KINDS, articleKind, type ArticleKind, type FieldDef } from "./wiki"
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
  return ARTICLE_KINDS.find(kind => kind.id === id) ?? ARTICLE_KINDS.find(kind => kind.folder === folder.split("/").at(-1))
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
export interface CategoryFacet { key: string; label: string; values: string[] }
export function categoryFacets(notes: readonly IndexedNote[]): CategoryFacet[] {
  const fields = new Map<string, FieldDef>()
  for (const note of notes) for (const field of articleKind(note.meta.frontmatter?.data?.tipo)?.fields ?? []) if (field.kind === "texto") fields.set(field.key,field)
  const result: CategoryFacet[] = []
  for (const field of fields.values()) {
    const values = new Set<string>()
    for (const note of notes) { const value = categoryValue(note.meta.frontmatter?.data?.[field.key]); if (value) values.add(value); if (values.size > 8) break }
    if (values.size && values.size <= 8) result.push({ key:field.key, label:field.label, values:[...values].sort((a,b) => a.localeCompare(b,"pt-BR")) })
  }
  return result
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
    if (Object.entries(query.fields).some(([key,value]) => value && categoryValue(data[key]) !== value)) return false
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
