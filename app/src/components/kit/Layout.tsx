import "./kit.css"
import { ChevronLeft, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react"
import type { ReactNode } from "react"

/**
 * Peças de layout que todas as telas usam do mesmo jeito (docs/adr/0026-rework-visual.md): o cabeçalho de página com
 * uma ação principal e o menu ⋯, a barra do documento, o aviso e a linha de lista.
 */

/** Cabeçalho de tela de lista: título, uma ação principal e o menu ⋯ sempre no mesmo canto. */
export function PageHeader({ eyebrow, title, meta, primary, menu }: { eyebrow?: ReactNode; title: ReactNode; meta?: ReactNode; primary?: ReactNode; menu?: ReactNode }) {
  return <header className="page-head kit-page-head">
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="page-title" tabIndex={-1}>{title}</h1>
      {meta && <div className="kit-page-meta">{meta}</div>}
    </div>
    {(primary || menu) && <div className="kit-actions">{primary}{menu}</div>}
  </header>
}

/** Barra única de um documento (nota, artigo, sessão, capítulo): voltar, título, modos, estado e menu. */
export function DocumentBar({ back, title, subtitle, center, status, actions, menu }: {
  back?: { label: string; onClick: () => void }; title: ReactNode; subtitle?: ReactNode; center?: ReactNode; status?: ReactNode; actions?: ReactNode; menu?: ReactNode
}) {
  return <div className="kit-docbar" role="toolbar" aria-label="Barra do documento">
    {back && <button type="button" className="btn ghost kit-back" onClick={back.onClick}><ChevronLeft size={16} /><span>{back.label}</span></button>}
    <div className="kit-doc-title">{subtitle && <small>{subtitle}</small>}<strong>{title}</strong></div>
    {center && <div className="kit-doc-center">{center}</div>}
    <div className="kit-doc-end">{status}{actions}{menu}</div>
  </div>
}

/** “Salvo” e companhia: estado da gravação em texto, nunca só pela cor do ponto. */
export function SaveStatus({ state }: { state: "salvo" | "salvando" | "erro" | "somente-leitura" }) {
  const text = { salvo: "Salvo", salvando: "Salvando…", erro: "Não salvo", "somente-leitura": "Somente leitura" }[state]
  return <span className={`kit-save ${state}`} role="status">{text}</span>
}

const NOTICE_ICONS = { info: <Info size={17} />, warn: <TriangleAlert size={17} />, danger: <CircleAlert size={17} />, ok: <CircleCheck size={17} /> }

/** Aviso dentro da tela (somente leitura, sessão com data passada, conflito…), com a próxima ação ao lado. */
export function Notice({ tone = "info", title, children, actions }: { tone?: keyof typeof NOTICE_ICONS; title?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return <div className={`kit-notice ${tone}`} role={tone === "danger" ? "alert" : "status"}>
    {NOTICE_ICONS[tone]}
    <div className="kit-notice-text">{title && <strong>{title}</strong>}{children && <span>{children}</span>}</div>
    {actions && <div className="kit-notice-actions">{actions}</div>}
  </div>
}

/** Linha de lista com altura fixa (imagem ou ícone, título, detalhe e o que vem no fim), pronta para listas longas. */
export function ListRow({ media, title, meta, trailing, href, onClick, current }: { media?: ReactNode; title: ReactNode; meta?: ReactNode; trailing?: ReactNode; href?: string; onClick?: () => void; current?: boolean }) {
  const body = <>{media && <span className="kit-row-media">{media}</span>}<span className="kit-row-text"><span className="kit-row-title">{title}</span>{meta && <small>{meta}</small>}</span>{trailing && <span className="kit-row-end">{trailing}</span>}</>
  if (href) return <a className="kit-row" href={href} aria-current={current ? "page" : undefined}>{body}</a>
  if (onClick) return <button type="button" className="kit-row" onClick={onClick} aria-current={current ? "true" : undefined}>{body}</button>
  return <div className="kit-row">{body}</div>
}
