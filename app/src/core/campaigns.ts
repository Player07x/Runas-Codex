import { parse as parseYaml, stringify as stringifyYaml } from "yaml"
import { parseEvent } from "./agenda"
import { findCodeBlocks, replaceCodeBlock } from "./codeblocks"
import { maskNonContent, parseFrontmatter, type LinkRef } from "./parse"
import { noteName } from "./text"
import type { IndexedNote, VaultIndex } from "./vault-index"

/**
 * Campanhas (etapa 7): cada campanha é uma pasta `Campanhas/<nome>/` com uma nota inicial `<nome>.md`
 * (`tipo: campanha`). Sessões e missões são notas comuns, achadas pelo `tipo` ou pela pasta. Personagens e NPCs
 * moram na wiki: a campanha guarda os vínculos dos personagens e a atitude dos NPCs
 * (`npcs: ["[[Aldren Vael]] (aliado)"]`, o mesmo formato das relações da wiki). Segredos são uma checklist, relógios
 * são um bloco ` ```runas-relogios `. Tudo continua sendo Markdown que o Obsidian abre.
 */

export const CAMPAIGN_ROOT = "Campanhas/"

export type CampaignStatus = "ativa" | "pausada" | "concluida"
export const CAMPAIGN_STATUS: { id: CampaignStatus; label: string }[] = [
  { id: "ativa", label: "Ativa" },
  { id: "pausada", label: "Pausada" },
  { id: "concluida", label: "Concluída" },
]

export interface CampaignInfo {
  name: string
  /** `Campanhas/<nome>/` */
  root: string
  /** Nota inicial (`Campanhas/<nome>/<nome>.md`), se existir. */
  home?: string
  status: CampaignStatus
  summary?: string
  /** Nome da wiki do mundo (`wiki: Ordem x Caos` ou um link para uma nota dela). */
  wiki?: string
  /** Id da mesa do VTT (`mesa`). */
  mesa?: string
  color?: string
}

// ---------- Utilitários ----------

const fold = (text: string) => text.normalize("NFC").toLocaleLowerCase("pt-BR")

function dataOf(note: IndexedNote | undefined): Record<string, unknown> {
  return note?.meta.frontmatter?.data ?? {}
}

function str(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined
  if (typeof value === "number") return String(value)
  return undefined
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value.replace(",", ".")))) return Number(value.replace(",", "."))
  return undefined
}

/** Valores de uma propriedade como lista (texto ou lista). */
export function listValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => v !== null && v !== undefined).map(String)
  if (typeof value === "string" && value.trim()) return [value]
  return []
}

/** `"[[Alvo|apelido]] (extra)"` → alvo e o texto depois do link (sem parênteses). */
export function linkItem(value: string): { target: string; extra: string } | null {
  const m = /^\s*\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]\s*(.*)$/.exec(value)
  if (!m) return null
  return { target: m[1]!.trim(), extra: m[2]!.replace(/^\(|\)$/g, "").trim() }
}

export function resolveTarget(index: VaultIndex, target: string, from: string): string | null {
  const link: LinkRef = { kind: "wiki", embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: true }
  return index.resolve(link, from).dest
}

/** Título da nota: o primeiro `# título`, ou o nome do arquivo. */
export function noteTitle(note: IndexedNote): string {
  const h1 = note.meta.headings.find((h) => h.level === 1)
  return h1?.text ?? note.name
}

// ---------- Campanhas ----------

export function campaignRootOf(path: string): string | null {
  const m = /^(Campanhas\/[^/]+\/)/.exec(path)
  return m ? m[1]! : null
}

export function campaignNameOf(path: string): string | null {
  const m = /^Campanhas\/([^/]+)\//.exec(path)
  return m ? m[1]! : null
}

function campaignStatus(value: unknown): CampaignStatus {
  const s = fold(String(value ?? ""))
  if (s.startsWith("paus")) return "pausada"
  if (s.startsWith("conclu") || s.startsWith("encerr") || s.startsWith("termin")) return "concluida"
  return "ativa"
}

