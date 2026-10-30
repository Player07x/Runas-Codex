import { openDocumentExport } from "../../components/export/ExportDialog"
import { WikiCategory } from "./WikiCategory"
import { useRef, useState } from "react"
import { useFitCount } from "../../components/kit/useFitCount"
import { CalendarDays, Check, ChevronDown, Eye, EyeOff, FileDown, GitFork, History, Library, Map, Network, Plus, Wrench } from "lucide-react"
import { newCalendarNote, newWikiNote, WIKI_ROOT } from "../../core/wiki"
import { href, navigate } from "../../lib/router"
import { Empty, useToast } from "../../components/ui"
import { NameDialog } from "../../components/vault/dialogs"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { useVault } from "../../platform/VaultProvider"
import { WikiArticleView } from "./WikiArticle"
import { WikiCalendar } from "./WikiCalendar"
import { WikiGraph } from "./WikiGraph"
import { WikiHome } from "./WikiHome"
import { WikiMap } from "./WikiMap"
import { WikiRelations } from "./WikiRelations"
import { WikiTools } from "./WikiTools"
import { WikiTimeline } from "./WikiTimeline"
import { WikiProvider, useWiki } from "./wiki-state"
import "./register"
import "./wiki.css"

const TABS = [
  { id: "", label: "Artigos", icon: <Library size={15} /> },
  { id: "calendario", label: "Calendário", icon: <CalendarDays size={15} /> },
  { id: "linha-do-tempo", label: "Linha do tempo", icon: <History size={15} /> },
  { id: "mapa", label: "Mapas", icon: <Map size={15} /> },
  { id: "relacoes", label: "Relações", icon: <GitFork size={15} /> },
  { id: "ferramentas", label: "Ferramentas", icon: <Wrench size={15} /> },
  { id: "grafico", label: "Gráfico", icon: <Network size={15} /> },
]

/** Rotas: /wiki, /wiki/artigo/<caminho>, /wiki/calendario[/<caminho>], /wiki/linha-do-tempo, /wiki/mapa[/<caminho>], /wiki/relacoes, /wiki/grafico */
export function WikiScreen({ route }: { route: string[] }) {
  const vault = useVault()
  const [section = "", rawId] = route
  const id = rawId // O roteador já decodifica cada segmento uma vez.
  if (vault.loading && !vault.index) return <div className="page"><p className="muted">Abrindo o cofre…</p></div>
  if (!vault.index) {
    return (
      <div className="page">
        <Empty title="Nenhum cofre aberto">A wiki é uma pasta Wikis/&lt;nome&gt;/ do cofre. Abra ou crie um cofre em Configurações.</Empty>
      </div>
    )
  }
  return (
    <WikiProvider articlePath={section === "artigo" || section === "mapa" || section === "calendario" || section === "categoria" ? id : undefined}>
      <WikiBody section={section} id={id} />
    </WikiProvider>
  )
}

function WikiBody({ section, id }: { section: string; id?: string }) {
  const { wiki } = useWiki()
  const fill = section === "mapa" || section === "grafico" || section === "artigo" || section === "relacoes"
  if (!wiki) return <NoWiki />
  return (
    <div className={fill ? "wiki-fill" : ""}>
      <WikiHeader current={section === "artigo" || section === "categoria" ? "" : section} />
      {section === "" && <WikiHome />}
      {section === "categoria" && id && <WikiCategory key={`${wiki.root}:${id}`} path={id}/>}
      {section === "artigo" && id && <WikiArticleView key={id} path={id} />}
      {section === "calendario" && <WikiCalendar path={id} />}
      {section === "linha-do-tempo" && <WikiTimeline />}
      {section === "mapa" && <WikiMap path={id} />}
      {section === "relacoes" && <WikiRelations path={id} />}
      {section === "ferramentas" && <WikiTools />}
      {section === "grafico" && <WikiGraph />}
    </div>
  )
}

/** Cria `Wikis/<nome>/` com a nota inicial e um calendário de exemplo. */
function useCreateWiki() {
  const vault = useVault()
  const { setWiki } = useWiki()
  return async (name: string) => {
    const root = `${WIKI_ROOT}${name}`
    await vault.createNote(root, name, newWikiNote(name))
    await vault.createNote(`${root}/Calendários`, `Calendário de ${name}`, newCalendarNote(`Calendário de ${name}`))
    setWiki(name)
    navigate("/wiki")
  }
}

