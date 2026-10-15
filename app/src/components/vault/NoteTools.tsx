import { useEffect, useRef, useState } from "react"
import { compareTexts, extractText, mergeCanvasLinks, mergeLinks, mergeText, textStats, type NoteSnapshot } from "../../core/note-tools"
import { dirname, noteName, toEditorText } from "../../core/text"
import { recordVersion, versions } from "../../lib/note-history"
import { navigate } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { Modal, useToast } from "../ui"

interface Props { active: boolean; path: string; draft: string; selection(): { from: number; to: number } | null; replace(text: string, cursor: number): void; flush(): Promise<void> }
export function NoteTools({ active, path, draft, selection, replace, flush }: Props) {
  const vault = useVault(), toast = useToast(), readOnly = vault.info?.readOnly
  const host = useRef<HTMLDivElement>(null)
  const [menu, setMenu] = useState(false), [dialog, setDialog] = useState<"history" | "extract" | "merge" | null>(null)
  const [history, setHistory] = useState<NoteSnapshot[]>([]), [picked, setPicked] = useState(0)
  const [name, setName] = useState(""), [target, setTarget] = useState(""), [targetText, setTargetText] = useState("")
  const [range, setRange] = useState<{ from: number; to: number } | null>(null), [original, setOriginal] = useState("")
  const [busy, setBusy] = useState(false), [error, setError] = useState("")
  const run = (action: () => Promise<void>) => { setBusy(true); setError(""); void action().catch(e => setError(e instanceof Error ? e.message : String(e))).finally(() => setBusy(false)) }
  useEffect(() => {
    const listener = (e: Event) => toast((e as CustomEvent<string>).detail)
    window.addEventListener("runas-codex:erro-historico", listener)
    return () => window.removeEventListener("runas-codex:erro-historico", listener)
  }, [toast])
  const checkOriginal = () => {
    if (toEditorText(vault.index!.note(path)!.text) !== original) throw new Error("A nota mudou desde a prévia. Feche e abra a ferramenta novamente.")
  }
  const begin = (kind: NonNullable<typeof dialog>) => {
    setMenu(false); setDialog(kind); setError(""); setOriginal(draft); setRange(selection()); setName(""); setTarget("")
    if (kind === "history") run(async () => { await flush(); setHistory(await versions(vault.info!.path, path)); setPicked(0) })
  }
  useEffect(() => {
    const command = (event: Event) => { if ((event as CustomEvent<string>).detail === "history" && active) begin("history") }
    const action = (event: Event) => {
      if (!active) return
      const kind = (event as CustomEvent<string>).detail
      if (kind === "save") run(flush)
      if (kind === "history" || (!readOnly && (kind === "extract" || kind === "merge"))) begin(kind)
    }
    window.addEventListener("runas-codex:comando", command)
    window.addEventListener("runas-codex:nota-acao", action)
    return () => { window.removeEventListener("runas-codex:comando", command); window.removeEventListener("runas-codex:nota-acao", action) }
  }, [draft, path, active, readOnly, flush, vault.index, vault.info?.path])
  const restore = async () => {
    const version = history[picked]; if (!version) return
    checkOriginal(); await flush()
    await recordVersion(vault.info!.path, path, vault.index!.note(path)!.text, true)
    await vault.save(path, version.text); setDialog(null); toast("Versão restaurada; a versão anterior ficou no histórico.")
  }
  const extract = async () => {
    checkOriginal()
    if (!range) throw new Error("Selecione o trecho no editor antes de abrir Extrair.")
    const content = extractText(original, range.from, range.to, "")
    await flush()
    const created = await vault.createNote(dirname(path), name.trim(), content.extracted)
    const plan = extractText(original, range.from, range.to, `[[${vault.index!.linkTarget(created, path)}]]`)
    // A criação vem primeiro: uma falha nunca apaga o trecho original.
    replace(plan.text, plan.cursor); setDialog(null); toast("Trecho extraído para uma nota nova.")
  }
  const merge = async () => {
    checkOriginal(); await flush()
    const current = vault.index!.note(target)
    if (!current || current.text !== targetText) throw new Error("A nota de destino mudou. Escolha-a novamente para atualizar a prévia.")
    await vault.platform.backup()
    await recordVersion(vault.info!.path, target, current.text, true)
    const index = vault.index!
    const incoming = index.allNotes().filter(note => note.path !== path && note.path !== target).map(note => ({ path: note.path, before: note.text, after: mergeLinks(note.text, note.path, path, target, index) })).filter(edit => edit.before !== edit.after)
    const canvases = index.allFiles().filter(file => /\.canvas$/i.test(file.path))
    const canvasTexts = await vault.platform.readTexts(canvases.map(file => file.path))
    const canvasEdits = canvases.map(file => ({ entry: file, before: canvasTexts[file.path], after: canvasTexts[file.path] === undefined ? undefined : mergeCanvasLinks(canvasTexts[file.path]!, path, target) })).filter(edit => edit.before !== edit.after)
    const source = mergeLinks(index.note(path)!.text, path, path, target, index, true)
    await vault.save(target, mergeText(mergeLinks(current.text, target, path, target, index), source, noteName(path)))
    for (const edit of incoming) {
      if (index.note(edit.path)?.text !== edit.before) throw new Error(`“${edit.path}” mudou. O destino já foi salvo; a origem foi preservada para conferência.`)
      await vault.save(edit.path, edit.after)
    }
    for (const edit of canvasEdits) {
      const current = index.allFiles().find(file => file.path === edit.entry.path)
      if (!current || current.mtime !== edit.entry.mtime || current.size !== edit.entry.size || edit.after === undefined) throw new Error(`“${edit.entry.path}” mudou. A origem foi preservada para conferência.`)
      await vault.save(edit.entry.path, edit.after)
    }
    checkOriginal()
    // O original permanece na lixeira; só sai depois de a gravação do destino ter concluído.
    await vault.trash(path); setDialog(null); navigate(vaultRoute(target)); toast("Notas mescladas. A origem pode ser recuperada da lixeira.")
  }
  const stats = textStats(draft), selected = history[picked], diff = selected ? compareTexts(selected.text, draft) : null
  return <>
    <div className="note-copy" ref={host}>
      <button className="btn sm ghost" aria-label="Ferramentas da nota" aria-expanded={menu} onClick={() => setMenu(!menu)}>Ferramentas</button>
      {menu && <div className="note-menu card" role="menu">
        <button role="menuitem" className="list-item small" onClick={() => begin("history")}>Histórico de versões</button>
        {!readOnly && <><button role="menuitem" className="list-item small" onClick={() => begin("extract")}>Extrair seleção para nota</button><button role="menuitem" className="list-item small" onClick={() => begin("merge")}>Mesclar em outra nota</button></>}
      </div>}
    </div>
    <span className="tiny faint note-word-count" title={`${stats.characters} caracteres (sem o frontmatter)`}>{stats.words} palavras · {stats.characters} caracteres</span>
    {dialog && <Modal title={dialog === "history" ? "Histórico de versões" : dialog === "extract" ? "Extrair seleção" : "Mesclar notas"} wide onClose={() => !busy && setDialog(null)} footer={<>
      <button className="btn" disabled={busy} onClick={() => setDialog(null)}>Fechar</button>
      {dialog === "history" && !readOnly && <><button className="btn" disabled={busy} onClick={() => run(async () => { await flush(); await recordVersion(vault.info!.path, path, vault.index!.note(path)!.text, true); setHistory(await versions(vault.info!.path, path)) })}>Guardar versão agora</button><button className="btn primary" disabled={busy || !selected} onClick={() => run(restore)}>Restaurar versão</button></>}
      {dialog === "extract" && <button className="btn primary" disabled={busy || !name.trim()} onClick={() => run(extract)}>Criar nota e substituir por link</button>}
      {dialog === "merge" && <button className="btn primary" disabled={busy || !target} onClick={() => run(merge)}>Mesclar e mandar origem à lixeira</button>}
    </>}>
      {error && <p role="alert" className="query-error">{error}</p>}
      {dialog === "history" ? <>
        <p className="small muted">Versões deste aparelho, até 40 por nota. Digitação contínua é agrupada a cada 30 segundos.</p>
        <select className="input" aria-label="Versão da nota" value={picked} onChange={e => setPicked(Number(e.target.value))}>{history.map((v, i) => <option key={i} value={i}>{new Date(v.updatedAt).toLocaleString("pt-BR")} · {v.text.length} caracteres</option>)}</select>
        {!history.length && <p className="muted">Nenhuma versão anterior. A primeira é guardada antes da próxima edição.</p>}
        {diff && <div className="version-compare"><section><h4>Versão escolhida</h4><pre>{diff.before}</pre></section><section><h4>Atual</h4><pre>{diff.after}</pre></section>{(diff.removed || diff.added) && <section><h4>Trecho alterado</h4><pre className="version-removed">{diff.removed}</pre><pre className="version-added">{diff.added}</pre></section>}</div>}
      </> : dialog === "extract" ? <>
        <label className="field"><span>Nome da nova nota</span><input className="input" aria-label="Nome da nota extraída" value={name} onChange={e => setName(e.target.value)} /></label>
        <p className="small muted">O trecho vira uma nota na mesma pasta e é substituído por um wikilink. Selecione no modo Editar ou Código.</p>
        <pre className="note-tool-preview">{range ? original.slice(range.from, range.to) : "Nenhum trecho selecionado."}</pre>
      </> : <>
        <label className="field"><span>Nota de destino</span><select className="input" aria-label="Destino da mesclagem" value={target} onChange={e => { setTarget(e.target.value); setTargetText(vault.index!.note(e.target.value)?.text ?? "") }}><option value="">Escolha…</option>{vault.index!.allNotes().filter(n => n.path !== path).map(n => <option key={n.path} value={n.path}>{n.path}</option>)}</select></label>
        <p className="small muted">O conteúdo e as propriedades da origem entram numa seção do destino; as propriedades ficam como bloco YAML. Um backup é feito antes. Os links das notas passam a apontar para o destino.</p>
        {target && <pre className="note-tool-preview">{mergeText(targetText, original, noteName(path))}</pre>}
      </>}
    </Modal>}
  </>
}
