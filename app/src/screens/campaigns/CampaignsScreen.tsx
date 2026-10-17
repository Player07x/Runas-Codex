import { CampaignTools } from "./CampaignTools"
import { useMemo, useState } from "react"
import { CalendarDays, ChevronDown, LayoutDashboard, ListTodo, MonitorPlay, Plus, ScrollText, Shapes, Users } from "lucide-react"
import { CAMPAIGN_STATUS, listCampaigns, listPlayers, listSessions, upcomingSession } from "../../core/campaigns"
import { href, navigate } from "../../lib/router"
import { Empty, useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { NewCampaignDialog } from "./campaign-dialogs"
import { campaignRoute, daysFrom, useCampaignData } from "./campaign-state"
import { CampaignDashboard } from "./CampaignDashboard"
import { SessionsView } from "./SessionView"
import { QuestBoard } from "./QuestBoard"
import { CastView } from "./CastView"
import { BoardsView } from "./CampaignCanvas"
import { StorytellerScreen } from "./StorytellerScreen"
import "./campaigns.css"
import "./register"

const TABS = [
  { id: "", label: "Painel", icon: <LayoutDashboard size={15} /> },
  { id: "sessoes", label: "Sessões", icon: <CalendarDays size={15} /> },
  { id: "missoes", label: "Missões", icon: <ListTodo size={15} /> },
  { id: "elenco", label: "Elenco", icon: <Users size={15} /> },
  { id: "ferramentas", label: "Ferramentas", icon: <Plus size={15} /> },
  { id: "quadro", label: "Quadro", icon: <Shapes size={15} /> },
]

/** Rotas: /campanhas, /campanhas/<nome>[/sessoes[/<caminho>] | /missoes | /elenco | /quadro[/<caminho>]] */
export function CampaignsScreen({ route }: { route: string[] }) {
  const vault = useVault()
  const [name, section = "", id] = route
  if (vault.loading && !vault.index) return <div className="page"><p className="muted">Abrindo o cofre…</p></div>
  if (!vault.index) {
    return (
      <div className="page">
        <Empty title="Nenhum cofre aberto">As campanhas ficam em Campanhas/&lt;nome&gt;/ do cofre. Abra ou crie um cofre em Configurações.</Empty>
      </div>
    )
  }
  if (!name) return <CampaignList />
  const exists = listCampaigns(vault.index).some((c) => c.name === name)
  if (!exists) {
    return (
      <div className="page">
        <Empty title="Campanha não encontrada" action={<a className="btn" href={href("/campanhas")}>Ver campanhas</a>}>
          A pasta Campanhas/{name}/ não está no cofre (foi renomeada ou apagada?).
        </Empty>
      </div>
    )
  }
  return <CampaignPage key={name} name={name} section={section} id={id} />
}

function CampaignPage({ name, section, id }: { name: string; section: string; id?: string }) {
  const data = useCampaignData(name)
  const [screen, setScreen] = useState(false)
  const fill = section === "quadro" || (section === "sessoes" && Boolean(id))
  return (
    <div className={fill ? "campaign-fill" : ""} style={data.campaign.color ? { ["--accent" as string]: data.campaign.color } : undefined}>
      <CampaignHeader name={name} current={section} onScreen={() => setScreen(true)} />
      {section === "" && <CampaignDashboard data={data} onScreen={() => setScreen(true)} />}
      {section === "sessoes" && <SessionsView data={data} path={id} />}
      {section === "missoes" && <QuestBoard data={data} />}
      {section === "elenco" && <CastView data={data} />}
      {section === "ferramentas" && <CampaignTools data={data} />}
      {section === "quadro" && <BoardsView data={data} path={id} />}
      {screen && <StorytellerScreen data={data} onClose={() => setScreen(false)} />}
    </div>
  )
}

function CampaignHeader({ name, current, onScreen }: { name: string; current: string; onScreen(): void }) {
  const vault = useVault()
  const campaigns = useMemo(() => listCampaigns(vault.index!), [vault.index, vault.version])
  const [open, setOpen] = useState(false)
  return (
    <div className="campaign-header">
      <div className="campaign-switcher">
        <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Trocar de campanha">
          <ScrollText size={16} color="var(--accent, var(--red))" />
          <strong className="truncate">{name}</strong>
          <ChevronDown size={15} />
        </button>
        {open && (
          <div className="campaign-menu" onMouseLeave={() => setOpen(false)}>
            {campaigns.map((c) => (
              <a key={c.name} className={`list-item ${c.name === name ? "active" : ""}`} href={href(campaignRoute(c.name))} onClick={() => setOpen(false)}>
                <ScrollText size={15} /> <span className="grow truncate">{c.name}</span>
                <span className="meta">{CAMPAIGN_STATUS.find((s) => s.id === c.status)?.label}</span>
              </a>
            ))}
            <div className="divider" />
            <a className="list-item" href={href("/campanhas")} onClick={() => setOpen(false)}>
              Todas as campanhas
            </a>
          </div>
        )}
      </div>
      <select className="select mobile-space-nav" aria-label="Tela da campanha" value={current} onChange={event => navigate(campaignRoute(name, event.target.value))}>{TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select>
      <nav className="tabs campaign-tabs">
        {TABS.map((tab) => (
          <a key={tab.id} href={href(campaignRoute(name, tab.id))} className={current === tab.id ? "active" : ""}>
            {tab.icon} {tab.label}
          </a>
        ))}
      </nav>
      <button className="btn sm ghost campaign-screen-btn" onClick={onScreen} title="Notas fixadas, preparação, NPCs e relógios num lugar só">
        <MonitorPlay size={15} /> Tela do Mestre
      </button>
    </div>
  )
}

function CampaignList() {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const [creating, setCreating] = useState(false)
  const readOnly = vault.info?.readOnly ?? true
  const campaigns = useMemo(() => {
    const today = new Date()
    return listCampaigns(index).map((c) => {
      const sessions = listSessions(index, c, today)
      return { ...c, sessions: sessions.length, done: sessions.filter((s) => s.status === "realizada").length, next: upcomingSession(sessions, today), players: listPlayers(index, c).length }
    })
  }, [index, vault.version])
  const create = () => (readOnly ? toast("Libere a gravação em Configurações para criar uma campanha.") : setCreating(true))
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Espaço Campanhas · Campanhas/</span>
          <h1 className="page-title">Campanhas</h1>
        </div>
        <button className="btn primary" onClick={create}>
          <Plus size={16} /> Nova campanha
        </button>
      </div>
      {campaigns.length === 0 ? (
        <Empty title="Nenhuma campanha neste cofre" action={<button className="btn primary" onClick={create}><Plus size={16} /> Criar campanha</button>}>
          Uma campanha é uma pasta em Campanhas/ com sessões, missões e um quadro. Os personagens dos jogadores e os NPCs são vinculados à wiki.
        </Empty>
      ) : (
        <div className="grid-cards">
          {campaigns.map((c) => (
            <a key={c.name} className="card link campaign-card" href={href(campaignRoute(c.name))} style={c.color ? { ["--accent" as string]: c.color } : undefined}>
              <div className="campaign-banner" />
              <div className="row between">
                <span className={`chip ${c.status === "ativa" ? "green" : c.status === "pausada" ? "gold" : ""}`}>{CAMPAIGN_STATUS.find((s) => s.id === c.status)?.label}</span>
                <span className="muted small row">
                  <Users size={14} /> {c.players}
                </span>
              </div>
              <strong className="campaign-card-title">{c.name}</strong>
              {c.summary && <p className="muted small">{c.summary}</p>}
              <span className="small">
                {c.next ? (
                  <span style={{ color: "var(--red)" }}>
                    Próxima: sessão {c.next.number ?? ""} {daysFrom(c.next.date) ? `· ${daysFrom(c.next.date)}` : ""}
                  </span>
                ) : (
                  <span className="muted">{c.done} {c.done === 1 ? "sessão jogada" : "sessões jogadas"}</span>
                )}
              </span>
            </a>
          ))}
        </div>
      )}
      {creating && <NewCampaignDialog onClose={() => setCreating(false)} onCreated={(name) => navigate(campaignRoute(name))} />}
    </div>
  )
}