/** `wiki: Mundo`, `wiki: "[[Wikis/Mundo/Mundo]]"` ou `"[[Mundo]]"` → `Mundo`. */
function wikiNameOf(index: VaultIndex, value: unknown, from: string): string | undefined {
  const link = linkItem(String(value ?? ""))
  if (!link) return str(value)?.replace(/^Wikis\//, "").replace(/\/.*$/, "")
  const dest = resolveTarget(index, link.target, from) ?? link.target
  return /^Wikis\/([^/]+)/.exec(dest)?.[1] ?? (dest.includes("/") ? undefined : dest)
}

export function campaignInfo(index: VaultIndex, name: string): CampaignInfo {
  const root = `${CAMPAIGN_ROOT}${name}/`
  const homePath = `${root}${name}.md`
  const home = index.note(homePath)
  const data = dataOf(home)
  const wiki = wikiNameOf(index, data.wiki, homePath)
  return {
    name,
    root,
    ...(home ? { home: homePath } : {}),
    status: campaignStatus(data.status),
    ...(str(data.resumo) ? { summary: str(data.resumo) } : {}),
    ...(wiki ? { wiki } : {}),
    ...(str(data.mesa) ? { mesa: str(data.mesa) } : {}),
    ...(str(data.cor) ? { color: str(data.cor) } : {}),
  }
}

/** As campanhas do cofre: cada subpasta de `Campanhas/` com pelo menos um arquivo. */
export function listCampaigns(index: VaultIndex): CampaignInfo[] {
  const names = new Set<string>()
  for (const file of index.allFiles()) {
    const name = campaignNameOf(file.path)
    if (name) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR")).map((name) => campaignInfo(index, name))
}

const isType = (note: IndexedNote, types: string[]) => types.includes(fold(String(dataOf(note).tipo ?? "")))
const inFolder = (note: IndexedNote, root: string, folders: RegExp) => folders.test(note.path.slice(root.length))

// ---------- Seções e tarefas de uma nota ----------

const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\]\s+)(.*)$/

/** Linhas [início, fim) do corpo da seção `## título` (sem a linha do título), ou `null`. */
export function sectionRange(text: string, heading: string): { headingLine: number; start: number; end: number } | null {
  const lines = text.split("\n")
  const masked = maskNonContent(text).split("\n")
  const fm = parseFrontmatter(text)
  const first = fm ? text.slice(0, fm.end).split("\n").length - 1 : 0
  let found: { line: number; level: number } | null = null
  for (let i = first; i < lines.length; i++) {
    const m = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*\r?$/.exec(masked[i]!)
    if (!m) continue
    const level = m[1]!.length
    if (found && level <= found.level) return { headingLine: found.line, start: found.line + 1, end: i }
    if (!found && fold(m[2]!.trim()) === fold(heading)) found = { line: i, level }
  }
  return found ? { headingLine: found.line, start: found.line + 1, end: lines.length } : null
}

/** Texto do corpo de uma seção (sem o título), sem as linhas em branco das pontas. */
export function sectionText(text: string, heading: string): string | null {
  const range = sectionRange(text, heading)
  if (!range) return null
  return text
    .split("\n")
    .slice(range.start, range.end)
    .map((l) => l.replace(/\r$/, ""))
    .join("\n")
    .trim()
}

/** Troca o corpo da seção (cria a seção no fim se não existir), mantendo as quebras de linha do arquivo. */
export function setSectionText(text: string, heading: string, body: string): string {
  const eol = /\r\n/.test(text) ? "\r\n" : "\n"
  const content = body.trim() ? body.trim().split(/\r?\n/) : []
  const range = sectionRange(text, heading)
  if (!range) return [text.replace(/(\r?\n)*$/, ""), "", `## ${heading}`, "", ...content].join(eol) + eol
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const after = lines.slice(range.end)
  // Uma linha em branco depois do título e outra antes do próximo título.
  const middle = after.length ? ["", ...content, ...(content.length ? [""] : [])] : ["", ...content]
  const result = [...lines.slice(0, range.start), ...middle, ...after].join(eol)
  return after.length ? result : result.replace(/(\r?\n)*$/, "") + eol
}

/** Acrescenta uma linha no fim da seção (cria a seção se não existir). */
export function appendToSection(text: string, heading: string, line: string): string {
  const current = sectionText(text, heading)
  return setSectionText(text, heading, current ? `${current}\n${line}` : line)
}

export interface TaskLine {
  /** Linha no arquivo (0 = primeira). */
  line: number
  text: string
  done: boolean
}

