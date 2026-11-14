import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { CircleHelp } from "lucide-react"

/**
 * “?” ao lado de uma busca (U66): a sintaxe (tag:, path:…) sai do texto de exemplo, onde ficava cortada no celular, e
 * aparece aqui por toque ou teclado. Fecha com Esc ou ao tocar fora.
 */
export function SearchHelp({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId(), wrap = useRef<HTMLSpanElement>(null), button = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [open])
  return <span ref={wrap} className="kit-search-help" onKeyDown={event => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); button.current?.focus() } }}>
    <button ref={button} type="button" className="icon-btn sm" aria-label="Como buscar" title="Como buscar" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <CircleHelp size={16} aria-hidden="true" />
    </button>
    <span id={id} className="kit-search-help-pop" role="note" hidden={!open}>{children}</span>
  </span>
}
