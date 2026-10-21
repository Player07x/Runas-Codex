import { ExportDialog } from "./export/ExportDialog"
import { ResizablePanel, togglePanel } from "./ResizablePanel"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowDownUp, BookOpen, CalendarDays, ChevronRight, Dices, Ellipsis, FileText, House, Library, Moon, NotebookPen,
  Plus, ScrollText, Search, Settings, Sun, WifiOff, DoorOpen, LogIn,
  ArrowLeft, ArrowRight, Shuffle, CalendarPlus, FilePlus, BookPlus, Swords,
} from "lucide-react"
import runa from "../assets/runa.png"
import { href, navigate } from "../lib/router"
import { ALL_NOTES } from "../lib/links"
import { routeOfNote } from "../lib/navigation"
import { vaultRoute } from "../lib/vault-notes"
import { noteName } from "../core/text"
import { pageTitle } from "../core/page-title"
import { crumbsFor } from "../lib/crumbs"
import { requestCreate } from "../lib/create-request"
import { useVault } from "../platform/VaultProvider"
import { NOTES } from "../data/notes"
import { ARTICLES } from "../data/wiki"
import { CAMPAIGNS } from "../data/campaigns"
import { BOOKS } from "../data/books"
import { MESAS } from "../data/mesas"
import { Modal, useToast } from "./ui"
import { OverflowMenu } from "./kit/OverflowMenu"
import { goBack, goForward } from "../lib/router"
import { shortcutLabel, shortcutText, type ShortcutAction } from "../core/shortcuts"
import { usePreferences } from "../lib/customization"

type NavItem = { route: string; label: string; icon: ReactNode; count?: number; match: string }

export const NAV: NavItem[] = [
  { route: "/", label: "Início", icon: <House size={18} />, match: "" },
  { route: "/notas", label: "Notas", icon: <NotebookPen size={18} />, count: NOTES.length, match: "notas" },
  { route: "/agenda", label: "Agenda", icon: <CalendarDays size={18} />, count: 0, match: "agenda" },
  { route: "/wiki", label: "Wiki", icon: <Library size={18} />, count: ARTICLES.length, match: "wiki" },
  { route: "/campanhas", label: "Campanhas", icon: <ScrollText size={18} />, count: CAMPAIGNS.length, match: "campanhas" },
  { route: "/livros", label: "Livros", icon: <BookOpen size={18} />, count: BOOKS.length, match: "livros" },
  { route: "/vtt", label: "VTT", icon: <Dices size={18} />, count: MESAS.length, match: "vtt" },
]

const TOOLS: NavItem[] = [
  { route: "/transferir", label: "Importar e exportar", icon: <ArrowDownUp size={18} />, match: "transferir" },
  { route: "/config", label: "Configurações", icon: <Settings size={18} />, match: "config" },
]

const BOTTOM = ["", "notas", "agenda", "vtt"]