/** Tarefas `- [ ]` dentro de uma seção. */
export function sectionTasks(text: string, heading: string): TaskLine[] {
  const range = sectionRange(text, heading)
  if (!range) return []
  const lines = text.split("\n")
  const masked = maskNonContent(text).split("\n")
  const tasks: TaskLine[] = []
  for (let i = range.start; i < range.end; i++) {
    const m = TASK.exec(masked[i]!.replace(/\r$/, ""))
    if (m) tasks.push({ line: i, text: lines[i]!.replace(/\r$/, "").replace(TASK, "$4"), done: m[2] !== " " })
  }
  return tasks
}

/** Troca o texto (e, se pedido, a marca) da tarefa da linha `line`, sem mexer no resto do arquivo. */
export function setTaskLine(text: string, line: number, value: { text?: string; done?: boolean }): string {
  const lines = text.split("\n")
  const current = lines[line]
  const cr = current?.endsWith("\r") ? "\r" : ""
  const m = current !== undefined ? TASK.exec(current.replace(/\r$/, "")) : null
  if (!m) throw new Error("A tarefa mudou de lugar; recarregue a nota.")
  const done = value.done ?? m[2] !== " "
  lines[line] = `${m[1]}${done ? "x" : " "}${m[3]}${(value.text ?? m[4]!).replace(/\r?\n/g, " ")}${cr}`
  return lines.join("\n")
}

// ---------- Sessões ----------

export type SessionStatus = "planejada" | "realizada" | "cancelada"
export const SESSION_STATUS: { id: SessionStatus; label: string }[] = [
  { id: "planejada", label: "Planejada" },
  { id: "realizada", label: "Realizada" },
  { id: "cancelada", label: "Cancelada" },
]

/** Roteiro de preparação (método "Lazy DM"): vira a checklist `## Preparação` da sessão. */
export const PREP_STEPS = ["Recapitulação", "Início forte", "Cenas possíveis", "Segredos e pistas", "Locais", "NPCs", "Recompensas"] as const
export const PREP_HEADING = "Preparação"
export const NOTES_HEADING = "Anotações"
export const SUMMARY_HEADING = "O que aconteceu"

export interface PrepItem extends TaskLine {
  /** O nome do passo (`**Início forte**`), se houver. */
  label?: string
  /** O texto depois do nome. */
  detail: string
}

export interface SessionInfo {
  path: string
  name: string
  number: number | null
  title: string
  status: SessionStatus
  /** Data real `AAAA-MM-DD`. */
  date?: string
  time?: string
  endTime?: string
  /** Nota do evento na Agenda. */
  event?: string | null
  worldDate?: string
  /** Personagens presentes (caminhos resolvidos; alvo do link se não existir). */
  present: string[]
  rating?: number
  summary: string
  prep: PrepItem[]
}

export function prepItems(text: string): PrepItem[] {
  return sectionTasks(text, PREP_HEADING).map((task) => {
    const m = /^\*\*(.+?)\*\*\s*(?:[—–:-]\s*)?(.*)$/.exec(task.text)
    return m ? { ...task, label: m[1]!.trim(), detail: m[2]!.trim() } : { ...task, detail: task.text.trim() }
  })
}

/** Grava o texto de um passo da preparação, mantendo o nome em negrito e a marca. */
export function setPrepDetail(text: string, item: PrepItem, detail: string): string {
  const clean = detail.replace(/\s*\r?\n\s*/g, " ").trim()
  const value = item.label ? `**${item.label}**${clean ? ` — ${clean}` : ""}` : clean
  return setTaskLine(text, item.line, { text: value })
}

function sessionStatus(value: unknown, date: string | undefined, today: string): SessionStatus {
  const s = fold(String(value ?? ""))
  if (s.startsWith("realiz") || s.startsWith("feita") || s.startsWith("jogad")) return "realizada"
  if (s.startsWith("cancel")) return "cancelada"
  if (s.startsWith("plan")) return "planejada"
  // Sem status: a data decide (as notas criadas pela Agenda não têm `status`).
  return date && date < today ? "realizada" : "planejada"
}

