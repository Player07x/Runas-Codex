import { useEffect, useRef, useState } from "react"
import { bookRoute } from "../../core/books"
import { importFolder, saveImportedBook } from "../../core/books-import/save"
import type { ImportedBook } from "../../core/books-import/types"
import { Markdown } from "../../components/Markdown"
import { navigate } from "../../lib/router"
import { useVault } from "../../platform/VaultProvider"

export function BookImport({ onClose }: { onClose(): void }) {
  const vault = useVault()
  const [file, setFile] = useState<File>()
  const [title, setTitle] = useState("")
  const [level, setLevel] = useState(1)
  const [preview, setPreview] = useState<ImportedBook>()
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const worker = useRef<Worker | null>(null)
  const generation = useRef(0)
  useEffect(() => () => { generation.current++; worker.current?.terminate() }, [])
  const folder = importFolder(title, vault.index!.allFiles().map((entry) => entry.path))

  const invalidate = () => { generation.current++; worker.current?.terminate(); worker.current = null; setBusy(false); setPreview(undefined); setError("") }
  async function prepare() {
    if (!file || !title.trim()) return
    invalidate()
    const current = generation.current
    setBusy(true)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Escolha um arquivo de até 20 MB.")
      const options = { title: title.trim(), headingLevel: level }
      const format = /\.docx$/i.test(file.name) ? "docx" : /\.(md|markdown|txt)$/i.test(file.name) ? "markdown" : null
      if (!format) throw new Error("Escolha Markdown do Homebrewery/GM Binder (.md ou .txt) ou um documento .docx.")
      const bytes = new Uint8Array(await file.arrayBuffer())
      if (current !== generation.current) return
      const book = await new Promise<ImportedBook>((resolve, reject) => {
        const task = new Worker(new URL("./import.worker.ts", import.meta.url), { type: "module" })
        worker.current = task
        const timer = window.setTimeout(() => { task.terminate(); reject(new Error("A conversão demorou demais. Tente um arquivo menor.")) }, 30000)
        const finish = () => { clearTimeout(timer); task.terminate(); worker.current = null }
        task.onmessage = (event: MessageEvent<{ book?: ImportedBook; error?: string }>) => {
          finish()
          if (event.data.book) resolve(event.data.book)
          else reject(new Error(event.data.error || "Não foi possível converter esse arquivo."))
        }
        task.onerror = () => { finish(); reject(new Error("Não foi possível converter esse arquivo.")) }
        task.postMessage({ bytes, options, format }, [bytes.buffer])
      })
      if (current === generation.current) setPreview(book)
    } catch (err) { if (current === generation.current) setError(err instanceof Error ? err.message : String(err)) }
    finally { if (current === generation.current) setBusy(false) }
  }
  async function confirm() {
    if (!preview || saving || vault.info?.readOnly) return
    setSaving(true); setError("")
    try {
      const path = await saveImportedBook(preview, folder, vault)
      navigate(bookRoute(path))
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); setPreview(undefined) }
    finally { setSaving(false) }
  }
  return <section className="book-import stack" aria-labelledby="book-import-heading">
    <div className="row-wrap"><h2 id="book-import-heading">Importar livro</h2><button className="btn" disabled={saving} onClick={onClose}>Fechar importação</button></div>
    <p className="muted">Homebrewery, GM Binder ou Word. Confira os capítulos e os avisos antes de salvar no cofre.</p>
    <label className="field">Arquivo (até 20 MB)<input className="input" type="file" aria-label="Arquivo do livro" accept=".md,.markdown,.txt,.docx" disabled={saving} onChange={(event) => {
      invalidate(); const chosen = event.target.files?.[0]; setFile(chosen); setTitle(chosen?.name.replace(/\.[^.]+$/, "") ?? "")
    }} /></label>
    <div className="row-wrap">
      <label className="field">Título do livro<input className="input" aria-label="Título do livro importado" value={title} disabled={saving} onChange={(event) => { invalidate(); setTitle(event.target.value) }} /></label>
      <label className="field">Iniciar capítulo em<select className="input" aria-label="Nível dos títulos para capítulos" value={level} disabled={saving} onChange={(event) => { invalidate(); setLevel(Number(event.target.value)) }}>
        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Título {n} (H{n})</option>)}
      </select></label>
      <button className="btn" disabled={!file || !title.trim() || busy || saving} onClick={() => void prepare()}>Ver prévia da importação</button>
    </div>
    <p role="status" aria-live="polite">{busy ? "Convertendo arquivo…" : saving ? "Salvando capítulos e anexos…" : ""}</p>
    {error && <p role="alert">{error}</p>}
    {preview && <div className="stack" data-book-import-preview>
      <strong>{preview.chapters.length} {preview.chapters.length === 1 ? "capítulo" : "capítulos"} · {preview.images.length} {preview.images.length === 1 ? "imagem embutida" : "imagens embutidas"} · {preview.warnings.length} {preview.warnings.length === 1 ? "aviso" : "avisos"}</strong>
      <p className="small">Destino: {folder}/. Uma pasta existente recebe outro número.</p>
      <ol>{preview.chapters.map((chapter, i) => <li key={i}>{chapter.title}</li>)}</ol>
      {preview.warnings.length > 0 && <details open><summary>Avisos da conversão</summary><ul>{preview.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}
      <details><summary>Conteúdo convertido</summary>{preview.chapters.map((chapter, i) => <section key={i}><h3>{chapter.title}</h3><Markdown source={chapter.markdown.replace(/!\[[^\]]*\]\(import-image:\d+\)|<img[^>]*src="import-image:\d+"[^>]*>/g, "[Imagem embutida — será salva ao confirmar]")} /></section>)}</details>
      <button className="btn primary" disabled={saving || vault.info?.readOnly} onClick={() => void confirm()}>Confirmar importação</button>
    </div>}
  </section>
}
