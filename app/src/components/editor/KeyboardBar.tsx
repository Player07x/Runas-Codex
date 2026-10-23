import "./editor.css"
import { Bold, Italic, Link2, ListChecks, Slash, Type } from "lucide-react"
import { useEffect, useState } from "react"

/**
 * Barra fina sobre o teclado do celular (rework F3), na ordem da barra da seleção do desktop: Formatar, menu `/`,
 * negrito, itálico, link e tarefa. Alvos de 44 px. Fica colada no teclado pelo `visualViewport` (no Android o app já
 * encolhe a tela quando o teclado abre). Só aparece com o editor em foco, em tela estreita.
 */
export function KeyboardBar({ onFormat, onSlash, onWrap, onLink, onTask }: { onFormat(): void; onSlash(): void; onWrap(mark: string): void; onLink(): void; onTask(): void }) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const place = () => setOffset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop))
    place()
    viewport.addEventListener("resize", place)
    viewport.addEventListener("scroll", place)
    return () => { viewport.removeEventListener("resize", place); viewport.removeEventListener("scroll", place) }
  }, [])
  const keep = (event: { preventDefault(): void }) => event.preventDefault()
  return <div className="keyboard-bar" role="toolbar" aria-label="Formatar" style={{ bottom: offset }} onMouseDown={keep} onTouchStart={(event) => { if (event.target instanceof Element && event.target.closest("button")) keep(event) }}>
    <button type="button" className="icon-btn" aria-label="Formatar…" onClick={onFormat}><Type size={18} /></button>
    <button type="button" className="icon-btn" aria-label="Menu de blocos (/)" onClick={onSlash}><Slash size={18} /></button>
    <button type="button" className="icon-btn" aria-label="Negrito" onClick={() => onWrap("**")}><Bold size={18} /></button>
    <button type="button" className="icon-btn" aria-label="Itálico" onClick={() => onWrap("*")}><Italic size={18} /></button>
    <button type="button" className="icon-btn" aria-label="Link" onClick={onLink}><Link2 size={18} /></button>
    <button type="button" className="icon-btn" aria-label="Tarefa" onClick={onTask}><ListChecks size={18} /></button>
  </div>
}
