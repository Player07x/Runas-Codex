import { useEffect, useMemo, useRef, useState } from "react"
import { Markdown } from "../../components/Markdown"
import { bookProperties, bookRoute } from "../../core/books"
import { BOOK_SIZES, BOOK_THEMES, previewChapters, previewSettings, type BookSize, type BookTheme } from "../../core/books-preview"
import { bookDecorationCss, indexEntries, printOptions } from "../../core/books-finish"
import { BookFinishSettings } from "./BookFinishSettings"
import { dirname } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { NoteSetContext } from "../../lib/note-set"
import { navigate } from "../../lib/router"
import { vaultNoteSet } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { paginate, readyForPagination, type Pagination } from "./pagination"
import "./book-pages.css"
import "./book-preview.css"

export default function BookPreview({ book, draft, onClose, documentMode = false, showSecrets = true }: { book: IndexedNote; draft?: { path: string; text: string }; onClose(): void; documentMode?: boolean; showSecrets?: boolean }) {
  const vault = useVault(), index = vault.index!
  const settings = previewSettings(book)
  let decoration = "", cssError = ""
  try { decoration = bookDecorationCss(book) } catch (e) { cssError = String(e) }
  const data = bookProperties(book)
  const source = useRef<HTMLDivElement>(null)
  const output = useRef<HTMLDivElement>(null)
  const scroll = useRef<HTMLDivElement>(null)
  const active = useRef<Pagination | null>(null)
  const queue = useRef(Promise.resolve())
  const [status, setStatus] = useState("Preparando prévia…")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")
  const [metadata, setMetadata] = useState(false)
  const [format, setFormat] = useState("pdf")
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState("")
  const [zoom, setZoom] = useState(1)
  const chapters = previewChapters(index, book, draft)
  // Inclui as notas transcluídas: mudanças no cofre também refazem a prévia.
  const signature = JSON.stringify([book.text, chapters, vault.version])
  const paperClass = `book-paper tema-${settings.theme}`

  useEffect(() => {
    const controller = new AbortController()
    setReady(false)
    setStatus("Atualizando prévia…")
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
          next = await paginate(source.current, stage, settings.size, printOptions(book))
          if (controller.signal.aborted || !output.current) { next.dispose(); return }
          const top = scroll.current?.scrollTop ?? 0
          active.current?.dispose()
          output.current.replaceChildren(...Array.from(stage.childNodes))
          active.current = next
          output.current.dataset.pages = String(next.total)
          output.current.dataset.paginationMs = next.milliseconds.toFixed(0)
          if (scroll.current) scroll.current.scrollTop = top
          setStatus(`${next.total} páginas · ${(next.milliseconds / 1000).toFixed(2)} s`)
          setError("")
          setReady(true)
        } catch (err) {
          if (!controller.signal.aborted) { setError(err instanceof Error ? err.message : String(err)); setStatus("Prévia não atualizada") }
        } finally { stage.remove() }
      })
    }, 500)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [signature])

  useEffect(() => () => { void queue.current.finally(() => { active.current?.dispose(); active.current = null }) }, [])
  useEffect(() => {
    const container = scroll.current
    if (!container) return
    const resize = () => setZoom(Math.min(1, Math.max(.1, (container.clientWidth - 24) / (BOOK_SIZES[settings.size].width * 96 / 25.4))))
    const observer = new ResizeObserver(resize)
    observer.observe(container)
    resize()
    return () => observer.disconnect()
  }, [settings.size])
  // O atalho lê o estado na hora da tecla (registrar de novo a cada mudança deixava uma janela sem o atalho certo).
  const readyNow = useRef(ready)
  readyNow.current = ready
  useEffect(() => {
    const print = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault()
        if (readyNow.current) void Promise.resolve().then(() => vault.platform.printDocument?.()).catch(error => setError(String(error)))
      }
    }
    document.addEventListener("keydown", print)
    document.body.classList.add("book-preview-open")
    return () => { document.removeEventListener("keydown", print); document.body.classList.remove("book-preview-open") }
  }, [vault.platform])

  async function exportFile() {
    if (!ready || exporting || !source.current) return
    setExporting(true); setExportStatus("")
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      if (source.current) await readyForPagination(source.current, new AbortController().signal)
      if (format === "pdf") {
        if (vault.platform.exportPdf) {
          const path = await vault.platform.exportPdf(`${book.name}.pdf`)
          setExportStatus(path ? `PDF salvo: ${path}` : "Exportação cancelada.")
        } else {
          if (!vault.platform.printDocument) throw new Error("A impressão não está disponível nesta plataforma.")
          await vault.platform.printDocument(book.name)
          setExportStatus("Escolha Salvar como PDF no diálogo de impressão.")
        }
      } else if (format === "md" || format === "zip") {
        const { generateMarkdown, generateMarkdownZip } = await import("../../core/export/book-extra")
        const bytes = format === "md" ? new TextEncoder().encode(generateMarkdown(index,book,draft)) : await generateMarkdownZip(index,book,p=>vault.platform.readBinary(p),draft)
        const path = await vault.platform.saveBytes(`${book.name}.${format}`,bytes,format === "md" ? "text/markdown" : "application/zip")
        setExportStatus(path ? `Arquivo salvo: ${path}` : "Exportação cancelada.")
      } else {
        const { captureBook } = await import("./export-snapshot")
        const snapshot = await captureBook(source.current, index, book, vault.platform, draft)
        if (documentMode && format === "html") snapshot.navigation = true
        const bytes = format === "html" ? (await import("../../core/export/book-extra")).generateHtml(snapshot) : format === "rtf" ? (await import("../../core/export/book-extra")).generateRtf(snapshot) : format === "epub" ? (await import("../../core/export/epub")).generateEpub(snapshot) : await (await import("../../core/export/docx")).generateDocx(snapshot)
        const path = await vault.platform.saveBytes(`${book.name}.${format}`, bytes, format === "html" ? "text/html" : format === "rtf" ? "application/rtf" : format === "epub" ? "application/epub+zip" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        setExportStatus(path ? `Arquivo salvo: ${path}. ${snapshot.warnings.join(" ")}` : "Exportação cancelada.")
      }
    } catch (err) { setExportStatus(`Não foi possível exportar: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setExporting(false) }
  }

  async function change(key: string, value: string | boolean) {
    try { await vault.setProperty(book.path, key, value) } catch (err) { setError(String(err)) }
  }
  return <section className="book-preview" aria-label="Prévia paginada">
    <div className="book-preview-controls">
      <strong>{documentMode ? "Prévia do documento" : "Prévia do livro"}</strong><button className="btn" onClick={onClose}>Fechar prévia</button>
      {!documentMode && <>
      <label>Tema<select className="input" aria-label="Tema do livro" value={settings.theme} disabled={vault.info?.readOnly} onChange={(e) => void change("tema", e.target.value as BookTheme)}>{Object.entries(BOOK_THEMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Página<select className="input" aria-label="Tamanho da página" value={settings.size} disabled={vault.info?.readOnly} onChange={(e) => void change("pagina", e.target.value as BookSize)}>{Object.keys(BOOK_SIZES).map((size) => <option key={size}>{size}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={settings.newChapter} disabled={vault.info?.readOnly} onChange={(e) => void change("capitulos_nova_pagina", e.target.checked)} />Capítulos em página nova</label>
      <button className="btn" onClick={() => setMetadata(!metadata)} disabled={vault.info?.readOnly}>Editar capa e créditos</button>
      </>}
      <button className="btn" disabled={!ready || !vault.platform.printDocument} onClick={() => void Promise.resolve().then(() => vault.platform.printDocument?.(book.name)).catch(error => setError(String(error)))}>Imprimir (Ctrl+P)</button>
      <label>Formato<select className="input" aria-label="Formato de exportação" value={format} disabled={exporting} onChange={(e) => setFormat(e.target.value)}><option value="pdf">PDF</option><option value="epub">EPUB</option><option value="docx">DOCX</option><option value="html">HTML offline</option><option value="rtf">RTF</option>{!documentMode && <><option value="md">Markdown único</option><option value="zip">Pasta Markdown (ZIP)</option></>}</select></label>
      <button className="btn primary" disabled={!ready || exporting} onClick={() => void exportFile()}>{exporting ? "Exportando…" : "Exportar arquivo"}</button>
      {["epub","docx"].includes(format) && <p className="small">{format === "epub" ? "EPUB ajusta a paginação ao leitor; colunas viram texto corrido." : "DOCX é editável; a paginação e as fontes dependem do Word ou LibreOffice. Fórmulas ficam em LaTeX."}</p>}
      {exportStatus && <p role="status" data-book-export-status>{exportStatus}</p>}
      <span className="small muted" role="status" data-book-pagination-status>{status}</span>
    </div>
    {(error || cssError) && <p className="proto-note" role="alert">{error || cssError}</p>}
    {decoration && <style>{decoration}</style>}
    {!documentMode && <BookFinishSettings key={book.path} book={book} />}
    {metadata && <BookMetadata book={book} onClose={() => setMetadata(false)} />}
    <div className="book-preview-scroll" ref={scroll}>
      <div className={`book-preview-output ${paperClass}`} ref={output} style={{ zoom }} aria-busy={!ready} />
    </div>
    <div className={`book-preview-source ${paperClass}`} ref={source} aria-hidden="true" inert>
      <div className={`book-print ${settings.newChapter ? "chapters-new-page" : ""}`}>
        {data.exportar_capa !== false && <section className="book-print-cover">
          <h1 className="book-print-title">{book.name}</h1>
          {typeof data.subtitulo === "string" && <p className="book-print-subtitle">{data.subtitulo}</p>}
          {typeof data.capa === "string" && data.capa.startsWith("[[") && <PreviewMarkdown path={book.path} text={`!${data.capa}`} />}
          {typeof data.autor === "string" && <p className="book-print-author">{data.autor}</p>}
        </section>}
        {typeof data.creditos === "string" && data.creditos.trim() && <section className="book-print-credits"><h1>Créditos</h1><p>{data.creditos}</p></section>}
        {chapters.map((chapter, i) => <section id={`book-chapter-${i}`} key={`${chapter.path}:${i}`} className={chapter.kind === "parte" ? "book-part" : chapter.kind === "capitulo" ? "book-chapter" : "book-section"}>
          <h2 className="book-chapter-heading">{chapter.title}</h2>
          {chapter.kind === "indice" ? <ul>{indexEntries(index,book,draft).map(entry=><li key={entry.term}><strong>{entry.term}</strong>: {entry.chapters.map((number,i)=><span key={number}>{i>0 && ", "}<a href={`#book-chapter-${number}`}>Capítulo {number+1}</a></span>)}</li>)}</ul> : <PreviewMarkdown path={chapter.path} text={chapter.body} showSecrets={showSecrets} />}
        </section>)}
        {typeof data.contracapa === "string" && data.contracapa.trim() && <section className="book-print-back"><h1>{book.name}</h1><p>{data.contracapa}</p></section>}
      </div>
    </div>
  </section>
}

