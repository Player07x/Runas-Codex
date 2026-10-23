import { useMemo, useState } from "react"
import { useVault } from "../../platform/VaultProvider"
import { CoverBand, Crest } from "../../components/kit/Emblem"
import { campaignLook } from "../../core/personalization"
import { BarChart3, Globe } from "lucide-react"
import { worldDateText } from "../../core/calendar"
import { href, navigate } from "../../lib/router"
import { useSinglePane } from "../../lib/tabs"
import { noteRoute } from "../../lib/vault-notes"
import { NewSessionDialog } from "./campaign-dialogs"
import { campaignRoute, worldDateLabel, type CampaignData } from "./campaign-state"
import { CastCard, ClocksCard, QuestsCard, SafetyCard, SecretsCard, TimelineCard } from "./DashboardCards"
import { NextSessionCard } from "./NextSessionCard"

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
