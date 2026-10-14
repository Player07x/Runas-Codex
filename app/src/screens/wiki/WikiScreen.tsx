import { useState } from "react"
import { CalendarDays, ChevronDown, GitFork, History, Library, Map, Network } from "lucide-react"
import { href } from "../../lib/router"
import { WIKI, WIKIS } from "../../data/wiki"
import { WikiHome } from "./WikiHome"
import { WikiArticleView } from "./WikiArticle"
import { WikiCalendar } from "./WikiCalendar"
import { WikiTimeline } from "./WikiTimeline"
import { WikiMap } from "./WikiMap"
import { WikiGraph } from "./WikiGraph"
import { WikiRelations } from "./WikiRelations"
import { useProtoAction } from "../../components/ui"
import "./wiki.css"

const TABS = [
  { id: "", label: "Artigos", icon: <Library size={15} /> },
  { id: "calendario", label: "Calendário", icon: <CalendarDays size={15} /> },
  { id: "linha-do-tempo", label: "Linha do tempo", icon: <History size={15} /> },
  { id: "mapa", label: "Mapa", icon: <Map size={15} /> },
  { id: "relacoes", label: "Relações", icon: <GitFork size={15} /> },
  { id: "grafico", label: "Gráfico", icon: <Network size={15} /> },
]

export function WikiScreen({ route }: { route: string[] }) {
  const [section, id] = route
  if (section === "artigo" && id) return <WikiArticleView articleId={id} />
  const current = section ?? ""
  const fill = current === "mapa" || current === "grafico"
  return (
    <div className={fill ? "wiki-fill" : ""}>
      <WikiHeader current={current} />
      {current === "" && <WikiHome />}
      {current === "calendario" && <WikiCalendar />}
      {current === "linha-do-tempo" && <WikiTimeline />}
      {current === "mapa" && <WikiMap />}
      {current === "relacoes" && <WikiRelations />}
      {current === "grafico" && <WikiGraph />}
    </div>
  )
}

function WikiHeader({ current }: { current: string }) {
  const proto = useProtoAction()
  const [open, setOpen] = useState(false)
  return (
    <div className="wiki-header">
      <div className="wiki-switcher">
        <button className="btn ghost" onClick={() => setOpen(!open)}>
          <Library size={16} color="var(--violet)" />
          <strong>{WIKI.title}</strong>
          <ChevronDown size={15} />
        </button>
        {open && (
          <div className="menu" onMouseLeave={() => setOpen(false)}>
            {WIKIS.map((w) => (
              <button key={w.id} className="list-item" onClick={proto(`trocar para a wiki “${w.title}”`)}>
                <Library size={15} /> <span className="grow">{w.title}</span>
                <span className="meta">{w.path}</span>
              </button>
            ))}
            <div className="divider" />
            <button className="list-item" onClick={proto("criar outra wiki")}>+ Nova wiki</button>
          </div>
        )}
      </div>
      <nav className="tabs wiki-tabs">
        {TABS.map((tab) => (
          <a key={tab.id} href={href(`/wiki${tab.id ? `/${tab.id}` : ""}`)} className={current === tab.id ? "active" : ""}>
            {tab.icon} {tab.label}
          </a>
        ))}
      </nav>
    </div>
  )
}
