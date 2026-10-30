import { useDialogFocus } from "../../components/useDialogFocus"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { FileUp, X } from "lucide-react"
import { childInputs, namedAfterFile, sceneInputs, summarizeImport, type ImportSummary } from "../import-apply"
import { importBatchTokens, importFoundryScene, importUniversalVtt, type ImportedVtt, type ImportedVttDocument } from "../shared/importers"
import { vtt } from "../api"
import { newId, type DocumentStore } from "../document-store"

type Source = "uvtt" | "foundry" | "tokens"

const SOURCES: { id: Source; label: string; hint: string; accept: string }[] = [
  { id: "uvtt", label: "Cena do Universal VTT", hint: ".dd2vtt, .uvtt ou .df2vtt (Dungeondraft, DungeonFog e outros): mapa, grade, paredes e portas.", accept: ".dd2vtt,.uvtt,.df2vtt,.json,application/json" },
  { id: "foundry", label: "Cena do Foundry VTT", hint: "O .json de “Exportar dados” de uma cena: grade, paredes, portas, tokens e luzes. O mapa vem à parte.", accept: ".json,application/json" },
  { id: "tokens", label: "Tokens em lote", hint: "Uma lista .json de tokens (nome, x, y, tamanho, oculto, disposição), até 500, na cena aberta.", accept: ".json,application/json" },
]

type Parsed = { source: "scene"; imported: ImportedVtt; summary: ImportSummary } | { source: "tokens"; tokens: ImportedVttDocument[] }

/**
 * Importar para a mesa (T4, ADR 0028): uma cena do Universal VTT ou do Foundry, ou tokens em lote na cena aberta.
 * Mostra o que vai entrar antes de gravar; nada é buscado na internet.
 */
