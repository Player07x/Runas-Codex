import { isMap, isSeq, parse as parseYaml, parseDocument, Scalar, YAMLSeq, type Document, type YAMLMap } from "yaml"
import { CalendarError, parseCalendar } from "./calendar"

/**
 * Configurar o calendário sem editar código (U35). O formulário lê o bloco ```runas-calendario``` e grava de volta no
 * mesmo bloco com a API `Document` do `yaml`: as chaves que o formulário não conhece (hoje, hora, correspondências,
 * equivalentes…), os comentários e a ordem ficam como estavam. Datas vão entre aspas.
 */
export interface MonthForm { nome: string; dias: number; estacao: string; intercalar: boolean }
export interface MoonForm { nome: string; ciclo: number; cheia_em: string; cor: string }
export interface EraForm { nome: string; sigla: string; inicio: number }
export interface HolidayForm { nome: string; data: string; cor: string }
export interface LeapForm { a_cada: number; exceto_a_cada: number | null; salvo_a_cada: number | null; mes: string; dias: number }
export interface ClockForm { horas: number; minutos: number; periodos: string[] }

export interface CalendarForm {
  nome: string
  sigla: string
  sufixo: string
  sufixo_negativo: string
  semana: string[]
  primeiro_dia: number
  meses: MonthForm[]
  bissexto: LeapForm | null
  luas: MoonForm[]
  eras: EraForm[]
  feriados: HolidayForm[]
  relogio: ClockForm | null
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
const int = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN
  return Number.isFinite(n) ? Math.round(n) : fallback
}
const optInt = (v: unknown) => (v === undefined || v === null || v === "" ? null : int(v, 0))

/** O formulário a partir do YAML do bloco (o que não estiver lá fica vazio). */
export function calendarFormFromYaml(source: string): CalendarForm {
  let data: Record<string, unknown> = {}
  try {
    data = rec(parseYaml(source))
  } catch {
    data = {}
  }
  const meses = list(data.meses).map((m, i) => {
    const o = rec(m)
    return { nome: text(o.nome) || `Mês ${i + 1}`, dias: int(o.dias, 30), estacao: text(o.estacao), intercalar: o.intercalar === true }
  })
  const leap = data.bissexto ? rec(data.bissexto) : null
  const clock = data.relogio ? rec(data.relogio) : null
  return {
    nome: text(data.nome),
    sigla: text(data.sigla),
    sufixo: text(data.sufixo),
    sufixo_negativo: text(data.sufixo_negativo),
    semana: list(data.semana).map(text),
    primeiro_dia: int(data.primeiro_dia, 0),
    meses,
    bissexto: leap ? { a_cada: int(leap.a_cada, 4), exceto_a_cada: optInt(leap.exceto_a_cada), salvo_a_cada: optInt(leap.salvo_a_cada), mes: text(leap.mes) || meses[0]?.nome || "", dias: int(leap.dias, 1) } : null,
    luas: list(data.luas).map((m) => { const o = rec(m); return { nome: text(o.nome), ciclo: int(o.ciclo, 28), cheia_em: text(o.cheia_em), cor: text(o.cor) } }),
    eras: list(data.eras).map((m) => { const o = rec(m); return { nome: text(o.nome), sigla: text(o.sigla), inicio: int(o.inicio, 0) } }),
    feriados: list(data.feriados).map((m) => { const o = rec(m); return { nome: text(o.nome), data: text(o.data), cor: text(o.cor) } }),
    relogio: clock ? { horas: int(clock.horas, 12), minutos: int(clock.minutos, 60), periodos: list(clock.periodos).map(text).filter(Boolean) } : null,
  }
}

/** Texto entre aspas duplas no YAML (datas e cores, para o Obsidian e o YAML não lerem outra coisa). */
function quoted(value: string): Scalar {
  const node = new Scalar(value)
  node.type = Scalar.QUOTE_DOUBLE
  return node
}

/** Um item de lista no estilo do bloco: `- { nome: Gelo, dias: 36 }`, sem as chaves vazias. */
function flowItem(doc: Document, entries: [string, unknown][]): YAMLMap {
  const node = doc.createNode(Object.fromEntries(entries.filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false))) as YAMLMap
  node.flow = true
  return node
}

function setList(doc: Document, key: string, items: YAMLMap[]): void {
  if (!items.length) return void doc.delete(key)
  const seq = new YAMLSeq<YAMLMap>()
  seq.items.push(...items)
  doc.set(key, seq)
}

function setText(doc: Document, key: string, value: string): void {
  if (value.trim()) doc.set(key, value.trim())
  else doc.delete(key)
}

