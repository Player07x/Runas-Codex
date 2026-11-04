import "./kit.css"
import { Ellipsis } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { nextIndex } from "../../core/roving"

export type MenuEntry = { label: string; icon?: ReactNode; hint?: string; onSelect: () => void; disabled?: boolean; danger?: boolean } | "separator"

type Anchor = { top: number; bottom: number; left: number; right: number }

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
  const menuId = useId()
  const button = useRef<HTMLButtonElement>(null)
  const close = (refocus: boolean) => { setOpen(false); if (refocus) button.current?.focus() }
  return <span className="kit-menu-wrap">
    <button ref={button} type="button" className={triggerClassName} aria-label={trigger ? undefined : label} title={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => setOpen((v) => !v)} onKeyDown={(event) => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true) } else if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false) } }}>
      {trigger ?? <Ellipsis size={18} />}
    </button>
    {open && <MenuPopup id={menuId} label={label} items={items} align={align} heading={heading} anchor={() => button.current?.getBoundingClientRect() ?? null} inside={(node) => Boolean(button.current?.contains(node))} onClose={close} />}
  </span>
}

/**
 * O mesmo menu aberto num ponto (botão direito, tecla Menu ou Shift+F10, ou segurar com o dedo): é o menu de
 * contexto das listas. Fecha devolvendo o foco a quem o abriu.
 */
export function ContextMenu({ at, label, items, heading, onClose }: { at: ContextPoint; label: string; items: MenuEntry[]; heading?: string; onClose(): void }) {
  const id = useId()
  return <MenuPopup id={id} label={label} items={items} heading={heading} align="start" anchor={() => ({ top: at.y, bottom: at.y, left: at.x, right: at.x })}
    onClose={(refocus) => { onClose(); if (refocus) at.from?.focus() }} />
}

export type ContextPoint = { x: number; y: number; from: HTMLElement | null }

/**
 * Liga o menu de contexto a um item da lista: botão direito (no Android, segurar o dedo também gera o
 * `contextmenu`), tecla Menu e Shift+F10. Devolve o ponto onde abrir, ou `null`.
 */
export function contextMenuProps(open: (point: ContextPoint) => void) {
  return {
    onContextMenu: (event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      // Teclado (tecla Menu) gera contextmenu em (0, 0): abre junto do item.
      const box = event.currentTarget.getBoundingClientRect()
      const fromKeyboard = event.clientX === 0 && event.clientY === 0
      open({ x: fromKeyboard ? box.left + 16 : event.clientX, y: fromKeyboard ? box.bottom : event.clientY, from: event.currentTarget })
    },
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      if (!(event.key === "F10" && event.shiftKey)) return
      event.preventDefault()
      const box = event.currentTarget.getBoundingClientRect()
      open({ x: box.left + 16, y: box.bottom, from: event.currentTarget })
    },
  }
}

function MenuPopup({ id, label, items, align = "end", heading, anchor, inside, onClose }: {
  id: string; label: string; items: MenuEntry[]; align?: "start" | "end"; heading?: string
  anchor(): Anchor | null; inside?(node: Node): boolean; onClose(refocus: boolean): void
}) {
  const [active, setActive] = useState(0)
  const menu = useRef<HTMLDivElement>(null)
  const actions = items.filter((item): item is Exclude<MenuEntry, "separator"> => item !== "separator")
  const disabled = actions.map((item) => Boolean(item.disabled))
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Ao abrir: foco no primeiro item disponível e clique fora fecha (sem devolver o foco: o clique já o levou).
  const firstEnabled = nextIndex("Home", -1, disabled) ?? 0
  useEffect(() => {
    setActive(firstEnabled)
    const outside = (event: PointerEvent) => { const target = event.target as Node; if (!menu.current?.contains(target) && !inside?.(target)) closeRef.current(false) }
    window.addEventListener("pointerdown", outside)
    return () => window.removeEventListener("pointerdown", outside)
  }, [])
  // Posição antes de pintar (direto no estilo, sem outro render): o foco do efeito abaixo já acha o menu no lugar.
  useLayoutEffect(() => {
    const place = () => {
      const box = menu.current, at = anchor()
      if (!at || !box) return
      const gap = 6, margin = 8, width = box.offsetWidth
      const room = { below: window.innerHeight - at.bottom - gap - margin, above: at.top - gap - margin }
      const up = box.scrollHeight > room.below && room.above > room.below
      const maxHeight = Math.max(120, up ? room.above : room.below)
      let left = align === "end" ? at.right - width : at.left
      if (left < margin) left = at.left
      if (left + width > window.innerWidth - margin) left = at.right - width
      left = Math.max(margin, Math.min(left, window.innerWidth - margin - width))
      box.style.left = `${left}px`
      box.style.maxHeight = `${maxHeight}px`
      box.style.top = up ? `${Math.max(margin, at.top - gap - Math.min(box.scrollHeight, maxHeight))}px` : `${at.bottom + gap}px`
    }
    place()
    window.addEventListener("resize", place)
    window.addEventListener("scroll", place, true)
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true) }
  }, [align])
  useEffect(() => { menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]")[active]?.focus() }, [active])

  const choose = (index: number) => { const item = actions[index]; if (!item || item.disabled) return; onClose(true); item.onSelect() }

  let n = -1
  return createPortal(<div ref={menu} id={id} className={`kit-menu ${align}`} role="menu" aria-label={label} onContextMenu={(event) => event.preventDefault()} onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(true) }
    // No fim da página, o Tab sairia para longe do botão: fecha e volta a ele.
    else if (event.key === "Tab") { event.preventDefault(); onClose(true) }
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
  </div>, document.body)
}
