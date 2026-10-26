import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type MouseEvent } from "react"
import { Markdown } from "../../components/Markdown"
import { bookProperties } from "../../core/books"
import { BOOK_SIZES, chapterTitle, previewChapters, previewSettings } from "../../core/books-preview"
import { bookDecorationCss, indexEntries, printOptions } from "../../core/books-finish"
import { resolveStyle, styleCss } from "../../core/book-style"
import { parseNote } from "../../core/parse"
import type { IndexedNote } from "../../core/vault-index"
import { NoteSetContext } from "../../lib/note-set"
import { vaultNoteSet } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { IMAGE_PPI, paginate, printableHtml, readyForPagination, type ImageQuality, type Pagination } from "./pagination"
// EB Garamond estática só para o livro: a variável (a do app) sai como fonte Type 3 no PDF (L2, ADR 0033).
import "@fontsource/eb-garamond/latin-400.css"
import "@fontsource/eb-garamond/latin-400-italic.css"
import "@fontsource/eb-garamond/latin-500.css"
import "@fontsource/eb-garamond/latin-600.css"
import "@fontsource/eb-garamond/latin-700.css"
import "@fontsource/eb-garamond/latin-700-italic.css"
import "./book-pages.css"
import "./book-preview.css"

/** Largura do painel, página inteira à vista ou duas páginas lado a lado (o livro aberto). */
export type PagesZoom = "largura" | "pagina" | "duas"
export interface PagesState { ready: boolean; status: string; error: string; total: number; lowResolution?: number }
export interface BookPagesHandle { source: HTMLDivElement | null; output: HTMLDivElement | null; scroll: HTMLDivElement | null }

const MM = 96 / 25.4

/**
 * As páginas do livro, paginadas pelo Paged.js a partir do mesmo leitor Markdown das notas. Usadas pelo Diagramar
 * (com os controles de exportação) e pela prévia ao lado do texto; cada uma pagina por conta própria.
 */
