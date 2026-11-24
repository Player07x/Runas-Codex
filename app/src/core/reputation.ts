import { campaignInfo, listPlayers, reputationOf, resolveTarget, sectionRange, sectionText, setSectionText, trackedLinks, type CampaignInfo } from "./campaigns"
import type { VaultIndex } from "./vault-index"

/**
 * Reputação por jogador (24/11): cada personagem de jogador tem a própria reputação com cada NPC, facção (e, quando
 * um NPC de outra campanha virou jogador, com outro jogador). Fica só na campanha, numa seção da nota inicial que o
 * Obsidian mostra como lista de links (e que renomear uma nota atualiza):
 *
 *     ## Reputação
 *
 *     Escala: de -3 a +3
 *
 *     - [[Ilsa Brasa]] com [[Aldren Vael]]: +2
 *     - [[Ilsa Brasa]] com [[Culto de Morr]]: -1
 *
 * O número antigo da facção (`[[Culto de Morr]] (+1)`, a reputação do grupo) continua valendo para quem ainda não tem
 * valor próprio com ela.
 */

export const REPUTATION_HEADING = "Reputação"

export interface RepScale { min: number; max: number }
export const DEFAULT_SCALE: RepScale = { min: -3, max: 3 }
/** Até 10 pontos de cada lado: cabe no cartão pequeno e no celular. */
export const SCALE_LIMIT = 10
/** A escala do número antigo das facções. */
const LEGACY_SCALE: RepScale = { min: -3, max: 3 }

export interface RepEntry {
  /** O alvo do link do jogador e do personagem, como está escrito (`Ilsa Brasa`, `Personagens/Ilsa Brasa`). */
  player: string
  target: string
  value: number
}

export interface ReputationBook {
  scale: RepScale
  entries: RepEntry[]
  /** Linhas da seção que não são de reputação (anotações do mestre): voltam do jeito que estavam. */
  other: string[]
}

const MINUS = /[−–]/g
const signed = (raw: string) => Number(raw.replace(MINUS, "-").replace(/^\+/, ""))
const LINK = String.raw`\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]`
const ENTRY = new RegExp(String.raw`^\s*[-*+]\s+${LINK}\s+com\s+${LINK}\s*:\s*([+\-−–]?\d+)\s*$`)
const SCALE_LINE = /^\s*Escala\s*:\s*(?:de\s+)?([+\-−–]?\d+)\s+(?:a|até)\s+([+\-−–]?\d+)\s*\.?\s*$/i

/** A escala válida: mínimo de −10 a 0, máximo de 1 a 10. */
export function validScale(min: number, max: number): RepScale | null {
  if (!Number.isInteger(min) || !Number.isInteger(max)) return null
  if (min > 0 || min < -SCALE_LIMIT || max < 1 || max > SCALE_LIMIT) return null
  return { min, max }
}

export const clampTo = (scale: RepScale, value: number) => Math.max(scale.min, Math.min(scale.max, value))

/** Lê a seção `## Reputação` da nota (sem a seção, a escala padrão e nada marcado). */
export function parseReputation(text: string): ReputationBook {
  const body = sectionText(text, REPUTATION_HEADING)
  let scale = DEFAULT_SCALE
  const entries: RepEntry[] = []
  const other: string[] = []
  for (const line of (body ?? "").split("\n")) {
    const s = SCALE_LINE.exec(line)
    const parsed = s ? validScale(signed(s[1]!), signed(s[2]!)) : null
    if (parsed) { scale = parsed; continue }
    const m = ENTRY.exec(line)
    if (m) { entries.push({ player: m[1]!.trim(), target: m[2]!.trim(), value: signed(m[3]!) }); continue }
    other.push(line)
  }
  while (other.length && !other[0]!.trim()) other.shift()
  while (other.length && !other[other.length - 1]!.trim()) other.pop()
  return { scale, entries: entries.map((e) => ({ ...e, value: clampTo(scale, e.value) })), other }
}

export const formatPoints = (value: number) => (value > 0 ? `+${value}` : String(value))