const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export function isSessionNote(note: IndexedNote, root: string): boolean {
  return isType(note, ["sessao", "sessão"]) || inFolder(note, root, /^Sess[õo]es\//i)
}

export function sessionInfo(index: VaultIndex, note: IndexedNote, today: Date): SessionInfo {
  const data = dataOf(note)
  const date = str(data.data)?.slice(0, 10)
  const eventTarget = linkItem(String(data.evento ?? ""))?.target
  // Sem `evento`, vale o evento da Agenda que aponta para a sessão (`sessao: "[[…]]"`).
  const event = eventTarget
    ? resolveTarget(index, eventTarget, note.path)
    : index.backlinks(note.path).find((b) => b.from.startsWith("Agenda/") && b.links.some((l) => l.link.inFrontmatter))?.from
  const eventInfo = event ? parseEvent(event, index.note(event)?.text ?? "") : null
  const number = num(data.numero) ?? num(/sess[ãa]o\s+(\d+)/i.exec(note.name)?.[1])
  return {
    path: note.path,
    name: note.name,
    number: number ?? null,
    title: noteTitle(note),
    status: sessionStatus(data.status, date ?? eventInfo?.date, isoDay(today)),
    ...(date ?? eventInfo?.date ? { date: date ?? eventInfo!.date } : {}),
    ...((str(data.hora) ?? eventInfo?.startTime) ? { time: str(data.hora) ?? eventInfo?.startTime } : {}),
    ...((str(data.hora_fim) ?? eventInfo?.endTime) ? { endTime: str(data.hora_fim) ?? eventInfo?.endTime } : {}),
    ...(event !== undefined ? { event } : {}),
    ...(str(data.data_mundo) ? { worldDate: str(data.data_mundo) } : {}),
    present: listValue(data.presentes).flatMap((item) => {
      const link = linkItem(item)
      return link ? [resolveTarget(index, link.target, note.path) ?? link.target] : []
    }),
    ...(num(data.avaliacao) !== undefined ? { rating: num(data.avaliacao) } : {}),
    summary: sectionText(note.text, SUMMARY_HEADING) ?? "",
    prep: prepItems(note.text),
  }
}

function compareSessions(a: SessionInfo, b: SessionInfo): number {
  if (a.number !== null && b.number !== null && a.number !== b.number) return a.number - b.number
  if ((a.date ?? "") !== (b.date ?? "")) return (a.date ?? "9999").localeCompare(b.date ?? "9999")
  return a.name.localeCompare(b.name, "pt-BR", { numeric: true })
}

export function listSessions(index: VaultIndex, campaign: CampaignInfo, today: Date): SessionInfo[] {
  return index
    .notesIn(campaign.root)
    .filter((note) => isSessionNote(note, campaign.root))
    .map((note) => sessionInfo(index, note, today))
    .sort(compareSessions)
}

/** A próxima sessão planejada (a de data mais próxima, de hoje em diante; sem data, a de menor número). */
export function upcomingSession(sessions: SessionInfo[], today: Date): SessionInfo | undefined {
  const day = isoDay(today)
  const planned = sessions.filter((s) => s.status === "planejada" && (!s.date || s.date >= day))
  return planned.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || compareSessions(a, b))[0]
}

export function previousSession(sessions: SessionInfo[], session: SessionInfo): SessionInfo | undefined {
  const done = sessions.filter((s) => s.status === "realizada" && s.path !== session.path && compareSessions(s, session) < 0)
  return done[done.length - 1]
}

export function nextSessionNumber(sessions: SessionInfo[]): number {
  return Math.max(0, ...sessions.map((s) => s.number ?? 0)) + 1
}

// ---------- Missões ----------

export type QuestStatus = "ideia" | "ativa" | "pausada" | "concluida" | "falhou"
export const QUEST_STATUS: { id: QuestStatus; label: string; color: string }[] = [
  { id: "ideia", label: "Ideias", color: "violet" },
  { id: "ativa", label: "Ativas", color: "cyan" },
  { id: "pausada", label: "Em pausa", color: "gold" },
  { id: "concluida", label: "Concluídas", color: "green" },
  { id: "falhou", label: "Falharam", color: "red" },
]

export interface QuestInfo {
  path: string
  title: string
  status: QuestStatus
  order: string
  giver?: { target: string; dest: string | null }
  reward?: string
  tags: string[]
}

function questStatus(value: unknown): QuestStatus {
  const s = fold(String(value ?? ""))
  if (s.startsWith("ide") || s.startsWith("gancho")) return "ideia"
  if (s.startsWith("paus")) return "pausada"
  if (s.startsWith("conclu") || s.startsWith("feita") || s.startsWith("complet")) return "concluida"
  if (s.startsWith("falh") || s.startsWith("fracass")) return "falhou"
  return "ativa"
}