function BookMetadata({ book, onClose }: { book: IndexedNote; onClose(): void }) {
  const vault = useVault()
  const [base] = useState(book.text)
  const props = bookProperties(book)
  const [title, setTitle] = useState(book.name)
  const [values, setValues] = useState(() => Object.fromEntries(["subtitulo", "autor", "capa", "creditos", "contracapa"].map((key) => [key, typeof props[key] === "string" ? props[key] : ""])))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return <form className="book-metadata" onSubmit={(event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    void (async () => {
      try {
        if (vault.index?.note(book.path)?.text !== base) throw new Error("O livro mudou enquanto este formulário estava aberto. Feche e reabra para conferir os dados atuais.")
        for (const [key, value] of Object.entries(values)) if (value !== (props[key] ?? "")) await vault.setProperty(book.path, key, value)
        if (title.trim() !== book.name) {
          const next = `${dirname(book.path)}/${title.trim()}.md`
          await vault.rename(book.path, next)
          navigate(bookRoute(next))
        }
        onClose()
      } catch (err) { setError(String(err)); setBusy(false) }
    })()
  }}>
    <label>Título (nome da nota)<input className="input" aria-label="Título da capa" required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    {[["subtitulo", "Subtítulo"], ["autor", "Autor"], ["capa", "Imagem da capa (link para anexo)"], ["creditos", "Créditos"], ["contracapa", "Contracapa"]].map(([key, label]) => <label key={key}>{label}<textarea className="input" rows={key === "creditos" || key === "contracapa" ? 3 : 1} aria-label={label} value={values[key!] ?? ""} onChange={(e) => setValues({ ...values, [key!]: e.target.value })} /></label>)}
    {error && <p role="alert">{error} As propriedades já gravadas permanecem na nota.</p>}
    <div className="row-wrap"><button className="btn primary" disabled={busy}>Salvar capa e créditos</button><button type="button" className="btn" disabled={busy} onClick={onClose}>Cancelar</button></div>
  </form>
}

function PreviewMarkdown({ path, text, showSecrets = true }: { path: string; text: string; showSecrets?: boolean }) {
  const vault = useVault()
  const notes = useMemo(() => vaultNoteSet(vault.index!, path, {}, vault.platform), [vault.index, vault.version, path, vault.platform])
  return <NoteSetContext.Provider value={notes}><Markdown source={text} space="livros" showSecrets={showSecrets} /></NoteSetContext.Provider>
}
