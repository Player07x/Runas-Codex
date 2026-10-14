import { useState } from "react"
import { BarChart3, Globe } from "lucide-react"
import { worldDateText } from "../../core/calendar"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { NewSessionDialog } from "./campaign-dialogs"
import { campaignRoute, worldDateLabel, type CampaignData } from "./campaign-state"
import { CastCard, ClocksCard, QuestsCard, SafetyCard, SecretsCard, TimelineCard } from "./DashboardCards"
import { NextSessionCard } from "./NextSessionCard"

export function CampaignDashboard({ data, onScreen }: { data: CampaignData; onScreen(): void }) {
  const { campaign, upcoming, stats } = data
  const [creating, setCreating] = useState(false)
  return (
    <div className="page campaign-dashboard">
      <section className="campaign-cover card">
        <div className="stack" style={{ gap: 6 }}>
          <span className="eyebrow">Campanha · {campaign.root}</span>
          <h1 className="page-title">{campaign.name}</h1>
          {campaign.summary && <p className="muted">{campaign.summary}</p>}
          <div className="row-wrap">
            {campaign.wiki && (
              <a className="chip violet" href={href("/wiki")}>
                <Globe size={12} /> {campaign.wiki}
              </a>
            )}
            {data.calendar?.today && <span className="chip gold">Hoje no mundo: {worldDateLabel(data.calendar, worldDateText(data.calendar.today))}</span>}
            {!campaign.home && <span className="chip red">Sem a nota {campaign.name}.md</span>}
          </div>
        </div>
        {campaign.home && (
          <a className="btn ghost sm" href={href(noteRoute(campaign.home))}>
            Abrir a nota da campanha
          </a>
        )}
      </section>

      <div className="campaign-top">
        <NextSessionCard data={data} session={upcoming} onNew={() => setCreating(true)} onScreen={onScreen} />
        <section className="card stack">
          <span className="section-title row">
            <BarChart3 size={15} /> Estatísticas
          </span>
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
        </section>
      </div>

      <div className="campaign-grid">
        <ClocksCard data={data} />
        <QuestsCard data={data} />
        <SecretsCard data={data} />
        <CastCard data={data} />
        <SafetyCard data={data} />
        <TimelineCard data={data} />
      </div>
      {creating && <NewSessionDialog data={data} onClose={() => setCreating(false)} onCreated={(path) => navigate(campaignRoute(campaign.name, "sessoes", path))} />}
    </div>
  )
}
