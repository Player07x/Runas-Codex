import { createPortal } from "react-dom"
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react"
import "./resizable-panel.css"

/** Pede a um painel que recolha ou expanda (atalhos de teclado e botões de outras barras). */
export const TOGGLE_PANEL_EVENT = "runas-codex:alternar-painel"
export const togglePanel = (id: string) => window.dispatchEvent(new CustomEvent<string>(TOGGLE_PANEL_EVENT, { detail: id }))
/** Recolhe ou expande um painel de vez (pedir duas vezes dá o mesmo resultado, ao contrário de alternar). */
export const SET_PANEL_EVENT = "runas-codex:definir-painel"
export const setPanelCollapsed = (id: string, collapsed: boolean): void => { window.dispatchEvent(new CustomEvent<{ id: string; collapsed: boolean }>(SET_PANEL_EVENT, { detail: { id, collapsed } })) }

/**
 * Painel lateral redimensionável e recolhível: o mesmo controle em todas as telas (ADR 0026). A barra do painel
 * mostra o nome dele e um botão de recolher; recolhido, vira uma faixa estreita (ou um trilho de ícones, na
 * navegação). Preferências locais; arrastar altera só o espaço do painel, nunca os dados do cofre.
 */
export function ResizablePanel({ id, label, side = "right", width = 300, as: Tag = "aside", className = "", children, hidden, controlsTarget, defaultCollapsed = false, reveal = false, collapsedMode = "hide" }: {
  id: string; label: string; side?: "left" | "right"; width?: number; as?: "aside" | "nav" | "section"; className?: string; children: ReactNode; hidden?: boolean; controlsTarget?: HTMLElement | null; defaultCollapsed?: boolean; reveal?: boolean
  /** `rail`: recolhido, mostra só os ícones (navegação principal). */
  collapsedMode?: "hide" | "rail"
}) {
  const key = `runas-codex:painel:${id}`
  const [prefs, setPrefs] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) ?? "null"); return { width: Math.min(600, Math.max(180, Number(saved?.width) || width)), collapsed: saved ? saved.collapsed === true : defaultCollapsed } }
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
    setPrefs({ collapsed: false, width: Math.max(180, Math.min(600, available - 260, next)) })
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
    <div className={`panel-edge panel-edge-${side}`} role="separator" aria-label={`Largura de ${label}`} aria-orientation="vertical" aria-valuemin={180} aria-valuemax={600} aria-valuenow={prefs.width} tabIndex={0}
      onDoubleClick={() => setPrefs({ width, collapsed: false })}
      onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) { event.preventDefault(); const delta = (event.key === "ArrowRight" ? 20 : -20) * (side === "left" ? 1 : -1); setPrefs(p => ({ collapsed: false, width: event.key === "Home" ? width : Math.min(600, Math.max(180, p.width + delta)) })) } }}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); drag.current = { x: event.clientX, width: ref.current?.getBoundingClientRect().width ?? prefs.width }; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={resize} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} />
  </Tag>
}
