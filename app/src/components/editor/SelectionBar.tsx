import "./editor.css"
import { Bold, Highlighter, Italic, Link2, Strikethrough, Type } from "lucide-react"
import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { intersectBoxes, placeSelectionBar, type Box } from "../../core/floating-place"
import type { EditorSelectionInfo } from "../vault/SourceEditor"

/** Ação extra da barra da seleção (Livros acrescenta Comentar e Citar da Wiki). */
export type SelectionAction = { label: string; icon: ReactNode; run(): void }

/** Parte do elemento que aparece na tela: a janela menos o que as caixas com rolagem (ou corte) em volta escondem. */
function visibleBox(element: HTMLElement): Box {
  let box: Box = { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth }
  for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    if (style.overflowX !== "visible" || style.overflowY !== "visible") box = intersectBoxes(box, parent.getBoundingClientRect())
  }
  return box
}

/**
 * Barra que aparece sobre o texto selecionado (rework F3): os formatos do dia a dia, as ações do espaço e “Mais”, que
 * abre a galeria. Com o teclado: Alt+F10 entra na barra, setas andam, Esc (ou Tab) volta ao texto; Ctrl+B e Ctrl+I funcionam
 * direto no editor. No celular quem faz esse papel é a barra sobre o teclado.
 *
 * Fica numa camada própria, por cima de painéis, menus e barras da tela, e sempre dentro da parte visível do texto
 * (`origin` é o elemento de onde `at` é medido). Antes ela ficava dentro do texto, e a parte que passava da coluna
 * sumia embaixo do Sumário dos Livros.
 */
export const SelectionBar = forwardRef<HTMLDivElement, {
  at: EditorSelectionInfo; origin: HTMLElement | null; onWrap(mark: string): void; onLink(): void; onMore(): void; onLeave(): void; extra?: SelectionAction[]
}>(function SelectionBar({ at, origin, onWrap, onLink, onMore, onLeave, extra = [] }, ref) {
  const own = useRef<HTMLDivElement | null>(null)
  const [place, setPlace] = useState<{ top: number; left: number; shown: boolean } | null>(null)
  // A camada é fixa na janela: rolar o texto ou mudar o tamanho da janela pede outra conta.
  const [moved, setMoved] = useState(0)
  useEffect(() => {
    let frame = 0
    const later = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setMoved((n) => n + 1)) }
    window.addEventListener("scroll", later, true)
    window.addEventListener("resize", later)
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", later, true); window.removeEventListener("resize", later) }
  }, [])
  useLayoutEffect(() => {
    const bar = own.current
    if (!bar || !origin) return
    const o = origin.getBoundingClientRect()
    const selection = { top: o.top + at.top, bottom: o.top + at.bottom, left: o.left + at.left, right: o.left + at.right }
    setPlace(placeSelectionBar(selection, { width: bar.offsetWidth, height: bar.offsetHeight }, visibleBox(origin), { width: window.innerWidth, height: window.innerHeight }))
  }, [at, origin, moved, extra.length])
  const buttons: SelectionAction[] = [
    { label: "Negrito (Ctrl+B)", icon: <Bold size={16} />, run: () => onWrap("**") },
    { label: "Itálico (Ctrl+I)", icon: <Italic size={16} />, run: () => onWrap("*") },
    { label: "Tachado", icon: <Strikethrough size={16} />, run: () => onWrap("~~") },
    { label: "Destaque", icon: <Highlighter size={16} />, run: () => onWrap("==") },
    { label: "Link", icon: <Link2 size={16} />, run: onLink },
  ]
  const setRefs = (element: HTMLDivElement | null) => {
    own.current = element
    if (typeof ref === "function") ref(element)
    else if (ref) ref.current = element
  }
  return createPortal(<div ref={setRefs} className="selection-bar" role="toolbar" aria-label="Formatar a seleção"
    style={{ top: place?.top ?? 0, left: place?.left ?? 0, visibility: place?.shown ? undefined : "hidden" }}
    // O clique não tira a seleção do editor.
    onMouseDown={(event) => event.preventDefault()}
    onKeyDown={(event) => {
      const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")]
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      // A camada fica no fim da página: Tab também volta ao texto, em vez de pular para fora da tela.
      if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); onLeave() }
      else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault()
        items[(index + (event.key === "ArrowRight" ? 1 : -1) + items.length) % items.length]?.focus()
      }
    }}>
    {buttons.map((button) => <button key={button.label} type="button" className="icon-btn sm" aria-label={button.label} title={button.label} onClick={button.run}>{button.icon}</button>)}
    {extra.length > 0 && <span className="selection-bar-sep" aria-hidden="true" />}
    {extra.map((button) => <button key={button.label} type="button" className="btn sm ghost" onClick={button.run}>{button.icon}<span>{button.label}</span></button>)}
    <span className="selection-bar-sep" aria-hidden="true" />
    <button type="button" className="btn sm ghost" onClick={onMore}><Type size={15} /><span>Mais</span></button>
  </div>, document.body)
})