const byName = (a: string, b: string) => a.localeCompare(b, "pt-BR")
const shortName = (target: string) => target.split("/").pop()!
/** Link com caminho leva o nome como apelido: no Obsidian aparece “Ilsa Brasa”, não a pasta inteira. */
const wikilink = (target: string) => (target.includes("/") ? `[[${target}|${shortName(target)}]]` : `[[${target}]]`)

/** Grava a seção (cria no fim da nota se não houver). A ordem: jogador, depois personagem, pelo nome. */
export function setReputation(text: string, book: ReputationBook): string {
  const entries = [...book.entries]
    .sort((a, b) => byName(shortName(a.player), shortName(b.player)) || byName(shortName(a.target), shortName(b.target)))
    .map((e) => `- ${wikilink(e.player)} com ${wikilink(e.target)}: ${formatPoints(e.value)}`)
  const lines = [`Escala: de ${formatPoints(book.scale.min)} a ${formatPoints(book.scale.max)}`, "", ...entries]
  if (book.other.length) lines.push("", ...book.other)
  return setSectionText(text, REPUTATION_HEADING, lines.join("\n"))
}

export const hasReputationSection = (text: string) => sectionRange(text, REPUTATION_HEADING) !== null

/**
 * Converte um valor de uma escala para outra pela proporção de cada lado: o zero continua neutro, +2 de +3 vira +4 de
 * +6 e +6 de +9; −2 de −3 vira −4 de −6. O resultado é arredondado (o mestre marca pontos inteiros).
 */
export function rescale(value: number, from: RepScale, to: RepScale): number {
  if (value === 0) return 0
  const ratio = value > 0 ? (from.max ? value / from.max : 0) : (from.min ? value / -from.min : 0)
  const raw = value > 0 ? ratio * to.max : ratio * -to.min
  return clampTo(to, Math.sign(raw) * Math.round(Math.abs(raw)))
}

/** A mesma reputação noutra escala (quando o mestre troca a escala da campanha). */
export function withScale(book: ReputationBook, scale: RepScale): ReputationBook {
  return { ...book, scale, entries: book.entries.map((e) => ({ ...e, value: rescale(e.value, book.scale, scale) })).filter((e) => e.value !== 0) }
}

// ---------- Valores resolvidos (caminhos das notas) ----------

export interface ResolvedReputation {
  scale: RepScale
  /** Jogador → personagem → valor marcado. */
  explicit: Map<string, Map<string, number>>
  /** Número antigo das facções (reputação do grupo), já na escala da campanha. */
  legacy: Map<string, number>
}

type Resolve = (target: string) => string | null

export function resolveReputation(book: ReputationBook, resolve: Resolve, legacy = new Map<string, number>()): ResolvedReputation {
  const explicit = new Map<string, Map<string, number>>()
  for (const e of book.entries) {
    const player = resolve(e.player) ?? e.player
    const target = resolve(e.target) ?? e.target
    const row = explicit.get(player) ?? new Map<string, number>()
    row.set(target, e.value)
    explicit.set(player, row)
  }
  return { scale: book.scale, explicit, legacy: new Map([...legacy].map(([path, value]) => [path, rescale(clampTo(LEGACY_SCALE, value), LEGACY_SCALE, book.scale)])) }
}

/** A reputação de um jogador com um personagem: a marcada, senão a antiga do grupo (facções), senão 0. */
export function reputationValue(rep: ResolvedReputation, player: string, target: string): number {
  return rep.explicit.get(player)?.get(target) ?? rep.legacy.get(target) ?? 0
}

/** Média dos jogadores escolhidos com o personagem, com uma casa depois da vírgula; `null` sem ninguém para contar. */
export function averageReputation(rep: ResolvedReputation, players: string[], target: string): number | null {
  const who = players.filter((p) => p !== target)
  if (!who.length) return null
  const sum = who.reduce((total, p) => total + reputationValue(rep, p, target), 0)
  return Math.round((sum / who.length) * 10) / 10
}

/** `+1,4`, `−2`, `0` (o sinal de menos tipográfico, a vírgula do pt-BR). */
export function formatReputation(value: number): string {
  const text = Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
  return value > 0 ? `+${text}` : value < 0 ? `−${text}` : "0"
}

