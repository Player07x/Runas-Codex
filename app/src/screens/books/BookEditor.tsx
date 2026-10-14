import { useState } from "react"
import {
  Bold, ChevronLeft, Columns2, Download, Eye, FileDown, Highlighter, Image, Italic, LayoutGrid, Link2, List, ListOrdered, PenLine, Quote,
  SeparatorHorizontal, Sparkles, Strikethrough, Swords, Table, TextAlignCenter, TextAlignJustify, TextAlignStart, Type, Underline,
} from "lucide-react"
import type { Book } from "../../data/types"
import { href, navigate } from "../../lib/router"
import { Markdown } from "../../components/Markdown"
import { Modal, Progress, Segmented, useToast } from "../../components/ui"
import { FORMATTER_GROUPS } from "./formatters"

type Pane = "escrever" | "previa"
type View = "texto" | "cortica"

const PAGE_BREAK = '<div class="quebra-pagina"></div>'

export function BookEditor({ book }: { book: Book }) {
  const toast = useToast()
  const [chapterId, setChapterId] = useState(book.chapters.find((c) => c.markdown.length > 100)?.id ?? book.chapters[0].id)
  const chapter = book.chapters.find((c) => c.id === chapterId)!
  const [source, setSource] = useState(chapter.markdown)
  const [pane, setPane] = useState<Pane>("escrever")
  const [view, setView] = useState<View>("texto")
  const [theme, setTheme] = useState("rpg")
  const [page, setPage] = useState<string>(book.page)
  const [catalog, setCatalog] = useState(false)
  const [exporting, setExporting] = useState(false)
  const parts = [...new Set(book.chapters.map((c) => c.part))]
  const words = book.chapters.reduce((sum, c) => sum + c.words, 0)
  const pages = source.split(PAGE_BREAK)

  const open = (id: string) => {
    const next = book.chapters.find((c) => c.id === id)!
    setChapterId(id)
    setSource(next.markdown)
    setView("texto")
  }

  const insert = (label: string) => () => toast(`Protótipo: inseriria ${label}`)

  return (
    <div className={`book-workspace pane-${pane}`}>
      <aside className="pane-left binder">
        <div className="pane-head">
          <a className="row small" href={href("/livros")} style={{ textDecoration: "none" }}>
            <ChevronLeft size={15} /> Livros
          </a>
          <strong className="display">{book.title}</strong>
          <span className="tiny muted">
            {words.toLocaleString("pt-BR")} / {book.goal.toLocaleString("pt-BR")} palavras
          </span>
          <Progress value={words} max={book.goal} color="var(--gold)" />
        </div>
        <div className="pane-body" style={{ gap: 10 }}>
          {parts.map((part) => (
            <div key={part} className="stack" style={{ gap: 2 }}>
              <span className="eyebrow">{part}</span>
              {book.chapters
                .filter((c) => c.part === part)
                .map((c) => (
                  <button key={c.id} className={`list-item small ${c.id === chapterId ? "active" : ""}`} onClick={() => open(c.id)}>
                    <span className={`status-dot ${c.status}`} title={c.status} />
                    <span className="grow truncate">{c.title}</span>
                    <span className="meta">{(c.words / 1000).toFixed(1)}k</span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </aside>

      <section className="book-center">
        <div className="editor-bar">
          <button className="icon-btn mobile-switch" onClick={() => navigate("/livros")} aria-label="Voltar">
            <ChevronLeft size={18} />
          </button>
          <Segmented<View>
            label="Visão"
            value={view}
            onChange={setView}
            options={[
              { value: "texto", label: "Texto", icon: <PenLine size={14} /> },
              { value: "cortica", label: "Cortiça", icon: <LayoutGrid size={14} /> },
            ]}
          />
          <div className="mobile-switch">
            <Segmented<Pane>
              label="Painel"
              value={pane}
              onChange={setPane}
              options={[
                { value: "escrever", label: "Escrever" },
                { value: "previa", label: "Prévia", icon: <Eye size={14} /> },
              ]}
            />
          </div>
          <span className="grow" />
          <button className="btn sm primary" onClick={() => setExporting(true)}>
            <Download size={14} /> Exportar
          </button>
        </div>

        {view === "cortica" ? (
          <div className="corkboard">
            {book.chapters.map((c, i) => (
              <button key={c.id} className="cork-card" onClick={() => open(c.id)} style={{ rotate: `${((i * 37) % 5) - 2}deg` }}>
                <span className="tiny faint">{c.part}</span>
                <strong>{c.title}</strong>
                <span className="tiny muted">{c.words.toLocaleString("pt-BR")} palavras · {c.status}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="format-bar" role="toolbar" aria-label="Formatação do livro">
              {[
                [<Type size={15} />, "Título"],
                [<Bold size={15} />, "Negrito"],
                [<Italic size={15} />, "Itálico"],
                [<Underline size={15} />, "Sublinhado"],
                [<Strikethrough size={15} />, "Tachado"],
                [<Highlighter size={15} />, "Destaque"],
                [<TextAlignStart size={15} />, "Alinhar à esquerda"],
                [<TextAlignCenter size={15} />, "Centralizar"],
                [<TextAlignJustify size={15} />, "Justificar"],
                [<List size={15} />, "Lista"],
                [<ListOrdered size={15} />, "Lista numerada"],
                [<Quote size={15} />, "Leia em voz alta"],
                [<Swords size={15} />, "Statblock"],
                [<Table size={15} />, "Tabela"],
                [<Image size={15} />, "Imagem"],
                [<Link2 size={15} />, "Link para a wiki"],
                [<Columns2 size={15} />, "Quebra de coluna"],
                [<SeparatorHorizontal size={15} />, "Quebra de página"],
              ].map(([icon, label]) => (
                <button key={label as string} className="icon-btn sm" title={label as string} onClick={insert(label as string)}>
                  {icon}
                </button>
              ))}
              <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => setCatalog(true)}>
                <Sparkles size={14} /> Todos os formatadores
              </button>
            </div>
            <div className="book-split">
              <textarea className="book-source" value={source} onChange={(e) => setSource(e.target.value)} spellCheck lang="pt-BR" aria-label="Texto do capítulo em Markdown" />
              <div className="book-preview">
                <div className="preview-bar">
                  <select className="select" value={theme} onChange={(e) => setTheme(e.target.value)} aria-label="Tema">
                    <option value="rpg">Manual de RPG</option>
                    <option value="pergaminho">Pergaminho</option>
                    <option value="minimalista">Minimalista</option>
                  </select>
                  <select className="select" value={page} onChange={(e) => setPage(e.target.value)} aria-label="Tamanho da página">
                    <option>A4</option>
                    <option>Carta</option>
                    <option>A5</option>
                  </select>
                  <span className="tiny faint">{pages.length} páginas</span>
                </div>
                <div className="pages">
                  {pages.map((content, i) => (
                    <div key={i} className={`book-page theme-${theme} size-${page}`}>
                      <div className="page-header">
                        <span>{book.title}</span>
                        <span>{chapter.title}</span>
                      </div>
                      <Markdown source={content} space="livros" className="page-columns" />
                      <div className="page-footer">{i + 12}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {catalog && (
        <Modal wide title="Todos os formatadores" onClose={() => setCatalog(false)}>
          <p className="muted small">Tudo é Markdown que o Obsidian também abre. Itens com HTML usam o snippet `runas-codex.css` para ficar igual lá.</p>
          {FORMATTER_GROUPS.map((group) => (
            <div key={group.title} className="stack">
              <span className="eyebrow">{group.title}</span>
              <div className="formatter-grid">
                {group.items.map((f) => (
                  <button key={f.label} className="formatter" onClick={() => toast(`Protótipo: inseriria ${f.label}`)}>
                    <strong className="small">{f.label}</strong>
                    <code className="tiny">{f.syntax}</code>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Modal>
      )}

      {exporting && (
        <Modal
          title="Exportar livro"
          onClose={() => setExporting(false)}
          footer={
            <>
              <button className="btn" onClick={() => setExporting(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => { setExporting(false); toast("Protótipo: geraria o PDF fiel à prévia") }}>
                <FileDown size={15} /> Exportar
              </button>
            </>
          }
        >
          <div className="grid-cards" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {["PDF (impressão)", "EPUB", "DOCX", "HTML", "Markdown", "RTF"].map((f, i) => (
              <label key={f} className="card tight check">
                <input type="radio" name="formato" defaultChecked={i === 0} /> {f}
              </label>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" defaultChecked /> Incluir capa, créditos e sumário
          </label>
          <label className="check">
            <input type="checkbox" /> Marcas de corte e sangria (gráfica)
          </label>
          <label className="check">
            <input type="checkbox" defaultChecked /> Versão dos jogadores (sem segredos)
          </label>
        </Modal>
      )}
    </div>
  )
}
