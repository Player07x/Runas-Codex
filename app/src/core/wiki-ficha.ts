import { dateProblem, noteDateText, parseWorldDate, sameAbbr, type Calendar } from "./calendar"
import { setProperty, type PropertyValue } from "./properties"
import type { ArticleKind, FieldDef } from "./wiki"

/**
 * A ficha preenchida no Novo artigo (U29) e a edição da ficha no artigo usam as mesmas regras: o que cada tipo de
 * campo aceita e como vira propriedade. A gravação passa sempre pelo `setProperty` (nada de YAML escrito à mão).
 */

// ---------- Grupos dos tipos no Novo artigo ----------

/** Grupos dos tipos prontos, na ordem do Novo artigo. Tipo pronto fora daqui cai em “Outros”. */
export const ARTICLE_KIND_GROUPS: readonly { id: string; label: string; ids: readonly string[] }[] = [
  { id: "pessoas", label: "Pessoas e grupos", ids: ["personagem", "organizacao", "especie", "cultura", "religiao"] },
  { id: "lugares", label: "Lugares", ids: ["local", "cidade", "construcao", "pais"] },
  { id: "coisas", label: "Coisas", ids: ["item", "material", "veiculo", "magia", "tecnologia"] },
  { id: "historia", label: "História e mundo", ids: ["evento", "guerra", "era", "mito", "calendario", "mapa"] },
]

export interface KindGroup { id: string; label: string; kinds: ArticleKind[] }

/** Os tipos em grupos: os prontos nos grupos acima, os criados pelo usuário em “Criados nesta wiki”, o resto em “Outros”. */
export function groupKinds(kinds: ArticleKind[]): KindGroup[] {
  const placed = new Set<string>()
  const groups: KindGroup[] = ARTICLE_KIND_GROUPS.map((group) => {
    const members = group.ids.flatMap((id) => kinds.filter((kind) => kind.id === id && !kind.root))
    members.forEach((kind) => placed.add(kind.id))
    return { id: group.id, label: group.label, kinds: members }
  })
  const custom = kinds.filter((kind) => kind.root)
  const others = kinds.filter((kind) => !kind.root && !placed.has(kind.id))
  groups.push({ id: "criados", label: "Criados nesta wiki", kinds: custom }, { id: "outros", label: "Outros", kinds: others })
  return groups.filter((group) => group.kinds.length > 0)
}

// ---------- Valores da ficha ----------

/** Lista de links: os nomes, um por item; os outros campos: texto (link e imagem sem os colchetes). */
export type FichaInput = string | string[]
export type FichaValues = Record<string, FichaInput>

/** Nome dentro de `[[…]]` (ou `![[…]]`), sem o apelido. */
export const linkName = (value: string): string => value.trim().replace(/^!?\[\[/, "").replace(/\]\]$/, "").split("|")[0]!.trim()

/** O valor gravado como o campo da ficha o edita. */
export function fichaInput(field: FieldDef, value: unknown): FichaInput {
  const list = Array.isArray(value) ? value : value === null || value === undefined || value === "" ? [] : [value]
  if (field.kind === "links") return list.map((item) => linkName(String(item))).filter(Boolean)
  const text = list.map(String).join(", ")
  return field.kind === "link" || field.kind === "imagem" ? linkName(text) : text
}

export type FichaResult = { value: PropertyValue } | { error: string }

/**
 * O que o campo grava: link e imagem como `[[nome]]`, lista como `[[a]], [[b]]`, número como número (texto se não
 * for), data com a sigla de um calendário que existe (`3999-02-12 OC`). `null` esvazia o campo.
 */
export function fichaValue(field: FieldDef, input: FichaInput, calendars: readonly Calendar[], fallbackAbbr?: string): FichaResult {
  if (field.kind === "links") {
    const items = (Array.isArray(input) ? input : input.split(",")).map(linkName).filter(Boolean)
    return { value: items.map((item) => `[[${item}]]`) }
  }
  const text = (Array.isArray(input) ? input.join(", ") : input).trim()
  if (field.kind === "data") {
    if (!text) return { value: null }
    const date = parseWorldDate(text)
    const example = `3999-02-12 ${fallbackAbbr ?? calendars[0]?.abbr ?? "OC"}`
    if (!date) return { error: `Preencha dia, mês e ano (ex.: ${example}).` }
    if (!date.calendar) return { error: `Escreva a sigla do calendário no fim (ex.: ${example}).` }
    const target = calendars.find((calendar) => sameAbbr(calendar.abbr, date.calendar!))
    if (!target) return { error: `Nenhum calendário com a sigla “${date.calendar}”.` }
    const problem = dateProblem(target, date)
    return problem ? { error: problem } : { value: noteDateText(date, target) }
  }
  if (field.kind === "link" || field.kind === "imagem") {
    const name = linkName(text)
    return { value: name ? `[[${name}]]` : null }
  }
  if (field.kind === "numero") return { value: text === "" ? null : Number.isFinite(Number(text)) ? Number(text) : text }
  return { value: text || null }
}

const filled = (input: FichaInput | undefined) => (Array.isArray(input) ? input.some((item) => item.trim()) : Boolean(input?.trim()))

/** Os erros da ficha, por campo (só dos campos preenchidos). */
export function fichaErrors(kind: ArticleKind, values: FichaValues, calendars: readonly Calendar[]): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of kind.fields) {
    const input = values[field.key]
    if (!filled(input)) continue
    const result = fichaValue(field, input!, calendars)
    if ("error" in result) errors[field.key] = result.error
  }
  return errors
}

/**
 * Grava a ficha no texto do artigo novo, uma propriedade por vez pelo `setProperty` (o resto do arquivo fica igual).
 * Campo vazio fica como o modelo deixou. Campo com erro interrompe com o nome do campo na mensagem.
 */
export function applyFicha(text: string, kind: ArticleKind, values: FichaValues, calendars: readonly Calendar[] = []): string {
  let next = text
  for (const field of kind.fields) {
    const input = values[field.key]
    if (!filled(input)) continue
    const result = fichaValue(field, input!, calendars)
    if ("error" in result) throw new Error(`${field.label}: ${result.error}`)
    next = setProperty(next, field.key, result.value)
  }
  return next
}

/** Põe um texto pronto (de um gerador, por exemplo) logo abaixo do título do artigo novo. */
export function withArticleBody(text: string, body: string): string {
  const clean = body.trim()
  if (!clean) return text
  return text.replace(/^# .*(?:\r?\n|$)/m, (heading) => `${heading.endsWith("\n") ? heading : `${heading}\n`}\n${clean}\n`)
}