export function isQuestNote(note: IndexedNote, root: string): boolean {
  return isType(note, ["missao", "missão"]) || inFolder(note, root, /^Miss[õo]es\//i)
}

/** Ordem narrativa (`1`, `1.1`, `2`, `10`): compara número a número. */
export function compareOrder(a: string, b: string): number {
  const pa = a.split(".").map(Number)
  const pb = b.split(".").map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? -1
    const y = pb[i] ?? -1
    if (Number.isNaN(x) || Number.isNaN(y)) return a.localeCompare(b, "pt-BR", { numeric: true })
    if (x !== y) return x - y
  }
  return 0
}

export function listQuests(index: VaultIndex, campaign: CampaignInfo): QuestInfo[] {
  return index
    .notesIn(campaign.root)
    .filter((note) => isQuestNote(note, campaign.root))
    .map((note) => {
      const data = dataOf(note)
      const giver = linkItem(String(data.contratante ?? ""))
      const giverText = str(data.contratante)
      return {
        path: note.path,
        title: noteTitle(note),
        status: questStatus(data.status),
        order: str(data.ordem) ?? "",
        ...(giver ? { giver: { target: giver.target, dest: resolveTarget(index, giver.target, note.path) } } : giverText ? { giver: { target: giverText, dest: null } } : {}),
        ...(str(data.recompensa) ? { reward: str(data.recompensa) } : {}),
        tags: listValue(data.tags),
      }
    })
    .sort((a, b) => compareOrder(a.order || "999", b.order || "999") || a.title.localeCompare(b.title, "pt-BR"))
}

// ---------- Personagens dos jogadores ----------

export interface PlayerCharacter {
  path: string
  name: string
  player?: string
  concept?: string
  color?: string
}

