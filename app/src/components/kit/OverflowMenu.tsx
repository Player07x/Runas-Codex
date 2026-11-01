import "./kit.css"
import { Ellipsis } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { nextIndex } from "../../core/roving"

export type MenuEntry = { label: string; icon?: ReactNode; hint?: string; onSelect: () => void; disabled?: boolean; danger?: boolean } | "separator"

/**
 * Menu de ações (o “⋯” de cada tela e o “+ Novo”): padrão de menu da WAI-ARIA. Abre com o foco no primeiro item,
 * setas e Home/End movem, Enter escolhe, Esc e Tab fecham e devolvem o foco ao botão.
 *
 * O menu abre no fim da página (portal, `position: fixed` calculado pelo botão), para nenhum cartão ou painel com
 * `overflow` cortá-lo; vira para o outro lado e para cima quando não cabe na janela e acompanha a rolagem.
 */
export function OverflowMenu({ label, items, trigger, triggerClassName = "icon-btn", align = "end", heading }: {
  label: string; items: MenuEntry[]; trigger?: ReactNode; triggerClassName?: string; align?: "start" | "end"; heading?: string
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const menuId = useId()
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const actions = items.filter((item): item is Exclude<MenuEntry, "separator"> => item !== "separator")
  const disabled = actions.map((item) => Boolean(item.disabled))

  // Ao abrir: foco no primeiro item disponível e clique fora fecha. Depende só de `open` (os itens mudam a cada render).
  const firstEnabled = nextIndex("Home", -1, disabled) ?? 0
  useEffect(() => {
    if (!open) return
    setActive(firstEnabled)
    const outside = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false) }
    window.addEventListener("pointerdown", outside)
    return () => window.removeEventListener("pointerdown", outside)
  }, [open])
  // Posição antes de pintar (direto no estilo, sem outro render): o foco do efeito abaixo já acha o menu no lugar.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const anchor = button.current?.getBoundingClientRect(), box = menu.current
      if (!anchor || !box) return
      const gap = 6, margin = 8, width = box.offsetWidth
      const room = { below: window.innerHeight - anchor.bottom - gap - margin, above: anchor.top - gap - margin }
      const up = box.scrollHeight > room.below && room.above > room.below
      const maxHeight = Math.max(120, up ? room.above : room.below)
      let left = align === "end" ? anchor.right - width : anchor.left
      if (left < margin) left = anchor.left
      if (left + width > window.innerWidth - margin) left = anchor.right - width
      left = Math.max(margin, Math.min(left, window.innerWidth - margin - width))
      box.style.left = `${left}px`
      box.style.maxHeight = `${maxHeight}px`
      box.style.top = up ? `${Math.max(margin, anchor.top - gap - Math.min(box.scrollHeight, maxHeight))}px` : `${anchor.bottom + gap}px`
    }
    place()
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true) }
  }, [open, align])
  useEffect(() => { if (open) menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]")[active]?.focus() }, [open, active])

  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus() }
  const choose = (index: number) => { const item = actions[index]; if (!item || item.disabled) return; close(); item.onSelect() }

  let n = -1
  return <span className="kit-menu-wrap">
    <button ref={button} type="button" className={triggerClassName} aria-label={trigger ? undefined : label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => setOpen((v) => !v)} onKeyDown={(event) => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true) } else if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false) } }}>
      {trigger ?? <Ellipsis size={18} />}
    </button>
    {open && createPortal(<div ref={menu} id={menuId} className={`kit-menu ${align}`} role="menu" aria-label={label} onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); close() }
      // No fim da página, o Tab sairia para longe do botão: fecha e volta a ele.
      else if (event.key === "Tab") { event.preventDefault(); close() }
      else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(active) }
      else { const next = nextIndex(event.key, active, disabled); if (next !== null) { event.preventDefault(); setActive(next) } }
    }}>
      {heading && <div className="kit-menu-heading" aria-hidden="true">{heading}</div>}
      {items.map((item, i) => {
        if (item === "separator") return <div key={`sep-${i}`} className="kit-menu-sep" role="separator" />
        const index = ++n
        return <button key={item.label} type="button" role="menuitem" tabIndex={index === active ? 0 : -1} disabled={item.disabled} aria-disabled={item.disabled || undefined}
          className={`kit-menu-item ${item.danger ? "danger" : ""}`} onClick={() => choose(index)} onMouseEnter={() => !item.disabled && setActive(index)}>
          {item.icon}<span>{item.label}</span>{item.hint && <kbd>{item.hint}</kbd>}
        </button>
      })}
    </div>, document.body)}
  </span>
}
