import { openDocumentExport } from "../../components/export/ExportDialog"
import { useMemo, useState } from "react"
import { ArrowLeft, FileDown, Folder, Grid2X2, List, Plus, Search } from "lucide-react"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { articleCardFields, categoryFacets, categoryKind, categoryNotes, categorySubfolders, filterCategory } from "../../core/wiki-category"
import { href } from "../../lib/router"
import { Empty } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { ArticleArt } from "./ArticleArt"
import { NewArticleDialog } from "./WikiHome"
import { articleRoute, iconByName, useWiki } from "./wiki-state"
const MODE_KEY = "runas-codex:wiki-categoria-modo"
type Mode = "grid" | "list"
const storedMode = (): Mode => { try { return localStorage.getItem(MODE_KEY) === "list" ? "list" : "grid" } catch { return "grid" } }
export function WikiCategory({ path }: { path: string }) {
  const vault = useVault(), { wiki, players } = useWiki(), index = vault.index!
  const folder = path.replace(/\/$/, ""), root = wiki!.root
  const valid = folder === root.slice(0,-1) || folder.startsWith(root)
  const notes = useMemo(() => categoryNotes(index.notesIn(root), folder, root, wiki!.home), [index, root, folder, wiki?.home, vault.version])
  const kind = useMemo(() => categoryKind(notes, folder), [notes, folder]), Icon = iconByName(kind?.icon ?? "")
  const facets = useMemo(() => categoryFacets(notes), [notes]), subfolders = useMemo(() => categorySubfolders(notes,folder), [notes,folder])
  const [query,setQuery] = useState(""), [order,setOrder] = useState<"name"|"recent">("name"), [fields,setFields] = useState<Record<string,string>>({}), [subfolder,setSubfolder] = useState("")
  const [mode,setMode] = useState<Mode>(storedMode), [limit,setLimit] = useState(24), [creating,setCreating] = useState(false)
  const filtered = useMemo(() => filterCategory(notes,folder,{text:query,order,fields,subfolder}), [notes,folder,query,order,fields,subfolder])
  const name = folder === root.slice(0,-1) ? "Sem pasta" : folder.split("/").at(-1)!
  const chooseMode = (mode: Mode) => { setMode(mode); try { localStorage.setItem(MODE_KEY,mode) } catch { /* Só não é lembrado no próximo início. */ } }
  const clear = () => {setQuery("");setFields({});setSubfolder("");setLimit(24)}
  if (!valid) return <div className="page"><Empty title="Categoria fora desta Wiki" action={<a className="btn" href={href("/wiki")}>Voltar para a Wiki</a>}>Escolha uma categoria na página inicial.</Empty></div>
  return <div className="page wiki-category-page">
    <a className="wiki-category-back" href={href("/wiki")}><ArrowLeft size={16}/> Voltar para a Wiki</a>
    <header className="page-head"><div><span className="eyebrow">{wiki!.name} · Categoria{players ? " · Visão dos jogadores" : ""}</span><h1 className="page-title row">{kind ? <Icon size={25}/> : <Folder size={25}/>} {name}</h1><p className="small muted">{notes.length} {notes.length === 1 ? "artigo" : "artigos"}</p></div>
      <div className="kit-actions">
        {!players && <button className="btn primary" disabled={vault.info?.readOnly} onClick={() => setCreating(true)}><Plus size={16}/> Novo {kind?.label.toLocaleLowerCase("pt-BR") ?? "artigo"}</button>}
        <OverflowMenu label="Ações da categoria" items={[{ label: "Exportar categoria…", icon: <FileDown size={15}/>, onSelect: () => openDocumentExport({ paths: notes.map(note => note.path), title: name, players }) }]} />
      </div>
    </header>
    <section className="wiki-category-controls" aria-label="Busca e organização da categoria">
      <label className="search"><Search size={16}/><input className="input" aria-label="Buscar nesta categoria" placeholder="Nome, apelido ou campo…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24)}}/></label>
      <label className="field"><span>Ordem</span><select className="select" aria-label="Ordem da categoria" value={order} onChange={e=>{setOrder(e.target.value as typeof order);setLimit(24)}}><option value="name">Nome (A–Z)</option><option value="recent">Editados por último</option></select></label>
      <div className="row" role="group" aria-label="Exibição da categoria"><button className={`btn ${mode === "grid" ? "primary" : ""}`} aria-pressed={mode === "grid"} onClick={()=>chooseMode("grid")}><Grid2X2 size={16}/> Grade</button><button className={`btn ${mode === "list" ? "primary" : ""}`} aria-pressed={mode === "list"} onClick={()=>chooseMode("list")}><List size={16}/> Lista</button></div>
    </section>
    {(facets.length > 0 || subfolders.length > 0) && <details className="wiki-category-filters"><summary>Filtros</summary>
      {subfolders.length > 0 && <fieldset><legend>Subpasta</legend><div className="row-wrap">{[{value:"",label:"Todas"},{value:".",label:"Na raiz"},...subfolders.map(value=>({value,label:value}))].map(option=><button className={`chip ${subfolder === option.value ? "cyan" : ""}`} aria-pressed={subfolder === option.value} key={option.value} onClick={()=>{setSubfolder(option.value);setLimit(24)}}>{option.label}</button>)}</div></fieldset>}
      {facets.map(facet=><fieldset key={facet.key}><legend>{facet.label}</legend><div className="row-wrap">{["",...facet.values].map(value=><button key={value} className={`chip ${(!fields[facet.key] && !value) || fields[facet.key] === value ? "cyan" : ""}`} aria-pressed={(!fields[facet.key] && !value) || fields[facet.key] === value} onClick={()=>{setFields(current=>({...current,[facet.key]:value}));setLimit(24)}}>{value || "Todas"}</button>)}</div></fieldset>)}
    </details>}
    {notes.length === 0 ? <Empty title="Nenhum artigo nesta categoria">{players ? "Não há artigos públicos nesta pasta." : "Crie o primeiro artigo para começar esta categoria."}</Empty> : filtered.length === 0 ? <Empty title="Nenhum artigo com esses filtros" action={<button className="btn" onClick={clear}>Limpar filtros</button>}>Tente outro nome, apelido ou valor dos campos.</Empty> : <>
      <p className="small muted" role="status">{Math.min(limit,filtered.length)} de {filtered.length} {filtered.length === 1 ? "artigo" : "artigos"}{filtered.length !== notes.length ? ` · ${notes.length} na categoria` : ""}</p>
      <div className={`wiki-category-results ${mode}`} aria-label="Artigos da categoria">{filtered.slice(0,limit).map(note=>{const info=articleCardFields(note);return <a className="wiki-category-article" key={note.path} href={href(articleRoute(note.path))}>
        <ArticleArt note={note} size={mode === "grid" ? "cover" : "list"}/><div className="wiki-category-copy"><h2>{note.name}</h2>{info.summary.length > 0 && <p className="wiki-category-summary" title={info.summary.join(" · ")}>{info.summary.join(" · ")}</p>}<div className="wiki-category-badges">{info.badges.map(field=><span className="chip" key={field.key} title={`${field.label}: ${field.text}`}>{field.text}</span>)}</div></div>
      </a>})}</div>
      {filtered.length > limit && <button className="btn wiki-category-more" onClick={()=>setLimit(count=>count+24)}>Mostrar mais ({filtered.length-limit} restantes)</button>}
    </>}
    {creating && <NewArticleDialog initialFolder={folder.slice(root.length)} initialKind={kind?.id} onClose={()=>setCreating(false)}/>}
  </div>
}
