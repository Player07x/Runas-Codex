import { useState, type ReactNode } from "react"
import { Bug, Check, ChevronDown, ChevronRight, CircleCheck, CircleHelp, ClipboardList, Eye, EyeOff, Flame, Info, List, Lock, PanelRight, Pencil, Quote, ScrollText, Sparkles, Swords, TriangleAlert, X, Zap, type LucideIcon } from "lucide-react"

/**
 * Tipos de callout: os do Obsidian (com os mesmos apelidos) e os do dialeto do Runas-Codex. `estilo` é a classe CSS
 * (a mesma que o snippet `runas-codex.css` usa no Obsidian).
 */
const TYPES: [string, string, string, LucideIcon][] = [
  // nomes, estilo, título padrão, ícone
  ["nota note", "nota", "Nota", Pencil],
  ["info informacao informação", "nota", "Info", Info],
  ["abstract summary tldr resumo", "resumo", "Resumo", ClipboardList],
  ["todo tarefa afazer", "nota", "A fazer", CircleCheck],
  ["tip hint important dica importante", "dica", "Dica", Flame],
  ["success check done sucesso feito", "sucesso", "Feito", Check],
  ["question help faq pergunta duvida dúvida", "pergunta", "Pergunta", CircleHelp],
  ["warning caution attention aviso atencao atenção cuidado", "aviso", "Aviso", TriangleAlert],
  ["failure fail missing falha", "perigo", "Falha", X],
  ["danger error perigo erro", "perigo", "Perigo", Zap],
  ["bug", "perigo", "Bug", Bug],
  ["example exemplo", "exemplo", "Exemplo", List],
  ["quote cite citacao citação", "citacao", "Citação", Quote],
  ["descritivo leia-em-voz-alta read-aloud", "descritivo", "Leia em voz alta", ScrollText],
  ["barra-lateral sidebar", "barra-lateral", "", PanelRight],
  ["statblock", "statblock", "", Swords],
  ["segredo secret", "segredo", "Segredo", Lock],
]

const BY_NAME = new Map(TYPES.flatMap(([names, style, title, icon]) => names.split(" ").map((name) => [name, { style, title, icon }] as const)))

export function calloutStyle(kind: string): { style: string; title: string; icon: LucideIcon } {
  return BY_NAME.get(kind) ?? { style: "nota", title: kind.charAt(0).toUpperCase() + kind.slice(1), icon: Sparkles }
}

/** Callouts que são layout (o dialeto usa callouts para colunas e blocos largos, que funcionam no Obsidian). */
export const LAYOUT_CALLOUTS = new Set(["colunas", "columns", "largo", "wide"])

interface Props {
  kind: string
  /** Título escrito na nota (já desenhado); vazio usa o título padrão do tipo. */
  title: ReactNode
  hasTitle: boolean
  meta: string
  fold: "" | "+" | "-"
  showSecrets: boolean
  children: ReactNode
}

export function Callout({ kind, title, hasTitle, meta, fold, showSecrets, children }: Props) {
  const [open, setOpen] = useState(fold !== "-")
  const [revealed, setRevealed] = useState(false)
  const { style, title: defaultTitle, icon: Icon } = calloutStyle(kind)
  const secret = style === "segredo"
  if (secret && !showSecrets) return null
  const shownTitle = hasTitle ? title : defaultTitle
  return (
    <div className={`callout ${style} ${secret && !revealed ? "hidden" : ""}`} data-callout={kind} data-callout-metadata={meta || undefined}>
      {(shownTitle || fold || secret) && (
        <div className="callout-title" onClick={fold ? () => setOpen(!open) : undefined} style={{ cursor: fold ? "pointer" : undefined }}>
          <Icon size={16} />
          <span className="grow">{shownTitle}</span>
          {secret && (
            <button
              className="btn ghost sm"
              onClick={(event) => {
                event.stopPropagation()
                setRevealed(!revealed)
              }}
              title="Segredos não vão para a versão dos jogadores"
            >
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />} Só o mestre
            </button>
          )}
          {fold && (open ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
        </div>
      )}
      {open && <div className="callout-body">{children}</div>}
    </div>
  )
}

/** `> [!colunas|3]` e `> [!largo]`: só o arranjo, sem a caixa. */
export function LayoutCallout({ kind, title, hasTitle, meta, children }: { kind: string; title: ReactNode; hasTitle: boolean; meta: string; children: ReactNode }) {
  const wide = kind === "largo" || kind === "wide"
  const columns = Math.min(4, Math.max(2, Number.parseInt(meta, 10) || 2))
  return (
    <div className={wide ? "md-largo" : "md-colunas"} style={wide ? undefined : { ["--colunas" as string]: columns }} data-callout={kind}>
      {hasTitle && <p className="md-layout-titulo">{title}</p>}
      {children}
    </div>
  )
}
