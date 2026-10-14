import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowDownUp, BookOpen, CalendarDays, ChevronRight, Dices, Ellipsis, FileText, House, Library, Moon, NotebookPen,
  PanelLeftClose, PanelLeftOpen, Plus, ScrollText, Search, Settings, Sun, WifiOff, DoorOpen, LogIn,
} from "lucide-react"
import runa from "../assets/runa.png"
import { href, navigate } from "../lib/router"
import { ALL_NOTES } from "../lib/links"
import { routeOfNote } from "../lib/navigation"
import { vaultRoute } from "../lib/vault-notes"
import { useVault } from "../platform/VaultProvider"
import { NOTES } from "../data/notes"
import { ARTICLES, WIKI } from "../data/wiki"
import { CAMPAIGNS } from "../data/campaigns"
import { BOOKS } from "../data/books"
import { MESAS } from "../data/mesas"
import { EVENTS } from "../data/agenda"
import { Modal } from "./ui"
import type { Note } from "../data/types"

type NavItem = { route: string; label: string; icon: ReactNode; count?: number; match: string }

export const NAV: NavItem[] = [
  { route: "/", label: "Início", icon: <House size={18} />, match: "" },
  { route: "/notas", label: "Notas", icon: <NotebookPen size={18} />, count: NOTES.length, match: "notas" },
  { route: "/agenda", label: "Agenda", icon: <CalendarDays size={18} />, count: EVENTS.length, match: "agenda" },
  { route: "/wiki", label: "Wiki", icon: <Library size={18} />, count: ARTICLES.length, match: "wiki" },
  { route: "/campanhas", label: "Campanhas", icon: <ScrollText size={18} />, count: CAMPAIGNS.length, match: "campanhas" },
  { route: "/livros", label: "Livros", icon: <BookOpen size={18} />, count: BOOKS.length, match: "livros" },
  { route: "/vtt", label: "VTT", icon: <Dices size={18} />, count: MESAS.length, match: "vtt" },
]

const TOOLS: NavItem[] = [
  { route: "/transferir", label: "Importar / Exportar", icon: <ArrowDownUp size={18} />, match: "transferir" },
  { route: "/config", label: "Configurações", icon: <Settings size={18} />, match: "config" },
]

const BOTTOM = ["", "notas", "agenda", "vtt"]

function crumbsFor(route: string[], notes: Note[]): { label: string; to?: string }[] {
  const [first, second, third, fourth] = route
  const item = [...NAV, ...TOOLS].find((n) => n.match === (first ?? ""))
  const crumbs: { label: string; to?: string }[] = [{ label: item?.label ?? "Início", to: item?.route }]
  if (first === "notas" && second) crumbs.push({ label: notes.find((n) => n.id === second)?.title ?? second })
  if (first === "wiki") {
    crumbs.push({ label: WIKI.title, to: "/wiki" })
    const labels: Record<string, string> = { calendario: "Calendário", "linha-do-tempo": "Linha do tempo", mapa: "Mapa", relacoes: "Relações", grafico: "Gráfico" }
    if (second === "artigo") crumbs.push({ label: ARTICLES.find((a) => a.id === third)?.title ?? third })
    else if (second) crumbs.push({ label: labels[second] ?? second })
  }
  if (first === "campanhas" && second) {
    crumbs.push({ label: CAMPAIGNS.find((c) => c.id === second)?.title ?? second, to: `/campanhas/${second}` })
    const labels: Record<string, string> = { sessao: "Sessão", missoes: "Missões", canvas: "Quadro" }
    if (third) crumbs.push({ label: third === "sessao" ? `Sessão ${fourth?.replace("s", "")}` : labels[third] ?? third })
  }
  if (first === "livros" && second) crumbs.push({ label: BOOKS.find((b) => b.id === second)?.title ?? second })
  if (first === "vtt" && second) {
    const labels: Record<string, string> = { criar: "Criar Sala", entrar: "Entrar Sala", jogador: "Vista do jogador" }
    if (second === "mesa") crumbs.push({ label: "Criar Sala", to: "/vtt/criar" }, { label: MESAS.find((m) => m.id === third)?.title ?? third })
    else crumbs.push({ label: labels[second] ?? second })
  }
  return crumbs
}

