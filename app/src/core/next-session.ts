import { AGENDA_ROOT, expandEvents, parseEvent, type AgendaEvent, type Occurrence } from "./agenda"
import { campaignNameOf, listCampaigns, listSessions, resolveTarget, type SessionInfo } from "./campaigns"
import type { VaultIndex } from "./vault-index"

/**
 * A próxima sessão, de uma fonte só (INI-1, rework F5): o Início, o painel da campanha e a Tela do Mestre perguntam
 * aqui e recebem a mesma resposta. Entram as sessões planejadas das campanhas (pela data da nota) e os eventos de sessão
 * da Agenda; um evento ligado a uma sessão conta uma vez só. Vence a mais próxima; sessão sem data fica por último.
 */

export interface NextSession {
  /** Nome da campanha (pasta em `Campanhas/`), se o evento ou a sessão for de uma. */
  campaign: string | null
  /** A nota da sessão, quando existe. */
  session: SessionInfo | null
  /** O evento da Agenda, quando existe. */
  event: Occurrence | null
  /** Quando começa; `null` para uma sessão planejada sem data. */
  when: Date | null
  allDay: boolean
  title: string
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const strip = (path: string) => path.replace(/\.md$/i, "")
const isSessionEvent = (e: AgendaEvent) => Boolean(e.session) || e.countdown || /^sess/i.test(e.category ?? "")

/** Os eventos de `Agenda/`. */
export function vaultEvents(index: VaultIndex): AgendaEvent[] {
  return index.notesIn(AGENDA_ROOT).map((n) => parseEvent(n.path, n.text)).filter((e): e is AgendaEvent => e !== null)
}

export interface SessionLinks {
  /** Sessões de cada campanha. */
  sessions: Map<string, SessionInfo[]>
  /** Evento da Agenda (sem `.md`) → sessão que aponta para ele. */
  byEvent: Map<string, { campaign: string; session: SessionInfo }>
}

export function sessionLinks(index: VaultIndex, today: Date): SessionLinks {
  const sessions = new Map<string, SessionInfo[]>()
  const byEvent = new Map<string, { campaign: string; session: SessionInfo }>()
  for (const c of listCampaigns(index)) {
    const list = listSessions(index, c, today)
    sessions.set(c.name, list)
    for (const s of list) if (s.event) byEvent.set(strip(s.event), { campaign: c.name, session: s })
  }
  return { sessions, byEvent }
}

/**
 * De qual campanha é um evento: pela sessão que ele liga (`sessao`), pela sessão que aponta para ele (`evento`) ou,
 * sem ligação, pelo título que a campanha dá aos eventos de sessão (“Sessão 13 — As Cinzas de Valdris”).
 */
export function campaignOfEvent(index: VaultIndex, event: AgendaEvent, links: SessionLinks): { campaign: string | null; session: SessionInfo | null } {
  if (event.session) {
    const path = resolveTarget(index, event.session, event.path)
    const campaign = path ? campaignNameOf(path) : null
    if (path && campaign) return { campaign, session: links.sessions.get(campaign)?.find((s) => s.path === path) ?? null }
  }
  const linked = links.byEvent.get(strip(event.path))
  if (linked) return linked
  if (isSessionEvent(event)) for (const name of links.sessions.keys()) if (event.title.endsWith(` — ${name}`)) return { campaign: name, session: null }
  return { campaign: null, session: null }
}

export function nextSession(index: VaultIndex, now: Date, onlyCampaign?: string): NextSession | null {
  const links = sessionLinks(index, now)
  const today = isoDay(now)
  const candidates: NextSession[] = []
  const covered = new Set<string>()

  // Eventos de sessão da Agenda que ainda não terminaram.
  const events = vaultEvents(index).filter(isSessionEvent)
  for (const occurrence of expandEvents(events, new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 400 * 86_400_000))) {
    if (occurrence.end <= now) continue
    const { campaign, session } = campaignOfEvent(index, occurrence.event, links)
    if (onlyCampaign && campaign !== onlyCampaign) continue
    if (session && session.status !== "planejada") continue
    if (session) covered.add(session.path)
    candidates.push({ campaign, session, event: occurrence, when: occurrence.start, allDay: occurrence.event.allDay, title: session?.title ?? occurrence.event.title })
  }

  // Sessões planejadas de hoje em diante (ou sem data) que nenhum evento cobriu.
  for (const [campaign, list] of links.sessions) {
    if (onlyCampaign && campaign !== onlyCampaign) continue
    for (const s of list) {
      if (s.status !== "planejada" || covered.has(s.path) || (s.date && s.date < today)) continue
      const when = s.date ? new Date(`${s.date}T${s.time ?? "00:00"}`) : null
      candidates.push({ campaign, session: s, event: null, when, allDay: Boolean(s.date && !s.time), title: s.title })
    }
  }

  return candidates.sort((a, b) => (a.when?.getTime() ?? Infinity) - (b.when?.getTime() ?? Infinity))[0] ?? null
}

/** CAM-1: sessões marcadas como planejadas cuja data já passou (pedem “realizada”, “cancelada” ou outra data). */
export function overdueSessions(sessions: SessionInfo[], now: Date): SessionInfo[] {
  const today = isoDay(now)
  return sessions.filter((s) => s.status === "planejada" && s.date && s.date < today)
}