export const BookPages = forwardRef<BookPagesHandle, {
  book: IndexedNote
  draft?: { path: string; text: string }
  /** Só este capítulo, sem capa, créditos nem contracapa (livros grandes); a numeração recomeça em 1. */
  onlyPath?: string
  zoom?: PagesZoom
  showSecrets?: boolean
  /** A prévia ao lado é só visual: o texto já está no editor, e o leitor de tela não o lê duas vezes. */
  decorative?: boolean
  onState?(state: PagesState): void
  /** Depois de cada paginação, com as páginas novas já na tela. */
  onPaginated?(output: HTMLDivElement): void
  onScroll?(): void
  onPagesClick?(event: MouseEvent<HTMLDivElement>): void
  className?: string
}>(function BookPages({ book, draft, onlyPath, zoom = "largura", showSecrets = true, decorative = false, onState, onPaginated, onScroll, onPagesClick, className = "" }, ref) {
  const vault = useVault(), index = vault.index!
  const settings = previewSettings(book)
  let decoration = "", cssError = ""
  try { decoration = bookDecorationCss(book) } catch (e) { cssError = String(e) }
  const data = bookProperties(book)
  // Estilo do livro (L3): modelo pronto, nota de modelo (`modelo: "[[…]]"` com `tipo: modelo-livro`) e o que o livro muda.
  const modelNote = (() => {
    if (typeof data.modelo !== "string" || !data.modelo.startsWith("[[")) return undefined
    const link = parseNote(data.modelo).links[0]
    const dest = link ? index.resolve(link, book.path).dest : undefined
    const note = dest ? index.note(dest) : undefined
    return note && bookProperties(note).tipo === "modelo-livro" ? bookProperties(note) : undefined
  })()
  const style = resolveStyle(data, modelNote)
  const source = useRef<HTMLDivElement>(null)
  const output = useRef<HTMLDivElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const active = useRef<Pagination | null>(null)
  const queue = useRef(Promise.resolve())
  const [state, setState] = useState<PagesState>({ ready: false, status: "Preparando prévia…", error: "", total: 0 })
  const [scale, setScale] = useState(1)
  useImperativeHandle(ref, () => ({ get source() { return source.current }, get output() { return output.current }, get scroll() { return scroll.current } }), [])
  const report = useRef(onState)
  report.current = onState
  const paginated = useRef(onPaginated)
  paginated.current = onPaginated
  // Avisa quem usa as páginas no mesmo passo em que elas mudam: o Diagramar libera Ctrl+P e Exportar junto com o
  // aria-busy das páginas (avisar num efeito depois deixava um instante com as páginas prontas e os botões não).
  const current = useRef(state)
  const update = (next: Partial<PagesState>) => { current.current = { ...current.current, ...next }; setState(current.current); report.current?.(current.current) }

  const all = previewChapters(index, book, draft)
  const chapters = onlyPath ? all.filter((chapter) => chapter.path === onlyPath) : all
  const whole = !onlyPath
  // Inclui as notas transcluídas: mudanças no cofre também refazem a prévia.
  const signature = JSON.stringify([book.text, chapters, vault.version, onlyPath, style])
  const paperClass = `book-paper modelo-${style.model} fichas-${style.fichas}`

  useEffect(() => {
    const controller = new AbortController()
    update({ ready: false, status: "Atualizando prévia…" })
    const timer = setTimeout(() => {
      queue.current = queue.current.catch(() => {}).then(async () => {
        if (controller.signal.aborted || !source.current || !output.current) return
        const stage = document.createElement("div")
        stage.className = `book-pagination-stage ${paperClass}`
        stage.setAttribute("aria-hidden", "true")
        document.body.append(stage)
        let next: Pagination | null = null
        try {
          await readyForPagination(source.current, controller.signal)
          const quality: ImageQuality = typeof data.imagens === "string" && Object.hasOwn(IMAGE_PPI, data.imagens) ? data.imagens as ImageQuality : "tela"
          const printable = await printableHtml(source.current, quality, async (src) => {
            const url = new URL(src)
            return url.host === "cofre" && !/^(?:https?|blob|data):$/.test(url.protocol) ? vault.platform.readBinary(url.pathname.slice(1).split("/").map(decodeURIComponent).join("/")) : null
          })
          if (controller.signal.aborted) return
          next = await paginate(printable.html, stage, settings.size, printOptions(book))
          if (controller.signal.aborted || !output.current) { next.dispose(); return }
          const top = scroll.current?.scrollTop ?? 0
          active.current?.dispose()
          output.current.replaceChildren(...Array.from(stage.childNodes))
          active.current = next
          output.current.dataset.pages = String(next.total)
          output.current.dataset.paginationMs = next.milliseconds.toFixed(0)
          if (scroll.current) scroll.current.scrollTop = top
          const low = printable.lowResolution ? ` · ${printable.lowResolution === 1 ? "1 imagem fica" : `${printable.lowResolution} imagens ficam`} abaixo de 200 ppi impressa` : ""
          update({ ready: true, error: "", total: next.total, lowResolution: printable.lowResolution, status: `${next.total} páginas · ${(next.milliseconds / 1000).toFixed(2)} s${low}` })
          paginated.current?.(output.current)
        } catch (err) {
          if (!controller.signal.aborted) update({ error: err instanceof Error ? err.message : String(err), status: "Prévia não atualizada" })
        } finally { stage.remove() }
      })
    }, 500)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [signature])

  useEffect(() => () => { void queue.current.finally(() => { active.current?.dispose(); active.current = null }) }, [])
  useEffect(() => {
    const container = scroll.current
    if (!container) return
    const page = BOOK_SIZES[settings.size]
    const resize = () => {
      const width = container.clientWidth - 24, height = container.clientHeight - 24
      const w = page.width * MM, h = page.height * MM
      const fit = zoom === "duas" ? width / (2 * w) : zoom === "pagina" ? Math.min(width / w, height / h) : width / w
      setScale(Math.min(1, Math.max(.1, fit)))
    }
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    return () => observer.disconnect()
  }, [settings.size, zoom])

  return <>
    {(state.error || cssError) && <p className="proto-note" role="alert">{state.error || cssError}</p>}
    <style>{styleCss(style)}</style>
    {decoration && <style>{decoration}</style>}
    <div className={`book-preview-scroll ${className}`} ref={scroll} onScroll={onScroll}>
      <div className={`book-preview-output ${paperClass} zoom-${zoom}`} ref={output} style={{ zoom: scale }} aria-busy={!state.ready} aria-hidden={decorative || undefined} onClick={onPagesClick} />
    </div>
    <div className={`book-preview-source ${paperClass}`} ref={source} aria-hidden="true" inert>
      <div className={`book-print ${settings.newChapter ? "chapters-new-page" : ""}`}>
        {whole && data.exportar_capa !== false && <section className="book-print-cover">
          <h1 className="book-print-title">{book.name}</h1>
          {typeof data.subtitulo === "string" && <p className="book-print-subtitle">{data.subtitulo}</p>}
          {typeof data.capa === "string" && data.capa.startsWith("[[") && <PreviewMarkdown path={book.path} text={`!${data.capa}`} />}
          {typeof data.autor === "string" && <p className="book-print-author">{data.autor}</p>}
        </section>}
        {whole && typeof data.creditos === "string" && data.creditos.trim() && <section className="book-print-credits"><h1>Créditos</h1><p>{data.creditos}</p></section>}
        {chapters.map((chapter, i) => {
          const { title, body } = chapterTitle(chapter)
          // Colunas do livro: o capítulo pode pedir outra (`colunas:`); quem já arruma as próprias colunas com
          // `::: runas-colunas-N` (ou `[!colunas]`) fica com uma, para não haver colunas dentro de colunas.
          const own = /^(?:::: *runas-colunas-\d|> *\[!colunas\])/m.test(body)
          const asked = index.note(chapter.path) ? bookProperties(index.note(chapter.path)!).colunas : undefined
          const columns = own ? 1 : asked === 1 || asked === 2 || asked === 3 ? asked : undefined
          return <section id={`book-chapter-${i}`} key={`${chapter.path}:${i}`} data-book-chapter={i} data-book-path={chapter.path} className={chapter.kind === "parte" ? "book-part" : chapter.kind === "capitulo" ? "book-chapter" : "book-section"} style={columns ? { ["--book-columns" as string]: columns } : undefined}>
            {title !== null && (chapter.kind === "secao" ? <h2 className="book-chapter-heading book-section-title">{title}</h2> : <h1 className="book-chapter-heading">{title}</h1>)}
            {chapter.kind === "indice" ? <ul>{indexEntries(index, book, draft).map(entry => <li key={entry.term}><strong>{entry.term}</strong>: {entry.chapters.map((number, i) => <span key={number}>{i > 0 && ", "}<a href={`#book-chapter-${number}`}>Capítulo {number + 1}</a></span>)}</li>)}</ul> : <PreviewMarkdown path={chapter.path} text={body} showSecrets={showSecrets} />}
          </section>
        })}
        {whole && typeof data.contracapa === "string" && data.contracapa.trim() && <section className="book-print-back"><h1>{book.name}</h1><p>{data.contracapa}</p></section>}
      </div>
    </div>
  </>
})

function PreviewMarkdown({ path, text, showSecrets = true }: { path: string; text: string; showSecrets?: boolean }) {
  const vault = useVault()
  const notes = useMemo(() => vaultNoteSet(vault.index!, path, {}, vault.platform), [vault.index, vault.version, path, vault.platform])
  return <NoteSetContext.Provider value={notes}><Markdown source={text} space="livros" showSecrets={showSecrets} /></NoteSetContext.Provider>
}
