import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { FileDown } from "lucide-react"
import { documentPaths, staticDocumentIndex } from "../../core/export/documents"
import { publicWikiIndex } from "../../core/wiki-public"
import { campaignInfo, campaignJournal, listSessions } from "../../core/campaigns"
import { VaultIndex } from "../../core/vault-index"
import { prepareDocumentExport } from "../../core/transfer/document"
import { VaultView, useVault } from "../../platform/VaultProvider"
import { flushOpenNotes } from "../../lib/vault-notes"
const BookPreview = lazy(() => import("../../screens/books/BookPreview"))
function deny<T>(): Promise<T> { return Promise.reject(new Error("Esta prévia não modifica as notas do cofre.")) }

export function DocumentExport({ paths, initialTitle = "Exportação de notas", initialPlayers = false, journal, selectable = false }: { paths: string[]; initialTitle?: string; initialPlayers?: boolean; journal?: string; selectable?: boolean }) {
  const vault = useVault()
  const current = useRef(vault)
  current.current = vault
  const [title, setTitle] = useState(initialTitle)
  const [players, setPlayers] = useState(initialPlayers), [cover, setCover] = useState(false)
  const [prepared, setPrepared] = useState<ReturnType<typeof prepareDocumentExport> | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { setPrepared(null) }, [vault.info?.path])
  const [linked, setLinked] = useState(false)
  const [selection, setSelection] = useState(new Set(paths))
  const [filter, setFilter] = useState("")
  const notes = paths.filter(path => /\.md$/i.test(path))
  const pathsKey = JSON.stringify(paths)
  useEffect(() => { setSelection(new Set(paths)); setPrepared(null) }, [pathsKey])
  useEffect(() => { setPrepared(null) }, [players, cover, title, linked, selection])
  async function open() {
    setError("")
    try {
      const identity = vault.info?.path
      await flushOpenNotes()
      if (current.current.info?.path !== identity || (await vault.platform.vault())?.path !== identity) throw new Error("O cofre mudou durante a preparação.")
      let source = current.current.index!
      let chosen = documentPaths(source, notes.filter(path => selection.has(path)), linked, players)
      if (journal) {
        source = players ? publicWikiIndex(source) : source
        const campaign = campaignInfo(source, journal)
        const text = campaignJournal(campaign, listSessions(source, campaign, new Date()))
        const path = `.exportacao-diario/${crypto.randomUUID()}.md`
        source = new VaultIndex([...source.allFiles(), { path, size: new TextEncoder().encode(text).length, mtime: 1 }], { ...Object.fromEntries(source.allNotes().map(note => [note.path, note.text])), [path]: text })
        chosen = [path]
      }
      setPrepared(prepareDocumentExport(staticDocumentIndex(source, players), chosen, title, players, cover))
    }
    catch (error) { setError(error instanceof Error ? error.message : String(error)) }
  }
  return <section className="card stack transfer-document">
    <h2 className="section-title"><FileDown size={18} /> Documento ou site offline</h2>
    <p className="small">Seleção atual: {notes.filter(path => selection.has(path)).length} nota(s). Confira a prévia antes de salvar. Os anexos usados acompanham o documento.</p>
    {selectable && !journal && notes.length > 1 && <details open className="export-note-selection"><summary>Notas da coleção · {selection.size} selecionada(s)</summary>
      <input type="search" className="input" aria-label="Filtrar notas da exportação" placeholder="Filtrar notas…" value={filter} onChange={e => setFilter(e.target.value)} />
      <div className="row-wrap"><button className="btn" onClick={() => setSelection(new Set(notes))}>Selecionar todas</button><button className="btn" onClick={() => setSelection(new Set())}>Limpar seleção</button></div>
      <div style={{ maxHeight: 180, overflow: "auto" }}>{notes.filter(path => path.toLocaleLowerCase("pt-BR").includes(filter.toLocaleLowerCase("pt-BR"))).map(path => <label className="check" key={path}><input type="checkbox" checked={selection.has(path)} onChange={e => setSelection(before => { const next = new Set(before); if (e.target.checked) next.add(path); else next.delete(path); return next })} /><span style={{ overflowWrap: "anywhere" }}>{path}</span></label>)}</div>
    </details>}
    {!journal && <label className="check"><input type="checkbox" checked={linked} onChange={e => setLinked(e.target.checked)} /> Incluir também as notas ligadas (até 200 notas)</label>}
    <label className="field"><span>Título do documento</span><input className="input" value={title} onChange={event => setTitle(event.target.value)} /></label>
    <div className="row-wrap"><label className="check"><input type="checkbox" checked={cover} onChange={event => setCover(event.target.checked)} /> Incluir capa</label><label className="check"><input type="checkbox" checked={players} onChange={event => setPlayers(event.target.checked)} /> Versão dos jogadores, sem artigos e blocos secretos</label></div>
    <div className="transfer-actions"><button className="btn primary" disabled={(!journal && (!notes.length || !selection.size)) || !vault.index} onClick={() => void open()}>Preparar documento</button></div>
    {error && <p role="alert" className="transfer-error">{error}</p>}
    {prepared && <VaultView value={{ ...vault, info: vault.info ? { ...vault.info, readOnly: true } : null, index: prepared.index, save: deny, createNote: deny, createFile: deny, createFolder: deny, rename: deny, trash: deny, setProperty: deny, importTransfer: deny, addAttachment: deny }}>
      {prepared.excluded > 0 && <p role="status">{prepared.excluded} nota(s) secretas não entram nesta versão.</p>}
      <Suspense fallback={<p role="status">Preparando o documento…</p>}><BookPreview book={prepared.book} onClose={() => setPrepared(null)} documentMode siteEnabled={!journal} showSecrets={!players} /></Suspense>
    </VaultView>}
  </section>
}
