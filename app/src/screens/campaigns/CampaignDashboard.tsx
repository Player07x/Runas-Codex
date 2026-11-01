import { useMemo, useState } from "react"
import { useVault } from "../../platform/VaultProvider"
import { CoverBand, Crest } from "../../components/kit/Emblem"
import { campaignLook } from "../../core/personalization"
import { BarChart3, CalendarClock, Globe } from "lucide-react"
import { addDays, addMonths, worldDateText, type WorldDate } from "../../core/calendar"
import { worldDateAhead } from "../../core/world-today"
import { noteName } from "../../core/text"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import { useToast } from "../../components/ui"
import { useSetWorldToday } from "../wiki/world-today"
import { href, navigate } from "../../lib/router"
import { useSinglePane } from "../../lib/tabs"
import { noteRoute } from "../../lib/vault-notes"
import { NewSessionDialog } from "./campaign-dialogs"
import { campaignRoute, worldDateLabel, type CampaignData } from "./campaign-state"
import { CastCard, ClocksCard, QuestsCard, SafetyCard, SecretsCard, TimelineCard } from "./DashboardCards"
import { NextSessionCard, OverdueSessions } from "./NextSessionCard"
import { LooseThreadsCard } from "./CampaignInsights"

function Stats({ data: { stats } }: { data: CampaignData }) {
  return (
    <>
      <div className="campaign-stats">
        <div>
          <strong>{stats.sessionsDone}</strong>
          <span>{stats.sessionsDone === 1 ? "sessão jogada" : "sessões jogadas"}</span>
        </div>
        <div>
          <strong>{stats.hours !== undefined ? `${Math.round(stats.hours)} h` : "—"}</strong>
          <span>de jogo</span>
        </div>
        <div>
          <strong>{stats.attendance !== undefined ? `${Math.round(stats.attendance * 100)}%` : "—"}</strong>
          <span>presença</span>
        </div>
        <div>
          <strong>{stats.rating !== undefined ? stats.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "—"}</strong>
          <span>nota média</span>
        </div>
      </div>
      <span className="tiny faint">Horas pelas sessões com horário; presença e nota pelas propriedades presentes e avaliacao de cada sessão.</span>
    </>
  )
}

/**
 * “Hoje no mundo” com o menu Avançar (sobras da revisão das Campanhas): depois de uma sessão o mestre avança o
 * calendário da wiki sem sair do Painel. Grava a linha `hoje:` do calendário, como a Wiki.
 */
function WorldToday({ data }: { data: CampaignData }) {
  const toast = useToast()
  const setWorldToday = useSetWorldToday()
  const calendar = data.calendar!
  const today = calendar.today!
  const ref = data.calendarRef
  const lastPlayed = [...data.sessions].reverse().find((s) => s.status === "realizada" && s.worldDate)
  const sessionDate = lastPlayed ? worldDateAhead(calendar, lastPlayed.worldDate) : null
  const label = (date: WorldDate) => worldDateLabel(calendar, worldDateText(date))
  const go = (next: WorldDate) => {
    if (!ref) return
    setWorldToday(ref, next).then(
      () => toast(`Hoje no mundo: ${label(next)}`),
      (err: unknown) => toast(err instanceof Error ? err.message : String(err)),
    )
  }
  const week = calendar.weekdays.length || 7
  const items: MenuEntry[] = [
    { label: "Avançar 1 dia", onSelect: () => go(addDays(calendar, today, 1)), disabled: data.readOnly },
    { label: `Avançar 1 semana (${week} dias)`, onSelect: () => go(addDays(calendar, today, week)), disabled: data.readOnly },
    { label: "Avançar 1 mês", onSelect: () => go(addMonths(calendar, today, 1)), disabled: data.readOnly },
    ...(lastPlayed && sessionDate ? [{ label: `Ir para a data da ${noteName(lastPlayed.path)}`, hint: label(sessionDate), onSelect: () => go(sessionDate), disabled: data.readOnly }] : []),
    "separator",
    { label: "Abrir o calendário", onSelect: () => ref && navigate(`/wiki/calendario/${encodeURIComponent(ref.path)}`) },
  ]
  return (
    <span className="campaign-world-today">
      <span className="chip gold">Hoje no mundo: {label(today)}</span>
      {ref && <OverflowMenu label="Avançar o dia do mundo" triggerClassName="btn sm ghost" align="start" trigger={<><CalendarClock size={14} aria-hidden="true" /> Avançar</>} items={items} />}
    </span>
  )
}

export function CampaignDashboard({ data, onScreen }: { data: CampaignData; onScreen(): void }) {
  const { campaign, upcoming } = data
  const [creating, setCreating] = useState(false)
  const narrow = useSinglePane()
  const vault = useVault()
  const look = useMemo(() => campaignLook(vault.index!, campaign.name), [vault.index, vault.version, campaign.name])
  const cards = (
    <>
      <ClocksCard data={data} />
      <QuestsCard data={data} />
      <SecretsCard data={data} />
      <CastCard data={data} />
      <SafetyCard data={data} />
      <TimelineCard data={data} />
      <LooseThreadsCard data={data} />
    </>
  )
  return (
    <div className="page campaign-dashboard">
      <section className="campaign-cover card">
        {(look.cover || look.tone) && <CoverBand tone={look.tone} cover={look.cover} from={campaign.home ?? campaign.root} height={look.cover ? 140 : 56} className="campaign-cover-band" />}
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">Campanha</span>
          <h1 className="page-title row" style={{ gap: 12 }}><Crest tone={look.tone} emblem={look.emblem} name={campaign.name} size={40} /> {campaign.name}</h1>
          {campaign.summary && <p className="muted">{campaign.summary}</p>}
          <div className="row-wrap">
            {campaign.wiki && (
              <a className="chip violet" href={href("/wiki")}>
                <Globe size={12} /> {campaign.wiki}
              </a>
            )}
            {data.calendar?.today && <WorldToday data={data} />}
            {!campaign.home && <span className="chip red">Sem a nota {campaign.name}.md</span>}
          </div>
        </div>
        {campaign.home && (
          <a className="btn ghost sm" href={href(noteRoute(campaign.home))}>
            Abrir a nota da campanha
          </a>
        )}
      </section>

      <OverdueSessions data={data} />
      {narrow ? (
        // CAM-9: no celular vem primeiro o que se usa na mesa; as estatísticas ficam no fim, recolhidas.
        <div className="campaign-grid">
          <NextSessionCard data={data} session={upcoming} onNew={() => setCreating(true)} onScreen={onScreen} />
          {cards}
          <details className="card campaign-stats-card">
            <summary className="section-title row">
              <BarChart3 size={15} /> Estatísticas
            </summary>
            <Stats data={data} />
          </details>
        </div>
      ) : (
        <>
          <div className="campaign-top">
            <NextSessionCard data={data} session={upcoming} onNew={() => setCreating(true)} onScreen={onScreen} />
            <section className="card stack">
              <span className="section-title row">
                <BarChart3 size={15} /> Estatísticas
              </span>
              <Stats data={data} />
            </section>
          </div>
          <div className="campaign-grid">{cards}</div>
        </>
      )}
      {creating && <NewSessionDialog data={data} onClose={() => setCreating(false)} onCreated={(path) => navigate(campaignRoute(campaign.name, "sessoes", path))} />}
    </div>
  )
}
