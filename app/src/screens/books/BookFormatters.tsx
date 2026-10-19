import { useEffect, useId, useState } from "react"
import { Bold, ChevronDown, ChevronUp, Columns3, Heading, Italic, LayoutGrid, Palette, Pilcrow, Plus, Search, Underline, X } from "lucide-react"
import { FORMATTER_GROUPS } from "./formatters"

const icons = [Bold, Palette, Pilcrow, LayoutGrid, Plus, Columns3]
export function BookFormatters({ insert }: { insert(text: string): void }) {
  const [group, setGroup] = useState("Texto"), [searching, setSearching] = useState(false), [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("runas-codex:livros:formatadores-recolhidos") === "true" } catch { return false }
  })
  const galleryId = useId()
  useEffect(() => {
    try { localStorage.setItem("runas-codex:livros:formatadores-recolhidos", String(collapsed)) } catch { /* preferência opcional */ }
  }, [collapsed])
  const toggle = () => { setCollapsed(value => !value); setSearching(false); setQuery("") }
  const items = FORMATTER_GROUPS.filter(item => query || item.title === group).flatMap(item => item.items).filter(item => !query || item.label.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))
  return <section className="books-formatters" aria-label="Formatadores" data-collapsed={collapsed}>
    <div className="ribbon-heading" onDoubleClick={event => { if (!(event.target as HTMLElement).closest(".formatter-search,.formatter-toggle")) toggle() }}><div className="formatter-categories" role="group" aria-label="Categorias de formatação">{FORMATTER_GROUPS.map((item,i) => { const Icon = icons[i] ?? Heading; return <button key={item.title} type="button" className={group === item.title ? "active" : ""} aria-pressed={group === item.title} title={`${item.title} · Dois cliques para ${collapsed ? "mostrar" : "ocultar"} os formatadores`} onClick={() => { setGroup(item.title); setQuery("") }}><Icon size={14}/><span>{item.title}</span></button> })}</div>
      <button className="icon-btn formatter-toggle" type="button" aria-label={collapsed ? "Mostrar formatadores" : "Ocultar formatadores"} title={collapsed ? "Mostrar formatadores" : "Ocultar formatadores"} aria-expanded={!collapsed} aria-controls={galleryId} onClick={toggle}>{collapsed ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}</button>
      <button className="icon-btn formatter-search" type="button" aria-label={searching ? "Fechar busca de formatadores" : "Buscar formatador"} title="Buscar formatador" onClick={() => {setSearching(!searching);setQuery("");setCollapsed(false)}}>{searching ? <X size={15}/> : <Search size={15}/>}</button>
    </div>
    {searching && <input type="search" className="input formatter-query" aria-label="Buscar formatador" placeholder="Buscar formatação…" value={query} onChange={e => setQuery(e.target.value)} />}
    <div id={galleryId} className="formatter-ribbon" aria-label="Galeria de formatadores" hidden={collapsed}>{items.map(item => {
      const columns = /Colunas automáticas: (\d)/.exec(item.label)?.[1]
      return <button type="button" className="formatter-card" key={item.label} aria-label={item.label} title={item.label + "\n" + item.syntax} onMouseDown={e => e.preventDefault()} onClick={() => insert(item.syntax)}>
        <span className="formatter-sample" aria-hidden="true">{columns ? <span className="column-sample" style={{ gridTemplateColumns: `repeat(${columns},1fr)` }}>{Array.from({ length: Number(columns) }, (_,i) => <span key={i}>━━<br />━━<br />━</span>)}</span> : item.label === "Negrito" ? <Bold size={20}/> : item.label === "Itálico" ? <Italic size={20}/> : item.label === "Sublinhado" ? <Underline size={20}/> : item.label.includes("Título") ? <b>{item.label.split(" ")[1]}</b> : item.label.includes("Tabela") ? "▦" : item.label.includes("Imagem") ? "▧" : item.label.includes("Quebra") ? "↵" : item.label.includes("Lista") ? "☷" : item.label === "Tachado" ? <s>Aa</s> : item.label === "Destaque" ? <mark>Aa</mark> : "Aa"}</span>
        <span>{columns ? `${columns} ${columns === "1" ? "coluna" : "colunas"}` : item.label}</span>
      </button>
    })}</div>
  </section>
}
