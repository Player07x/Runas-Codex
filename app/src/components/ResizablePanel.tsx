import { createPortal } from "react-dom"
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from "react"
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react"
import "./resizable-panel.css"

/** Pede a um painel que recolha ou expanda (atalhos de teclado e botões de outras barras). */
export const TOGGLE_PANEL_EVENT = "runas-codex:alternar-painel"
export const togglePanel = (id: string) => window.dispatchEvent(new CustomEvent<string>(TOGGLE_PANEL_EVENT, { detail: id }))
/** Recolhe ou expande um painel de vez (pedir duas vezes dá o mesmo resultado, ao contrário de alternar). */
export const SET_PANEL_EVENT = "runas-codex:definir-painel"
export const setPanelCollapsed = (id: string, collapsed: boolean): void => { window.dispatchEvent(new CustomEvent<{ id: string; collapsed: boolean }>(SET_PANEL_EVENT, { detail: { id, collapsed } })) }

const media = (query: string) => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query) : null)

/**
 * Botão “Painel” das telas com painel ao lado do texto (artigo da Wiki, sessão de campanha). No computador ele recolhe
 * e expande o próprio painel; na janela estreita (até `narrowAt` px) o painel vira uma camada sobre o texto, aberta
 * pelo mesmo botão e fechada também pelo botão de recolher da barra do painel. Passe `onCollapsedChange` ao painel.
 */
export function usePanelToggle(id: string, narrowAt = 1100) {
  const query = `(max-width: ${narrowAt}px)`
  const narrow = useSyncExternalStore(
    (listener) => { const list = media(query); list?.addEventListener("change", listener); return () => list?.removeEventListener("change", listener) },
    () => Boolean(media(query)?.matches),
    () => false,
  )
  const [overlay, setOverlay] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const show = (open: boolean) => {
    // Aberto da camada: o painel guardado como recolhido no computador apareceria vazio.
    if (open) setPanelCollapsed(id, false)
    setOverlay(open)
    // Na camada o foco entra no painel ao abrir e volta ao botão Painel ao fechar.
    requestAnimationFrame(() => {
      const panel = document.querySelector<HTMLElement>(`[data-panel-id="${id}"]`)
      const target = open ? panel?.querySelector<HTMLElement>(`[data-panel-control="${id}"] button`) : panel?.parentElement?.querySelector<HTMLElement>(".doc-panel")
      target?.focus()
    })
  }
  return {
    /** Classe `show-panel` da camada na janela estreita. */
    overlay,
    /** Para o `aria-expanded` do botão Painel. */
    expanded: narrow ? overlay : !collapsed,
    toggle: () => (narrow ? show(!overlay) : togglePanel(id)),
    close: () => show(false),
    onCollapsedChange: (value: boolean) => {
      setCollapsed(value)
      if (value && overlay) show(false)
    },
  }
}

/**
 * Painel lateral redimensionável e recolhível: o mesmo controle em todas as telas (ADR 0026). A barra do painel
 * mostra o nome dele e um botão de recolher; recolhido, vira uma faixa estreita (ou um trilho de ícones, na
 * navegação). Preferências locais; arrastar altera só o espaço do painel, nunca os dados do cofre.
 */
