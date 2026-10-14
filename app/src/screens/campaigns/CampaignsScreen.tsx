import { CalendarDays, LayoutDashboard, ListTodo, Plus, ScrollText, Shapes, Users } from "lucide-react"
import { CAMPAIGNS } from "../../data/campaigns"
import { TODAY } from "../../data/agenda"
import { href } from "../../lib/router"
import { formatDate, relativeDays } from "../../lib/navigation"
import { useProtoAction } from "../../components/ui"
import { CampaignDashboard } from "./CampaignDashboard"
import { SessionView } from "./SessionView"
import { QuestBoard } from "./QuestBoard"
import { CampaignCanvas } from "./CampaignCanvas"
import "./campaigns.css"

export function CampaignsScreen({ route }: { route: string[] }) {
  const [id, section, sub] = route
  const campaign = CAMPAIGNS.find((c) => c.id === id)
  if (!campaign) return <CampaignList />
  return (
    <div style={{ ["--accent" as string]: campaign.accent }}>
      <div className="wiki-header">
        <strong className="display row" style={{ whiteSpace: "nowrap" }}>
          <ScrollText size={16} color="var(--accent)" /> {campaign.title}
        </strong>
        <nav className="tabs wiki-tabs">
          <a href={href(`/campanhas/${id}`)} className={!section ? "active" : ""}>
            <LayoutDashboard size={15} /> Painel
          </a>
          <a href={href(`/campanhas/${id}/sessao/s12`)} className={section === "sessao" ? "active" : ""}>
            <CalendarDays size={15} /> Sessões
          </a>
          <a href={href(`/campanhas/${id}/missoes`)} className={section === "missoes" ? "active" : ""}>
            <ListTodo size={15} /> Missões
          </a>
          <a href={href(`/campanhas/${id}/canvas`)} className={section === "canvas" ? "active" : ""}>
            <Shapes size={15} /> Quadro
          </a>
        </nav>
      </div>
      {!section && <CampaignDashboard campaign={campaign} />}
      {section === "sessao" && <SessionView campaign={campaign} sessionId={sub ?? "s12"} />}
      {section === "missoes" && <QuestBoard campaign={campaign} />}
      {section === "canvas" && <CampaignCanvas />}
    </div>
  )
}

function CampaignList() {
  const proto = useProtoAction()
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Espaço Campanhas · Campanhas/</span>
          <h1 className="page-title">Campanhas</h1>
        </div>
        <button className="btn primary" onClick={proto("criar campanha (escolhe a wiki e cria a mesa)")}>
          <Plus size={16} /> Nova campanha
        </button>
      </div>
      <div className="grid-cards">
        {CAMPAIGNS.map((c) => {
          const next = c.sessions.find((s) => s.status === "planejada")
          const last = c.sessions.find((s) => s.status === "realizada")
          return (
            <a key={c.id} className="card link campaign-card" href={href(`/campanhas/${c.id}`)} style={{ ["--accent" as string]: c.accent }}>
              <div className="campaign-banner" />
              <div className="row between">
                <span className={`chip ${c.status === "ativa" ? "green" : c.status === "pausada" ? "gold" : ""}`}>{c.status}</span>
                <span className="muted small row">
                  <Users size={14} /> {c.players.length}
                </span>
              </div>
              <strong className="display" style={{ fontSize: 18 }}>{c.title}</strong>
              <p className="muted small">{c.summary}</p>
              <span className="small">
                {next ? (
                  <span style={{ color: "var(--red)" }}>
                    Próxima: sessão {next.number}, {relativeDays(next.date, TODAY)}
                  </span>
                ) : last ? (
                  <span className="muted">Última: sessão {last.number}, {formatDate(last.date, { day: "2-digit", month: "short", year: "numeric" })}</span>
                ) : null}
              </span>
            </a>
          )
        })}
      </div>
    </div>
  )
}
