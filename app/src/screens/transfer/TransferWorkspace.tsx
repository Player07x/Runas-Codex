import { useEffect, useMemo, useState } from "react"
import { Archive, ArrowDownToLine, ArrowUpFromLine, BookOpen, CalendarDays, Dices, FileText, FolderOpen, FolderOutput, History, Library, Package, ScrollText } from "lucide-react"
import { useVault } from "../../platform/VaultProvider"
import { Segmented } from "../../components/ui"
import { navigate, useRoute } from "../../lib/router"
import { flushOpenNotes } from "../../lib/vault-notes"
import { buildImportPlan, sameTransferVersion, selectTransferPaths, type ImportPlan, type ImportStrategy, type TransferEntry } from "../../core/transfer/plan"
import { ANDROID_TRANSFER_LIMITS, createTransferArchive, LEGACY_ARCHIVE_LIMIT, managedWorldPath, readTransferArchiveFrom, transferPath, TRANSFER_LIMITS, writeTransferArchive, type TransferArchive, type TransferFile } from "../../core/transfer/archive"
import { blobSource, bufferedSink } from "../../core/transfer/zip-stream"
import { convertNotionExport, NOTION_FOLDER, unwrapNestedZips } from "../../core/transfer/notion"
import "./transfer-workspace.css"
import { parseWorldManifest } from "../../vtt/shared/world"
import { DocumentExport } from "./DocumentExport"

