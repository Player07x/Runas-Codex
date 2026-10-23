import "./editor.css"
import { Bold, Highlighter, Italic, Link2, Strikethrough, Type } from "lucide-react"
import { forwardRef, type ReactNode } from "react"
import type { EditorSelectionInfo } from "../vault/SourceEditor"

/** Ação extra da barra da seleção (Livros acrescenta Comentar e Citar da Wiki). */
export type SelectionAction = { label: string; icon: ReactNode; run(): void }

/**
 * Barra que aparece sobre o texto selecionado (rework F3): os formatos do dia a dia, as ações do espaço e “Mais”, que
 * abre a galeria. Com o teclado: Alt+F10 entra na barra, setas andam, Esc volta ao texto; Ctrl+B e Ctrl+I funcionam
 * direto no editor. No celular quem faz esse papel é a barra sobre o teclado.
 */
export const SelectionBar = forwardRef<HTMLDivElement, {
  at: EditorSelectionInfo; width: number; onWrap(mark: string): void; onLink(): void; onMore(): void; onLeave(): void; extra?: SelectionAction[]
}>(function SelectionBar({ at, width, onWrap, onLink, onMore, onLeave, extra = [] }, ref) {
  const above = at.top > 52
  const center = Math.min(Math.max((at.left + at.right) / 2, 150), Math.max(150, width - 150))
  const buttons: SelectionAction[] = [
    { label: "Negrito (Ctrl+B)", icon: <Bold size={16} />, run: () => onWrap("**") },
    { label: "Itálico (Ctrl+I)", icon: <Italic size={16} />, run: () => onWrap("*") },
    { label: "Tachado", icon: <Strikethrough size={16} />, run: () => onWrap("~~") },
    { label: "Destaque", icon: <Highlighter size={16} />, run: () => onWrap("==") },
    { label: "Link", icon: <Link2 size={16} />, run: onLink },
  ]
  return <div ref={ref} className="selection-bar" role="toolbar" aria-label="Formatar a seleção" style={{ top: above ? at.top - 46 : at.bottom + 8, left: center }}
    // O clique não tira a seleção do editor.
    onMouseDown={(event) => event.preventDefault()}
    onKeyDown={(event) => {
      const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")]
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      if (event.key === "Escape") { event.preventDefault(); onLeave() }
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
  </div>
})