/**
 * Quanto de cada ponto está pintado: do centro para fora, 1 inteiro por ponto completo e a fração no próximo
 * (1,4 → [1, 0.4, 0]). `neg[0]` e `pos[0]` são os pontos ao lado do número.
 */
export function pipFills(value: number, scale: RepScale): { neg: number[]; pos: number[] } {
  const fill = (amount: number, count: number) => Array.from({ length: count }, (_, i) => Math.max(0, Math.min(1, Math.round((amount - i) * 10) / 10)))
  return { neg: fill(value < 0 ? -value : 0, -scale.min), pos: fill(value > 0 ? value : 0, scale.max) }
}

/** Troca (ou apaga, com `null` ou 0 sem número antigo) valores; as chaves seguem as já escritas para o mesmo caminho. */
export function withValues(book: ReputationBook, changes: { player: string; target: string; value: number | null }[], resolve: Resolve, linkOf: (path: string) => string, legacy: Map<string, number> = new Map()): ReputationBook {
  const keyOf = new Map<string, string>()
  for (const e of book.entries) {
    keyOf.set(resolve(e.player) ?? e.player, e.player)
    keyOf.set(resolve(e.target) ?? e.target, e.target)
  }
  const key = (path: string) => keyOf.get(path) ?? linkOf(path)
  const same = (e: RepEntry, player: string, target: string) => (resolve(e.player) ?? e.player) === player && (resolve(e.target) ?? e.target) === target
  let entries = [...book.entries]
  for (const change of changes) {
    entries = entries.filter((e) => !same(e, change.player, change.target))
    if (change.value === null) continue
    const value = clampTo(book.scale, change.value)
    // 0 sem número antigo é o padrão: não precisa de linha.
    if (value === 0 && !legacy.has(change.target)) continue
    entries.push({ player: key(change.player), target: key(change.target), value })
  }
  return { ...book, entries }
}

// ---------- Importar de outra campanha ----------

export interface CampaignReputation {
  campaign: CampaignInfo
  scale: RepScale
  players: string[]
  /** Pares com valor diferente de zero: o marcado ou o antigo da facção. */
  pairs: { player: string; target: string; value: number }[]
}

/** A reputação de uma campanha inteira (para importar noutra), com caminhos resolvidos. */
export function campaignReputation(index: VaultIndex, name: string): CampaignReputation {
  const campaign = campaignInfo(index, name)
  const home = campaign.home ? index.note(campaign.home) : undefined
  const book = parseReputation(home?.text ?? "")
  const resolve = (target: string) => (campaign.home ? resolveTarget(index, target, campaign.home) : null)
  const factions = trackedLinks(index, campaign, "faccoes")
  const legacy = new Map(factions.filter((f) => f.dest && /[+-]?\d/.test(f.extra)).map((f) => [f.dest!, reputationOf(f.extra)]))
  const rep = resolveReputation(book, resolve, legacy)
  const players = listPlayers(index, campaign).map((p) => p.path)
  const pairs = new Map<string, { player: string; target: string; value: number }>()
  for (const player of players) for (const [target] of rep.legacy) pairs.set(`${player}>${target}`, { player, target, value: reputationValue(rep, player, target) })
  for (const [player, row] of rep.explicit) for (const [target, value] of row) pairs.set(`${player}>${target}`, { player, target, value })
  return { campaign, scale: book.scale, players, pairs: [...pairs.values()].filter((p) => p.value !== 0 && p.player !== p.target) }
}

/**
 * O que dá para importar: só os pares cujos dois personagens estão nesta campanha, com o jogador como jogador daqui.
 * O outro lado pode ser NPC, facção ou, se um NPC de lá virou jogador aqui, jogador. Os valores mudam de escala pela
 * proporção ({@link rescale}).
 */
export function importablePairs(source: CampaignReputation, players: string[], members: Set<string>, scale: RepScale): { player: string; target: string; value: number }[] {
  const here = new Set(players)
  return source.pairs
    .filter((p) => here.has(p.player) && (members.has(p.target) || here.has(p.target)) && p.player !== p.target)
    .map((p) => ({ ...p, value: rescale(p.value, source.scale, scale) }))
}