export function ImportDialog({ store, sceneId, onClose, onOpen }: { store: DocumentStore; sceneId: string | null; onClose: () => void; onOpen: (id: string) => void }) {
  const [source, setSource] = useState<Source>("uvtt")
  const [fileName, setFileName] = useState("")
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  useDialogFocus(dialog, () => { if (!busy) onClose() })
  useEffect(() => { dialog.current?.focus() }, [])
  const scene = sceneId ? store.get<{ name: string }>(sceneId) : null
  const current = SOURCES.find((item) => item.id === source)!

  function choose(next: Source) {
    setSource(next)
    setParsed(null)
    setFileName("")
    setError("")
  }

  async function read(file: File) {
    setError("")
    setParsed(null)
    setFileName(file.name)
    try {
      const text = await file.text()
      if (source === "tokens") {
        setParsed({ source: "tokens", tokens: importBatchTokens(text, sceneId ?? "") })
      } else {
        const imported = namedAfterFile(source === "uvtt" ? importUniversalVtt(text) : importFoundryScene(text), file.name)
        setParsed({ source: "scene", imported, summary: summarizeImport(imported) })
      }
    } catch (reason) {
      setError(reason instanceof SyntaxError ? "O arquivo não é um JSON válido." : reason instanceof Error ? reason.message : String(reason))
    }
  }

  async function apply() {
    if (!parsed) return
    setBusy(true)
    setError("")
    try {
      if (parsed.source === "tokens") {
        if (!sceneId) throw new Error("Abra uma cena antes de importar tokens.")
        const after = store.children(sceneId).tokens.length
        for (const document of childInputs(parsed.tokens, sceneId, newId, after)) await store.put(document)
        onOpen(sceneId)
      } else {
        // Os mapas embutidos entram na pasta da mesa; a cena aponta para o caminho que a mesa devolveu.
        const paths = new Map<string, string>()
        for (const asset of parsed.imported.assets) paths.set(asset.path, await vtt.assets.import(asset.kind, asset.name, asset.bytes))
        const id = newId()
        for (const document of sceneInputs(parsed.imported, id, newId, paths)) await store.put(document)
        onOpen(id)
      }
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível importar.")
      setBusy(false)
    }
  }

  const tokensWithoutScene = source === "tokens" && !sceneId
  // Fora do painel lateral (que tem camada própria), para o diálogo ficar acima das barras do app no celular.
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <div ref={dialog} className="settings-dialog import-dialog" role="dialog" aria-modal="true" aria-labelledby="import-title" tabIndex={-1}>
      <header>
        <div><p className="eyebrow">Mesa</p><h2 id="import-title">Importar para a mesa</h2></div>
        <button className="icon" aria-label="Fechar" disabled={busy} onClick={onClose}><X size={16} /></button>
      </header>
      <div className="settings-body">
        <fieldset className="import-sources">
          <legend>O que importar</legend>
          {SOURCES.map((item) => <label key={item.id} className={`import-source${item.id === source ? " active" : ""}`}>
            <input type="radio" name="import-source" value={item.id} checked={item.id === source} disabled={busy} onChange={() => choose(item.id)} />
            <span><strong>{item.label}</strong><small>{item.hint}</small></span>
          </label>)}
        </fieldset>
        {tokensWithoutScene ? <p className="hint">Abra ou crie uma cena antes: os tokens entram na cena aberta.</p> : <div className="import-file">
          <button className="ghost" disabled={busy} onClick={() => input.current?.click()}><FileUp size={15} /> {fileName ? "Escolher outro arquivo" : "Escolher arquivo…"}</button>
          {fileName && <span className="import-file-name" title={fileName}>{fileName}</span>}
          <input ref={input} type="file" accept={current.accept} hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void read(file) }} />
        </div>}
        {parsed?.source === "scene" && <ImportPreview summary={parsed.summary} />}
        {parsed?.source === "tokens" && <section className="import-preview" aria-label="O que vai entrar">
          <p><strong>{parsed.tokens.length} {parsed.tokens.length === 1 ? "token" : "tokens"}</strong> na cena “{scene?.data.name ?? "aberta"}”.</p>
          <ul className="import-names">{parsed.tokens.slice(0, 8).map((token) => <li key={token.id}>{(token.data as { name: string }).name}</li>)}{parsed.tokens.length > 8 && <li>e mais {parsed.tokens.length - 8}</li>}</ul>
        </section>}
        {error && <p className="error" role="alert">{error}</p>}
      </div>
      <footer>
        <button className="ghost" disabled={busy} onClick={onClose}>Cancelar</button>
        <button className="primary" disabled={!parsed || busy} onClick={() => void apply()}>{busy ? "Importando…" : parsed?.source === "tokens" ? "Importar tokens" : "Importar cena"}</button>
      </footer>
    </div>
  </div>, document.querySelector(".vtt-root") ?? document.body)
}

function ImportPreview({ summary }: { summary: ImportSummary }) {
  const cells = summary.cell ? ` (${Math.round(summary.width / summary.cell)} × ${Math.round(summary.height / summary.cell)} células de ${summary.cell} px)` : ""
  return <section className="import-preview" aria-label="O que vai entrar">
    <p>Uma cena nova: <strong>{summary.name}</strong></p>
    <dl>
      <div><dt>Tamanho</dt><dd>{Math.round(summary.width)} × {Math.round(summary.height)} px{cells}</dd></div>
      <div><dt>Mapa</dt><dd>{summary.map ? "dentro do arquivo" : "não veio; escolha depois em Trocar mapa"}</dd></div>
      <div><dt>Paredes</dt><dd>{summary.walls}</dd></div>
      <div><dt>Portas</dt><dd>{summary.doors}</dd></div>
      <div><dt>Tokens</dt><dd>{summary.tokens}</dd></div>
      <div><dt>Luzes</dt><dd>{summary.lights}</dd></div>
    </dl>
    {summary.warnings.length > 0 && <ul className="import-warnings" aria-label="Avisos">{summary.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
  </section>
}
