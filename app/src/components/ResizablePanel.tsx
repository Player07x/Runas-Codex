import { createPortal } from "react-dom"
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react"
import "./resizable-panel.css"

/** Preferências locais; arrastar altera só o espaço do painel, nunca os dados do cofre. */
export function ResizablePanel({ id, label, side = "right", width = 300, as: Tag = "aside", className = "", children, hidden, controlsTarget, defaultCollapsed = false, reveal = false }: {
  id: string; label: string; side?: "left" | "right"; width?: number; as?: "aside" | "nav" | "section"; className?: string; children: ReactNode; hidden?: boolean; controlsTarget?: HTMLElement | null; defaultCollapsed?: boolean; reveal?: boolean
}) {
  const key = `runas-codex:painel:${id}`
  const [prefs, setPrefs] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem(key) ?? "null"); return { width: Math.min(600, Math.max(180, Number(saved?.width) || width)), collapsed: saved ? saved.collapsed === true : defaultCollapsed } }
    catch { return { width, collapsed: defaultCollapsed } }
  })
  useEffect(() => { if (reveal) setPrefs(p => ({ ...p, collapsed: false })) }, [reveal])
  const ref = useRef<HTMLElement>(null)
  const drag = useRef<{ x: number; width: number } | null>(null)
  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    parent?.style.setProperty(`--panel-${id}`, `${prefs.collapsed ? (controlsTarget ? 0 : 44) : prefs.width}px`)
    try { localStorage.setItem(key, JSON.stringify(prefs)) } catch { /* preferência opcional */ }
    return () => { parent?.style.removeProperty(`--panel-${id}`) }
  }, [prefs, id, key, controlsTarget])
  function resize(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const available = ref.current?.parentElement?.clientWidth ?? window.innerWidth
    const next = drag.current.width + (event.clientX - drag.current.x) * (side === "left" ? 1 : -1)
    setPrefs({ collapsed: false, width: Math.max(180, Math.min(600, available - 260, next)) })
  }
  const Icon = side === "left" ? (prefs.collapsed ? PanelLeftOpen : PanelLeftClose) : (prefs.collapsed ? PanelRightOpen : PanelRightClose)
  return <Tag ref={ref} hidden={hidden} className={`resizable-panel ${className}`} data-panel-id={id} data-panel-detached={Boolean(controlsTarget)} data-panel-collapsed={prefs.collapsed} aria-label={label}>
    {controlsTarget ? createPortal(<div className="panel-controls" data-panel-control={id}><button type="button" className="panel-collapse btn ghost" aria-label={`${prefs.collapsed ? "Expandir" : "Recolher"} ${label}`} title={`${prefs.collapsed ? "Expandir" : "Recolher"} ${label}`} aria-expanded={!prefs.collapsed} onClick={() => setPrefs(p => ({ ...p, collapsed: !p.collapsed }))}><Icon size={17} /><span>{controlsTarget ? label : prefs.collapsed ? label : "Recolher"}</span></button></div>, controlsTarget) : <div className="panel-controls" data-panel-control={id}><button type="button" className="panel-collapse btn ghost" aria-label={`${prefs.collapsed ? "Expandir" : "Recolher"} ${label}`} title={`${prefs.collapsed ? "Expandir" : "Recolher"} ${label}`} aria-expanded={!prefs.collapsed} onClick={() => setPrefs(p => ({ ...p, collapsed: !p.collapsed }))}><Icon size={17} /><span>{controlsTarget ? label : prefs.collapsed ? label : "Recolher"}</span></button></div>}
    {children}
    <div className={`panel-edge panel-edge-${side}`} role="separator" aria-label={`Largura de ${label}`} aria-orientation="vertical" aria-valuemin={180} aria-valuemax={600} aria-valuenow={prefs.width} tabIndex={0}
      onDoubleClick={() => setPrefs({ width, collapsed: false })}
      onKeyDown={event => { if (["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) { event.preventDefault(); const delta = (event.key === "ArrowRight" ? 20 : -20) * (side === "left" ? 1 : -1); setPrefs(p => ({ collapsed: false, width: event.key === "Home" ? width : Math.min(600, Math.max(180, p.width + delta)) })) } }}
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); drag.current = { x: event.clientX, width: ref.current?.getBoundingClientRect().width ?? prefs.width }; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={resize} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} />
  </Tag>
}
