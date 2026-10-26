import { useEffect, useRef, useState } from "react"
import { bookProperties, bookRoute } from "../../core/books"
import { BOOK_SIZES, BOOK_THEMES, previewSettings, type BookSize, type BookTheme } from "../../core/books-preview"
import { BookFinishSettings } from "./BookFinishSettings"
import { dirname } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { BookPages, type BookPagesHandle, type PagesState } from "./BookPages"
import { readyForPagination } from "./pagination"

export default function BookPreview({ book, draft, onClose, documentMode = false, showSecrets = true, siteEnabled = false }: { book: IndexedNote; draft?: { path: string; text: string }; onClose(): void; documentMode?: boolean; showSecrets?: boolean; siteEnabled?: boolean }) {
  const vault = useVault(), index = vault.index!
  const settings = previewSettings(book)
  const pages = useRef<BookPagesHandle>(null)
  const [pagesState, setPagesState] = useState<PagesState>({ ready: false, status: "Preparando prévia…", error: "", total: 0 })
  const { ready, status } = pagesState
  const [error, setError] = useState("")
  const [metadata, setMetadata] = useState(false)
  const [format, setFormat] = useState("pdf")
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState("")

  // O atalho lê o estado na hora da tecla (registrar de novo a cada mudança deixava uma janela sem o atalho certo).
  const readyNow = useRef(ready)
  readyNow.current = ready
  function requestPrint(name?: string) {
    try { void Promise.resolve(vault.platform.printDocument?.(name)).catch(error => setError(String(error))) }
    catch (error) { setError(String(error)) }
  }
  useEffect(() => {
    const print = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault()
        if (readyNow.current) requestPrint()
      }
    }
    document.addEventListener("keydown", print)
    document.body.classList.add("book-preview-open")
    return () => { document.removeEventListener("keydown", print); document.body.classList.remove("book-preview-open") }
  }, [vault.platform])

  async function exportFile() {
    const source = pages.current?.source
    if (!ready || exporting || !source) return
    setExporting(true); setExportStatus("")
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      await readyForPagination(source, new AbortController().signal)
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
        const snapshot = await captureBook(source, index, book, vault.platform, draft)
        if (documentMode && format === "html") snapshot.navigation = true
        const bytes = format === "site" ? (await import("../../core/export/documents")).generateStaticSite(snapshot) : format === "html" ? (await import("../../core/export/book-extra")).generateHtml(snapshot) : format === "rtf" ? (await import("../../core/export/book-extra")).generateRtf(snapshot) : format === "epub" ? (await import("../../core/export/epub")).generateEpub(snapshot) : await (await import("../../core/export/docx")).generateDocx(snapshot)
        const path = await vault.platform.saveBytes(`${book.name}.${format === "site" ? "site.zip" : format}`, bytes, format === "site" ? "application/zip" : format === "html" ? "text/html" : format === "rtf" ? "application/rtf" : format === "epub" ? "application/epub+zip" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
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
      <strong>{documentMode ? "Prévia do documento" : "Diagramar e exportar"}</strong><button className="btn" onClick={onClose}>{documentMode ? "Fechar prévia" : "Voltar ao texto"}</button>
      {!documentMode && <>
      <label>Tema<select className="input" aria-label="Tema do livro" value={settings.theme} disabled={vault.info?.readOnly} onChange={(e) => void change("tema", e.target.value as BookTheme)}>{Object.entries(BOOK_THEMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Página<select className="input" aria-label="Tamanho da página" value={settings.size} disabled={vault.info?.readOnly} onChange={(e) => void change("pagina", e.target.value as BookSize)}>{Object.keys(BOOK_SIZES).map((size) => <option key={size}>{size}</option>)}</select></label>
      <label className="check"><input type="checkbox" checked={settings.newChapter} disabled={vault.info?.readOnly} onChange={(e) => void change("capitulos_nova_pagina", e.target.checked)} />Capítulos em página nova</label>
      <button className="btn" onClick={() => setMetadata(!metadata)} disabled={vault.info?.readOnly}>Editar capa e créditos</button>
      </>}
      <button className="btn" disabled={!ready || !vault.platform.printDocument} onClick={() => requestPrint(book.name)}>{vault.platform.kind === "capacitor" ? "Imprimir" : "Imprimir (Ctrl+P)"}</button>
      <label>Formato<select className="input" aria-label="Formato de exportação" value={format} disabled={exporting} onChange={(e) => setFormat(e.target.value)}><option value="pdf">PDF</option><option value="epub">EPUB</option><option value="docx">DOCX</option><option value="html">HTML offline</option><option value="rtf">RTF</option>{siteEnabled && <option value="site">Site offline (ZIP, uma página por nota)</option>}{!documentMode && <><option value="md">Markdown único</option><option value="zip">Pasta Markdown (ZIP)</option></>}</select></label>
      <button className="btn primary" disabled={!ready || exporting} onClick={() => void exportFile()}>{exporting ? "Exportando…" : "Exportar arquivo"}</button>
      {["epub","docx"].includes(format) && <p className="small">{format === "epub" ? "EPUB ajusta a paginação ao leitor; colunas viram texto corrido." : "DOCX é editável; a paginação e as fontes dependem do Word ou LibreOffice. Fórmulas ficam em LaTeX."}</p>}
      {exportStatus && <p role="status" data-book-export-status>{exportStatus}</p>}
      <span className="small muted" role="status" data-book-pagination-status>{status}</span>
    </div>
    {error && <p className="proto-note" role="alert">{error}</p>}
    {!documentMode && <BookFinishSettings key={book.path} book={book} />}
    {metadata && <BookMetadata book={book} onClose={() => setMetadata(false)} />}
    <BookPages ref={pages} book={book} draft={draft} showSecrets={showSecrets} onState={setPagesState} />
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