export function ResizablePanel({ id, label, side = "right", width = 300, maxWidth = 600, as: Tag = "aside", className = "", children, hidden, controlsTarget, defaultCollapsed = false, reveal = false, collapsedMode = "hide", onCollapsedChange }: {
  id: string; label: string; side?: "left" | "right"; width?: number; as?: "aside" | "nav" | "section"; className?: string; children: ReactNode; hidden?: boolean; controlsTarget?: HTMLElement | null; defaultCollapsed?: boolean; reveal?: boolean
  /** Largura máxima ao arrastar (a prévia das páginas do livro pede mais que os painéis de lista). */
  maxWidth?: number
  /** `rail`: recolhido, mostra só os ícones (navegação principal). */
  collapsedMode?: "hide" | "rail"
  /** Avisa quando o painel abre ou fecha (também ao montar), para quem só quer desenhar o conteúdo aberto. */
  onCollapsedChange?(collapsed: boolean): void
}) {
  const key = `runas-codex:painel:${id}`
  const [prefs, setPrefs] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) ?? "null"); return { width: Math.min(maxWidth, Math.max(180, Number(saved?.width) || width)), collapsed: saved ? saved.collapsed === true : defaultCollapsed } }
    catch { return { width, collapsed: defaultCollapsed } }
  })
  useEffect(() => { if (reveal) setPrefs(p => ({ ...p, collapsed: false })) }, [reveal])
  useEffect(() => {
    const toggle = (event: Event) => { if ((event as CustomEvent<string>).detail === id) setPrefs(p => ({ ...p, collapsed: !p.collapsed })) }
    const set = (event: Event) => { const { detail } = event as CustomEvent<{ id: string; collapsed: boolean }>; if (detail.id === id) setPrefs(p => ({ ...p, collapsed: detail.collapsed })) }
    window.addEventListener(TOGGLE_PANEL_EVENT, toggle)
    window.addEventListener(SET_PANEL_EVENT, set)
    return () => { window.removeEventListener(TOGGLE_PANEL_EVENT, toggle); window.removeEventListener(SET_PANEL_EVENT, set) }
  }, [id])
  const ref = useRef<HTMLElement>(null)
  const drag = useRef<{ x: number; width: number } | null>(null)
  const collapsedWidth = controlsTarget ? 0 : collapsedMode === "rail" ? 68 : 44
  const collapsedChange = useRef(onCollapsedChange)
  collapsedChange.current = onCollapsedChange
  useEffect(() => { collapsedChange.current?.(prefs.collapsed) }, [prefs.collapsed])
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    parent?.style.setProperty(`--panel-${id}`, `${prefs.collapsed ? collapsedWidth : prefs.width}px`)
    try { localStorage.setItem(key, JSON.stringify(prefs)) } catch { /* preferência opcional */ }
    return () => { parent?.style.removeProperty(`--panel-${id}`) }
  }, [prefs, id, key, collapsedWidth])
  function resize(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const available = ref.current?.parentElement?.clientWidth ?? window.innerWidth
    const next = drag.current.width + (event.clientX - drag.current.x) * (side === "left" ? 1 : -1)
    setPrefs({ collapsed: false, width: Math.max(180, Math.min(maxWidth, available - 260, next)) })
  }
  const Icon = side === "left" ? (prefs.collapsed ? PanelLeftOpen : PanelLeftClose) : (prefs.collapsed ? PanelRightOpen : PanelRightClose)
  const action = `${prefs.collapsed ? "Expandir" : "Recolher"} ${label}`
  const toggle = () => setPrefs(p => ({ ...p, collapsed: !p.collapsed }))
  // Painéis com o botão em outra barra (Livros) mantêm o nome no botão; os demais têm a barra do painel com o nome.
  const control = controlsTarget
    ? <div className="panel-controls" data-panel-control={id}><button type="button" className="panel-collapse btn ghost" aria-label={action} title={action} aria-expanded={!prefs.collapsed} onClick={toggle}><Icon size={17} /><span>{label}</span></button></div>
    : <div className="panel-controls" data-panel-control={id}>
      {collapsedMode !== "rail" && <span className="panel-title">{label}</span>}
      <button type="button" className="panel-collapse icon-btn sm" aria-label={action} title={id === "navigation" ? `${action} (Ctrl+\\)` : action} aria-expanded={!prefs.collapsed} onClick={toggle}><Icon size={17} /></button>
    </div>
  return <Tag ref={ref} hidden={hidden} className={`resizable-panel ${className}`} data-panel-id={id} data-panel-mode={collapsedMode} data-panel-detached={Boolean(controlsTarget)} data-panel-collapsed={prefs.collapsed} aria-label={label}>
    {controlsTarget ? createPortal(control, controlsTarget) : control}
    {children}
    <div className={`panel-edge panel-edge-${side}`} role="separator" aria-label={`Largura de ${label}`} aria-orientation="vertical" aria-valuemin={180} aria-valuemax={maxWidth} aria-valuenow={prefs.width} tabIndex={0}
      onDoubleClick={() => setPrefs({ width, collapsed: false })}
      onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) { event.preventDefault(); const delta = (event.key === "ArrowRight" ? 20 : -20) * (side === "left" ? 1 : -1); setPrefs(p => ({ collapsed: false, width: event.key === "Home" ? width : Math.min(maxWidth, Math.max(180, p.width + delta)) })) } }}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); drag.current = { x: event.clientX, width: ref.current?.getBoundingClientRect().width ?? prefs.width }; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={resize} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} />
  </Tag>
}
