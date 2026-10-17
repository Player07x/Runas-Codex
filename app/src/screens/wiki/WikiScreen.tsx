import { useState } from "react"
import { CalendarDays, ChevronDown, Eye, EyeOff, GitFork, History, Library, Map, Network, Plus } from "lucide-react"
import { newCalendarNote, newWikiNote, WIKI_ROOT } from "../../core/wiki"
import { href, navigate } from "../../lib/router"
import { Empty, useToast } from "../../components/ui"
import { NameDialog } from "../../components/vault/dialogs"
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
  { id: "ferramentas", label: "Ferramentas", icon: <Plus size={15} /> },
  { id: "grafico", label: "Gráfico", icon: <Network size={15} /> },
]

/** Rotas: /wiki, /wiki/artigo/<caminho>, /wiki/calendario[/<caminho>], /wiki/linha-do-tempo, /wiki/mapa[/<caminho>], /wiki/relacoes, /wiki/grafico */
export function WikiScreen({ route }: { route: string[] }) {
  const vault = useVault()
  const [section = "", rawId] = route
  const id = rawId ? decodeURIComponent(rawId) : undefined
  if (vault.loading && !vault.index) return <div className="page"><p className="muted">Abrindo o cofre…</p></div>
  if (!vault.index) {
    return (
      <div className="page">
        <Empty title="Nenhum cofre aberto">A wiki é uma pasta Wikis/&lt;nome&gt;/ do cofre. Abra ou crie um cofre em Configurações.</Empty>
      </div>
    )
  }
  return (
    <WikiProvider articlePath={section === "artigo" || section === "mapa" || section === "calendario" ? id : undefined}>
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
      <WikiHeader current={section === "artigo" ? "" : section} />
      {section === "" && <WikiHome />}
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
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const create = useCreateWiki()
  return (
    <div className="wiki-header">
      <div className="wiki-switcher">
        <button className="btn ghost" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Trocar de wiki">
          <Library size={16} color="var(--violet)" />
          <strong>{wiki?.name}</strong>
          <ChevronDown size={15} />
        </button>
        {open && (
          <div className="menu" onMouseLeave={() => setOpen(false)}>
            {wikis.map((w) => (
              <button
                key={w.name}
                className={`list-item ${w.name === wiki?.name ? "active" : ""}`}
                onClick={() => {
                  setWiki(w.name)
                  setOpen(false)
                  navigate("/wiki")
                }}
              >
                <Library size={15} /> <span className="grow">{w.name}</span>
                <span className="meta">{w.articles} artigos</span>
              </button>
            ))}
            <div className="divider" />
            <button
              className="list-item"
              onClick={() => {
                setOpen(false)
                if (vault.info?.readOnly) toast("Libere a gravação em Configurações para criar uma wiki.")
                else setCreating(true)
              }}
            >
              <Plus size={15} /> Nova wiki
            </button>
          </div>
        )}
      </div>
      <select className="select mobile-space-nav" aria-label="Tela da Wiki" value={current} onChange={event => navigate(`/wiki${event.target.value ? "/" + event.target.value : ""}`)}>{TABS.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}</select>
      <nav className="tabs wiki-tabs">
        {TABS.map((tab) => (
          <a key={tab.id} href={href(`/wiki${tab.id ? `/${tab.id}` : ""}`)} className={current === tab.id ? "active" : ""}>
            {tab.icon} {tab.label}
          </a>
        ))}
      </nav>
      <button className={`btn sm ${players ? "primary" : "ghost"} wiki-players`} onClick={() => setPlayers(!players)} title="Esconde os segredos do mestre (callouts [!segredo], pinos secretos)" aria-pressed={players}>
        {players ? <EyeOff size={14} /> : <Eye size={14} />} {players ? "Versão dos jogadores" : "Visão do mestre"}
      </button>
      {creating && <NameDialog title="Nova wiki" label="Nome do mundo" confirmLabel="Criar" hint="Cria Wikis/<nome>/ com a página inicial e um calendário de exemplo." onClose={() => setCreating(false)} onConfirm={create} />}
    </div>
  )
}