/** Grava o formulário no YAML do bloco, mexendo só nas chaves dele. */
export function applyCalendarForm(source: string, form: CalendarForm): string {
  const doc = parseDocument(source.trim() ? source : "{}")
  if (!isMap(doc.contents)) throw new CalendarError("O bloco do calendário não é um mapa YAML; edite o código.")
  if (doc.contents.flow) doc.contents.flow = false
  setText(doc, "nome", form.nome)
  setText(doc, "sigla", form.sigla)
  setText(doc, "sufixo", form.sufixo)
  setText(doc, "sufixo_negativo", form.sufixo_negativo)
  const week = doc.createNode(form.semana.map((d) => d.trim()).filter(Boolean).map((d) => (/^\d+$/.test(d) ? Number(d) : d)))
  if (isSeq(week)) week.flow = true
  if (form.semana.some((d) => d.trim())) doc.set("semana", week)
  else doc.delete("semana")
  if (form.primeiro_dia) doc.set("primeiro_dia", form.primeiro_dia)
  else doc.delete("primeiro_dia")
  setList(doc, "meses", form.meses.map((m) => flowItem(doc, [["nome", m.nome.trim()], ["dias", m.dias], ["estacao", m.estacao.trim()], ["intercalar", m.intercalar]])))
  if (doc.has("intercalares")) doc.delete("intercalares") // o atalho antigo vira um mês da lista (já lido em `meses`)
  if (form.bissexto) {
    const b = form.bissexto
    const node = flowItem(doc, [["a_cada", b.a_cada], ["exceto_a_cada", b.exceto_a_cada], ["salvo_a_cada", b.salvo_a_cada], ["mes", b.mes], ["dias", b.dias]])
    doc.set("bissexto", node)
  } else doc.delete("bissexto")
  setList(doc, "luas", form.luas.map((m) => {
    const node = flowItem(doc, [["nome", m.nome.trim()], ["ciclo", m.ciclo]])
    if (m.cheia_em.trim()) node.set("cheia_em", quoted(m.cheia_em.trim()))
    if (m.cor.trim()) node.set("cor", quoted(m.cor.trim()))
    return node
  }))
  setList(doc, "eras", form.eras.map((e) => flowItem(doc, [["nome", e.nome.trim()], ["sigla", e.sigla.trim()], ["inicio", e.inicio]])))
  setList(doc, "feriados", form.feriados.map((h) => {
    const node = flowItem(doc, [["nome", h.nome.trim()]])
    node.set("data", quoted(h.data.trim()))
    if (h.cor.trim()) node.set("cor", quoted(h.cor.trim()))
    return node
  }))
  if (form.relogio) {
    const node = flowItem(doc, [["horas", form.relogio.horas], ["minutos", form.relogio.minutos]])
    const periods = doc.createNode(form.relogio.periodos.map((p) => p.trim()).filter(Boolean))
    if (isSeq(periods)) periods.flow = true
    node.set("periodos", periods)
    doc.set("relogio", node)
  } else doc.delete("relogio")
  // O estilo dos blocos do app (e do exemplo do calendário): `{ nome: Gelo }` com espaço, `[Pedra, Raiz]` sem.
  return doc.toString({ lineWidth: 0, flowCollectionPadding: true }).replace(/\[ ([^[\]\n"]*?) \]/g, "[$1]")
}

/** O que impede de gravar (a mesma leitura do calendário na tela), ou `null`. */
export function calendarFormProblem(source: string, form: CalendarForm): string | null {
  if (!form.nome.trim()) return "Dê um nome ao calendário."
  if (!form.meses.length) return "Acrescente pelo menos um mês."
  try {
    parseCalendar(applyCalendarForm(source, form))
    return null
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

// ---------- Modelos (Novo artigo › Calendário) ----------

export type CalendarTemplate = "gregoriano" | "12x30" | "13x28" | "branco"

export const CALENDAR_TEMPLATES: { value: CalendarTemplate; label: string; hint: string }[] = [
  { value: "gregoriano", label: "Gregoriano", hint: "12 meses, 365 dias, bissexto a cada 4 anos" },
  { value: "12x30", label: "12 meses de 30", hint: "360 dias, sem bissexto" },
  { value: "13x28", label: "13 meses de 28", hint: "364 dias, semana de 7" },
  { value: "branco", label: "Em branco", hint: "você cria os meses" },
]

const WEEK_PT = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]
const GREGORIAN: [string, number, string][] = [
  ["Janeiro", 31, "Verão"], ["Fevereiro", 28, "Verão"], ["Março", 31, "Outono"], ["Abril", 30, "Outono"], ["Maio", 31, "Outono"], ["Junho", 30, "Inverno"],
  ["Julho", 31, "Inverno"], ["Agosto", 31, "Inverno"], ["Setembro", 30, "Primavera"], ["Outubro", 31, "Primavera"], ["Novembro", 30, "Primavera"], ["Dezembro", 31, "Verão"],
]

/** O formulário inicial de um modelo. */
export function calendarTemplate(kind: CalendarTemplate, name: string): CalendarForm {
  const base: CalendarForm = { nome: name, sigla: "", sufixo: "", sufixo_negativo: "", semana: [...WEEK_PT], primeiro_dia: 0, meses: [], bissexto: null, luas: [], eras: [], feriados: [], relogio: null }
  if (kind === "gregoriano") {
    // 1/1 do ano 0 do gregoriano proléptico foi um sábado.
    return { ...base, primeiro_dia: 6, meses: GREGORIAN.map(([nome, dias, estacao]) => ({ nome, dias, estacao, intercalar: false })), bissexto: { a_cada: 4, exceto_a_cada: 100, salvo_a_cada: 400, mes: "Fevereiro", dias: 1 } }
  }
  if (kind === "12x30") return { ...base, meses: Array.from({ length: 12 }, (_, i) => ({ nome: `Mês ${i + 1}`, dias: 30, estacao: "", intercalar: false })) }
  if (kind === "13x28") return { ...base, meses: Array.from({ length: 13 }, (_, i) => ({ nome: `Mês ${i + 1}`, dias: 28, estacao: "", intercalar: false })) }
  return { ...base, meses: [{ nome: "Mês 1", dias: 30, estacao: "", intercalar: false }] }
}

/** O corpo de uma nota nova de calendário: o bloco e uma linha que diz como mudar. */
export function calendarNoteBody(form: CalendarForm, today: string): string {
  const yaml = applyCalendarForm(`hoje: "${today}"\n`, form)
  return `Configure em Wiki › Calendário › Configurar.\n\n\`\`\`runas-calendario\n${yaml.trimEnd()}\n\`\`\`\n`
}

/** Dias num ano comum. */
export function yearDays(form: CalendarForm): number {
  return form.meses.reduce((sum, m) => sum + (Number.isFinite(m.dias) ? m.dias : 0), 0)
}
