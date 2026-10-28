import { openDocumentExport } from "../../components/export/ExportDialog"
import { useMemo, useState } from "react"
import { ArrowLeft, FileDown, Folder, Grid2X2, List, ListChecks, Palette, Plus, Search, SlidersHorizontal } from "lucide-react"
import { CoverBand, emblemIcon } from "../../components/kit/Emblem"
import { PersonalizeDialog } from "../../components/kit/PersonalizeDialog"
import { categoryLook, categoryNotePath, isCategoryNote } from "../../core/personalization"
import { toneStyle } from "../../core/tones"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { activeFilters, articleCardFields, categoryFields, categoryKind, categoryNotes, categorySubfolders, chosenFilters, filterCategory } from "../../core/wiki-category"
import { ARTICLE_KINDS } from "../../core/wiki"
import { CategoryKindDialog, FilterChooser } from "./CategoryDialogs"
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
  const notes = useMemo(() => categoryNotes(index.notesIn(root), folder, root, wiki!.home).filter(note => !isCategoryNote(note)), [index, root, folder, wiki?.home, vault.version])
  const look = useMemo(() => categoryLook(index, folder), [index, folder, vault.version])
  const Emblem = emblemIcon(look.emblem)
  const [personalizing, setPersonalizing] = useState(false)
  const kind = useMemo(() => categoryKind(notes, folder), [notes, folder]), Icon = iconByName(kind?.icon ?? "")
  const categoryNote = index.note(categoryNotePath(folder))
  const chosen = useMemo(() => chosenFilters(categoryNote && isCategoryNote(categoryNote) ? categoryNote.meta.frontmatter?.data : undefined), [categoryNote, vault.version])
  const fieldInfo = useMemo(() => categoryFields(notes), [notes]), subfolders = useMemo(() => categorySubfolders(notes,folder), [notes,folder])
  const facets = useMemo(() => activeFilters(fieldInfo, chosen), [fieldInfo, chosen])
  const [choosing, setChoosing] = useState(false), [editingKind, setEditingKind] = useState(false)
  const [query,setQuery] = useState(""), [order,setOrder] = useState<"name"|"recent">("name"), [fields,setFields] = useState<Record<string,string>>({}), [subfolder,setSubfolder] = useState("")
  const [mode,setMode] = useState<Mode>(storedMode), [limit,setLimit] = useState(24), [creating,setCreating] = useState(false)
  // Um filtro que saiu da escolha deixa de valer, mesmo com um valor marcado antes.
  const applied = useMemo(() => Object.fromEntries(Object.entries(fields).filter(([key]) => facets.some(facet => facet.key === key))), [fields, facets])
  const filtered = useMemo(() => filterCategory(notes,folder,{text:query,order,fields:applied,subfolder}), [notes,folder,query,order,applied,subfolder])
  const name = folder === root.slice(0,-1) ? "Sem pasta" : folder.split("/").at(-1)!
  const chooseMode = (mode: Mode) => { setMode(mode); try { localStorage.setItem(MODE_KEY,mode) } catch { /* Só não é lembrado no próximo início. */ } }
  const clear = () => {setQuery("");setFields({});setSubfolder("");setLimit(24)}
  if (!valid) return <div className="page"><Empty title="Categoria fora desta Wiki" action={<a className="btn" href={href("/wiki")}>Voltar para a Wiki</a>}>Escolha uma categoria na página inicial.</Empty></div>
  const isRoot = folder === root.slice(0,-1)
  const readOnly = vault.info?.readOnly ?? true
  // A ficha só é editável aqui nas categorias que não usam um tipo pronto (as criadas pelo usuário ou sem tipo).
  const customizable = !players && !isRoot && !ARTICLE_KINDS.some(builtIn => builtIn.id === kind?.id)
  const pick = (key: string, value: string) => { setFields(current => ({ ...current, [key]: value })); setLimit(24) }
  return <div className={`page wiki-category-page${look.tone ? " toned" : ""}`} style={toneStyle(look.tone)}>
    <a className="wiki-category-back" href={href("/wiki")}><ArrowLeft size={16}/> Voltar para a Wiki</a>
    {look.cover && <CoverBand tone={look.tone} cover={look.cover} from={folder + "/"} height={140} className="wiki-category-cover" />}
    <header className="page-head"><div><span className="eyebrow">{wiki!.name} · Categoria{players ? " · Visão dos jogadores" : ""}</span><h1 className="page-title row">{Emblem ? <Emblem size={25}/> : kind ? <Icon size={25}/> : <Folder size={25}/>} {name}</h1>{look.description && <p className="wiki-category-description">{look.description}</p>}<p className="small muted">{notes.length} {notes.length === 1 ? "artigo" : "artigos"}</p></div>
      <div className="kit-actions">
        {!players && <button className="btn primary" disabled={vault.info?.readOnly} onClick={() => setCreating(true)}><Plus size={16}/> Novo {kind?.label.toLocaleLowerCase("pt-BR") ?? "artigo"}</button>}
        <OverflowMenu label="Ações da categoria" items={[
          ...(!players && !isRoot ? [{ label: "Personalizar categoria…", icon: <Palette size={15}/>, onSelect: () => setPersonalizing(true), disabled: readOnly }, { label: "Escolher filtros…", icon: <SlidersHorizontal size={15}/>, onSelect: () => setChoosing(true), disabled: readOnly }] : []),
          ...(customizable ? [{ label: "Ficha da categoria…", icon: <ListChecks size={15}/>, onSelect: () => setEditingKind(true), disabled: readOnly }] : []),
          { label: "Exportar categoria…", icon: <FileDown size={15}/>, onSelect: () => openDocumentExport({ paths: notes.map(note => note.path), title: name, players }) },
        ]} />
      </div>
    </header>
    <section className="wiki-category-controls" aria-label="Busca e organização da categoria">
      <label className="search"><Search size={16}/><input className="input" aria-label="Buscar nesta categoria" placeholder="Nome, apelido ou campo…" value={query} onChange={e=>{setQuery(e.target.value);setLimit(24)}}/></label>
      <label className="field"><span>Ordem</span><select className="select" aria-label="Ordem da categoria" value={order} onChange={e=>{setOrder(e.target.value as typeof order);setLimit(24)}}><option value="name">Nome (A–Z)</option><option value="recent">Editados por último</option></select></label>
      <div className="row" role="group" aria-label="Exibição da categoria"><button className={`btn ${mode === "grid" ? "primary" : ""}`} aria-pressed={mode === "grid"} onClick={()=>chooseMode("grid")}><Grid2X2 size={16}/> Grade</button><button className={`btn ${mode === "list" ? "primary" : ""}`} aria-pressed={mode === "list"} onClick={()=>chooseMode("list")}><List size={16}/> Lista</button></div>
    </section>
    {(facets.length > 0 || subfolders.length > 0 || (!players && !isRoot && fieldInfo.length > 0)) && <details className="wiki-category-filters" open={facets.length > 0 || undefined}><summary>Filtros</summary>
      {!players && !isRoot && <div className="wiki-category-filters-head"><span className="small muted">{chosen ? "Escolhidos para esta categoria." : "Automáticos: os campos com 2 a 8 valores."}</span><button className="btn sm" disabled={readOnly} onClick={() => setChoosing(true)}><SlidersHorizontal size={14}/> Escolher filtros</button></div>}
      {subfolders.length > 0 && <fieldset><legend>Subpasta</legend><div className="row-wrap">{[{value:"",label:"Todas"},{value:".",label:"Na raiz"},...subfolders.map(value=>({value,label:value}))].map(option=><button className={`chip hit-area ${subfolder === option.value ? "cyan" : ""}`} aria-pressed={subfolder === option.value} key={option.value} onClick={()=>{setSubfolder(option.value);setLimit(24)}}>{option.label}</button>)}</div></fieldset>}
      {facets.map(facet=>facet.values.length <= 8
        ? <fieldset key={facet.key}><legend>{facet.label}</legend><div className="row-wrap">{[{text:"",count:notes.length},...facet.values].map(({text,count})=>{const on=(!applied[facet.key] && !text) || applied[facet.key] === text;return <button key={text} className={`chip hit-area ${on ? "cyan" : ""}`} aria-pressed={on} onClick={()=>pick(facet.key,text)}>{text || "Todas"}<span className="chip-count">{count}</span></button>})}</div></fieldset>
        : <label key={facet.key} className="field wiki-category-select"><span>{facet.label}</span><select className="select" value={applied[facet.key] ?? ""} onChange={e=>pick(facet.key,e.target.value)}><option value="">Todas ({notes.length})</option>{facet.values.map(({text,count})=><option key={text} value={text}>{text} ({count})</option>)}</select></label>)}
      {facets.length === 0 && subfolders.length === 0 && <p className="small muted">Nenhum filtro ativo nesta categoria.</p>}
    </details>}
    {notes.length === 0 ? <Empty title="Nenhum artigo nesta categoria">{players ? "Não há artigos públicos nesta pasta." : "Crie o primeiro artigo para começar esta categoria."}</Empty> : filtered.length === 0 ? <Empty title="Nenhum artigo com esses filtros" action={<button className="btn" onClick={clear}>Limpar filtros</button>}>Tente outro nome, apelido ou valor dos campos.</Empty> : <>
      <p className="small muted" role="status">{Math.min(limit,filtered.length)} de {filtered.length} {filtered.length === 1 ? "artigo" : "artigos"}{filtered.length !== notes.length ? ` · ${notes.length} na categoria` : ""}</p>
      <div className={`wiki-category-results ${mode}`} aria-label="Artigos da categoria">{filtered.slice(0,limit).map(note=>{const info=articleCardFields(note);return <a className="wiki-category-article" key={note.path} href={href(articleRoute(note.path))}>
        <ArticleArt note={note} size={mode === "grid" ? "cover" : "list"}/><div className="wiki-category-copy"><h2>{note.name}</h2>{info.summary.length > 0 && <p className="wiki-category-summary" title={info.summary.join(" · ")}>{info.summary.join(" · ")}</p>}<div className="wiki-category-badges">{info.badges.map(field=><span className="chip" key={field.key} title={`${field.label}: ${field.text}`}>{field.text}</span>)}</div></div>
      </a>})}</div>
      {filtered.length > limit && <button className="btn wiki-category-more" onClick={()=>setLimit(count=>count+24)}>Mostrar mais ({filtered.length-limit} restantes)</button>}
    </>}
    {creating && <NewArticleDialog initialFolder={folder.slice(root.length)} initialKind={kind?.id} onClose={()=>setCreating(false)}/>}
    {choosing && <FilterChooser folder={folder} name={name} fields={fieldInfo} chosen={chosen} onClose={() => setChoosing(false)} />}
    {editingKind && <CategoryKindDialog root={root} wikiName={wiki!.name} folder={folder} onClose={() => setEditingKind(false)} />}
    {personalizing && <PersonalizeDialog title={`Personalizar ${name}`} name={name} path={categoryNotePath(folder)} createIn={folder} withDescription onClose={() => setPersonalizing(false)} />}
  </div>
}
