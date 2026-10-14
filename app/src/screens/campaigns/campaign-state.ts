import { useMemo } from "react"
import { formatDate as formatWorld, parseWorldDate, type Calendar } from "../../core/calendar"
import {
  campaignInfo, campaignStats, clocksOf, listPlayers, listQuests, listSessions, secretsOf, trackedLinks, upcomingSession,
  type CampaignInfo, type CampaignStats, type Clock, type PlayerCharacter, type QuestInfo, type SecretItem, type SessionInfo, type TrackedLink,
} from "../../core/campaigns"
import { listCalendars } from "../../core/wiki"
import type { IndexedNote } from "../../core/vault-index"
import { useVault } from "../../platform/VaultProvider"

/** Rota de uma tela da campanha (`/campanhas/<nome>/<seção>/<caminho>`). */
export function campaignRoute(name: string, section = "", id?: string): string {
  return `/campanhas/${encodeURIComponent(name)}${section ? `/${section}` : ""}${id ? `/${encodeURIComponent(id)}` : ""}`
}

export const sessionRoute = (session: SessionInfo) => {
  const name = /^Campanhas\/([^/]+)\//.exec(session.path)?.[1] ?? ""
  return campaignRoute(name, "sessoes", session.path)
}

export interface CampaignData {
  campaign: CampaignInfo
  home?: IndexedNote
  data: Record<string, unknown>
  sessions: SessionInfo[]
  upcoming?: SessionInfo
  quests: QuestInfo[]
  players: PlayerCharacter[]
  npcs: TrackedLink[]
  factions: TrackedLink[]
  secrets: SecretItem[]
  clocks: Clock[] | { error: string }
  boards: string[]
  stats: CampaignStats
  /** Calendário do mundo (o primeiro bloco runas-calendario da wiki da campanha). */
  calendar: Calendar | null
  readOnly: boolean
}

/** Tudo o que as telas de uma campanha mostram, lido do índice (refeito a cada mudança no cofre). */
export function useCampaignData(name: string): CampaignData {
  const vault = useVault()
  const index = vault.index!
  const readOnly = vault.info?.readOnly ?? true
  return useMemo(() => {
    const today = new Date()
    const campaign = campaignInfo(index, name)
    const home = campaign.home ? index.note(campaign.home) : undefined
    const sessions = listSessions(index, campaign, today)
    const players = listPlayers(index, campaign)
    const calendars = listCalendars(index, campaign.wiki ? `Wikis/${campaign.wiki}/` : "Wikis/")
    const calendar = calendars.find((c): c is Extract<typeof c, { calendar: Calendar }> => "calendar" in c)?.calendar ?? null
    return {
      campaign,
      ...(home ? { home } : {}),
      data: home?.meta.frontmatter?.data ?? {},
      sessions,
      ...(upcomingSession(sessions, today) ? { upcoming: upcomingSession(sessions, today) } : {}),
      quests: listQuests(index, campaign),
      players,
      npcs: trackedLinks(index, campaign, "npcs"),
      factions: trackedLinks(index, campaign, "faccoes"),
      secrets: home ? secretsOf(home.text) : [],
      clocks: home ? clocksOf(home.text) : [],
      boards: index
        .allFiles()
        .filter((f) => f.path.startsWith(campaign.root) && f.path.toLowerCase().endsWith(".canvas"))
        .map((f) => f.path)
        .sort((a, b) => a.localeCompare(b, "pt-BR")),
      stats: campaignStats(sessions, players),
      calendar,
      readOnly,
    }
    // `version` muda a cada alteração do índice.
  }, [index, name, vault.version, readOnly])
}

/** Data do mundo por extenso, se houver calendário e a data for válida. */
export function worldDateLabel(calendar: Calendar | null, text: string | undefined): string | undefined {
  if (!text) return undefined
  const date = parseWorldDate(text)
  if (!calendar || !date) return text
  return formatWorld(calendar, date)
}

export function dayLabel(date: string | undefined, time?: string): string {
  if (!date) return "Sem data"
  const d = new Date(`${date}T${time ?? "12:00"}`)
  const day = d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })
  return time ? `${day} · ${time}` : day
}

/** "hoje", "amanhã", "em 3 dias", "há 2 dias". */
export function daysFrom(date: string | undefined, now = new Date()): string | undefined {
  if (!date) return undefined
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const diff = Math.round((day(new Date(`${date}T12:00`)) - day(now)) / 86_400_000)
  if (diff === 0) return "hoje"
  if (diff === 1) return "amanhã"
  if (diff === -1) return "ontem"
  return diff > 0 ? `em ${diff} dias` : `há ${-diff} dias`
}
