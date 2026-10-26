import { Paintbrush } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { useNarrow } from "../../components/editor/use-narrow"
import { bookStyle } from "../../core/book-style"
import { CoverImagePicker } from "./CoverImagePicker"
import { bookProperties, bookRoute } from "../../core/books"
import { dirname } from "../../core/text"
import { setProperty as setPropertyText, type PropertyValue } from "../../core/properties"
import type { IndexedNote } from "../../core/vault-index"
import { navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"
import { BookPages, type BookPagesHandle, type PagesState, type PagesZoom } from "./BookPages"
import { BookStylePanel, type SaveState, type StyleChanges } from "./BookStylePanel"
import { readyForPagination } from "./pagination"

/** O livro com as mudanças do Estilo ainda não gravadas, para a prévia mostrar na hora. */
function withChanges(note: IndexedNote, changes: StyleChanges): IndexedNote {
  if (!Object.keys(changes).length || !note.meta.frontmatter) return note
  const data: Record<string, unknown> = { ...bookProperties(note) }
  for (const [key, value] of Object.entries(changes)) if (value === undefined) delete data[key]; else data[key] = value
  return { ...note, meta: { ...note.meta, frontmatter: { ...note.meta.frontmatter, data } } }
}
const same = (a: PropertyValue | undefined, b: PropertyValue | undefined) => JSON.stringify(a) === JSON.stringify(b)

export default function BookPreview({ book, draft, onClose, documentMode = false, showSecrets = true, siteEnabled = false }: { book: IndexedNote; draft?: { path: string; text: string }; onClose(): void; documentMode?: boolean; showSecrets?: boolean; siteEnabled?: boolean }) {
  const vault = useVault(), index = vault.index!
  const narrow = useNarrow()
  const pages = useRef<BookPagesHandle>(null)
  const [pagesState, setPagesState] = useState<PagesState>({ ready: false, status: "Preparando prévia…", error: "", total: 0 })
  const { ready, status } = pagesState
  const [error, setError] = useState("")
  const [metadata, setMetadata] = useState(false)
  const [format, setFormat] = useState("pdf")
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState("")
  const [zoom, setZoom] = useState<PagesZoom>("largura")
  const [styleOpen, setStyleOpen] = useState(false)

  // Estilo do livro (L3): as mudanças valem na prévia na hora e vão para o livro um segundo depois da última, numa
  // gravação só. Desfazer volta o último ajuste (gravado ou não).
  const [pending, setPending] = useState<StyleChanges>({})
  const [history, setHistory] = useState<{ before: StyleChanges; coalesce?: string; at: number }[]>([])
  const [saveState, setSaveState] = useState<SaveState>("salvo")
  const shown = useMemo(() => withChanges(book, pending), [book, pending])
  const style = bookStyle(index, shown)
  const pendingNow = useRef(pending)
  pendingNow.current = pending
  function change(changes: StyleChanges, coalesce?: string) {
    const props = bookProperties(shown)
    const before = Object.fromEntries(Object.keys(changes).map((key) => [key, props[key] as PropertyValue | undefined]))
    const now = Date.now()
    setHistory((list) => {
      const last = list.at(-1)
      // Digitar ou arrastar uma cor vira um passo só de Desfazer.
      if (coalesce && last?.coalesce === coalesce && now - last.at < 1500) return [...list.slice(0, -1), { ...last, at: now }]
      return [...list.slice(-49), { before, coalesce, at: now }]
    })
    setPending((current) => ({ ...current, ...changes }))
  }
  function undo() {
    const last = history.at(-1)
    if (!last) return
    setHistory((list) => list.slice(0, -1))
    setPending((current) => ({ ...current, ...last.before }))
  }
  const flushing = useRef(Promise.resolve())
  const flush = () => (flushing.current = flushing.current.then(async () => {
    const changes = pendingNow.current
    if (!Object.keys(changes).length) return
    const note = vault.index?.note(book.path)
    if (!note) return
    try {
      let text = note.text
      for (const [key, value] of Object.entries(changes)) text = setPropertyText(text, key, value)
      if (text !== note.text) await vault.save(book.path, text)
      setPending((current) => Object.fromEntries(Object.entries(current).filter(([key, value]) => !(key in changes) || !same(changes[key], value))))
      setSaveState("salvo")
    } catch (err) { setSaveState("erro"); setError(`O estilo não foi gravado: ${err instanceof Error ? err.message : String(err)}`) }
  }))
  const flushNow = useRef(flush)
  flushNow.current = flush
  useEffect(() => {
    if (!Object.keys(pending).length) return
    setSaveState("salvando")
    const timer = setTimeout(() => void flushNow.current(), 1000)
    return () => clearTimeout(timer)
  }, [pending])
  // Sair do Diagramar não perde o último ajuste.
  useEffect(() => () => { void flushNow.current() }, [])

  // O atalho lê o estado na hora da tecla (registrar de novo a cada mudança deixava uma janela sem o atalho certo).
  const readyNow = useRef(ready)
  readyNow.current = ready
  // Na impressora, o fundo do papel só sai se o livro pedir (gasta tinta); o PDF para ler continua com ele (L2).
  const plainPrint = bookProperties(shown).fundo_impressao !== true
  const plainNow = useRef(plainPrint)
  plainNow.current = plainPrint
  function requestPrint(name?: string) {
    const plain = plainNow.current
    if (plain) document.body.classList.add("book-print-plain")
    const done = () => document.body.classList.remove("book-print-plain")
    try { void Promise.resolve(vault.platform.printDocument?.(name)).catch(error => setError(String(error))).finally(done) }
    catch (error) { setError(String(error)); done() }
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
      // O arquivo sai com o estilo gravado: o que ainda estava esperando o segundo vai antes.
      await flush()
      const saved = vault.index?.note(book.path) ?? book
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
        const bytes = format === "md" ? new TextEncoder().encode(generateMarkdown(index,saved,draft)) : await generateMarkdownZip(index,saved,p=>vault.platform.readBinary(p),draft)
        const path = await vault.platform.saveBytes(`${book.name}.${format}`,bytes,format === "md" ? "text/markdown" : "application/zip")
        setExportStatus(path ? `Arquivo salvo: ${path}` : "Exportação cancelada.")
      } else {
        const { captureBook } = await import("./export-snapshot")
        const snapshot = await captureBook(source, index, saved, vault.platform, draft)
        if (documentMode && format === "html") snapshot.navigation = true
        const bytes = format === "site" ? (await import("../../core/export/documents")).generateStaticSite(snapshot) : format === "html" ? (await import("../../core/export/book-extra")).generateHtml(snapshot) : format === "rtf" ? (await import("../../core/export/book-extra")).generateRtf(snapshot) : format === "epub" ? (await import("../../core/export/epub")).generateEpub(snapshot) : await (await import("../../core/export/docx")).generateDocx(snapshot)
        const path = await vault.platform.saveBytes(`${book.name}.${format === "site" ? "site.zip" : format}`, bytes, format === "site" ? "application/zip" : format === "html" ? "text/html" : format === "rtf" ? "application/rtf" : format === "epub" ? "application/epub+zip" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        setExportStatus(path ? `Arquivo salvo: ${path}. ${snapshot.warnings.join(" ")}` : "Exportação cancelada.")
      }
    } catch (err) { setExportStatus(`Não foi possível exportar: ${err instanceof Error ? err.message : String(err)}`) }
    finally { setExporting(false) }
  }

  const showStyle = !documentMode && (!narrow || styleOpen)
  const stylePanel = <BookStylePanel key={book.path} book={shown} style={style} onChange={change} onUndo={undo} canUndo={history.length > 0} saveState={saveState} onEditCover={() => setMetadata(true)} narrow={narrow} />
  return <section className={`book-preview${documentMode ? " document-mode" : ""}`} aria-label={documentMode ? "Prévia paginada" : "Diagramar"}>
    {showStyle && !narrow && stylePanel}
    <div className="book-diagram">
      <div className="book-preview-controls">
        <strong>{documentMode ? "Prévia do documento" : "Diagramar e exportar"}</strong>
        {!documentMode && narrow && <button type="button" className="btn" aria-expanded={styleOpen} onClick={() => setStyleOpen(!styleOpen)}><Paintbrush size={16} /> Estilo do livro</button>}
        <button className="btn" onClick={onClose}>{documentMode ? "Fechar prévia" : "Voltar ao texto"}</button>
        {!narrow && <ChoiceGroup label="Zoom das páginas" value={zoom} options={[{ value: "largura", label: "Largura" }, { value: "pagina", label: "Página" }, { value: "duas", label: "Duas" }]} onChange={setZoom} />}
        <button className="btn" disabled={!ready || !vault.platform.printDocument} onClick={() => requestPrint(book.name)}>{vault.platform.kind === "capacitor" ? "Imprimir" : "Imprimir (Ctrl+P)"}</button>
        <label>Formato<select className="input" aria-label="Formato de exportação" value={format} disabled={exporting} onChange={(e) => setFormat(e.target.value)}><option value="pdf">PDF</option><option value="epub">EPUB</option><option value="docx">DOCX</option><option value="html">HTML offline</option><option value="rtf">RTF</option>{siteEnabled && <option value="site">Site offline (ZIP, uma página por nota)</option>}{!documentMode && <><option value="md">Markdown único</option><option value="zip">Pasta Markdown (ZIP)</option></>}</select></label>
        <button className="btn primary" disabled={!ready || exporting} onClick={() => void exportFile()}>{exporting ? "Exportando…" : "Exportar arquivo"}</button>
        {["epub","docx"].includes(format) && <p className="small">{format === "epub" ? "EPUB ajusta a paginação ao leitor; colunas viram texto corrido." : "DOCX é editável; a paginação e as fontes dependem do Word ou LibreOffice. Fórmulas ficam em LaTeX."}</p>}
        {exportStatus && <p role="status" data-book-export-status>{exportStatus}</p>}
        <span className="small muted" role="status" data-book-pagination-status>{status}</span>
      </div>
      {/* No celular o painel abre logo abaixo do botão, antes das páginas. */}
      {showStyle && narrow && stylePanel}
      {error && <p className="proto-note" role="alert">{error}</p>}
      {metadata && <BookMetadata book={book} onClose={() => setMetadata(false)} />}
      <BookPages ref={pages} book={shown} draft={draft} zoom={zoom} showSecrets={showSecrets} onState={setPagesState} />
    </div>
  </section>
}