export function isPlayerNote(note: IndexedNote, root: string): boolean {
  return isType(note, ["personagem-jogador", "pj", "jogador"]) || inFolder(note, root, /^Personagens\//i)
}

export function listPlayers(index: VaultIndex, campaign: CampaignInfo): PlayerCharacter[] {
  const links = dataOf(campaign.home ? index.note(campaign.home) : undefined).personagens
  // Sem a propriedade, mantém os perfis antigos. Uma lista vazia significa nenhum vínculo.
  const entries = links === undefined
    ? index.notesIn(campaign.root).filter((note) => isPlayerNote(note, campaign.root)).map((note) => ({ note, player: str(dataOf(note).jogador) }))
    : listValue(links).flatMap((value) => {
      const link = linkItem(value)
      const path = link && campaign.home ? resolveTarget(index, link.target, campaign.home) : null
      const note = path ? index.note(path) : undefined
      return note && link ? [{ note, player: str(link.extra) }] : []
    })
  const seen = new Set<string>()
  return entries.filter(({ note }) => {
    if (seen.has(note.path)) return false
    seen.add(note.path)
    return true
  }).map(({ note, player }) => {
    const data = dataOf(note)
    return {
      path: note.path,
      name: noteTitle(note),
      ...(player ? { player } : {}),
      ...(str(data.conceito) ? { concept: str(data.conceito) } : {}),
      ...(str(data.cor) ? { color: str(data.cor) } : {}),
    }
  })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

/** Atualiza só o vínculo na campanha; `null` desvincula e preserva a nota e as presenças antigas. */
export function withCampaignPlayer(index: VaultIndex, campaign: CampaignInfo, path: string, player: string | null): string[] {
  if (!campaign.home) throw new Error("Falta a nota inicial da campanha.")
  const current = dataOf(index.note(campaign.home)).personagens
  // Converte a lista antiga em vínculos explícitos na primeira edição, sem mover arquivos.
  const links = current === undefined
    ? listPlayers(index, campaign).map((p) => `[[${p.path.replace(/\.md$/i, "")}]]${p.player ? ` (${p.player})` : ""}`)
    : listValue(current)
  const remaining = links.filter((value) => {
    const link = linkItem(value)
    return !link || resolveTarget(index, link.target, campaign.home!) !== path
  })
  if (player !== null) remaining.push(`[[${path.replace(/\.md$/i, "")}]]${player.trim() ? ` (${player.trim()})` : ""}`)
  return remaining
}

// ---------- NPCs e facções (atitude/reputação ao lado do link) ----------

export const ATTITUDES = ["aliado", "amigável", "neutro", "desconfiado", "hostil"] as const

export interface TrackedLink {
  /** Posição na lista da propriedade. */
  position: number
  target: string
  dest: string | null
  /** Texto entre parênteses depois do link (atitude, reputação). */
  extra: string
}

export function trackedLinks(index: VaultIndex, campaign: CampaignInfo, key: "npcs" | "faccoes"): TrackedLink[] {
  if (!campaign.home) return []
  const data = dataOf(index.note(campaign.home))
  return listValue(data[key]).flatMap((item, position) => {
    const link = linkItem(item)
    return link ? [{ position, target: link.target, dest: resolveTarget(index, link.target, campaign.home!), extra: link.extra }] : []
  })
}

/** A lista da propriedade com o item `position` trocado (`[[alvo]] (extra)`), ou acrescentado se `position` < 0. */
export function withTrackedLink(current: unknown, position: number, target: string, extra: string): string[] {
  const list = listValue(current)
  const value = `[[${target}]]${extra.trim() ? ` (${extra.trim()})` : ""}`
  if (position < 0 || position >= list.length) return [...list, value]
  return list.map((item, i) => (i === position ? value : item))
}

export function withoutPosition(current: unknown, position: number): string[] {
  return listValue(current).filter((_, i) => i !== position)
}

export interface NpcSighting {
  /** A última sessão (pela ordem das sessões) que cita o NPC. */
  lastSeen?: SessionInfo
  mentions: number
}

/** Onde o NPC apareceu: sessões da campanha que têm link para a nota dele. */
export function npcSightings(index: VaultIndex, dest: string | null, sessions: SessionInfo[]): NpcSighting {
  if (!dest) return { mentions: 0 }
  const from = new Set(index.backlinks(dest).map((b) => b.from))
  const seen = sessions.filter((s) => from.has(s.path))
  return { ...(seen.length ? { lastSeen: seen[seen.length - 1] } : {}), mentions: seen.length }
}

/** Reputação `+2`, `-1`, `0` no texto entre parênteses. */
export function reputationOf(extra: string): number {
  const m = /([+-]?\d+)/.exec(extra)
  return m ? Math.max(-3, Math.min(3, Number(m[1]))) : 0
}

// ---------- Segredos e pistas ----------

export const SECRETS_HEADING = "Segredos e pistas"

export interface SecretItem extends TaskLine {
  /** Alvo do link "revelado em [[…]]", se houver. */
  revealedIn?: string
  /** O texto sem o "revelado em". */
  clean: string
}

const REVEALED = /\s*[—–-]\s*revelad[oa] (?:em|na|no) \[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*$/i

export function secretsOf(text: string): SecretItem[] {
  return sectionTasks(text, SECRETS_HEADING).map((task) => {
    const m = REVEALED.exec(task.text)
    return { ...task, clean: task.text.replace(REVEALED, "").trim(), ...(m ? { revealedIn: m[1]!.trim() } : {}) }
  })
}

/** Marca o segredo como revelado (com a sessão, se houver) ou volta a guardá-lo. */
export function setSecretRevealed(text: string, item: SecretItem, revealed: boolean, sessionTarget?: string): string {
  const value = revealed && sessionTarget ? `${item.clean} — revelado em [[${sessionTarget}]]` : item.clean
  return setTaskLine(text, item.line, { text: value, done: revealed })
}

// ---------- Relógios ----------

export interface Clock {
  name: string
  segments: number
  filled: number
  kind: "ameaca" | "progresso"
}

export const CLOCK_BLOCK = "runas-relogios"

export function parseClocks(content: string): Clock[] {
  const data = parseYaml(content) as unknown
  if (data === null || data === undefined) return []
  if (!Array.isArray(data)) throw new Error("O bloco runas-relogios precisa ser uma lista.")
  return data.map((raw, i) => {
    const item = (raw ?? {}) as Record<string, unknown>
    const segments = Math.max(2, Math.min(12, Math.round(num(item.segmentos) ?? 4)))
    return {
      name: str(item.nome) ?? `Relógio ${i + 1}`,
      segments,
      filled: Math.max(0, Math.min(segments, Math.round(num(item.preenchidos) ?? 0))),
      kind: fold(String(item.tipo ?? "")).startsWith("prog") ? "progresso" : "ameaca",
    }
  })
}

export function clocksYaml(clocks: Clock[]): string {
  if (!clocks.length) return "[]"
  return clocks
    .map((c) => `- ${stringifyYaml({ nome: c.name, segmentos: c.segments, preenchidos: c.filled, tipo: c.kind }, { collectionStyle: "flow", lineWidth: 0 }).trim()}`)
    .join("\n")
}

export function clocksOf(text: string): Clock[] | { error: string } {
  const block = findCodeBlocks(text, CLOCK_BLOCK)[0]
  if (!block) return []
  try {
    return parseClocks(block.content)
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** Grava os relógios no bloco (cria o bloco no fim da nota, numa seção `## Relógios`, se não houver). */
export function setClocks(text: string, clocks: Clock[]): string {
  const block = findCodeBlocks(text, CLOCK_BLOCK)[0]
  if (block) return replaceCodeBlock(text, block, clocksYaml(clocks))
  const eol = /\r\n/.test(text) ? "\r\n" : "\n"
  return `${text.replace(/(\r?\n)*$/, "")}${eol}${eol}## Relógios${eol}${eol}\`\`\`${CLOCK_BLOCK}${eol}${clocksYaml(clocks).split("\n").join(eol)}${eol}\`\`\`${eol}`
}

// ---------- Estatísticas ----------

export interface CampaignStats {
  sessionsDone: number
  sessionsPlanned: number
  /** Presença média nas sessões realizadas que registraram presença (0–1). */
  attendance?: number
  rating?: number
  /** Horas jogadas (sessões realizadas com horário de início e fim). */
  hours?: number
}

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number)
  return h! * 60 + (m ?? 0)
}

export function campaignStats(sessions: SessionInfo[], players: PlayerCharacter[]): CampaignStats {
  const done = sessions.filter((s) => s.status === "realizada")
  const withPresence = done.filter((s) => s.present.length)
  const rated = done.filter((s) => s.rating !== undefined)
  const timed = done.filter((s) => s.time && s.endTime)
  const hours = timed.reduce((sum, s) => sum + ((minutes(s.endTime!) - minutes(s.time!) + 1440) % 1440) / 60, 0)
  return {
    sessionsDone: done.length,
    sessionsPlanned: sessions.filter((s) => s.status === "planejada").length,
    ...(players.length && withPresence.length ? { attendance: withPresence.reduce((sum, s) => sum + Math.min(1, s.present.length / players.length), 0) / withPresence.length } : {}),
    ...(rated.length ? { rating: rated.reduce((sum, s) => sum + s.rating!, 0) / rated.length } : {}),
    ...(timed.length ? { hours } : {}),
  }
}

// ---------- Notas novas ----------

const q = (value: string) => JSON.stringify(value)

export function newCampaignNote(name: string, options: { wiki?: string; summary?: string } = {}): string {
  const lines = ["---", "tipo: campanha", "status: ativa"]
  if (options.summary) lines.push(`resumo: ${q(options.summary)}`)
  if (options.wiki) lines.push(`wiki: ${q(options.wiki)}`)
  lines.push("npcs: []", "faccoes: []", "linhas: []", "veus: []", "fixadas: []", "---")
  return `${lines.join("\n")}
# ${name}

${options.summary ?? "Do que trata a campanha, o tom e o que os jogadores já sabem."}

## ${SECRETS_HEADING}

- [ ] Um segredo que os jogadores podem descobrir.

## Relógios

\`\`\`${CLOCK_BLOCK}
- { nome: Ameaça principal, segmentos: 6, preenchidos: 0, tipo: ameaca }
\`\`\`
`
}

export interface NewSession {
  number: number
  title?: string
  date?: string
  time?: string
  endTime?: string
  /** Caminho da nota do evento (sem `.md`). */
  event?: string
  worldDate?: string
  present?: string[]
}

export function sessionFileName(number: number): string {
  return `Sessão ${number}`
}

export function newSessionNote(session: NewSession): string {
  const lines = ["---", "tipo: sessao", `numero: ${session.number}`, "status: planejada"]
  if (session.date) lines.push(`data: ${q(session.date)}`)
  if (session.time) lines.push(`hora: ${q(session.time)}`)
  if (session.endTime) lines.push(`hora_fim: ${q(session.endTime)}`)
  if (session.event) lines.push(`evento: ${q(`[[${session.event}]]`)}`)
  if (session.worldDate) lines.push(`data_mundo: ${q(session.worldDate)}`)
  lines.push(`presentes: [${(session.present ?? []).map((p) => q(`[[${p}]]`)).join(", ")}]`, "---")
  const title = `Sessão ${session.number}${session.title ? ` — ${session.title}` : ""}`
  return `${lines.join("\n")}
# ${title}

## ${PREP_HEADING}

${PREP_STEPS.map((step) => `- [ ] **${step}**`).join("\n")}

## ${NOTES_HEADING}

## ${SUMMARY_HEADING}
`
}

export function newQuestNote(title: string, options: { status?: QuestStatus; order?: string; giver?: string; reward?: string } = {}): string {
  const lines = ["---", "tipo: missao", `status: ${options.status ?? "ativa"}`]
  if (options.order) lines.push(`ordem: ${q(options.order)}`)
  if (options.giver) lines.push(`contratante: ${q(options.giver.startsWith("[[") ? options.giver : `[[${options.giver}]]`)}`)
  if (options.reward) lines.push(`recompensa: ${q(options.reward)}`)
  lines.push("---")
  return `${lines.join("\n")}\n# ${title}\n\n## Objetivos\n\n- [ ] \n\n## Pistas\n`
}

export function newPlayerNote(name: string, options: { player?: string; concept?: string } = {}): string {
  const lines = ["---", "tipo: personagem-jogador"]
  if (options.player) lines.push(`jogador: ${q(options.player)}`)
  if (options.concept) lines.push(`conceito: ${q(options.concept)}`)
  lines.push("---")
  return `${lines.join("\n")}\n# ${name}\n\n## Antecedentes\n\n## Ganchos pessoais\n`
}

/** Nome de arquivo livre na pasta (acrescenta 2, 3… se já existir). */
export function uniqueNoteName(index: VaultIndex, folder: string, base: string): string {
  const taken = new Set(index.allFiles().filter((f) => f.path.startsWith(`${folder}/`) && !f.path.slice(folder.length + 1).includes("/")).map((f) => fold(noteName(f.path))))
  for (let n = 1; ; n++) {
    const name = n > 1 ? `${base} ${n}` : base
    if (!taken.has(fold(name))) return name
  }
}

// ---------- Tela inicial ----------

export interface NextCampaignSession {
  campaign: CampaignInfo
  session: SessionInfo
  players: PlayerCharacter[]
}

/**
 * A sessão que a tela inicial mostra: a do próximo evento de sessão da Agenda (`sessao: "[[…]]"`), ou, sem ele, a
 * próxima sessão planejada de qualquer campanha.
 */
export function nextCampaignSession(index: VaultIndex, today: Date, agenda?: { session?: string; from: string }): NextCampaignSession | null {
  let path = agenda?.session ? resolveTarget(index, agenda.session, agenda.from) : null
  if (!path || !index.note(path) || !campaignNameOf(path)) {
    const upcoming = listCampaigns(index).flatMap((c) => {
      const s = upcomingSession(listSessions(index, c, today), today)
      return s ? [s] : []
    })
    path = upcoming.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))[0]?.path ?? null
  }
  const note = path ? index.note(path) : undefined
  const name = path ? campaignNameOf(path) : null
  if (!note || !name) return null
  const campaign = campaignInfo(index, name)
  return { campaign, session: sessionInfo(index, note, today), players: listPlayers(index, campaign) }
}

// ---------- Exportar ----------

/** Links do Obsidian viram texto (fora do cofre não há para onde apontar): `[[a/b#c|d]]` → `d`, `[[a/b]]` → `b`. */
export function flattenLinks(text: string): string {
  return text.replace(/!?\[\[([^\]|]*?)(?:\|([^\]]*))?\]\]/g, (_, target: string, alias?: string) => alias?.trim() || noteName(target.split("#")[0]!.trim() || target.replace(/^#\^?/, "")))
}

/**
 * Diário da campanha em Markdown (exportar): as sessões realizadas em ordem, com a data real, a data no mundo e o
 * "O que aconteceu" de cada uma. `worldLabel` escreve a data fictícia por extenso (calendário da wiki).
 */
export function campaignJournal(campaign: CampaignInfo, sessions: SessionInfo[], worldLabel: (date: string) => string = (d) => d): string {
  const parts = [`# Diário — ${campaign.name}`]
  if (campaign.summary) parts.push(flattenLinks(campaign.summary))
  const done = sessions.filter((s) => s.status === "realizada")
  if (!done.length) parts.push("_Nenhuma sessão realizada ainda._")
  for (const s of done) {
    const when = [s.date ? s.date.split("-").reverse().join("/") : "", s.worldDate ? `no mundo: ${worldLabel(s.worldDate)}` : ""].filter(Boolean).join(" · ")
    parts.push(`## ${flattenLinks(s.title)}`)
    if (when) parts.push(`*${when}*`)
    parts.push(s.summary.trim() ? flattenLinks(s.summary.trim()) : "_Sem resumo._")
  }
  return `${parts.join("\n\n")}\n`
}
