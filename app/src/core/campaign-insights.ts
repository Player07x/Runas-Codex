import { resolveTarget, type CastRow, type Clock, type QuestInfo, type SecretItem, type SessionInfo } from "./campaigns"
import { noteName } from "./text"
import type { VaultIndex } from "./vault-index"

/**
 * Ideias da revisão das Campanhas que só leem o cofre: a pista que destrava uma missão, “o que mudou desde a última
 * sessão” (o recap do mestre) e os fios soltos (pontas que os jogadores já conhecem e ficaram para trás).
 */

// ---------- Pistas que destravam missões ----------

const QUEST_LINK = /\s*(?:→|->)\s*\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]\s*$/

/** `O selo é falso → [[O Selo do Conde]]` → o texto da pista e o alvo da missão. */
export function secretQuest(clean: string): { text: string; target: string } | null {
  const m = QUEST_LINK.exec(clean)
  return m ? { text: clean.slice(0, m.index).trim(), target: m[1]!.trim() } : null
}

/** A pista com a missão que ela destrava, no formato que o Obsidian mostra como link. */
export function withQuestLink(text: string, target: string): string {
  return `${text.trim()} → [[${target}]]`
}

/** A missão da pista, se ela aponta para uma missão da campanha. */
export function questOfSecret(index: VaultIndex, secret: SecretItem, quests: QuestInfo[], from: string): QuestInfo | undefined {
  const link = secretQuest(secret.clean)
  const dest = link ? resolveTarget(index, link.target, from) : null
  return dest ? quests.find((q) => q.path === dest) : undefined
}

// ---------- O que mudou desde a última sessão ----------

export interface ClockNote {
  name: string
  filled: number
  segments: number
  kind: Clock["kind"]
  /** A missão dona do relógio; sem ela, é um relógio da campanha. */
  quest?: QuestInfo
}

export interface CampaignChanges {
  since: SessionInfo
  /** Missões cuja nota mudou do dia da sessão em diante, com a situação de agora. */
  quests: QuestInfo[]
  /** Pistas reveladas na sessão. */
  revealed: SecretItem[]
  /** NPCs citados pela primeira vez na sessão. */
  newNpcs: CastRow[]
  /** Relógios a uma parte de encher, ou cheios. */
  clocks: ClockNote[]
}

const dayStart = (date: string) => new Date(`${date}T00:00:00`).getTime()

export function allClocks(campaign: Clock[], quests: QuestInfo[]): ClockNote[] {
  return [
    ...campaign.map((c) => ({ name: c.name, filled: c.filled, segments: c.segments, kind: c.kind })),
    ...quests.flatMap((q) => (q.clocks ?? []).map((c) => ({ name: c.name, filled: c.filled, segments: c.segments, kind: c.kind, quest: q }))),
  ]
}

export function changesSince(
  index: VaultIndex,
  input: { quests: QuestInfo[]; secrets: SecretItem[]; rows: CastRow[]; clocks: Clock[]; home?: string },
  last: SessionInfo,
): CampaignChanges {
  const since = last.date ? dayStart(last.date) : null
  const from = input.home ?? last.path
  return {
    since: last,
    quests: since === null ? [] : input.quests.filter((q) => (index.note(q.path)?.mtime ?? 0) >= since),
    revealed: input.secrets.filter((s) => s.done && s.revealedIn && (resolveTarget(index, s.revealedIn, from) === last.path || noteName(s.revealedIn) === last.name)),
    newNpcs: input.rows.filter((r) => r.seen[0]?.path === last.path),
    clocks: allClocks(input.clocks, input.quests).filter((c) => c.filled >= c.segments - 1),
  }
}

/** Há alguma coisa para contar? */
export const hasChanges = (c: CampaignChanges) => c.quests.length + c.revealed.length + c.newNpcs.length + c.clocks.length > 0

// ---------- Fios soltos ----------

export interface LooseThreads {
  /** Missões ativas que nenhuma das sessões recentes cita. */
  quiet: QuestInfo[]
  /** NPCs citados numa sessão só, antes das recentes. */
  vanished: CastRow[]
  /** Pistas ainda guardadas que levam a uma missão já encerrada. */
  stale: { secret: SecretItem; quest: QuestInfo }[]
}

/**
 * Pontas abertas para reaproveitar. Só olha as sessões quando já há `recent` sessões jogadas: antes disso tudo é
 * “recente” e a lista só faria barulho.
 */
export function looseThreads(
  index: VaultIndex,
  input: { quests: QuestInfo[]; sessions: SessionInfo[]; secrets: SecretItem[]; rows: CastRow[]; home?: string },
  recent = 3,
): LooseThreads {
  const played = input.sessions.filter((s) => s.status === "realizada")
  const latest = played.slice(-recent)
  const latestPaths = new Set(latest.map((s) => s.path))
  const enough = played.length >= recent
  const cited = new Set(latest.flatMap((s) => index.outgoing(s.path).map((l) => l.dest).filter((d): d is string => Boolean(d))))
  const from = input.home ?? ""
  return {
    quiet: enough ? input.quests.filter((q) => q.status === "ativa" && !cited.has(q.path)) : [],
    vanished: enough ? input.rows.filter((r) => r.seen.length === 1 && !latestPaths.has(r.seen[0]!.path)) : [],
    stale: input.secrets.flatMap((secret) => {
      if (secret.done) return []
      const quest = questOfSecret(index, secret, input.quests, from)
      return quest && (quest.status === "concluida" || quest.status === "falhou") ? [{ secret, quest }] : []
    }),
  }
}

export const hasLooseThreads = (t: LooseThreads) => t.quiet.length + t.vanished.length + t.stale.length > 0
