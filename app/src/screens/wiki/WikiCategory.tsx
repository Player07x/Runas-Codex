import { openDocumentExport } from "../../components/export/ExportDialog"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, FileDown, Folder, Grid2X2, List, ListChecks, Palette, Plus, Search, SlidersHorizontal } from "lucide-react"
import { CoverBand, emblemIcon } from "../../components/kit/Emblem"
import { PersonalizeDialog } from "../../components/kit/PersonalizeDialog"
import { categoryLook, categoryNotePath, isCategoryNote } from "../../core/personalization"
import { toneStyle } from "../../core/tones"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { activeFilters, articleCardFields, categoryFields, categoryKind, categoryNotes, categorySubfolders, categoryViewKey, chosenFilters, filterCategory, parseCategoryView } from "../../core/wiki-category"
import { useRemembered } from "../../lib/remembered"
import { ARTICLE_KINDS } from "../../core/wiki"
import { CategoryKindDialog, FilterChooser } from "./CategoryDialogs"
import { href } from "../../lib/router"
import { Empty } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { useGridColumns } from "../../components/kit/useGridColumns"
import { clampPage, pageCount, pageSize } from "../../core/grid-rows"
import { Pagination } from "../../components/kit/Pagination"
import { ArticleArt } from "./ArticleArt"
import { NewArticleDialog } from "./WikiHome"
import { articleRoute, iconByName, useWiki } from "./wiki-state"
const MODE_KEY = "runas-codex:wiki-categoria-modo"
type Mode = "grid" | "list"
const parsePage = (raw: unknown): number => typeof raw === "number" && Number.isFinite(raw) ? raw : 1
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
  // Ordem, filtros e subpasta voltam como estavam ao reabrir a categoria (U6); a busca começa vazia.
  const [query,setQuery] = useState(""), [view,setView] = useRemembered(categoryViewKey(folder), parseCategoryView)
  const { order, fields } = view
  const subfolder = view.subfolder === "" || view.subfolder === "." || subfolders.includes(view.subfolder) ? view.subfolder : ""
  const setOrder = (value: typeof order) => setView(current => ({ ...current, order: value }))
  const setSubfolder = (value: string) => setView(current => ({ ...current, subfolder: value }))
  const [mode,setMode] = useState<Mode>(storedMode), [creating,setCreating] = useState(false)
  // Páginas que enchem a tela (U71): fileiras inteiras com 40 a 60 artigos; a página fica lembrada por categoria e
  // volta à 1 quando a busca, a ordem ou um filtro muda.
  const [storedPage,setStoredPage] = useRemembered(`${categoryViewKey(folder)}:pagina`, parsePage)
  const firstPage = () => setStoredPage(1)
  const pagerRef = useRef<HTMLDivElement>(null), moved = useRef(false)
  const resultsRef = useRef<HTMLDivElement>(null), columns = useGridColumns(resultsRef, 220, mode)
  // Um filtro que saiu da escolha deixa de valer, mesmo com um valor marcado antes.
  const applied = useMemo(() => Object.fromEntries(Object.entries(fields).filter(([key]) => facets.some(facet => facet.key === key))), [fields, facets])
  const filtered = useMemo(() => filterCategory(notes,folder,{text:query,order,fields:applied,subfolder}), [notes,folder,query,order,applied,subfolder])
  const size = pageSize(mode === "grid" ? columns : 1), page = clampPage(storedPage, filtered.length, size), pages = pageCount(filtered.length, size)
  const shown = filtered.slice((page - 1) * size, page * size)
  const goTo = (next: number) => { moved.current = true; setStoredPage(next) }
  // Trocar de página leva a vista para o começo da lista e o foco para o primeiro artigo da página nova.
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    pagerRef.current?.scrollIntoView({ block: "start" })
    resultsRef.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true })
  }, [page])
  const name = folder === root.slice(0,-1) ? "Sem pasta" : folder.split("/").at(-1)!
  const chooseMode = (mode: Mode) => { setMode(mode); try { localStorage.setItem(MODE_KEY,mode) } catch { /* Só não é lembrado no próximo início. */ } }
  const clear = () => {setQuery("");setView(current => ({ ...current, fields: {}, subfolder: "" }));firstPage()}
  const clearFilters = () => {setView(current => ({ ...current, fields: {}, subfolder: "" }));firstPage()}
  const activeCount = Object.values(applied).filter(Boolean).length + (subfolder ? 1 : 0)
  if (!valid) return <div className="page"><Empty title="Categoria fora desta Wiki" action={<a className="btn" href={href("/wiki")}>Voltar para a Wiki</a>}>Escolha uma categoria na página inicial.</Empty></div>
  const isRoot = folder === root.slice(0,-1)
  const readOnly = vault.info?.readOnly ?? true
  // A ficha só é editável aqui nas categorias que não usam um tipo pronto (as criadas pelo usuário ou sem tipo).
  const customizable = !players && !isRoot && !ARTICLE_KINDS.some(builtIn => builtIn.id === kind?.id)
  const pick = (key: string, value: string) => { setView(current => ({ ...current, fields: { ...current.fields, [key]: value } })); firstPage() }
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
      <label className="search"><Search size={16}/><input className="input" aria-label="Buscar nesta categoria" placeholder="Nome, apelido ou campo…" value={query} onChange={e=>{setQuery(e.target.value);firstPage()}}/></label>
      <label className="field"><span>Ordem</span><select className="select" aria-label="Ordem da categoria" value={order} onChange={e=>{setOrder(e.target.value as typeof order);firstPage()}}><option value="name">Nome (A–Z)</option><option value="recent">Editados por último</option></select></label>
      <div className="row" role="group" aria-label="Exibição da categoria"><button className={`btn ${mode === "grid" ? "primary" : ""}`} aria-pressed={mode === "grid"} onClick={()=>chooseMode("grid")}><Grid2X2 size={16}/> Grade</button><button className={`btn ${mode === "list" ? "primary" : ""}`} aria-pressed={mode === "list"} onClick={()=>chooseMode("list")}><List size={16}/> Lista</button></div>
    </section>
    {/* Os filtros começam fechados; o título conta os ligados e o Limpar fica à vista, para nada filtrar escondido. */}
    {(facets.length > 0 || subfolders.length > 0 || (!players && !isRoot && fieldInfo.length > 0)) && <div className="wiki-category-filters-wrap"><details className="wiki-category-filters"><summary>Filtros{activeCount > 0 && <span className="chip cyan wiki-filters-count">{activeCount === 1 ? "1 ligado" : `${activeCount} ligados`}</span>}</summary>
      {!players && !isRoot && <div className="wiki-category-filters-head"><span className="small muted">{chosen ? "Escolhidos para esta categoria." : "Automáticos: os campos com 2 a 8 valores."}</span><button className="btn sm" disabled={readOnly} onClick={() => setChoosing(true)}><SlidersHorizontal size={14}/> Escolher filtros</button></div>}
      {subfolders.length > 0 && <fieldset><legend>Subpasta</legend><div className="row-wrap">{[{value:"",label:"Todas"},{value:".",label:"Na raiz"},...subfolders.map(value=>({value,label:value}))].map(option=><button className={`chip hit-area ${subfolder === option.value ? "cyan" : ""}`} aria-pressed={subfolder === option.value} key={option.value} onClick={()=>{setSubfolder(option.value);firstPage()}}>{option.label}</button>)}</div></fieldset>}
      {facets.map(facet=>facet.values.length <= 8
        ? <fieldset key={facet.key}><legend>{facet.label}</legend><div className="row-wrap">{[{text:"",count:notes.length},...facet.values].map(({text,count})=>{const on=(!applied[facet.key] && !text) || applied[facet.key] === text;return <button key={text} className={`chip hit-area ${on ? "cyan" : ""}`} aria-pressed={on} onClick={()=>pick(facet.key,text)}>{text || "Todas"}<span className="chip-count">{count}</span></button>})}</div></fieldset>
        : <label key={facet.key} className="field wiki-category-select"><span>{facet.label}</span><select className="select" value={applied[facet.key] ?? ""} onChange={e=>pick(facet.key,e.target.value)}><option value="">Todas ({notes.length})</option>{facet.values.map(({text,count})=><option key={text} value={text}>{text} ({count})</option>)}</select></label>)}
      {facets.length === 0 && subfolders.length === 0 && <p className="small muted">Nenhum filtro ativo nesta categoria.</p>}
    </details>{activeCount > 0 && <button type="button" className="btn sm ghost wiki-filters-clear" onClick={clearFilters} aria-label="Limpar filtros">Limpar</button>}</div>}
    {notes.length === 0 ? <Empty title="Nenhum artigo nesta categoria">{players ? "Não há artigos públicos nesta pasta." : "Crie o primeiro artigo para começar esta categoria."}</Empty> : filtered.length === 0 ? <Empty title="Nenhum artigo com esses filtros" action={<button className="btn" onClick={clear}>Limpar filtros</button>}>Tente outro nome, apelido ou valor dos campos.</Empty> : <>
      <div ref={pagerRef} className="wiki-category-pager"><Pagination page={page} pages={pages} from={(page - 1) * size + 1} to={(page - 1) * size + shown.length} total={filtered.length} noun={`${filtered.length === 1 ? "artigo" : "artigos"}${filtered.length !== notes.length ? ` · ${notes.length} na categoria` : ""}`} label="Páginas da categoria" announce onPage={goTo} /></div>
      <div ref={resultsRef} className={`wiki-category-results ${mode}`} aria-label="Artigos da categoria">{shown.map(note=>{const info=articleCardFields(note);return <a className="wiki-category-article" key={note.path} href={href(articleRoute(note.path))}>
        <ArticleArt note={note} size={mode === "grid" ? "cover" : "list"}/><div className="wiki-category-copy"><h2>{note.name}</h2>{info.summary.length > 0 && <p className="wiki-category-summary" title={info.summary.join(" · ")}>{info.summary.join(" · ")}</p>}<div className="wiki-category-badges">{info.badges.map(field=><span className="chip" key={field.key} title={`${field.label}: ${field.text}`}>{field.text}</span>)}</div></div>
      </a>})}</div>
      {pages > 1 && <Pagination page={page} pages={pages} from={(page - 1) * size + 1} to={(page - 1) * size + shown.length} total={filtered.length} noun={filtered.length === 1 ? "artigo" : "artigos"} label="Páginas da categoria (fim da lista)" onPage={goTo} />}
    </>}
    {creating && <NewArticleDialog initialFolder={folder.slice(root.length)} initialKind={kind?.id} onClose={()=>setCreating(false)}/>}
    {choosing && <FilterChooser folder={folder} name={name} fields={fieldInfo} chosen={chosen} onClose={() => setChoosing(false)} />}
    {editingKind && <CategoryKindDialog root={root} wikiName={wiki!.name} folder={folder} onClose={() => setEditingKind(false)} />}
    {personalizing && <PersonalizeDialog title={`Personalizar ${name}`} name={name} path={categoryNotePath(folder)} createIn={folder} withDescription onClose={() => setPersonalizing(false)} />}
  </div>
}
