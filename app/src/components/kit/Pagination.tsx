import { ChevronLeft, ChevronRight } from "lucide-react"
import { pageNumbers } from "../../core/grid-rows"

/**
 * Navegação entre páginas (U71): “Anterior”, os números (primeira, última e vizinhas da atual) e “Próxima”, com a
 * contagem ao lado. A mesma barra vai no começo e no fim da lista; só a de cima anuncia a mudança (`role="status"`),
 * para o leitor de tela não falar duas vezes.
 */
export function Pagination({ page, pages, from, to, total, noun, label, announce = false, onPage }: {
  page: number
  pages: number
  /** Primeiro e último item da página (contando de 1). */
  from: number
  to: number
  total: number
  /** Nome no plural do que é contado (“artigos”). */
  noun: string
  label: string
  announce?: boolean
  onPage(page: number): void
}) {
  const summary = `Página ${page} de ${pages} · ${from}–${to} de ${total} ${noun}`
  return (
    <div className="kit-pagination">
      <span className="small muted kit-pagination-summary" {...(announce ? { role: "status" } : {})}>{summary}</span>
      {pages > 1 && (
        <nav className="kit-pagination-pages" aria-label={label}>
          <button type="button" className="btn sm ghost" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
            <ChevronLeft size={16} aria-hidden="true" /> <span className="kit-pagination-word">Anterior</span>
          </button>
          {pageNumbers(page, pages).map((n, i) => n === null
            ? <span key={`gap-${i}`} className="kit-pagination-gap" aria-hidden="true">…</span>
            : <button key={n} type="button" className={`btn sm ${n === page ? "primary" : "ghost"} kit-pagination-number`} aria-current={n === page ? "page" : undefined} aria-label={`Página ${n}`} onClick={() => n !== page && onPage(n)}>{n}</button>)}
          <button type="button" className="btn sm ghost" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Próxima página">
            <span className="kit-pagination-word">Próxima</span> <ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}
