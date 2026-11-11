import "./relations.css"
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Maximize2, Minus, Plus, ZoomIn, ZoomOut } from "lucide-react"
import type { GraphData } from "../../core/graph-data"
import { layoutNeighbors, layoutOrg, orgStructureOf, type LayoutNode, type OrgPerson, type OrgStructure } from "../../core/relation-layout"
import { familyGraph, generationLabel, layoutFamily } from "../../core/family-layout"
import { noteName } from "../../core/text"
import { articleKind, diplomacy, relationEdges, relationsOf } from "../../core/wiki"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { NoteCrest } from "../../components/kit/Emblem"
import { FormField } from "../../components/kit/FormField"
import { ListRow, PageHeader } from "../../components/kit/Layout"
import { ResizablePanel, usePanelToggle } from "../../components/ResizablePanel"
import { DEFAULT_FORCES, GraphView } from "../../components/vault/GraphView"
import { href, navigate } from "../../lib/router"
import { useSinglePane } from "../../lib/tabs"
import { noteRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { Relations } from "./WikiArticle"
import { articleRoute, useWiki } from "./wiki-state"

type View = "organizacao" | "familia" | "diplomacia"
type Show = "grafico" | "lista"

const VIEW_KEY = "runas-codex:wiki-relacoes-visao"
const PANEL = "wiki-relacoes"
const readView = (): View | null => { try { const v = localStorage.getItem(VIEW_KEY); return v === "organizacao" || v === "familia" || v === "diplomacia" ? v : null } catch { return null } }
const byName = (a: string, b: string) => noteName(a).localeCompare(noteName(b), "pt-BR")
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")
const upper = (text: string) => text.charAt(0).toLocaleUpperCase("pt-BR") + text.slice(1)
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// Cores da teia: a exceção registrada à regra de não usar hexadecimal (D6); em texto, o nome da relação vai junto.
const DIPLOMACY_COLORS: Record<string, { color: string; label: string }> = {
  aliados: { color: "#9dcbb4", label: "Aliança" },
  inimigos: { color: "#ffa48e", label: "Inimizade" },
  em_guerra_com: { color: "#ff6f5e", label: "Guerra" },
  rivais: { color: "#ecc484", label: "Rivalidade" },
  paz_tensa_com: { color: "#d9b26b", label: "Paz tensa" },
  vassalo_de: { color: "#bfadf1", label: "Vassalagem" },
}

/**
 * Relações da wiki (U25): um cabeçalho, a visão (Organograma, Árvore genealógica, Teia diplomática) e como mostrar
 * (Gráfico ou Lista) em dois seletores; à esquerda a lista com busca, no meio o gráfico (ou a tabela) e à direita o
 * painel do nó escolhido (`ResizablePanel`, D4). No celular a lista vem primeiro; escolher abre o gráfico e o nó sobe
 * por cima. A visão fica lembrada no aparelho.
 */
export function WikiRelations({ path }: { path?: string }) {
  const vault = useVault()
  const { wiki } = useWiki()
  const index = vault.index!
  const root = wiki!.root
  const readOnly = vault.info?.readOnly ?? true
  const edges = useMemo(() => relationEdges(index, root), [index, root, vault.version])
  const kindOf = (p: string) => articleKind(index.note(p)?.meta.frontmatter?.data?.tipo)?.id
  const orgs = useMemo(() => index.notesIn(root).filter((n) => articleKind(n.meta.frontmatter?.data?.tipo)?.id === "organizacao").map((n) => n.path).sort(byName), [index, root, vault.version])
  const structures = useMemo(() => new Map(orgs.map((o) => [o, orgStructureOf(index, o, root, edges)])), [orgs, index, root, edges])
  const people = useMemo(() => [...new Set(edges.filter((e) => e.type.group === "familia").flatMap((e) => [e.from, e.to]))].sort(byName), [edges])
  const web = useMemo(() => diplomacy(index, root), [index, root, vault.version])

  // Por onde começar: o artigo pedido (organização, pessoa com família ou membro de alguma), a visão lembrada ou a
  // primeira que tem dados (Organograma, Árvore, Teia).
  const [start] = useState(() => {
    const busiest = orgs.find((o) => structures.get(o)!.members > 0) ?? orgs[0] ?? ""
    const base = { organizacao: busiest, familia: people[0] ?? "", diplomacia: web.nodes[0] ?? "" }
    if (path && kindOf(path) === "organizacao") return { view: "organizacao" as View, current: { ...base, organizacao: path }, selected: path }
    if (path && people.includes(path)) return { view: "familia" as View, current: { ...base, familia: path }, selected: path }
    const memberOf = path ? orgs.find((o) => findPerson(structures.get(o)!.people, path)) : undefined
    if (path && memberOf) return { view: "organizacao" as View, current: { ...base, organizacao: memberOf }, selected: path }
    const firstWithData: View = [...structures.values()].some((s) => s.members) ? "organizacao" : people.length ? "familia" : "diplomacia"
    return { view: readView() ?? firstWithData, current: base, selected: null as string | null }
  })
  const [view, setViewState] = useState<View>(start.view)
  const [show, setShow] = useState<Show>("grafico")
  const [current, setCurrent] = useState<Record<View, string>>(start.current)
  const [selected, setSelected] = useState<string | null>(start.selected)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const narrow = useSinglePane()
  const [mobileGraph, setMobileGraph] = useState(Boolean(path))
  const panel = usePanelToggle(PANEL, 860)

  const setView = (next: View) => {
    setViewState(next); setSelected(null); setQuery(""); setMobileGraph(false)
    try { localStorage.setItem(VIEW_KEY, next) } catch { /* só não fica lembrada */ }
  }
  const choose = (item: string) => {
    setCurrent((c) => ({ ...c, [view]: item })); setSelected(item); setCollapsed(new Set())
    if (narrow) setMobileGraph(true)
  }
  const select = (node: string) => {
    setSelected(node)
    if (narrow && !panel.overlay) panel.toggle()
  }
  const toggleBranch = (node: string) => setCollapsed((s) => { const next = new Set(s); if (next.has(node)) next.delete(node); else next.add(node); return next })

  // Esc fecha o painel por cima (celular) e devolve o foco ao nó.
  useEffect(() => {
    if (!panel.overlay) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return
      panel.close()
      if (selected) document.querySelector<HTMLElement>(`[data-node="${CSS.escape(selected)}"]`)?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [panel, selected])

  const lists: Record<View, { title: string; items: string[]; meta(item: string): string; empty: ReactNode }> = {
    organizacao: {
      title: "Organizações", items: orgs,
      meta: (o) => { const s = structures.get(o)!; return s.members ? `${plural(s.members - s.former, "membro", "membros")}${s.former ? `, ${plural(s.former, "antigo", "antigos")}` : ""}` : "Sem membros" },
      empty: <>Nenhuma organização. Crie artigos do tipo Organização; os membros usam <code>membro_de</code> (o cargo entre parênteses), <code>lider_de</code> e <code>subordinado_a</code>.</>,
    },
    familia: {
      title: "Pessoas", items: people,
      meta: (p) => plural(edges.filter((e) => e.type.group === "familia" && (e.from === p || e.to === p)).length, "laço de família", "laços de família"),
      empty: <>Nenhuma relação de família. Use as propriedades <code>pais</code>, <code>filhos</code>, <code>conjuges</code> e <code>irmaos</code> (listas de links) nos artigos.</>,
    },
    diplomacia: {
      title: "Facções", items: web.nodes,
      meta: (f) => `${articleKind(index.note(f)?.meta.frontmatter?.data?.tipo)?.label ?? "Facção"} · ${plural(web.edges.filter((e) => e.from === f || e.to === f).length, "relação", "relações")}`,
      empty: <>Nenhuma relação entre facções. Em organizações, países, culturas e religiões, use <code>aliados</code>, <code>inimigos</code>, <code>rivais</code>, <code>em_guerra_com</code>, <code>paz_tensa_com</code> e <code>vassalo_de</code>.</>,
    },
  }
  const list = lists[view]
  const shown = list.items.filter((item) => !query.trim() || fold(noteName(item)).includes(fold(query.trim())))
  const subject = current[view]
  const structure = view === "organizacao" && subject ? structures.get(subject) : undefined

  const listPart = <div className="relations-list">
    <FormField label={list.title} hint={<span role="status">{shown.length === list.items.length ? plural(list.items.length, "item", "itens") : `${shown.length} de ${list.items.length}`}</span>}>
      {(control) => <input id={control.id} className="input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-describedby={control.describedBy} autoComplete="off" />}
    </FormField>
    <div className="relations-list-rows">
      {shown.map((item) => <ListRow key={item} media={<NoteCrest path={item} name={noteName(item)} size={32} round={view === "familia"} />} title={noteName(item)} meta={list.meta(item)}
        current={item === subject} onClick={() => choose(item)} trailing={narrow ? <ChevronRight size={16} aria-hidden="true" /> : undefined} />)}
      {list.items.length > 0 && !shown.length && <p className="small muted">Nada com “{query.trim()}”.</p>}
    </div>
  </div>

  const mainPart = !list.items.length ? <p className="muted relations-empty">{list.empty}</p>
    : !subject ? <p className="muted relations-empty">Escolha na lista.</p>
    : view === "organizacao" && structure
      ? show === "grafico"
        ? <OrgGraph key={subject} structure={structure} collapsed={collapsed} selected={selected} onSelect={select} onToggle={toggleBranch} />
        : <OrgTable structure={structure} onSelect={select} />
      : view === "familia"
        ? show === "grafico" ? <FamilyTreeView center={subject} root={root} onSelect={(path) => { if (path !== subject) choose(path); else select(path) }} /> : <FamilyTable people={people} root={root} onSelect={select} />
        : show === "grafico" ? <DiplomacyGraph root={root} onSelect={select} /> : <DiplomacyTable root={root} />

  const panelNode = selected ? <NodeDetails key={selected} path={selected} org={view === "organizacao" ? structure : undefined} root={root} readOnly={readOnly}
    branch={structure && view === "organizacao" ? { collapsed: collapsed.has(selected), onToggle: () => toggleBranch(selected) } : undefined} /> : <p className="small muted">Escolha um nó no gráfico (ou na lista) para ver os detalhes e as relações.</p>

  return (
    <div className="page wiki-relations-page">
      <PageHeader eyebrow={`Wiki · ${wiki!.name}`} title="Relações" />
      <div className="relations-controls">
        <ChoiceGroup label="Visão" value={view} onChange={setView} options={[{ value: "organizacao", label: "Organograma" }, { value: "familia", label: "Árvore genealógica" }, { value: "diplomacia", label: "Teia diplomática" }]} />
        <ChoiceGroup label="Mostrar como" value={show} onChange={setShow} options={[{ value: "grafico", label: "Gráfico" }, { value: "lista", label: "Lista" }]} />
      </div>
      <div className={`relations-layout${panel.overlay ? " show-panel" : ""}`}>
        {(!narrow || !mobileGraph) && listPart}
        {(!narrow || mobileGraph) && <section className="relations-main" aria-label={subject ? `${noteName(subject)}: ${show === "grafico" ? "gráfico" : "lista"}` : "Relações"}>
          {narrow && <div className="relations-mobile-bar">
            <button type="button" className="btn ghost sm" onClick={() => setMobileGraph(false)}><ChevronLeft size={16} aria-hidden="true" /> {list.title}</button>
            {subject && <strong className="truncate">{noteName(subject)}</strong>}
          </div>}
          {mainPart}
        </section>}
        <ResizablePanel id={PANEL} label="Detalhes" side="right" width={320} className="relations-panel" reveal={Boolean(selected)} onCollapsedChange={panel.onCollapsedChange}>
          {narrow && <button type="button" className="btn ghost sm relations-panel-close" onClick={() => { panel.close(); if (selected) document.querySelector<HTMLElement>(`[data-node="${CSS.escape(selected)}"]`)?.focus() }}>Fechar os detalhes</button>}
          {panelNode}
        </ResizablePanel>
      </div>
    </div>
  )
}

// ---------- Painel do nó ----------

function NodeDetails({ path, org, root, readOnly, branch }: {
  path: string; org?: OrgStructure; root: string; readOnly: boolean; branch?: { collapsed: boolean; onToggle(): void }
}) {
  const vault = useVault()
  const note = vault.index!.note(path)
  const status = note?.meta.frontmatter?.data?.status
  const kind = articleKind(note?.meta.frontmatter?.data?.tipo)
  const person = org ? findPerson(org.people, path) : undefined
  const below = person ? countBelow(person) : 0
  const orgName = org ? noteName(org.org) : ""
  const roleLine = !org || !person ? (org && path === org.org ? `${plural(org.members - org.former, "membro", "membros")}${org.former ? ` e ${plural(org.former, "antigo membro", "antigos membros")}` : ""}` : kind?.label)
    : person.former ? `Antigo membro de ${orgName}${person.role ? ` (${person.role})` : ""}`
    : person.leader ? `${person.role ? upper(person.role) : "Líder"} de ${orgName}` : `${person.role ? upper(person.role) : "Membro"} de ${orgName}`
  return <div className="relations-node">
    <div className="relations-node-head">
      <NoteCrest path={path} name={noteName(path)} size={56} round={kind?.id === "personagem"} />
      <div className="relations-node-text">
        <h2>{noteName(path)}</h2>
        {roleLine && <span className="small muted">{roleLine}</span>}
        {typeof status === "string" && status.trim() && <span className="small muted">Situação: {status}</span>}
      </div>
    </div>
    <div className="row-wrap">
      {note && <button type="button" className="btn sm" onClick={() => navigate(articleRoute(path))}>Abrir artigo</button>}
      {branch && (below > 0 || (org && path === org.org && org.people.length > 0)) && <button type="button" className="btn sm ghost" aria-expanded={!branch.collapsed} onClick={branch.onToggle}>
        {branch.collapsed ? <ChevronRight size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}{branch.collapsed ? "Abrir o ramo" : "Fechar o ramo"}
      </button>}
    </div>
    {note ? <Relations path={path} root={root} readOnly={readOnly} shortcuts={false} /> : <p className="small muted">Este nome ainda não tem artigo.</p>}
  </div>
}

const findPerson = (people: OrgPerson[], path: string): OrgPerson | undefined => {
  for (const p of people) { if (p.path === path) return p; const inner = findPerson(p.children, path); if (inner) return inner }
  return undefined
}
const countBelow = (p: OrgPerson): number => p.children.reduce((n, c) => n + 1 + countBelow(c), 0)

// ---------- Organograma ----------

function useZoom(region: RefObject<HTMLDivElement | null>, width: number, height: number) {
  const [scale, setScale] = useState(1)
  const clamp = (value: number) => Math.min(1.6, Math.max(0.3, Math.round(value * 100) / 100))
  const fit = () => {
    const el = region.current
    if (!el) return
    setScale(clamp(Math.min(1, (el.clientWidth - 8) / width, (el.clientHeight - 8) / height)))
    el.scrollTo({ left: 0, top: 0 })
  }
  return { scale, zoomIn: () => setScale((s) => clamp(s * 1.25)), zoomOut: () => setScale((s) => clamp(s / 1.25)), fit }
}

const ARROWS: Record<string, "up" | "down" | "left" | "right" | undefined> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }

const personMeta = (node: LayoutNode, status: unknown) => {
  if (node.kind === "org") return "Organização"
  const p = node.person!
  return [p.leader ? (p.role ? upper(p.role) : "Líder") : p.role ? upper(p.role) : "", p.former ? "Antigo membro" : "", typeof status === "string" ? status.trim() : ""].filter(Boolean).join(" · ") || "Membro"
}

/**
 * O organograma desenhado (D11): uma parada de Tab (o nó ativo), as setas andam pela estrutura (↑ chefe, ↓ primeiro
 * subordinado, ← → vizinhos do ramo), Enter mostra os detalhes, + e − aproximam e 0 enquadra; os botões fazem o mesmo.
 * Antigo membro: borda tracejada e “Antigo membro” escrito (D7, sem opacidade).
 */
function OrgGraph({ structure, collapsed, selected, onSelect, onToggle }: {
  structure: OrgStructure; collapsed: ReadonlySet<string>; selected: string | null; onSelect(path: string): void; onToggle(path: string): void
}) {
  const vault = useVault()
  const help = useId()
  const region = useRef<HTMLDivElement>(null)
  const layout = useMemo(() => layoutOrg(structure, collapsed), [structure, collapsed])
  const near = useMemo(() => layoutNeighbors(layout), [layout])
  const [active, setActive] = useState(selected && near.has(selected) ? selected : structure.org)
  const focusNext = useRef(false)
  const zoom = useZoom(region, layout.width, layout.height)
  const activeNode = near.has(active) ? active : structure.org
  // Enquadra ao abrir a organização (o componente nasce de novo a cada organização).
  const fitted = useRef(false)
  useEffect(() => { if (!fitted.current) { fitted.current = true; zoom.fit() } })
  useEffect(() => {
    if (!focusNext.current) return
    focusNext.current = false
    const el = region.current?.querySelector<HTMLElement>(`[data-node="${CSS.escape(activeNode)}"]`)
    el?.focus({ preventScroll: true })
    el?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [activeNode, layout])

  if (!structure.members) return <p className="muted relations-empty">Ninguém declarou ser membro de {noteName(structure.org)} (propriedade <code>membro_de</code> nos artigos dos membros, com o cargo entre parênteses).</p>

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom.zoomIn(); return }
    if (event.key === "-") { event.preventDefault(); zoom.zoomOut(); return }
    if (event.key === "0") { event.preventDefault(); zoom.fit(); return }
    const dir = ARROWS[event.key]
    if (!dir && event.key !== "Home") return
    event.preventDefault()
    // ↓ num ramo fechado abre o ramo.
    if (dir === "down" && collapsed.has(activeNode)) { onToggle(activeNode); return }
    const to = event.key === "Home" ? structure.org : near.get(activeNode)?.[dir!]
    if (to) { focusNext.current = true; setActive(to) }
  }

  return <div className="relations-graph">
    <div className="relations-graph-tools" role="toolbar" aria-label="Zoom do organograma">
      <button type="button" className="icon-btn" aria-label="Afastar" title="Afastar (−)" onClick={zoom.zoomOut}><ZoomOut size={17} /></button>
      <span className="small muted relations-zoom">{Math.round(zoom.scale * 100)} %</span>
      <button type="button" className="icon-btn" aria-label="Aproximar" title="Aproximar (+)" onClick={zoom.zoomIn}><ZoomIn size={17} /></button>
      <button type="button" className="btn sm ghost" title="Enquadrar (0)" onClick={zoom.fit}><Maximize2 size={15} aria-hidden="true" /> Enquadrar</button>
    </div>
    <div ref={region} className="relations-graph-region" role="region" aria-label={`Organograma de ${noteName(structure.org)}`} aria-describedby={help} onKeyDown={onKey}>
      <div className="relations-graph-size" style={{ width: layout.width * zoom.scale, height: layout.height * zoom.scale }}>
        <div className="relations-graph-canvas" style={{ width: layout.width, height: layout.height, transform: `scale(${zoom.scale})` }}>
          <svg className="relations-graph-lines" width={layout.width} height={layout.height} aria-hidden="true">
            {layout.edges.map((e) => <path key={`${e.from}>${e.to}`} d={e.d} />)}
          </svg>
          {layout.nodes.map((node) => <div key={node.path} className={`org-card ${node.kind}${node.person?.former ? " former" : ""}`} style={{ left: node.x, top: node.y, width: node.w, height: node.h }}>
            <button type="button" className="org-card-main" data-node={node.path} tabIndex={node.path === activeNode ? 0 : -1} aria-current={node.path === selected || undefined}
              onFocus={() => setActive(node.path)} onClick={() => { setActive(node.path); onSelect(node.path) }}>
              <NoteCrest path={node.path} name={noteName(node.path)} size={32} round={node.kind === "person"} />
              <span className="org-card-text"><strong>{noteName(node.path)}</strong><small>{personMeta(node, vault.index!.note(node.path)?.meta.frontmatter?.data?.status)}</small></span>
              {/* Para o leitor de tela: a quem responde e quantos tem abaixo (o desenho mostra pelas linhas). */}
              {node.parent && <span className="sr-only">, sob {noteName(node.parent)}</span>}
              {node.childCount > 0 && <span className="sr-only">, {plural(node.childCount, "membro", "membros")} abaixo{node.collapsed ? ", ramo fechado" : ""}</span>}
            </button>
            {node.childCount > 0 && node.kind === "person" && <button type="button" className="org-fold" tabIndex={-1} aria-expanded={!node.collapsed} aria-label={`Ramo de ${noteName(node.path)}: ${plural(node.childCount, "membro", "membros")}`} onClick={() => onToggle(node.path)}>
              {node.collapsed ? <ChevronRight size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}{plural(node.childCount, "membro", "membros")}
            </button>}
          </div>)}
        </div>
      </div>
    </div>
    <p id={help} className="small muted relations-help">Setas andam pelo organograma, Enter mostra os detalhes do nó, + e − aproximam, 0 enquadra. Borda tracejada: antigo membro.</p>
  </div>
}

/** O organograma em tabela: Membro · Cargo · Situação, na ordem da hierarquia. */
function OrgTable({ structure, onSelect }: { structure: OrgStructure; onSelect(path: string): void }) {
  const vault = useVault()
  if (!structure.members) return <p className="muted relations-empty">Ninguém declarou ser membro de {noteName(structure.org)}.</p>
  const rows: { person: OrgPerson; depth: number; boss?: string }[] = []
  const walk = (list: OrgPerson[], depth: number, boss?: string) => { for (const p of list) { rows.push({ person: p, depth, ...(boss ? { boss } : {}) }); walk(p.children, depth + 1, p.path) } }
  walk(structure.people, 0)
  return <div className="relations-table-wrap">
    <table className="graph-table">
      <caption className="sr-only">Membros de {noteName(structure.org)}</caption>
      <thead><tr><th scope="col">Membro</th><th scope="col">Cargo</th><th scope="col">Situação</th></tr></thead>
      <tbody>{rows.map(({ person, depth, boss }) => {
        const status = vault.index!.note(person.path)?.meta.frontmatter?.data?.status
        return <tr key={person.path}>
          <th scope="row" style={{ paddingLeft: 8 + depth * 16 }}><button type="button" className="link-btn" data-node={person.path} onClick={() => onSelect(person.path)}>{noteName(person.path)}</button>{boss && <span className="small muted"> · sob {noteName(boss)}</span>}</th>
          <td>{person.leader ? (person.role ? upper(person.role) : "Líder") : person.role ? upper(person.role) : "Membro"}</td>
          <td>{[typeof status === "string" ? status : "", person.former ? "antigo membro" : ""].filter(Boolean).join(", ") || "—"}</td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

// ---------- Árvore genealógica (o desenho novo vem no PR O) ----------

const GENERATIONS_KEY = "runas-codex:wiki-arvore-geracoes"
function readGenerations(): { up: number; down: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(GENERATIONS_KEY) ?? "{}") as unknown
    // Antes era um número só, para cima e para baixo.
    if (typeof saved === "number") return { up: saved, down: saved }
    const value = saved as { up?: unknown; down?: unknown }
    return { up: typeof value.up === "number" ? value.up : 2, down: typeof value.down === "number" ? value.down : 2 }
  } catch { return { up: 2, down: 2 } }
}

/**
 * Árvore genealógica (U25): gerações acima e abaixo escolhidas à parte e lembradas no aparelho; clicar ou Enter num nome
 * põe a pessoa no centro (e anuncia), clicar no centro mostra os detalhes.
 */
function FamilyTreeView({ center, root, onSelect }: { center: string; root: string; onSelect(path: string): void }) {
  const vault = useVault()
  const [generations, setGenerations] = useState(readGenerations)
  const change = (key: "up" | "down", value: number) => setGenerations((current) => {
    const next = { ...current, [key]: Math.max(0, Math.min(5, Math.round(value) || 0)) }
    try { localStorage.setItem(GENERATIONS_KEY, JSON.stringify(next)) } catch { /* preferência opcional */ }
    return next
  })
  const layout = useMemo(() => layoutFamily(familyGraph(vault.index!, center, generations.up, generations.down, root)), [vault.index, center, root, generations, vault.version])
  const stepper = (key: "up" | "down", label: string) => <div className="relations-stepper" role="group" aria-label={label}>
    <span className="small">{label}</span>
    <button type="button" className="icon-btn sm" aria-label={`Menos ${label.toLocaleLowerCase("pt-BR")}`} disabled={generations[key] <= 0} onClick={() => change(key, generations[key] - 1)}><Minus size={14} /></button>
    <input className="input" type="number" min={0} max={5} inputMode="numeric" aria-label={label} value={generations[key]} onChange={(event) => change(key, Number(event.target.value))} />
    <button type="button" className="icon-btn sm" aria-label={`Mais ${label.toLocaleLowerCase("pt-BR")}`} disabled={generations[key] >= 5} onClick={() => change(key, generations[key] + 1)}><Plus size={14} /></button>
  </div>
  return (
    <div className="relations-graph">
      <div className="row-wrap relations-family-controls">{stepper("up", "Gerações acima")}{stepper("down", "Gerações abaixo")}</div>
      <p className="sr-only" aria-live="polite">Centralizado em {noteName(center)}</p>
      <div className="relations-graph-region family-tree" role="region" aria-label={`Árvore genealógica de ${noteName(center)}`}>
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width={layout.width} height={layout.height} role="group" aria-label={`${layout.nodes.length} pessoas, por geração`}>
          <g aria-hidden="true">{layout.lines.map((line, i) => line.kind === "casamento"
            ? <line key={i} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className="tree-marriage" />
            : <path key={i} d={`M${line.x1},${line.y1} C${line.x1},${(line.y1 + line.y2) / 2} ${line.x2},${(line.y1 + line.y2) / 2} ${line.x2},${line.y2}`} className="tree-line" />)}</g>
          {layout.nodes.map((p) => (
            <a key={p.path} href={href(noteRoute(p.path))} data-node={p.path} aria-current={p.path === center ? "true" : undefined} onClick={(event) => { event.preventDefault(); onSelect(p.path) }}>
              <title>{p.path === center ? `${noteName(p.path)} (centro): ver os detalhes` : `Pôr ${noteName(p.path)} no centro (${generationLabel(p.generation)})`}</title>
              <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={10} className={`tree-box ${p.path === center ? "center" : ""}`} />
              <text aria-hidden="true" x={p.x + p.w / 2} y={p.y + p.h / 2 + 4} textAnchor="middle" className="tree-name">
                {noteName(p.path).length > 20 ? noteName(p.path).slice(0, 19) + "…" : noteName(p.path)}
              </text>
            </a>
          ))}
        </svg>
      </div>
      <p className="small muted relations-help">Linha cheia: filiação · tracejada: casamento. Escolha um nome para pô-lo no centro; no centro, para ver os detalhes.</p>
    </div>
  )
}

/** A árvore em tabela: Pessoa · Pais · Cônjuges · Filhos. */
function FamilyTable({ people, root, onSelect }: { people: string[]; root: string; onSelect(path: string): void }) {
  const vault = useVault()
  const index = vault.index!
  const names = (path: string, key: string) => relationsOf(index, path, root).filter((r) => r.type.key === key && r.other).map((r) => noteName(r.other!)).join(", ") || "—"
  return <div className="relations-table-wrap">
    <table className="graph-table">
      <caption className="sr-only">Famílias</caption>
      <thead><tr><th scope="col">Pessoa</th><th scope="col">Pais</th><th scope="col">Cônjuges</th><th scope="col">Filhos</th></tr></thead>
      <tbody>{people.map((p) => <tr key={p}>
        <th scope="row"><button type="button" className="link-btn" data-node={p} onClick={() => onSelect(p)}>{noteName(p)}</button></th>
        <td>{names(p, "pais")}</td><td>{names(p, "conjuges")}</td><td>{names(p, "filhos")}</td>
      </tr>)}</tbody>
    </table>
  </div>
}

// ---------- Teia diplomática (o mesmo motor de antes) ----------

function DiplomacyGraph({ root, onSelect }: { root: string; onSelect(path: string): void }) {
  const vault = useVault()
  const index = vault.index!
  const web = useMemo(() => diplomacy(index, root), [index, root, vault.version])
  const data = useMemo<GraphData>(
    () => ({
      nodes: web.nodes.map((path) => ({ id: path, label: noteName(path), kind: "note" as const, path, degree: web.edges.filter((e) => e.from === path || e.to === path).length })),
      edges: web.edges.map((e) => ({ source: e.from, target: e.to, color: DIPLOMACY_COLORS[e.kind]?.color ?? "#69799c", ...(e.kind === "vassalo_de" ? {} : { mutual: true }) })),
    }),
    [web],
  )
  // Enquadra o gráfico logo depois de as forças assentarem (rework F4b, WIK-4).
  const [fit, setFit] = useState(0)
  useEffect(() => { const timer = setTimeout(() => setFit((n) => n + 1), 700); return () => clearTimeout(timer) }, [data])
  return (
    <div className="relations-graph">
      <div className="diplomacy-graph">
        <GraphView data={data} groups={[]} forces={{ ...DEFAULT_FORCES, repulsion: 400, distance: 120, linkWidth: 2.5, nodeSize: 1.6, arrows: true }} labels="always" fitSignal={fit} onOpen={(node) => onSelect(node.path)} />
      </div>
      <div className="row-wrap relations-legend">
        {Object.entries(DIPLOMACY_COLORS)
          .filter(([kind]) => web.edges.some((e) => e.kind === kind))
          .map(([kind, { color, label }]) => (
            // A cor fica só no ponto: em texto, as cores do mapa não têm contraste no tema claro.
            <span key={kind} className="chip relation-kind">
              <span className="relation-dot" style={{ background: color }} aria-hidden="true" />
              {label}
            </span>
          ))}
      </div>
      <p className="small muted relations-help">A mesma teia está em “Mostrar como: Lista”, em tabela.</p>
    </div>
  )
}

/** A teia em tabela: lida pelo teclado e pelo leitor de tela, e sem depender da cor. */
function DiplomacyTable({ root }: { root: string }) {
  const vault = useVault()
  const web = useMemo(() => diplomacy(vault.index!, root), [vault.index, root, vault.version])
  return <div className="relations-table-wrap">
    <table className="graph-table">
      <caption className="sr-only">Relações entre facções</caption>
      <thead><tr><th scope="col">Quem</th><th scope="col">Relação</th><th scope="col">Com quem</th></tr></thead>
      <tbody>{web.edges.map((edge, i) => (
        <tr key={i}>
          <th scope="row"><a href={href(noteRoute(edge.from))} className="wikilink">{noteName(edge.from)}</a></th>
          <td><span className="relation-kind"><span className="relation-dot" style={{ background: DIPLOMACY_COLORS[edge.kind]?.color ?? "var(--line-strong)" }} aria-hidden="true" />{DIPLOMACY_COLORS[edge.kind]?.label ?? edge.label}</span></td>
          <td><a href={href(noteRoute(edge.to))} className="wikilink">{noteName(edge.to)}</a></td>
        </tr>
      ))}</tbody>
    </table>
  </div>
}