function NoWiki() {
  const vault = useVault()
  const toast = useToast()
  const [creating, setCreating] = useState(false)
  const create = useCreateWiki()
  const readOnly = vault.info?.readOnly ?? true
  return (
    <div className="page">
      <Empty
        title="Nenhuma wiki neste cofre"
        action={
          <button className="btn primary" onClick={() => (readOnly ? toast("Libere a gravação em Configurações para criar a wiki.") : setCreating(true))}>
            <Plus size={16} /> Criar wiki
          </button>
        }
      >
        Uma wiki é uma pasta em Wikis/ com artigos (personagens, lugares, organizações…), calendários do mundo, linha do tempo e mapas. Tudo continua sendo nota Markdown que o Obsidian abre.
      </Empty>
      {creating && <NameDialog title="Nova wiki" label="Nome do mundo" confirmLabel="Criar" hint="Cria Wikis/<nome>/ com a página inicial e um calendário de exemplo." onClose={() => setCreating(false)} onConfirm={create} />}
    </div>
  )
}


function WikiHeader({ current }: { current: string }) {
  const vault = useVault()
  const toast = useToast()
  const { wikis, wiki, setWiki, players, setPlayers } = useWiki()
  const [creating, setCreating] = useState(false)
  const create = useCreateWiki()
  const newWiki = () => (vault.info?.readOnly ? toast("Libere a gravação em Configurações para criar uma wiki.") : setCreating(true))
  // As telas que não cabem na fileira vão para “Mais” (rework F4b, WIK-1: a fileira não é mais cortada).
  const nav = useRef<HTMLElement>(null), measure = useRef<HTMLDivElement>(null)
  const fit = useFitCount(nav, measure, TABS.length)
  const shown = TABS.slice(0, fit), more = TABS.slice(fit)
  const moreCurrent = more.find((tab) => tab.id === current)
  const tabHref = (id: string) => href(`/wiki${id ? `/${id}` : ""}`)
  return (
    <div className="wiki-header">
      <OverflowMenu label="Trocar de wiki" align="start" triggerClassName="btn ghost wiki-switch"
        trigger={<><Library size={16} color="var(--violet)" /><strong>{wiki?.name}</strong><ChevronDown size={15} /></>}
        items={[
          ...wikis.map((w) => ({ label: w.name, hint: `${w.articles} artigos`, icon: w.name === wiki?.name ? <Check size={15} /> : <Library size={15} />, onSelect: () => { setWiki(w.name); navigate("/wiki") } })),
          "separator" as const,
          { label: "Nova wiki…", icon: <Plus size={15} />, onSelect: newWiki },
        ]} />
      <select className="select mobile-space-nav" aria-label="Tela da Wiki" value={current} onChange={event => navigate(`/wiki${event.target.value ? "/" + event.target.value : ""}`)}>{TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select>
      <nav ref={nav} className="tabs wiki-tabs" aria-label="Telas da Wiki">
        <div ref={measure} className="tabs-measure" aria-hidden="true">{TABS.map((tab) => <span key={tab.id}>{tab.icon} {tab.label}</span>)}</div>
        {shown.map((tab) => (
          <a key={tab.id} href={tabHref(tab.id)} className={current === tab.id ? "active" : ""} aria-current={current === tab.id ? "page" : undefined}>
            {tab.icon} {tab.label}
          </a>
        ))}
        {more.length > 0 && <OverflowMenu label="Mais telas da Wiki" triggerClassName={`wiki-more ${moreCurrent ? "active" : ""}`}
          trigger={<>{moreCurrent?.icon}{moreCurrent ? moreCurrent.label : "Mais"}<ChevronDown size={14} /></>}
          items={more.map((tab) => ({ label: tab.label, icon: tab.icon, onSelect: () => navigate(`/wiki${tab.id ? `/${tab.id}` : ""}`) }))} />}
      </nav>
      <button className={`btn sm ${players ? "primary" : "ghost"} wiki-players`} onClick={() => setPlayers(!players)} title="Esconde os segredos do mestre (callouts [!segredo], pinos secretos)" aria-pressed={players}>
        {players ? <EyeOff size={14} /> : <Eye size={14} />} {players ? "Versão dos jogadores" : "Visão do mestre"}
      </button>
      <OverflowMenu label="Ações da wiki" items={[
        { label: "Exportar wiki…", icon: <FileDown size={15} />, onSelect: () => openDocumentExport({ paths: vault.index!.notesIn(wiki!.root).map(note => note.path), title: wiki!.name, players }) },
        { label: "Nova wiki…", icon: <Plus size={15} />, onSelect: newWiki },
      ]} />
      {creating && <NameDialog title="Nova wiki" label="Nome do mundo" confirmLabel="Criar" hint="Cria Wikis/<nome>/ com a página inicial e um calendário de exemplo." onClose={() => setCreating(false)} onConfirm={create} />}
    </div>
  )
}
