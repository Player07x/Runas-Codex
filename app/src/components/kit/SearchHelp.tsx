import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { CircleHelp } from "lucide-react"

const GAP = 6, MARGIN = 8

/**
 * “?” ao lado de uma busca (U66): a sintaxe (tag:, path:…) sai do texto de exemplo, onde ficava cortada no celular, e
 * aparece aqui por toque ou teclado. Fecha com Esc ou ao tocar fora. A caixa vai para o fim da página, fixa junto ao
 * botão e dentro da janela (anexo 12, 24/11): dentro da lista de notas, que rola, ela ficava cortada pela borda do
 * painel e parecia ficar por baixo do menu.
 */
export function SearchHelp({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<{ top: number; left: number; width: number } | null>(null)
  const id = useId(), wrap = useRef<HTMLSpanElement>(null), button = useRef<HTMLButtonElement>(null), pop = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { const target = event.target as Node; if (!wrap.current?.contains(target) && !pop.current?.contains(target)) setOpen(false) }
    document.addEventListener("pointerdown", outside)
    return () => document.removeEventListener("pointerdown", outside)
  }, [open])
  useLayoutEffect(() => {
    if (!open) return setPlace(null)
    // Alinhada pela direita ao botão, como antes; perto da borda da janela, desliza para dentro (320 px de largura).
    const measure = () => {
      const rect = button.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(320, window.innerWidth - 2 * MARGIN)
      const left = Math.max(MARGIN, Math.min(rect.right - width, window.innerWidth - width - MARGIN))
      setPlace({ top: rect.bottom + GAP, left, width })
    }
    measure()
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => { window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true) }
  }, [open])
  return <span ref={wrap} className="kit-search-help" onKeyDown={event => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); button.current?.focus() } }}>
    <button ref={button} type="button" className="icon-btn sm" aria-label="Como buscar" title="Como buscar" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <CircleHelp size={16} aria-hidden="true" />
    </button>
    {createPortal(<span ref={pop} id={id} className="kit-search-help-pop" role="note" hidden={!open || !place} style={place ? { top: place.top, left: place.left, width: place.width } : undefined}>{children}</span>, document.body)}
  </span>
}