const COVER_FIELDS = [["titulo_capa", "Título na capa"], ["edicao", "Edição"], ["subtitulo", "Subtítulo"], ["autor", "Autor"], ["creditos", "Créditos"], ["contracapa", "Contracapa"]] as const

/** Capa e créditos (L4): título e edição separados do nome da nota e a imagem pelo seletor (o desenho fica no Estilo). */
function BookMetadata({ book, onClose }: { book: IndexedNote; onClose(): void }) {
  const vault = useVault()
  const props = bookProperties(book)
  const initial = useMemo<Record<string, string>>(() => Object.fromEntries([...COVER_FIELDS.map(([key]) => key), "capa"].map((key) => [key, typeof props[key] === "string" ? String(props[key]) : ""])), [book.path])
  const [title, setTitle] = useState(book.name)
  const [values, setValues] = useState<Record<string, string>>(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  return <form className="book-metadata" aria-label="Capa e créditos" onSubmit={(event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    void (async () => {
      try {
        // Só o que mudou neste formulário vai para o livro, sobre o texto mais novo (o Estilo pode ter gravado no meio).
        const note = vault.index?.note(book.path)
        if (!note) throw new Error("O livro não está mais no cofre.")
        let text = note.text
        for (const [key, value] of Object.entries(values)) if (value !== initial[key]) text = setPropertyText(text, key, value.trim() ? value : undefined)
        if (text !== note.text) await vault.save(book.path, text)
        if (title.trim() !== book.name) {
          const next = `${dirname(book.path)}/${title.trim()}.md`
          await vault.rename(book.path, next)
          navigate(bookRoute(next))
        }
        onClose()
      } catch (err) { setError(String(err)); setBusy(false) }
    })()
  }}>
    <label className="field"><span>Nome da nota</span><input className="input" aria-label="Nome da nota do livro" required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
    {COVER_FIELDS.map(([key, label]) => <label key={key} className="field"><span>{label}</span><textarea className="input" rows={key === "creditos" || key === "contracapa" ? 3 : 1} aria-label={label} placeholder={key === "titulo_capa" ? book.name : undefined} value={values[key] ?? ""} onChange={(e) => setValues({ ...values, [key]: e.target.value })} /></label>)}
    <CoverImagePicker value={values.capa ?? ""} nearNote={book.path} onChange={(link) => setValues({ ...values, capa: link })} />
    {error && <p role="alert">{error}</p>}
    <div className="row-wrap"><button className="btn primary" disabled={busy}>Salvar capa e créditos</button><button type="button" className="btn" disabled={busy} onClick={onClose}>Cancelar</button></div>
  </form>
}
