import { CampaignTools } from "./CampaignTools"
import { useMemo, useRef, useState } from "react"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { useFitCount } from "../../components/kit/useFitCount"
import { CalendarDays, Check, ChevronDown, CircleDot, ExternalLink, LayoutDashboard, ListTodo, MonitorPlay, Palette, Plus, ScrollText, Shapes, Trash2, Users, Wrench, Package } from "lucide-react"
import { CoverBand, Crest, emblemIcon } from "../../components/kit/Emblem"
import { PersonalizeDialog } from "../../components/kit/PersonalizeDialog"
import { campaignHomePath, campaignLook } from "../../core/personalization"
import { toneStyle } from "../../core/tones"
import { CAMPAIGN_STATUS, campaignContents, listCampaigns, listPlayers, listSessions, upcomingSession, type CampaignInfo } from "../../core/campaigns"
import { ConfirmDialog } from "../../components/vault/dialogs"
import { href, navigate } from "../../lib/router"
import { campaignItem, requestExport } from "../../lib/transfer-request"
import { Empty, Modal, useToast } from "../../components/ui"
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
import { forwardCreate, useCreateRequest } from "../../lib/create-request"

const TABS = [
  { id: "", label: "Painel", icon: <LayoutDashboard size={15} /> },
  { id: "sessoes", label: "Sessões", icon: <CalendarDays size={15} /> },
  { id: "missoes", label: "Missões", icon: <ListTodo size={15} /> },
  { id: "elenco", label: "Elenco", icon: <Users size={15} /> },
  { id: "ferramentas", label: "Ferramentas", icon: <Wrench size={15} /> },
  { id: "quadro", label: "Quadro", icon: <Shapes size={15} /> },
]

/** Rotas: /campanhas, /campanhas/<nome>[/sessoes[/<caminho>] | /missoes[/<caminho>] | /elenco | /quadro[/<caminho>]] */
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
  const [deleting, setDeleting] = useState(false)
  const fill = section === "quadro" || ((section === "sessoes" || section === "missoes") && Boolean(id))
  // ADR 0027: tudo dentro da campanha herda a cor dela (botões, abas, sessões, missões, quadro, elenco).
  const look = useMemo(() => campaignLook(vault.index!, name), [vault.index, vault.version, name])
  return (
    <div className={`campaign-page${fill ? " campaign-fill" : ""}${look.tone ? " toned" : ""}`} style={toneStyle(look.tone)}>
      <CampaignHeader name={name} current={section} onScreen={() => setScreen(true)} onPersonalize={() => setPersonalizing(true)} onDelete={() => setDeleting(true)} emblem={look.emblem} />
      {deleting && <DeleteCampaignDialog campaign={data.campaign} onClose={() => setDeleting(false)} onDeleted={() => navigate("/campanhas")} />}
      {personalizing && <PersonalizeDialog title={`Personalizar ${name}`} name={name} path={campaignHomePath(name)} onClose={() => setPersonalizing(false)} />}
      {section === "" && <CampaignDashboard data={data} onScreen={() => setScreen(true)} />}
      {section === "sessoes" && <SessionsView data={data} path={id} />}
      {section === "missoes" && <QuestBoard data={data} path={id} />}
      {section === "elenco" && <CastView data={data} />}
      {section === "ferramentas" && <CampaignTools data={data} />}
      {section === "quadro" && <BoardsView data={data} path={id} />}
      {screen && <StorytellerScreen data={data} onClose={() => setScreen(false)} />}
    </div>
  )
}

function CampaignHeader({ name, current, onScreen, onPersonalize, onDelete, emblem }: { name: string; current: string; onScreen(): void; onPersonalize(): void; onDelete(): void; emblem: string | null }) {
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
          "separator" as const,
          { label: "Excluir esta campanha…", icon: <Trash2 size={15} />, danger: true, onSelect: onDelete, disabled: vault.info?.readOnly ?? true },
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
      <button className="btn sm ghost campaign-screen-btn" onClick={onScreen} aria-label="Tela do Mestre" title="Notas fixadas, preparação, NPCs e relógios num lugar só">
        <MonitorPlay size={15} aria-hidden="true" /> <span className="campaign-screen-label">Tela do Mestre</span>
      </button>
    </div>
  )
}

function CampaignList() {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const [creating, setCreating] = useState(false)
  const [personalizing, setPersonalizing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<CampaignInfo | null>(null)
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
  // “+ Novo › Nota do mestre” fora de uma campanha: com uma só, vai direto às Sessões dela; com várias, pergunta.
  const [choosing, setChoosing] = useState(false)
  const gmNoteIn = (name: string) => forwardCreate("nota-mestre", campaignRoute(name, "sessoes"))
  useCreateRequest("nota-mestre", () => {
    if (readOnly) toast("Libere a gravação em Configurações para criar notas do mestre.")
    else if (campaigns.length === 0) toast("Crie uma campanha antes: a nota do mestre fica dentro dela.")
    else if (campaigns.length === 1) gmNoteIn(campaigns[0].name)
    else setChoosing(true)
  })
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow" title="Pasta Campanhas/">Espaço Campanhas</span>
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
            <CampaignCard key={c.name} campaign={c} readOnly={readOnly} onPersonalize={() => setPersonalizing(c.name)} onDelete={() => setDeleting(c)} />
          ))}
        </div>
      )}
      {creating && <NewCampaignDialog onClose={() => setCreating(false)} onCreated={(name) => navigate(campaignRoute(name))} />}
      {personalizing && <PersonalizeDialog title={`Personalizar ${personalizing}`} name={personalizing} path={campaignHomePath(personalizing)} onClose={() => setPersonalizing(null)} />}
      {deleting && <DeleteCampaignDialog campaign={deleting} onClose={() => setDeleting(null)} onDeleted={() => setDeleting(null)} />}
      {choosing && <Modal title="Nota do mestre em qual campanha?" onClose={() => setChoosing(false)} footer={<button className="btn ghost" onClick={() => setChoosing(false)}>Cancelar</button>}>
        <ul className="stack campaign-choose-list" aria-label="Campanhas">
          {campaigns.map((c) => <li key={c.name}><button type="button" className="btn campaign-choose" onClick={() => { setChoosing(false); gmNoteIn(c.name) }}>
            <ScrollText size={16} /> <span className="grow truncate">{c.name}</span> <span className="small muted">{CAMPAIGN_STATUS.find((st) => st.id === c.status)?.label}</span>
          </button></li>)}
        </ul>
      </Modal>}
    </div>
  )
}