export function Shell({ route, theme, onToggleTheme, fill, children }: { route: string[]; theme: string; onToggleTheme: () => void; fill?: boolean; children: ReactNode }) {
  const vault = useVault()
  const [palette, setPalette] = useState(false)
  const [more, setMore] = useState(false)
  const current = route[0] ?? ""
  const crumbs = crumbsFor(route)
  const counts = useVaultCounts()
  const prefs = usePreferences()
  const announce = usePageChange(route, crumbs.map((c) => c.label))
  const readOnly = Boolean(vault.info?.readOnly)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      if ((event.ctrlKey || event.metaKey) && ["k", "p", "o"].includes(event.key.toLowerCase())) {
        event.preventDefault()
        setPalette(true)
      }
      // Ctrl+\ recolhe e expande a navegação, como nos editores de código.
      if ((event.ctrlKey || event.metaKey) && event.key === "\\") {
        event.preventDefault()
        togglePanel("navigation")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Captura rápida pelo atalho global do desktop (Ctrl+Alt+N): uma nota nova no espaço Notas.
  useEffect(() => {
    const command = (event: Event) => {
      const action = (event as CustomEvent<ShortcutAction>).detail
      if (action === "palette" || action === "switcher") setPalette(true)
      if (action === "newNote") navigate("/notas/nova")
      if (action === "daily") navigate("/notas/hoje")
      if (action === "theme") onToggleTheme()
    }
    window.addEventListener("runas-codex:comando", command)
    return () => window.removeEventListener("runas-codex:comando", command)
  }, [onToggleTheme])
  useEffect(() => vault.platform.onQuickCapture?.(() => navigate("/notas/nova")), [vault.platform])

  // “+ Novo”: as mesmas criações dos botões de cada tela, sem atalhos novos para regras que já existem lá.
  const mac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform)
  const newNoteHint = vault.platform.kind === "capacitor" ? undefined : shortcutText(shortcutLabel("newNote", prefs.shortcuts), mac)
  const create = [
    { label: "Nota", icon: <FilePlus size={16} />, hint: newNoteHint, onSelect: () => navigate("/notas/nova"), disabled: readOnly },
    { label: "Nota do dia", icon: <CalendarDays size={16} />, onSelect: () => navigate("/notas/hoje") },
    "separator" as const,
    { label: "Evento na Agenda", icon: <CalendarPlus size={16} />, onSelect: () => requestCreate("evento"), disabled: readOnly },
    { label: "Artigo da Wiki", icon: <Library size={16} />, onSelect: () => requestCreate("artigo"), disabled: readOnly },
    { label: "Campanha", icon: <Swords size={16} />, onSelect: () => requestCreate("campanha"), disabled: readOnly },
    { label: "Livro", icon: <BookPlus size={16} />, onSelect: () => requestCreate("livro"), disabled: readOnly },
  ]

  return (
    <div className="shell">
      <ResizablePanel id="navigation" label="Navegação" side="left" width={240} as="nav" className="sidebar" aria-label="Espaços" collapsedMode="rail">
        <a className="brand" href={href("/")} aria-label="Runas-Codex, início">
          <img src={runa} alt="" />
          <div>
            <strong>Runas-Codex</strong>
            <small className="truncate">Cofre: {vault.info?.name ?? "nenhum aberto"}</small>
          </div>
        </a>
        <div className="nav-group">
          {NAV.map((item) => (
            <a key={item.route} className={`nav-link ${current === item.match ? "active" : ""}`} href={href(item.route)} title={item.label} aria-label={item.label} aria-current={current === item.match ? "page" : undefined}>
              {item.icon}
              <span>{item.label}</span>
              {item.count !== undefined && <span className="count" aria-hidden="true">{counts[item.match === "vtt" ? "mesas" : item.match as keyof typeof counts] ?? 0}</span>}
            </a>
          ))}
        </div>
        <div className="nav-label">Cofre</div>
        <div className="nav-group">
          {TOOLS.map((item) => (
            <a key={item.route} className={`nav-link ${current === item.match ? "active" : ""}`} href={href(item.route)} title={item.label} aria-label={item.label} aria-current={current === item.match ? "page" : undefined}>
              {item.icon}
              <span>{item.label}</span>
            </a>
          ))}
        </div>
        <div className="sidebar-foot">
          <div className="offline-pill" title="Nenhuma chamada de rede fora da sala do VTT">
            <WifiOff size={15} aria-hidden="true" />
            <span>Offline · cofre local</span>
          </div>

        </div>
      </ResizablePanel>

      <div className="main">
        <header className="topbar">
          <nav className="crumbs" aria-label="Você está em">
            {crumbs.map((crumb, index) => (
              <span key={index} className="row" style={{ gap: 6, minWidth: 0 }}>
                {index > 0 && <ChevronRight size={14} aria-hidden="true" />}
                {crumb.to && index < crumbs.length - 1 ? <a href={href(crumb.to)}>{crumb.label}</a> : <strong aria-current="page">{crumb.label}</strong>}
              </span>
            ))}
          </nav>
          <button className="search-trigger" onClick={() => setPalette(true)} aria-label="Buscar e comandos">
            <Search size={16} />
            <span>Buscar notas e comandos…</span>
            {vault.platform.kind !== "capacitor" && <kbd>Ctrl K</kbd>}
          </button>
          <div className="top-actions">
            <OverflowMenu label="Criar" heading="Criar" items={create} triggerClassName="btn new-trigger" trigger={<><Plus size={17} /><span>Novo</span></>} />
            <button className="icon-btn" onClick={onToggleTheme} title={theme === "dark" ? "Tema claro" : "Tema escuro"} aria-label={theme === "dark" ? "Usar o tema claro" : "Usar o tema escuro"}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main id="runas-main" tabIndex={-1} className={`content ${fill ? "fill" : ""}`}>{children}</main>
        <div className="sr-only" role="status">{announce}</div>
      </div>

      <nav className="bottom-nav" aria-label="Navegação">
        {NAV.filter((item) => BOTTOM.includes(item.match)).map((item) => (
          <a key={item.route} href={href(item.route)} className={current === item.match ? "active" : ""} aria-current={current === item.match ? "page" : undefined}>
            {item.icon}
            {item.label}
          </a>
        ))}
        <button onClick={() => setMore(true)} className={!BOTTOM.includes(current) ? "active" : ""} aria-current={!BOTTOM.includes(current) ? "page" : undefined}>
          <Ellipsis size={18} />
          Mais
        </button>
      </nav>

      {more && (
        <Modal title="Mais" onClose={() => setMore(false)}>
          <div className="more-sheet" style={{ padding: 0 }}>
            {[...NAV.filter((item) => !BOTTOM.includes(item.match)), ...TOOLS].map((item) => (
              <a key={item.route} className={`nav-link ${current === item.match ? "active" : ""}`} href={href(item.route)} onClick={() => setMore(false)} aria-current={current === item.match ? "page" : undefined}>
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
      <ExportDialog />
      {palette && <CommandPalette onClose={() => setPalette(false)} onToggleTheme={onToggleTheme} />}
    </div>
  )
}

/**
 * Ao trocar de tela: título da aba (WCAG 2.4.2) e foco no título da tela nova (2.4.3), para quem usa teclado ou
 * leitor de tela não ficar no link que clicou. Dentro do mesmo espaço, quem estava no conteúdo (lista, editor)
 * continua onde está, e a troca é só anunciada.
 */
function usePageChange(route: string[], crumbs: string[]): string {
  const key = route.join("/")
  const space = route[0] ?? ""
  const title = pageTitle(crumbs)
  const [announce, setAnnounce] = useState("")
  const previous = useRef<{ key: string; space: string } | null>(null)
  useEffect(() => { document.title = title }, [title])
  useEffect(() => {
    const before = previous.current
    previous.current = { key, space }
    if (!before || before.key === key) return
    const main = document.getElementById("runas-main")
    if (before.space === space && main?.contains(document.activeElement)) {
      setAnnounce(crumbs.at(-1) ?? "")
      return
    }
    setAnnounce("")
    // Depois de os diálogos devolverem o foco (paleta, menus), para não perder a disputa.
    const frame = requestAnimationFrame(() => {
      const heading = main?.querySelector<HTMLElement>("h1")
      if (heading && !heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1")
      ;(heading ?? main)?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
    // A migalha muda junto com a rota; reagir à rota basta.
  }, [key])
  return announce
}

function CommandPalette({ onClose, onToggleTheme }: { onClose: () => void; onToggleTheme: () => void }) {
  const prefs = usePreferences()
  const dialogRef = useRef<HTMLDivElement>(null)
  useDialogFocus(dialogRef, onClose)
  const vault = useVault()
  const toast = useToast()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState(0)
  const commands = useMemo(
    () => [
      { label: "Nova nota", icon: <Plus size={16} />, hint: vault.platform.kind === "capacitor" ? "" : shortcutText(shortcutLabel("newNote", prefs.shortcuts)), run: () => navigate("/notas/nova") },
      { label: "Nota do dia", icon: <CalendarDays size={16} />, hint: "Notas", run: () => navigate("/notas/hoje") },
      { label: "Criar Sala", icon: <DoorOpen size={16} />, hint: "VTT", run: () => navigate("/vtt/criar") },
      { label: "Entrar Sala", icon: <LogIn size={16} />, hint: "VTT", run: () => navigate("/vtt/entrar") },
      { label: "Abrir agenda", icon: <CalendarDays size={16} />, hint: "", run: () => navigate("/agenda") },
      { label: "Calendário do mundo", icon: <CalendarDays size={16} />, hint: "Wiki", run: () => navigate("/wiki/calendario") },
      { label: "Gráfico da wiki", icon: <Library size={16} />, hint: "Wiki", run: () => navigate("/wiki/grafico") },
      { label: "Importar / Exportar", icon: <ArrowDownUp size={16} />, hint: "", run: () => navigate("/transferir") },
      { label: "Alternar tema", icon: <Sun size={16} />, hint: "", run: onToggleTheme },
      { label: "Voltar", icon: <ArrowLeft size={16} />, hint: vault.platform.kind === "capacitor" ? "" : "Alt ←", run: goBack },
      { label: "Avançar", icon: <ArrowRight size={16} />, hint: vault.platform.kind === "capacitor" ? "" : "Alt →", run: goForward },
      { label: "Nota aleatória", icon: <Shuffle size={16} />, hint: "Notas", run: () => navigate("/notas/aleatoria") },
      ...["Salvar nota", "Histórico de versões", "Extrair seleção para nota", "Mesclar em outra nota", "Dividir painel à direita", "Dividir painel para baixo", "Workspaces", "Lixeira do cofre", "Nova base"].map((label, index) => ({ label, icon: <FileText size={16} />, hint: "Notas", run: () => window.dispatchEvent(new CustomEvent("runas-codex:nota-acao", { detail: ["save", "history", "extract", "merge", "split-right", "split-below", "workspace", "trash", "newbase"][index] })) })),
      { label: "Alternar tarefa (Tasks)", icon: <FileText size={16} />, hint: vault.platform.kind === "capacitor" ? "Notas" : shortcutText(shortcutLabel("toggleTask", prefs.shortcuts)), run: () => window.dispatchEvent(new CustomEvent("runas-codex:nota-acao", { detail: "toggle-task" })) },
      { label: "Criar ou editar tarefa (Tasks)", icon: <FileText size={16} />, hint: vault.platform.kind === "capacitor" ? "Notas" : shortcutText(shortcutLabel("editTask", prefs.shortcuts)), run: () => window.dispatchEvent(new CustomEvent("runas-codex:nota-acao", { detail: "edit-task" })) },
    ],
    [onToggleTheme, prefs.shortcuts, vault.platform.kind],
  )
  const q = query.trim().toLocaleLowerCase("pt-BR")
  // Notas do cofre (pelo índice); no exemplo do navegador, as que têm tela própria (wiki, campanhas) abrem nela.
  const notes = useMemo(() => {
    if (!vault.index) return ALL_NOTES.filter((n) => !q || n.title.toLocaleLowerCase("pt-BR").includes(q) || n.aliases?.some((a) => a.toLocaleLowerCase("pt-BR").includes(q))).slice(0, 7).map((n) => ({ key: n.id, label: n.title, path: n.path, route: routeOfNote(n) }))
    const demo = vault.platform.kind === "memory" ? new Map(ALL_NOTES.map((n) => [n.path, n])) : null
    const paths = q ? vault.index.search(query, "", 7).map((hit) => hit.path) : vault.index.allNotes().sort((a, b) => b.mtime - a.mtime).slice(0, 7).map((n) => n.path)
    return paths.map((path) => {
      const example = demo?.get(path)
      return { key: path, label: noteName(path), path, route: example && example.space !== "notas" ? routeOfNote(example) : vaultRoute(path) }
    })
  }, [vault.index, vault.platform.kind, vault.version, q, query])
  const cmds = commands.filter((c) => !q || c.label.toLocaleLowerCase("pt-BR").includes(q))
  const canCreate = Boolean(vault.index && !vault.info?.readOnly && query.trim() && !notes.some((n) => n.label.toLocaleLowerCase("pt-BR") === q))
  const createNote = () => {
    const folder = vault.index?.allFiles().some((f) => f.path.startsWith("Notas/")) ? "Notas" : ""
    vault.createNote(folder, query.trim()).then((path) => navigate(vaultRoute(path)), (error: unknown) => toast(error instanceof Error ? error.message : String(error)))
  }
  const items = [
    ...notes.map((n) => ({ key: n.key, label: n.label, icon: <FileText size={16} />, hint: n.path.split("/").slice(0, -1).join(" › "), run: () => navigate(n.route), section: "Notas" })),
    ...(canCreate ? [{ key: "criar", label: `Criar nota “${query.trim()}”`, icon: <Plus size={16} />, hint: vault.platform.kind === "capacitor" ? "" : "Enter", run: createNote, section: "Notas" }] : []),
    ...cmds.map((c) => ({ key: c.label, ...c, section: "Comandos" })),
  ]

  const run = (index: number) => {
    items[index]?.run()
    onClose()
  }

  return (
    <div className="palette-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="palette" ref={dialogRef} tabIndex={-1} aria-modal="true" role="dialog" aria-label="Paleta de comandos">
        <div className="palette-input">
          <Search size={18} color="var(--muted)" />
          <input
            aria-label="Buscar notas e comandos"
            autoFocus
            placeholder="Buscar nota (nome, apelido, tag:, path:) ou um comando…"
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
          {items.length === 0 && <div className="palette-item muted">Nada encontrado.</div>}
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
        {vault.platform.kind !== "capacitor" && <div className="palette-foot">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span>
          <span><kbd>Enter</kbd> abrir</span>
          <span><kbd>Esc</kbd> fechar</span>
        </div>}
      </div>
    </div>
  )
}

import { useDialogFocus } from "./useDialogFocus"
import { useRef } from "react"

import { useVaultCounts } from "../lib/vault-counts"