export function Shell({ route, theme, onToggleTheme, fill, children }: { route: string[]; theme: string; onToggleTheme: () => void; fill?: boolean; children: ReactNode }) {
  const vault = useVault()
  const [collapsed, setCollapsed] = useState(false)
  const [palette, setPalette] = useState(false)
  const [more, setMore] = useState(false)
  const current = route[0] ?? ""
  const crumbs = crumbsFor(route, vault.notes ?? NOTES)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["k", "p", "o"].includes(event.key.toLowerCase())) {
        event.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <nav className="sidebar" aria-label="Espaços">
        <a className="brand" href={href("/")}>
          <img src={runa} alt="" />
          <div>
            <strong>Runas-Codex</strong>
            <small className="truncate">Cofre: {vault.info?.name ?? "nenhum aberto"}</small>
          </div>
        </a>
        <div className="nav-group">
          {NAV.map((item) => (
            <a key={item.route} className={`nav-link ${current === item.match ? "active" : ""}`} href={href(item.route)} title={item.label}>
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && <span className="count">{item.match === "notas" && vault.notes ? vault.notes.length : item.count}</span>}
            </a>
          ))}
        </div>
        <div className="nav-label">Cofre</div>
        <div className="nav-group">
          {TOOLS.map((item) => (
            <a key={item.route} className={`nav-link ${current === item.match ? "active" : ""}`} href={href(item.route)} title={item.label}>
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
        </div>
        <div className="sidebar-foot">
          <div className="offline-pill" title="Nenhuma chamada de rede fora da sala do VTT">
            <WifiOff size={15} />
            <span>Offline · cofre local</span>
          </div>
          <button className="nav-link" style={{ border: 0, background: "transparent" }} onClick={() => setCollapsed(!collapsed)} title="Recolher barra">
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span>Recolher</span>
          </button>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <div className="crumbs">
            {crumbs.map((crumb, index) => (
              <span key={index} className="row" style={{ gap: 6, minWidth: 0 }}>
                {index > 0 && <ChevronRight size={14} />}
                {crumb.to && index < crumbs.length - 1 ? <a href={href(crumb.to)}>{crumb.label}</a> : <strong>{crumb.label}</strong>}
              </span>
            ))}
          </div>
          <button className="search-trigger" onClick={() => setPalette(true)} aria-label="Buscar e comandos">
            <Search size={16} />
            <span>Buscar notas e comandos…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="top-actions">
            <button className="icon-btn hide-mobile" onClick={() => navigate("/notas/nova")} title="Nova nota (Ctrl N)">
              <Plus size={18} />
            </button>
            <button className="icon-btn" onClick={onToggleTheme} title={theme === "dark" ? "Tema claro" : "Tema escuro"}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main className={`content ${fill ? "fill" : ""}`}>{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Navegação">
        {NAV.filter((item) => BOTTOM.includes(item.match)).map((item) => (
          <a key={item.route} href={href(item.route)} className={current === item.match ? "active" : ""}>
            {item.icon}
            {item.label}
          </a>
        ))}
        <button onClick={() => setMore(true)} className={!BOTTOM.includes(current) ? "active" : ""}>
          <Ellipsis size={18} />
          Mais
        </button>
      </nav>

      {more && (
        <Modal title="Mais" onClose={() => setMore(false)}>
          <div className="more-sheet" style={{ padding: 0 }}>
            {[...NAV.filter((item) => !BOTTOM.includes(item.match)), ...TOOLS].map((item) => (
              <a key={item.route} className={`nav-link ${current === item.match ? "active" : ""}`} href={href(item.route)} onClick={() => setMore(false)}>
                {item.icon}
                <span>{item.label}</span>
                {item.count !== undefined && <span className="count">{item.count}</span>}
              </a>
            ))}
            <div className="offline-pill">
              <WifiOff size={15} /> Offline · cofre local
            </div>
          </div>
        </Modal>
      )}
      {palette && <CommandPalette onClose={() => setPalette(false)} onToggleTheme={onToggleTheme} />}
    </div>
  )
}

function CommandPalette({ onClose, onToggleTheme }: { onClose: () => void; onToggleTheme: () => void }) {
  const vault = useVault()
  const source = vault.notes ?? ALL_NOTES
  const routeOf = vault.notes ? vaultRoute : routeOfNote
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const commands = useMemo(
    () => [
      { label: "Nova nota", icon: <Plus size={16} />, hint: "Ctrl N", run: () => navigate("/notas/nova") },
      { label: "Criar Sala", icon: <DoorOpen size={16} />, hint: "VTT", run: () => navigate("/vtt/criar") },
      { label: "Entrar Sala", icon: <LogIn size={16} />, hint: "VTT", run: () => navigate("/vtt/entrar") },
      { label: "Abrir agenda", icon: <CalendarDays size={16} />, hint: "", run: () => navigate("/agenda") },
      { label: "Calendário do mundo", icon: <CalendarDays size={16} />, hint: "Wiki", run: () => navigate("/wiki/calendario") },
      { label: "Gráfico da wiki", icon: <Library size={16} />, hint: "Wiki", run: () => navigate("/wiki/grafico") },
      { label: "Importar / Exportar", icon: <ArrowDownUp size={16} />, hint: "", run: () => navigate("/transferir") },
      { label: "Alternar tema", icon: <Sun size={16} />, hint: "", run: onToggleTheme },
    ],
    [onToggleTheme],
  )
  const q = query.trim().toLocaleLowerCase("pt-BR")
  const notes = source.filter((n) => !q || n.title.toLocaleLowerCase("pt-BR").includes(q) || n.aliases?.some((a) => a.toLocaleLowerCase("pt-BR").includes(q))).slice(0, 7)
  const cmds = commands.filter((c) => !q || c.label.toLocaleLowerCase("pt-BR").includes(q))
  const items = [
    ...notes.map((n) => ({ key: n.id, label: n.title, icon: <FileText size={16} />, hint: n.path.split("/").slice(0, -1).join(" › "), run: () => navigate(routeOf(n)), section: "Notas" })),
    ...cmds.map((c) => ({ key: c.label, ...c, section: "Comandos" })),
  ]

  const run = (index: number) => {
    items[index]?.run()
    onClose()
  }

  return (
    <div className="palette-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="palette" role="dialog" aria-label="Paleta de comandos">
        <div className="palette-input">
          <Search size={18} color="var(--muted)" />
          <input
            autoFocus
            placeholder="Buscar nota pelo nome ou apelido, ou um comando…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSelected(0)
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") setSelected((s) => Math.min(items.length - 1, s + 1))
              if (event.key === "ArrowUp") setSelected((s) => Math.max(0, s - 1))
              if (event.key === "Enter") run(selected)
              if (event.key === "Escape") onClose()
            }}
          />
        </div>
        <div className="palette-list">
          {items.length === 0 && (
            <div className="palette-item muted">
              <Plus size={16} /> Criar nota “{query}”
            </div>
          )}
          {items.map((item, index) => (
            <div key={item.key}>
              {(index === 0 || items[index - 1].section !== item.section) && <div className="palette-section">{item.section}</div>}
              <button className={`palette-item ${index === selected ? "selected" : ""}`} onMouseEnter={() => setSelected(index)} onClick={() => run(index)}>
                {item.icon}
                <span className="truncate">{item.label}</span>
                <small className="truncate">{item.hint}</small>
              </button>
            </div>
          ))}
        </div>
        <div className="palette-foot">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd>Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  )
}