type CardData = CampaignInfo & { look: ReturnType<typeof campaignLook>; sessions: number; done: number; next: ReturnType<typeof upcomingSession>; players: number }

/**
 * Cartão da lista: o título é o link (a área do cartão inteiro clica nele) e o “⋯” fica fora do link, por cima da
 * capa. Em coluna, com o rodapé no fim: com ou sem resumo, os cartões de uma linha terminam alinhados.
 */
function CampaignCard({ campaign: c, readOnly, onPersonalize, onDelete }: { campaign: CardData; readOnly: boolean; onPersonalize(): void; onDelete(): void }) {
  const vault = useVault()
  const toast = useToast()
  const status = CAMPAIGN_STATUS.find((s) => s.id === c.status)
  const setStatus = (id: string, label: string) => {
    if (!c.home) return
    void vault.setProperty(c.home, "status", id).then(() => toast(`${c.name}: ${label.toLowerCase()}`), (e: unknown) => toast(e instanceof Error ? e.message : String(e)))
  }
  return (
    <article className={`card campaign-card${c.look.tone ? " toned" : ""}`} style={toneStyle(c.look.tone)}>
      <div className="campaign-card-cover">
        <CoverBand tone={c.look.tone} cover={c.look.cover} from={campaignHomePath(c.name)} height={88} className="campaign-banner" />
        <Crest tone={c.look.tone} emblem={c.look.emblem} name={c.name} size={44} />
      </div>
      <div className="campaign-card-actions">
        <OverflowMenu label={`Ações da campanha ${c.name}`} triggerClassName="icon-btn campaign-card-menu" items={[
          { label: "Abrir", icon: <ExternalLink size={15} />, onSelect: () => navigate(campaignRoute(c.name)) },
          { label: "Personalizar…", icon: <Palette size={15} />, onSelect: onPersonalize, disabled: readOnly },
          { label: "Exportar campanha…", icon: <Package size={15} />, onSelect: () => requestExport({ items: [campaignItem(c.name)] }) },
          "separator" as const,
          ...CAMPAIGN_STATUS.filter((s) => s.id !== c.status).map((s) => ({ label: `Marcar como ${s.label.toLowerCase()}`, icon: <CircleDot size={15} />, onSelect: () => setStatus(s.id, s.label), disabled: readOnly || !c.home })),
          "separator" as const,
          { label: "Excluir campanha…", icon: <Trash2 size={15} />, danger: true, onSelect: onDelete, disabled: readOnly },
        ]} />
      </div>
      <div className="row between">
        <span className={`chip ${c.status === "ativa" ? "green" : c.status === "pausada" ? "gold" : ""}`}>{status?.label}</span>
        <span className="muted small row">
          <Users size={14} /> {c.players}
        </span>
      </div>
      <a className="campaign-card-title campaign-card-link" href={href(campaignRoute(c.name))}>{c.name}</a>
      {c.summary && <p className="muted small campaign-card-summary">{c.summary}</p>}
      <span className="small campaign-card-foot">
        {c.next ? (
          <span style={{ color: "var(--gold)" }}>
            Próxima: sessão {c.next.number ?? ""} {daysFrom(c.next.date) ? `· ${daysFrom(c.next.date)}` : ""}
          </span>
        ) : (
          <span className="muted">{c.done} {c.done === 1 ? "sessão jogada" : "sessões jogadas"}</span>
        )}
      </span>
    </article>
  )
}

/** Manda a pasta da campanha para a lixeira do cofre (.trash), dizendo antes o que vai junto. */
function DeleteCampaignDialog({ campaign, onClose, onDeleted }: { campaign: CampaignInfo; onClose(): void; onDeleted(): void }) {
  const vault = useVault()
  const toast = useToast()
  const contents = useMemo(() => campaignContents(vault.index!, campaign), [vault.index, vault.version, campaign])
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
  return (
    <ConfirmDialog title={`Mandar “${campaign.name}” para a lixeira?`} confirmLabel="Mandar para a lixeira" danger onClose={onClose}
      onConfirm={async () => { await vault.trash(contents.folder); toast(`“${campaign.name}” foi para a lixeira do cofre (.trash)`); onDeleted() }}>
      <p>
        A pasta <code>{contents.folder}/</code> vai inteira para a lixeira do cofre: {plural(contents.files, "arquivo", "arquivos")}, com{" "}
        {plural(contents.sessions, "sessão", "sessões")} e {plural(contents.quests, "missão", "missões")}.
      </p>
      <p className="muted campaign-delete-note">Os artigos da wiki (personagens, lugares, facções) ficam onde estão. A lixeira é a mesma do Obsidian: dá para recuperar a pasta por lá.</p>
    </ConfirmDialog>
  )
}
