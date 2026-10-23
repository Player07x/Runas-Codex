import { CampaignTools } from "./CampaignTools"
import { useMemo, useRef, useState } from "react"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { useFitCount } from "../../components/kit/useFitCount"
import { CalendarDays, Check, ChevronDown, LayoutDashboard, ListTodo, MonitorPlay, Palette, Plus, ScrollText, Shapes, Users } from "lucide-react"
import { CoverBand, Crest, emblemIcon } from "../../components/kit/Emblem"
import { PersonalizeDialog } from "../../components/kit/PersonalizeDialog"
import { campaignHomePath, campaignLook } from "../../core/personalization"
import { toneStyle } from "../../core/tones"
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
import { useCreateRequest } from "../../lib/create-request"

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
  const vault = useVault()
  const [screen, setScreen] = useState(false)
  const [personalizing, setPersonalizing] = useState(false)
  const fill = section === "quadro" || (section === "sessoes" && Boolean(id))
  // ADR 0027: tudo dentro da campanha herda a cor dela (botões, abas, sessões, missões, quadro, elenco).
  const look = useMemo(() => campaignLook(vault.index!, name), [vault.index, vault.version, name])
  return (
    <div className={`campaign-page${fill ? " campaign-fill" : ""}${look.tone ? " toned" : ""}`} style={toneStyle(look.tone)}>
      <CampaignHeader name={name} current={section} onScreen={() => setScreen(true)} onPersonalize={() => setPersonalizing(true)} emblem={look.emblem} />
      {personalizing && <PersonalizeDialog title={`Personalizar ${name}`} name={name} path={campaignHomePath(name)} onClose={() => setPersonalizing(false)} />}
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

function CampaignHeader({ name, current, onScreen, onPersonalize, emblem }: { name: string; current: string; onScreen(): void; onPersonalize(): void; emblem: string | null }) {
  const Emblem = emblemIcon(emblem) ?? ScrollText
  const vault = useVault()
  const campaigns = useMemo(() => listCampaigns(vault.index!), [vault.index, vault.version])
  // As telas que não cabem vão para “Mais”, como na Wiki (rework F4c).
  const nav = useRef<HTMLElement>(null), measure = useRef<HTMLDivElement>(null)
  const fit = useFitCount(nav, measure, TABS.length)
  const shown = TABS.slice(0, fit), more = TABS.slice(fit)
  const moreCurrent = more.find((tab) => tab.id === current)
  return (
    <div className="campaign-header">
      <OverflowMenu label="Trocar de campanha" align="start" triggerClassName="btn ghost campaign-switch"
        trigger={<><Emblem size={16} color="var(--accent, var(--violet))" /><strong className="truncate">{name}</strong><ChevronDown size={15} /></>}
        items={[
          ...campaigns.map((c) => ({ label: c.name, hint: CAMPAIGN_STATUS.find((s) => s.id === c.status)?.label, icon: c.name === name ? <Check size={15} /> : <ScrollText size={15} />, onSelect: () => navigate(campaignRoute(c.name)) })),
          "separator" as const,
          { label: "Personalizar esta campanha…", icon: <Palette size={15} />, onSelect: onPersonalize, disabled: vault.info?.readOnly ?? true },
          { label: "Todas as campanhas", icon: <LayoutDashboard size={15} />, onSelect: () => navigate("/campanhas") },
        ]} />
      <select className="select mobile-space-nav" aria-label="Tela da campanha" value={current} onChange={event => navigate(campaignRoute(name, event.target.value))}>{TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select>
      <nav ref={nav} className="tabs campaign-tabs" aria-label="Telas da campanha">
        <div ref={measure} className="tabs-measure" aria-hidden="true">{TABS.map((tab) => <span key={tab.id}>{tab.icon} {tab.label}</span>)}</div>
        {shown.map((tab) => (
          <a key={tab.id} href={href(campaignRoute(name, tab.id))} className={current === tab.id ? "active" : ""} aria-current={current === tab.id ? "page" : undefined}>
            {tab.icon} {tab.label}
          </a>
        ))}
        {more.length > 0 && <OverflowMenu label="Mais telas da campanha" triggerClassName={`campaign-more ${moreCurrent ? "active" : ""}`}
          trigger={<>{moreCurrent?.icon}{moreCurrent ? moreCurrent.label : "Mais"}<ChevronDown size={14} /></>}
          items={more.map((tab) => ({ label: tab.label, icon: tab.icon, onSelect: () => navigate(campaignRoute(name, tab.id)) }))} />}
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
      return { ...c, look: campaignLook(index, c.name), sessions: sessions.length, done: sessions.filter((s) => s.status === "realizada").length, next: upcomingSession(sessions, today), players: listPlayers(index, c).length }
    })
  }, [index, vault.version])
  const create = () => (readOnly ? toast("Libere a gravação em Configurações para criar uma campanha.") : setCreating(true))
  useCreateRequest("campanha", create)
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
            <a key={c.name} className={`card link campaign-card${c.look.tone ? " toned" : ""}`} href={href(campaignRoute(c.name))} style={toneStyle(c.look.tone)}>
              <div className="campaign-card-cover">
                <CoverBand tone={c.look.tone} cover={c.look.cover} from={campaignHomePath(c.name)} height={88} className="campaign-banner" />
                <Crest tone={c.look.tone} emblem={c.look.emblem} name={c.name} size={44} />
              </div>
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
                  <span style={{ color: "var(--gold)" }}>
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
