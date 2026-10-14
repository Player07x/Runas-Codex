import { useEffect, useState } from "react"
import { BookOpenText, Code2, Lock, PenLine, PanelRight, ChevronLeft, Bold, Italic, Strikethrough, Highlighter, Link2, List, ListChecks, Quote, Table, Image, Heading2, Dices } from "lucide-react"
import type { Note } from "../data/types"
import { splitFrontmatter } from "../lib/links"
import { Markdown } from "./Markdown"
import { Segmented, useToast } from "./ui"

export type EditorMode = "leitura" | "live" | "codigo"

const PLAIN = /^(?![-*>#|`\d]|\s*$|<|\$\$).+/

/** `readOnly`: nota de um cofre real aberto em somente leitura — só o modo Leitura, sem barra de formatação. */
export function NoteEditor({ note, onShowPanel, onBack, readOnly }: { note: Note; onShowPanel?: () => void; onBack?: () => void; readOnly?: boolean }) {
  const toast = useToast()
  const [chosenMode, setMode] = useState<EditorMode>("live")
  const mode = readOnly ? "leitura" : chosenMode
  const [source, setSource] = useState(note.markdown)
  useEffect(() => setSource(note.markdown), [note])
  const { body } = splitFrontmatter(source)
  const lines = body.split("\n")
  const caretLine = Math.max(0, lines.findIndex((line) => PLAIN.test(line)))

  return (
    <article className="note-editor">
      <div className="editor-bar">
        {onBack && (
          <button className="icon-btn mobile-switch" onClick={onBack} aria-label="Voltar para a lista">
            <ChevronLeft size={18} />
          </button>
        )}
        {readOnly ? (
          <span className="chip gold">
            <Lock size={13} /> Somente leitura
          </span>
        ) : (
          <Segmented<EditorMode>
            label="Modo de edição"
            value={mode}
            onChange={setMode}
            options={[
              { value: "leitura", label: "Leitura", icon: <BookOpenText size={14} /> },
              { value: "live", label: "Live preview", icon: <PenLine size={14} /> },
              { value: "codigo", label: "Código", icon: <Code2 size={14} /> },
            ]}
          />
        )}
        <span className="grow" />
        <span className="tiny faint hide-narrow">{readOnly ? note.path : `Salvo · ${note.path}`}</span>
        {onShowPanel && (
          <button className="icon-btn" onClick={onShowPanel} title="Links, propriedades e gráfico local">
            <PanelRight size={18} />
          </button>
        )}
      </div>

      {mode !== "leitura" && (
        <div className="format-bar" role="toolbar" aria-label="Formatação">
          {[
            [<Heading2 size={15} />, "Título"],
            [<Bold size={15} />, "Negrito"],
            [<Italic size={15} />, "Itálico"],
            [<Strikethrough size={15} />, "Tachado"],
            [<Highlighter size={15} />, "Destaque"],
            [<Link2 size={15} />, "Link [["],
            [<List size={15} />, "Lista"],
            [<ListChecks size={15} />, "Tarefa"],
            [<Quote size={15} />, "Callout"],
            [<Table size={15} />, "Tabela"],
            [<Image size={15} />, "Imagem"],
            [<Dices size={15} />, "Rolagem"],
          ].map(([icon, label]) => (
            <button key={label as string} className="icon-btn sm" title={label as string} onClick={() => toast(`Protótipo: inseriria ${label}`)}>
              {icon}
            </button>
          ))}
          <span className="tiny faint" style={{ marginLeft: 6, whiteSpace: "nowrap" }}>
            Digite <kbd>/</kbd> para todos os formatadores
          </span>
        </div>
      )}

      <div className="editor-body">
        {mode === "codigo" && <textarea className="source-area" value={source} onChange={(event) => setSource(event.target.value)} spellCheck lang="pt-BR" aria-label="Código-fonte Markdown" />}
        {mode === "leitura" && <Markdown source={body} space={note.space} />}
        {mode === "live" && (
          <div className="live">
            <Markdown source={lines.slice(0, caretLine).join("\n")} space={note.space} />
            <div className="md">
              <div className="src-line">
                {lines[caretLine]}
                <span className="caret" />
              </div>
            </div>
            <Markdown source={lines.slice(caretLine + 1).join("\n")} space={note.space} />
          </div>
        )}
      </div>
    </article>
  )
}