const scopes = [
  { value: "", label: "Cofre inteiro", roots: [""] }, { value: "Notas", label: "Notas", roots: ["Notas"] },
  { value: "Wikis", label: "Wikis", roots: ["Wikis"] }, { value: "Campanhas", label: "Campanhas", roots: ["Campanhas"] },
  { value: "Livros", label: "Livros", roots: ["Livros"] }, { value: "Agenda", label: "Agenda", roots: ["Agenda"] },
  { value: "Mesas", label: "Mesas e dados do VTT", roots: ["Mesas", ".runas/mesas"] },
]
const sizeLabel = (bytes: number) => bytes >= 1073741824 ? `${(bytes / 1073741824).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} GB` : bytes >= 1048576 ? `${(bytes / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : `${Math.ceil(bytes / 1024)} KB`
const safeName = (name: string) => name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").slice(0, 80) || "Cofre"
const failure = (error: unknown) => error instanceof Error ? error.message : String(error)
interface Preview { archive: TransferArchive; existing: TransferEntry[] }

/** TRF-1: primeiro o que a pessoa quer fazer; depois só o formulário disso. */
type Goal = "aparelho" | "documento" | "obsidian"
const GOALS: { value: Goal; title: string; hint: string; icon: typeof Package }[] = [
  { value: "aparelho", title: "Levar para outro aparelho", hint: "Pacote .runas com o cofre, espaços ou uma seleção; mesas do VTT se quiser.", icon: Package },
  { value: "documento", title: "Gerar documento ou site", hint: "PDF, DOCX, EPUB, HTML ou site offline das notas escolhidas; versão dos jogadores.", icon: FileText },
  { value: "obsidian", title: "Pasta para o Obsidian", hint: "ZIP com os .md e os anexos originais, para abrir como cofre.", icon: FolderOutput },
]
const GOAL_KEY = "runas-codex:transferir-objetivo"
const savedGoal = (): Goal => { try { const v = localStorage.getItem(GOAL_KEY); return v === "documento" || v === "obsidian" ? v : "aparelho" } catch { return "aparelho" } }

export function TransferWorkspace() {
  const vault = useVault()
  // /transferir/importar (“Importar mesa…” do VTT) abre direto na importação.
  const routeSection = useRoute()[1]
  const [direction, setDirection] = useState<"exportar" | "importar">(routeSection === "importar" ? "importar" : "exportar")
  useEffect(() => { if (routeSection === "importar") setDirection("importar") }, [routeSection])
  const [goal, setGoalState] = useState<Goal>(savedGoal)
  const setGoal = (next: Goal) => {
    setGoalState(next)
    setKind(next === "obsidian" ? "markdown" : "runas")
    try { localStorage.setItem(GOAL_KEY, next) } catch { /* só não é lembrado */ }
  }
  const [scope, setScope] = useState("")
  const [kind, setKind] = useState<"runas" | "markdown">(() => (savedGoal() === "obsidian" ? "markdown" : "runas"))
  const [linked, setLinked] = useState(true)
  const [worlds, setWorlds] = useState(true)
  const [entries, setEntries] = useState<TransferEntry[]>([])
  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [search, setSearch] = useState("")
  const [shown, setShown] = useState(100)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [incoming, setIncoming] = useState<Set<string>>(new Set())
  const [strategy, setStrategy] = useState<ImportStrategy>("merge")
  const [destination, setDestination] = useState("Notas/Importados")
  // U50 (ADR 0037): o desktop grava em pedaços; o Android mantém os limites antigos até o PR A2.
  const limits = vault.platform.kind === "capacitor" ? ANDROID_TRANSFER_LIMITS : TRANSFER_LIMITS
  const [notice, setNotice] = useState("")
  const listFiles = () => vault.platform.listTransferFiles?.(worlds || scope === "Mesas") ?? vault.platform.listVault()

  useEffect(() => {
    let active = true
    setPreview(null); setSelected(null)
    if (!vault.info) { setEntries([]); return }
    void listFiles().then(files => { if (active) setEntries(files) }, error => { if (active) setError(failure(error)) })
    return () => { active = false }
  }, [vault.info?.path, worlds, scope])

  const scoped = entries.filter(entry => (scopes.find(item => item.value === scope)?.roots ?? [""]).some(root => !root || entry.path.startsWith(root + "/")))
  const visible = scoped.filter(entry => entry.path.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))
  const calculated = useMemo<{ plan: ImportPlan | null; problem: string }>(() => {
    if (!preview) return { plan: null, problem: "" }
    try { return { plan: buildImportPlan({ ...preview.archive, files: preview.archive.files.filter(file => incoming.has(file.path)) }, preview.existing, strategy), problem: "" } }
    catch (error) { return { plan: null, problem: failure(error) } }
  }, [preview, incoming, strategy])

  async function act(operation: () => Promise<void>) {
    setBusy(true); setError(""); setStatus(""); setNotice("")
    try { await operation() } catch (error) { setError(failure(error)) } finally { setBusy(false) }
  }
  async function collect(paths: string[], known: TransferEntry[], title: string): Promise<TransferFile[]> {
    const identity = vault.info?.path, files: TransferFile[] = []
    for (const [index, path] of paths.entries()) {
      const expected = known.find(entry => entry.path === path)
      if (!expected || expected.size > limits.file) throw new Error(`“${path}” está indisponível ou excede o limite por arquivo de ${sizeLabel(limits.file)}.`)
      setStatus(`Lendo ${index + 1} de ${paths.length}: ${path}`)
      files.push({ path, bytes: await vault.platform.readBinary(path) })
    }
    if ((await vault.platform.vault())?.path !== identity) throw new Error("O cofre mudou durante a preparação.")
    const current = await (vault.platform.listTransferFiles?.(paths.some(path => managedWorldPath(path)) || worlds || scope === "Mesas") ?? vault.platform.listVault())
    for (const path of paths) if (!sameTransferVersion(current.find(entry => entry.path === path), known.find(entry => entry.path === path)!)) throw new Error(`“${path}” mudou durante a preparação de ${title}. Tente novamente.`)
    return files
  }
  async function exportFiles() {
    await flushOpenNotes()
    const known = await listFiles()
    const roots = selected === null ? scopes.find(item => item.value === scope)!.roots : [...selected]
    const worldRoots = new Map<string, string>()
    if (linked && roots.some(path => path === "Campanhas" || path.startsWith("Campanhas/"))) {
      for (const entry of known.filter(entry => managedWorldPath(entry.path) && entry.path.endsWith("/mesa.json"))) {
        const manifest = parseWorldManifest(JSON.parse(new TextDecoder().decode(await vault.platform.readBinary(entry.path))))
        worldRoots.set(manifest.id, entry.path.slice(0, -"/mesa.json".length))
      }
    }
    const paths = selectTransferPaths(vault.index!, known, roots, linked, worlds && !scope || scope === "Mesas", worldRoots)
    const name = `${safeName(vault.info!.name)}${scope ? " - " + scope : ""}.${kind === "runas" ? "runas" : "zip"}`, mime = kind === "runas" ? "application/octet-stream" : "application/zip"
    if (!vault.platform.openSave) {
      // Android até o PR A2: o pacote ainda é montado inteiro e passa de uma vez pela ponte.
      const files = await collect(paths, known, "exportação")
      setStatus("Montando o arquivo…")
      const bytes = await createTransferArchive(vault.info!.name, files, kind, limits)
      const saved = await vault.platform.saveBytes(name, bytes, mime)
      setStatus(saved ? `${files.length} arquivo(s) exportados: ${saved}` : "Exportação cancelada.")
      return
    }
    // U50 (ADR 0037): confere os tamanhos antes do diálogo; depois lê e grava um arquivo por vez.
    const big = paths.filter(path => (known.find(entry => entry.path === path)?.size ?? Infinity) > limits.file)
    if (big.length) throw new Error(`${big.length} arquivo(s) passam de ${sizeLabel(limits.file)} ou sumiram: ${big.slice(0, 3).join(", ")}${big.length > 3 ? "…" : ""}`)
    const identity = vault.info?.path
    const target = await vault.platform.openSave(name, mime)
    if (!target) { setStatus("Exportação cancelada."); return }
    try {
      const sink = bufferedSink(bytes => target.write(bytes))
      const size = await writeTransferArchive({
        title: vault.info!.name, paths, kind, limits, sink,
        read: path => vault.platform.readBinary(path),
        onProgress: (done, total, path) => setStatus(`Gravando ${done + 1} de ${total}: ${path}`),
      })
      await sink.flush()
      if ((await vault.platform.vault())?.path !== identity) throw new Error("O cofre mudou durante a exportação.")
      const current = await (vault.platform.listTransferFiles?.(paths.some(path => managedWorldPath(path)) || worlds || scope === "Mesas") ?? vault.platform.listVault())
      for (const path of paths) if (!sameTransferVersion(current.find(entry => entry.path === path), known.find(entry => entry.path === path)!)) throw new Error(`“${path}” mudou durante a exportação. Tente novamente.`)
      const saved = await target.close()
      setStatus(`${paths.length} arquivo(s) exportados: ${saved}`)
      setNotice(`Pacote de ${sizeLabel(size)}.${size > LEGACY_ARCHIVE_LIMIT ? " Ele passa de 128 MB: só abre no Runas-Codex 1.4 ou mais novo." : ""}`)
    } catch (error) {
      await target.abort().catch(() => undefined)
      throw error
    }
  }
  async function prepareImport(files: FileList | null) {
    if (!files?.length) return
    const chosen = [...files]
    await act(async () => {
      await flushOpenNotes()
      if (chosen.length > 1 && chosen.some(file => /\.(zip|runas)$/i.test(file.name))) throw new Error("Escolha um pacote por vez, ou selecione apenas notas e anexos avulsos.")
      let archive: TransferArchive
      let notionNote = ""
      if (chosen.length === 1 && /\.(zip|runas)$/i.test(chosen[0]!.name)) {
        if (chosen[0]!.size > limits.archive) throw new Error(`O arquivo excede ${sizeLabel(limits.archive)} compactados.`)
        setStatus("Lendo e conferindo o pacote…")
        // U50: lê o pacote por partes, um arquivo por vez, em vez de carregar o arquivo inteiro.
        archive = await readTransferArchiveFrom(blobSource(chosen[0]!), chosen[0]!.name.replace(/\.[^.]+$/, ""), limits, (done, total) => setStatus(`Lendo e conferindo o pacote: ${done + 1} de ${total}`))
        if (/\.runas$/i.test(chosen[0]!.name) && archive.kind !== "runas") throw new Error("O arquivo .runas está sem seu manifesto. Use um pacote exportado pelo programa.")
        // Exportação do Notion (Markdown & CSV): nomes sem o id, links do Obsidian e bancos de dados como propriedades.
        archive = await unwrapNestedZips(archive, limits)
        const notion = archive.kind === "markdown" ? convertNotionExport(archive.files) : null
        if (notion) {
          archive = { ...archive, title: "Notion", files: notion.files, ignored: [...archive.ignored, ...notion.ignored] }
          notionNote = `Exportação do Notion reconhecida: ${notion.pages} página(s) e ${notion.databases} banco(s) de dados vão para a pasta ${NOTION_FOLDER}/. `
        }
      } else {
        const prefix = destination.trim().replace(/\/$/, "")
        if (prefix) transferPath(prefix)
        let total = 0
        const data: TransferFile[] = []
        for (const file of chosen) {
          if (file.size > limits.file || (total += file.size) > limits.expanded || chosen.length > limits.files) throw new Error("A seleção de arquivos excede os limites informados.")
          const path = transferPath((prefix ? prefix + "/" : "") + file.name)
          data.push({ path, bytes: new Uint8Array(await file.arrayBuffer()) })
        }
        archive = { title: "Arquivos importados", kind: "markdown", files: data, ignored: [] }
      }
      const existing = await (vault.platform.listTransferFiles?.(true) ?? vault.platform.listVault())
      buildImportPlan(archive, existing, "merge")
      setPreview({ archive, existing }); setIncoming(new Set(archive.files.map(file => file.path))); setStrategy("merge")
      setStatus(`${notionNote}Prévia pronta. Confira a seleção e os conflitos antes de importar.`)
    })
  }
  async function importFiles() {
    const plan = calculated.plan
    if (!plan?.writes.length) return
    await flushOpenNotes()
    if (plan.replacements.length) {
      setStatus("Preparando o pacote de segurança dos arquivos que serão substituídos…")
      const files = await collect(plan.replacements.map(entry => entry.path), plan.replacements, "pacote de segurança")
      const backup = await createTransferArchive(`Antes de importar em ${vault.info!.name}`, files, "runas", limits)
      const saved = await vault.platform.saveBytes(`Antes da importação - ${safeName(vault.info!.name)}.runas`, backup, "application/octet-stream")
      if (!saved) { setStatus("Importação cancelada; nenhum arquivo foi substituído."); return }
    }
    setStatus("Importando os arquivos confirmados…")
    const count = await vault.importTransfer(plan.writes)
    setPreview(null); setEntries(await listFiles()); setStatus(`${count} arquivo(s) importados. ${plan.skipped.length} existente(s) preservados.`)
  }
  function toggle(set: Set<string>, path: string): Set<string> { const next = new Set(set); if (next.has(path)) next.delete(path); else next.add(path); return next }
  const canImport = Boolean(vault.info && !vault.info.readOnly && vault.index && !vault.loading)

  return <div className="page transfer-workspace">
    <div className="page-head"><div><span className="eyebrow">Leve seus dados entre aparelhos</span><h1 className="page-title">Importar / Exportar</h1></div>
      <Segmented label="Direção" value={direction} onChange={setDirection} options={[{ value: "exportar", label: "Exportar", icon: <ArrowUpFromLine size={14} /> }, { value: "importar", label: "Importar", icon: <ArrowDownToLine size={14} /> }]} />
    </div>
    {!vault.info && <section className="card stack"><p>Abra um cofre para importar ou exportar seus arquivos.</p><button className="btn" onClick={() => navigate("/config")}><FolderOpen size={16} /> Abrir Configurações</button></section>}
    {vault.info && <section className="card stack" data-transfer-workspace>
      <h2 className="section-title"><Package size={18} /> {direction === "exportar" ? "Cofre, espaços ou seleção" : "Importar para o cofre aberto"}</h2>
      {direction === "exportar" ? <>
        <fieldset className="transfer-goals">
          <legend>O que você quer fazer?</legend>
          {GOALS.map(item => <label key={item.value} className={`transfer-goal${goal === item.value ? " on" : ""}`}>
            <input type="radio" name="transferir-objetivo" checked={goal === item.value} disabled={busy} onChange={() => setGoal(item.value)} />
            <item.icon size={20} aria-hidden="true" /><span><strong>{item.title}</strong><small>{item.hint}</small></span>
          </label>)}
        </fieldset>
        <div className="transfer-fields">
          <label className="field"><span>O que exportar</span><select className="select" aria-label="O que exportar" value={scope} disabled={busy} onChange={event => { setScope(event.target.value); setSelected(null); setShown(100) }}>{scopes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          {goal !== "documento" && <label className="field"><span>Formato</span><select className="select" aria-label="Formato do pacote" value={kind} disabled={busy} onChange={event => setKind(event.target.value as typeof kind)}><option value="runas">Pacote Runas (.runas)</option><option value="markdown">ZIP Markdown (Obsidian)</option></select></label>}
        </div>
        <details><summary>Escolher arquivos ({selected === null ? scoped.length : selected.size})</summary><div className="stack">
          <input className="input" aria-label="Filtrar arquivos para exportar" placeholder="Filtrar por caminho…" value={search} onChange={event => { setSearch(event.target.value); setShown(100) }} />
          <div className="row-wrap"><button className="btn sm" disabled={busy} onClick={() => setSelected(null)}>Todos deste espaço</button><button className="btn sm" disabled={busy} onClick={() => setSelected(new Set())}>Limpar seleção</button></div>
          <div className="transfer-files">{visible.slice(0, shown).map(entry => <label className="check" key={entry.path}><input type="checkbox" disabled={busy} checked={selected === null || selected.has(entry.path)} onChange={() => setSelected(toggle(selected ?? new Set(scoped.map(entry => entry.path)), entry.path))} /><span>{entry.path}</span><small>{sizeLabel(entry.size)}</small></label>)}</div>
          {visible.length > shown && <button className="btn sm" onClick={() => setShown(shown + 100)}>Mostrar mais</button>}
        </div></details>
        {goal !== "documento" && <>
          <label className="check"><input type="checkbox" checked={linked} disabled={busy} onChange={event => setLinked(event.target.checked)} /> Incluir notas ligadas; os anexos acompanham a seleção</label>
          {!scope && <label className="check"><input type="checkbox" checked={worlds} disabled={busy} onChange={event => setWorlds(event.target.checked)} /> Incluir mesas do VTT</label>}
          <p className="small muted">Mantém as notas e anexos originais, inclusive os segredos do mestre. Preferências deste aparelho e configurações de plugins não entram no pacote.</p>
          <div className="transfer-actions">
            <p className="small transfer-summary" role="status">Vai salvar {selected === null ? scoped.length : selected.size} arquivo(s) de {scopes.find(item => item.value === scope)?.label.toLocaleLowerCase("pt-BR")}{linked ? ", mais as notas ligadas e os anexos" : ""}{!scope && worlds ? ", com as mesas," : ""} num {kind === "runas" ? "pacote .runas" : "ZIP Markdown"}.</p>
            <button className="btn primary" disabled={busy || !vault.index || vault.loading || !scoped.length || selected?.size === 0} onClick={() => void act(exportFiles)}><ArrowUpFromLine size={16} /> {busy ? "Preparando…" : "Escolher onde salvar"}</button>
          </div>
        </>}
      </> : <>
        {vault.info.readOnly && <p role="status">O cofre está em somente leitura. Libere a gravação em Configurações para importar.</p>}
        <label className="field"><span>Pacote .runas, ZIP Markdown ou arquivos de notas e anexos</span><input type="file" aria-label="Arquivo para importar" multiple disabled={busy || !canImport} accept=".runas,.zip,.md,.canvas,.base,image/*,audio/*,video/*,.pdf" onChange={event => { const files = event.target.files; void prepareImport(files); event.target.value = "" }} /></label>
        <label className="field"><span>Pasta de destino para arquivos avulsos</span><input className="input" value={destination} disabled={busy} onChange={event => setDestination(event.target.value)} /></label>
        <p className="small muted">Pacotes e ZIPs conservam seus caminhos internos, inclusive as mesas do VTT. Arquivos avulsos entram na pasta acima.</p>
        <p className="small muted">Do Notion: use Exportar (no menu ⋯ da página ou nas configurações do espaço de trabalho), escolha “Markdown &amp; CSV” com as subpáginas e importe o .zip aqui. As páginas entram na pasta {NOTION_FOLDER}/, sem os códigos nos nomes, e as colunas dos bancos de dados viram propriedades.</p>
        {preview && <div className="stack" data-transfer-preview>
          <h3>{preview.archive.title}</h3><p className="small">{preview.archive.files.length} arquivo(s) disponíveis; {calculated.plan?.conflicts.length ?? 0} conflito(s) na seleção.{preview.archive.ignored.length > 0 && ` ${preview.archive.ignored.length} arquivo(s) de configuração ou controle foram ignorados.`}</p>
          <label className="field"><span>Quando já existe</span><select className="select" aria-label="Quando já existe" value={strategy} disabled={busy} onChange={event => setStrategy(event.target.value as ImportStrategy)}><option value="merge">Mesclar: adicionar novos e manter os existentes</option><option value="replace">Substituir os conflitos, salvando um pacote de segurança antes</option><option value="duplicate">Duplicar com novos caminhos e links ajustados</option></select></label>
          <div className="row-wrap"><button className="btn sm" disabled={busy} onClick={() => setIncoming(new Set(preview.archive.files.map(file => file.path)))}>Selecionar todos</button><button className="btn sm" disabled={busy} onClick={() => setIncoming(new Set())}>Limpar seleção</button></div>
          <div className="transfer-files">{preview.archive.files.slice(0, shown).map(file => <label className="check" key={file.path}><input type="checkbox" disabled={busy} checked={incoming.has(file.path)} onChange={() => setIncoming(toggle(incoming, file.path))} /><span>{file.path}</span><small>{sizeLabel(file.bytes.length)}</small></label>)}</div>
          {preview.archive.files.length > shown && <button className="btn sm" onClick={() => setShown(shown + 100)}>Mostrar mais</button>}
          {calculated.problem && <p role="alert" className="transfer-error">{calculated.problem}</p>}
          <div className="transfer-actions"><button className="btn" disabled={busy} onClick={() => { setPreview(null); setStatus("") }}>Cancelar prévia</button><button className="btn primary" disabled={busy || !canImport || !calculated.plan?.writes.length || Boolean(calculated.problem)} onClick={() => void act(importFiles)}><ArrowDownToLine size={16} /> Importar {calculated.plan?.writes.length ?? 0} arquivo(s)</button></div>
        </div>}
      </>}
      <p className="small muted">Limites: {sizeLabel(limits.archive)} por pacote, {sizeLabel(limits.expanded)} de conteúdo ao importar e {sizeLabel(limits.file)} por arquivo.</p>
      {status && <p role="status" className="small transfer-status">{status}</p>}{notice && <p className="small transfer-notice">{notice}</p>}{error && <p role="alert" className="transfer-error">{error}</p>}
    </section>}
    {direction === "exportar" && goal === "documento" && vault.info && <DocumentExport paths={selected === null ? scoped.map(entry => entry.path) : [...selected]} />}
    <div className="transfer-grid">
      <section className="card stack transfer-card"><h2 className="section-title"><BookOpen size={18} /> Livros</h2><p className="small">Importe DOCX, Homebrewery ou GM Binder. Na prévia do livro, exporte PDF, EPUB, DOCX, HTML, RTF, Markdown ou ZIP.</p><button className="btn" onClick={() => navigate("/livros")}>Abrir Livros</button></section>
      <section className="card stack transfer-card"><h2 className="section-title"><CalendarDays size={18} /> Agenda</h2><p className="small">Importe e exporte calendários iCalendar (.ics) pela Agenda.</p><button className="btn" onClick={() => navigate("/agenda")}>Abrir Agenda</button></section>
      <section className="card stack transfer-card"><h2 className="section-title"><Library size={18} /> Plugins do Obsidian</h2><p className="small">Confira a prévia de calendários, mapas, statblocks e encontros antes de convertê-los.</p><button className="btn" onClick={() => navigate("/transferir/obsidian")}>Abrir importador</button></section>
      <section className="card stack transfer-card"><h2 className="section-title"><ScrollText size={18} /> Campanhas</h2><p className="small">Exporte a pasta da campanha com suas notas ligadas e anexos no painel acima. O diário Markdown fica na lista de sessões da campanha.</p><button className="btn" onClick={() => navigate("/campanhas")}>Abrir Campanhas</button></section>
      <section className="card stack transfer-card"><h2 className="section-title"><Dices size={18} /> Mesas do VTT</h2><p className="small">Para importar uma mesa, escolha Importar e abra o pacote .runas que tem a mesa. Para exportar, escolha “Mesas e dados do VTT” em Levar para outro aparelho.</p><button className="btn" onClick={() => setDirection("importar")}>Importar mesa</button></section>
      <section className="card stack transfer-card"><h2 className="section-title"><History size={18} /> Backups</h2><p className="small">Backups locais de texto continuam em Configurações. Para levar também anexos e mesas a outro aparelho, use um pacote do cofre inteiro.</p><button className="btn" disabled={busy || !vault.info} onClick={() => void act(async () => { const result = await vault.platform.backup(); setStatus(`Backup de ${result.files} arquivo(s) criado.`) })}><Archive size={16} /> Fazer backup de texto</button><button className="btn ghost" onClick={() => navigate("/config/backups")}>Abrir Configurações › Backups</button></section>
    </div>
  </div>
}
