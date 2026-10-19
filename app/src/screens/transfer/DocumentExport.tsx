import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { FileDown } from "lucide-react"
import { prepareDocumentExport } from "../../core/transfer/document"
import { VaultView, useVault } from "../../platform/VaultProvider"
import { flushOpenNotes } from "../../lib/vault-notes"
const BookPreview = lazy(() => import("../books/BookPreview"))
function deny<T>(): Promise<T> { return Promise.reject(new Error("Esta prévia não modifica as notas do cofre.")) }

export function DocumentExport({ paths }: { paths: string[] }) {
  const vault = useVault()
  const current = useRef(vault)
  current.current = vault
  const [title, setTitle] = useState("Exportação de notas")
  const [players, setPlayers] = useState(false), [cover, setCover] = useState(false)
  const [prepared, setPrepared] = useState<ReturnType<typeof prepareDocumentExport> | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { setPrepared(null) }, [vault.info?.path])
  const notes = paths.filter(path => /\.md$/i.test(path))
  async function open() {
    setError("")
    try {
      const identity = vault.info?.path
      await flushOpenNotes()
      if (current.current.info?.path !== identity || (await vault.platform.vault())?.path !== identity) throw new Error("O cofre mudou durante a preparação.")
      setPrepared(prepareDocumentExport(current.current.index!, notes, title, players, cover))
    }
    catch (error) { setError(error instanceof Error ? error.message : String(error)) }
  }
  return <section className="card stack transfer-document">
    <h2 className="section-title"><FileDown size={18} /> Notas em PDF, DOCX ou HTML</h2>
    <p className="small">Usa a seleção de arquivos acima: {notes.length} nota(s). Confira a prévia paginada antes de salvar; a exportação mantém as notas originais.</p>
    <label className="field"><span>Título do documento</span><input className="input" value={title} onChange={event => setTitle(event.target.value)} /></label>
    <div className="row-wrap"><label className="check"><input type="checkbox" checked={cover} onChange={event => setCover(event.target.checked)} /> Incluir capa</label><label className="check"><input type="checkbox" checked={players} onChange={event => setPlayers(event.target.checked)} /> Versão dos jogadores, sem artigos e blocos secretos</label></div>
    <button className="btn" disabled={!notes.length || !vault.index} onClick={() => void open()}>Preparar documento</button>
    {error && <p role="alert" className="transfer-error">{error}</p>}
    {prepared && <VaultView value={{ ...vault, info: vault.info ? { ...vault.info, readOnly: true } : null, index: prepared.index, save: deny, createNote: deny, createFile: deny, createFolder: deny, rename: deny, trash: deny, setProperty: deny, importTransfer: deny, addAttachment: deny }}>
      {prepared.excluded > 0 && <p role="status">{prepared.excluded} nota(s) secretas não entram nesta versão.</p>}
      <Suspense fallback={<p role="status">Preparando o documento…</p>}><BookPreview book={prepared.book} onClose={() => setPrepared(null)} documentMode showSecrets={!players} /></Suspense>
    </VaultView>}
  </section>
}
