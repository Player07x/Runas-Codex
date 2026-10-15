import { useEffect, useMemo, useState, type ReactNode } from "react"
import { parseBase, runBase, type QueryResult } from "../../core/queries/bases"
import { runDataview } from "../../core/queries/dataview"
import { display, isQueryLink } from "../../core/queries/expression"
import { basename } from "../../core/text"
import { useNoteSet } from "../../lib/note-set"
import { href } from "../../lib/router"
import { useOpenNote } from "../../lib/tabs"
import { noteRoute } from "../../lib/vault-notes"
import { useNotesLock } from "../../lib/notes-lock"
import { scopeOf } from "../../core/spaces"
import { VaultIndex } from "../../core/vault-index"
import { registerCodeBlock, registerFileEmbed, type CodeBlockProps, type FileEmbedProps } from "../../markdown/extensions"
import { useVault } from "../../platform/VaultProvider"
import "./queries.css"

/** A nota e os embeds usam a mesma visualização; o conteúdo permanece YAML/DQL compatível com o Obsidian. */
export function QueryView({ code, language = "base", from, initialView }: { code: string; language?: string; from?: string; initialView?: string }) {
  const vault = useVault(), open = useOpenNote()
  const { locked } = useNotesLock()
  const queryIndex = useMemo(() => {
    if (!vault.index || !locked) return vault.index
    const notes = vault.index.allNotes().filter(note => note.scope.space !== "notas" && note.scope.space !== null)
    return new VaultIndex(vault.index.allFiles().filter(file => scopeOf(file.path).space !== "notas" && scopeOf(file.path).space !== null), Object.fromEntries(notes.map(note => [note.path, note.text])))
  }, [vault.index, vault.version, locked])
  const [view, setView] = useState(initialView?.replace(/^#/, "") ?? ""), [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ index: number; descending: boolean } | null>(null)
  const result = useMemo(() => {
    try {
      if (!queryIndex) return { error: "Abra um cofre para consultar as notas." }
      if (language === "dataview" || language === "runas-consulta") return { data: runDataview(code, queryIndex, from), views: [] }
      const base = parseBase(code)
      return { data: runBase(base, queryIndex, view || undefined, from), views: base.views.map(v => v.name) }
    } catch (e) { return { error: e instanceof Error ? e.message : String(e) } }
  }, [code, language, from, queryIndex, vault.version, view])
  const link = (path: string, name: string) => <a href={href(noteRoute(path))} onClick={e => { if (!(e.ctrlKey || e.metaKey)) { e.preventDefault(); open(path, "aqui") } }}>{name}</a>
  const cell = (value: unknown): ReactNode => {
    if (Array.isArray(value)) return value.map((v, i) => <span key={i}>{i > 0 ? ", " : ""}{cell(v)}</span>)
    const target = isQueryLink(value) ? value.$link : typeof value === "string" && /^\[\[.*\]\]$/.test(value) ? value.slice(2, -2).split("|")[0] : null
    if (target) {
      const dest = vault.index?.resolve({ kind: "wiki", target, embed: false, start: 0, end: 0, raw: "", inFrontmatter: false }, from ?? "").dest
      return dest ? link(dest, display(value).replace(/^\[\[|\]\]$/g, "")) : display(value)
    }
    return typeof value === "boolean" ? value ? "Sim" : "Não" : display(value)
  }
  if (result.error) return <div className="query-view query-error" role="status">{result.error}</div>
  const originalData = result.data as QueryResult
  const fileLabels: Record<string, string> = { "file.name": "Nome", "file.path": "Caminho", "file.folder": "Pasta", "file.tags": "Tags", "file.mtime": "Modificada", "file.ctime": "Criada", "file.size": "Tamanho" }
  const data = { ...originalData, labels: originalData.labels.map((label, i) => label === originalData.columns[i]?.replace(/^file\./, "") ? fileLabels[originalData.columns[i]!] ?? label : label) }
  const rows = data.rows.filter(row => !search || (row.name + " " + row.cells.map(display).join(" ")).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")))
  if (sort) rows.sort((a, b) => a.group.localeCompare(b.group, "pt-BR") || (sort.descending ? -1 : 1) * display(a.cells[sort.index]).localeCompare(display(b.cells[sort.index]), "pt-BR", { numeric: true }))
  const groups = [...new Set(rows.map(r => r.group))]
  return <section className="query-view" aria-label="Consulta de notas">
    <div className="query-bar">
      {Boolean(result.views?.length) && <label>Visão <select aria-label="Visão da base" value={view || result.views![0]} onChange={e => { setView(e.target.value); setSort(null) }}>{result.views!.map(name => <option key={name}>{name}</option>)}</select></label>}
      <input aria-label="Filtrar resultados da consulta" placeholder="Filtrar resultados…" value={search} onChange={e => setSearch(e.target.value)} />
      <span className="small muted">{rows.length} de {data.total} nota(s)</span>
    </div>
    {data.total > data.rows.length && <p className="small muted">Mostrando até {data.rows.length} resultados. Refine os filtros para ver os demais.</p>}
    {!rows.length && <p className="muted">Nenhuma nota corresponde aos filtros.</p>}
    {groups.map(group => <div key={group} className="query-group">
      {group && <h4>{group}</h4>}
      {data.type === "table" ? <div className="query-scroll"><table><thead><tr>{data.labels.map((label, i) => <th key={i}><button onClick={() => setSort({ index: i, descending: sort?.index === i ? !sort.descending : false })}>{label}{sort?.index === i ? sort.descending ? " ↓" : " ↑" : ""}</button></th>)}</tr></thead><tbody>
        {rows.filter(r => r.group === group).map(row => <tr key={row.path}>{row.cells.map((value, i) => <td key={i}>{data.columns[i] === "file.name" ? link(row.path, display(value)) : cell(value)}</td>)}</tr>)}
      </tbody></table></div> : <div className={`query-${data.type}`}>
        {rows.filter(r => r.group === group).map(row => <article key={row.path}>
          <strong>{data.columns.some(c => c === "file.name" || c === "file.link") || data.type === "cards" ? link(row.path, row.name) : cell(row.cells[0])}</strong>
          {row.cells.map((value, i) => data.columns[i] === "file.name" || data.columns[i] === "file.link" || (i === 0 && data.type === "list" && !data.columns.includes("file.link") && !data.columns.includes("file.name")) ? null : <div key={i}><span className="muted">{data.labels[i]}: </span>{cell(value)}</div>)}
        </article>)}
      </div>}
    </div>)}
    {data.summaries.some(Boolean) && <div className="query-summary">{data.summaries.map((value, i) => value && <span key={i}>{data.labels[i]}: <strong>{value}</strong></span>)}</div>}
  </section>
}

export function BaseFile({ path, subpath, from }: Pick<FileEmbedProps, "path" | "subpath" | "from"> & { editable?: boolean }) {
  const vault = useVault(), [text, setText] = useState<string>(), [error, setError] = useState("")
  useEffect(() => { let active = true; void vault.platform.readTexts([path]).then(data => { if (active) { setText(data[path]); if (data[path] === undefined) setError("Não foi possível ler esta base.") } }, e => active && setError(String(e))); return () => { active = false } }, [path, vault.version, vault.platform])
  return error ? <div className="query-view query-error">{error}</div> : text === undefined ? <p className="muted">Lendo a base…</p> : <QueryView key={subpath} code={text} from={from} initialView={subpath} />
}

export function BaseScreen({ path }: { path: string }) {
  const vault = useVault(), [editing, setEditing] = useState(false), [text, setText] = useState(""), [error, setError] = useState("")
  const [version, setVersion] = useState<{ mtime: number; size: number }>()
  const begin = async () => {
    const entry = vault.index?.allFiles().find(f => f.path === path)
    const value = (await vault.platform.readTexts([path]))[path]
    if (value === undefined) throw new Error("Não foi possível ler a base.")
    setText(value); setVersion(entry); setEditing(true)
  }
  const save = async () => {
    parseBase(text)
    const current = vault.index?.allFiles().find(f => f.path === path)
    if (!current || current.mtime !== version?.mtime || current.size !== version.size) throw new Error("Esta base mudou fora do app. Reabra a edição antes de gravar.")
    await vault.save(path, text); setEditing(false); setError("")
  }
  const run = (action: () => Promise<void>) => void action().catch(e => setError(e instanceof Error ? e.message : String(e)))
  return <div className="base-screen page">
    <div className="row-wrap between"><h2>{basename(path)}</h2>{!vault.info?.readOnly && <button className="btn sm" onClick={() => editing ? (setEditing(false), setError("")) : run(begin)}>{editing ? "Cancelar edição" : "Editar YAML"}</button>}</div>
    {error && <p role="alert" className="query-error">{error}</p>}
    {editing ? <><label className="field"><span>Definição da base</span><textarea aria-label="YAML da base" rows={16} value={text} onChange={e => setText(e.target.value)} /></label><button className="btn primary" onClick={() => run(save)}>Salvar base</button><QueryView code={text} /></> : <BaseFile path={path} subpath="" />}
  </div>
}
function CodeQuery({ code, language }: CodeBlockProps) { const noteSet = useNoteSet(); return <QueryView code={code} language={language} from={noteSet.from} /> }
registerCodeBlock(["base", "dataview", "runas-consulta"], CodeQuery)
registerFileEmbed([".base"], BaseFile)
