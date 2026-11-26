import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { useSinglePane } from "../../lib/tabs"
import { useRemembered } from "../../lib/remembered"
import { BookOpen, Check, Download, Gauge, Library, Minus, Pencil, Plus, Ruler, Search, Shapes, Shield, Skull, SlidersHorizontal, Trash, Unlink, User, UserPlus, Users, X } from "lucide-react"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { NoteCrest } from "../../components/kit/Emblem"
import { PanelTabs, TabPanel } from "../../components/kit/PanelTabs"
import { Modal } from "../../components/ui"
import { ATTITUDES, castRows, npcExtra, withCampaignPlayer, type CastRow, type PlayerCharacter, withoutPosition, withTrackedLink, type TrackedLink } from "../../core/campaigns"
import { goneStatus } from "../../core/cast-status"
import { reputationValue, type RepScale, type ResolvedReputation } from "../../core/reputation"
import { fullRows, nextLimit } from "../../core/grid-rows"
import { useGridColumns } from "../../components/kit/useGridColumns"
import { noteName } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { articleKind } from "../../core/wiki"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { ArticleArt } from "../wiki/ArticleArt"
import { EditPlayerDialog, NewNpcDialog, NewPlayerDialog } from "./campaign-dialogs"
import { useCampaignEdits, useUndoable } from "./campaign-edits"
import { sessionRoute, type CampaignData } from "./campaign-state"
import { attitudeColor } from "./DashboardCards"
import { CastRelations, useCastRelations } from "./CastRelations"
import { AttitudeBadge, ImportReputationDialog, parseViewers, RepBar, ReputationDialog, ScaleDialog, shownReputation, useReputation } from "./cast-reputation"

/**
 * Elenco (U115): uma barra só (busca, “Filtros e exibição”, “Adicionar” e ⋯), abas por tipo com o número de cada um e
 * cartões só com o nome e a atitude. O resto (atitude, “apareceu”, sessões, relações, Trocar jogador, Abrir artigo,
 * Tirar da campanha) fica no painel do cartão escolhido, como na tela Relações da Wiki. Nada some: só muda de lugar.
 * 24/11: cada jogador tem a própria reputação com o elenco, marcada pelo botão “Reputação”; o cartão mostra a dos
 * jogadores escolhidos em “Filtros e exibição” (a média, com os pontos pintados em fração). A cor do cartão diz se o
 * personagem já apareceu; morto, o cartão fica mais escuro.
 */
type Tab = "todos" | "jogadores" | "npcs" | "faccoes" | "relacoes"
type Seen = "todos" | "apareceu" | "ainda"
type Group = "nenhum" | "local" | "faccao" | "atitude" | "situacao"
type Order = "nome" | "recente" | "adicao"
/** Lista (linhas) ou grade (cartões com a imagem do artigo), como nas categorias da Wiki. */
type Mode = "list" | "grid"
type CardSize = "small" | "medium" | "large"
type Prefs = { group: Group; order: Order; mode: Mode; size: CardSize }
type Selected = { kind: "pj"; path: string } | { kind: "npc" | "faccao"; reference: string; position: number }

const selectTracked = (kind: "npc" | "faccao", item: TrackedLink): Selected => ({ kind, reference: item.dest ?? item.target, position: item.position })

function trackedSelection(items: TrackedLink[], selected: Extract<Selected, { reference: string }>): TrackedLink | undefined {
  const matches = items.filter((item) => (item.dest ?? item.target) === selected.reference)
  return matches.length === 1 ? matches[0] : matches.find((item) => item.position === selected.position)
}

const PAGE = 60
const TABS: Tab[] = ["todos", "jogadores", "npcs", "faccoes", "relacoes"]
const parseTab = (raw: unknown): Tab => (TABS.includes(raw as Tab) ? (raw as Tab) : "todos")
const parseCastFilters = (raw: unknown): { seen: Seen; attitude: string } => {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return { seen: value.seen === "apareceu" || value.seen === "ainda" ? value.seen : "todos", attitude: typeof value.attitude === "string" ? value.attitude : "" }
}
// A mesma chave de antes (U33): quem já escolheu Grade ou a ordem não perde a escolha.
const prefsKey = (root: string) => `runas-codex:campanha:elenco:${root}`
const readPrefs = (key: string): Prefs => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<Prefs>
    return { group: saved.group ?? "nenhum", order: saved.order ?? "nome", mode: saved.mode === "grid" ? "grid" : "list", size: saved.size === "small" || saved.size === "large" ? saved.size : "medium" }
  } catch { return { group: "nenhum", order: "nome", mode: "list", size: "medium" } }
}
function usePrefs(root: string) {
  const key = prefsKey(root)
  const [prefs, setState] = useState(() => readPrefs(key))
  const set = (next: Partial<Prefs>) => setState((current) => {
    const value = { ...current, ...next }
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* preferência opcional */ }
    return value
  })
  return [prefs, set] as const
}

const GROUPS: Record<Group, string> = { nenhum: "Sem grupos", local: "Por local", faccao: "Por facção", atitude: "Por atitude", situacao: "Apareceram ou não" }
const ORDERS: Record<Order, string> = { nome: "Nome", recente: "Visto há menos tempo", adicao: "Últimos acrescentados" }
const SEEN: Record<Seen, string> = { todos: "Todos", apareceu: "Apareceram", ainda: "Ainda não" }
const fold = (text: string) => text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "")

/** O que o cartão precisa da reputação: a escala, quem está sendo mostrado e o valor resolvido. */
type RepView = { rep: ResolvedReputation; viewers: string[]; scale: RepScale }

export function CastView({ data, requestedPath }: { data: CampaignData; requestedPath?: string }) {
  const vault = useVault()
  const index = vault.index!
  const { setHome } = useCampaignEdits(data)
  const undoable = useUndoable()
  const narrow = useSinglePane()
  const root = data.campaign.root
  const canEdit = !data.readOnly && Boolean(data.campaign.home)
  const [rememberedTab, setTab] = useRemembered(`runas-codex:campanha:elenco-aba:${root}`, parseTab)
  const [fromLink, setFromLink] = useState(Boolean(requestedPath))
  const tab = fromLink ? "todos" : rememberedTab
  const [filters, setFilters] = useRemembered(`runas-codex:campanha:elenco-filtros:${root}`, parseCastFilters)
  const [prefs, setPrefs] = usePrefs(root)
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(PAGE)
  const [chosen, setSelected] = useState<Selected | null>(() => {
    if (!requestedPath) return null
    if (data.players.some((player) => player.path === requestedPath)) return { kind: "pj", path: requestedPath }
    const npc = data.npcs.find((item) => item.dest === requestedPath)
    if (npc) return selectTracked("npc", npc)
    const faction = data.factions.find((item) => item.dest === requestedPath)
    return faction ? selectTracked("faccao", faction) : null
  })
  // O cofre pode ser reindexado com o painel aberto. Resolva a referência antes de usar a posição para editar.
  const current = chosen && chosen.kind !== "pj" ? trackedSelection(chosen.kind === "npc" ? data.npcs : data.factions, chosen) : undefined
  const selected = chosen?.kind === "pj" ? (data.players.some((player) => player.path === chosen.path) ? chosen : null)
    : chosen && current ? selectTracked(chosen.kind, current) : null
  const detailsOpen = selected !== null
  const [adding, setAdding] = useState(false)
  const [dialog, setDialog] = useState<ReactNode>(null)
  const relations = useCastRelations(data)
  const rep = useReputation(data)
  const [savedViewers, setViewers] = useRemembered(`runas-codex:campanha:elenco-reputacao:${root}`, parseViewers)
  const chosenViewers = savedViewers.filter((path) => data.players.some((p) => p.path === path))
  // Ninguém escolhido (ou quem estava saiu da campanha): todos os jogadores.
  const viewers = chosenViewers.length ? chosenViewers : data.players.map((p) => p.path)
  const repView: RepView = { rep, viewers, scale: rep.scale }
  const detailId = useId()
  const returnFocus = useRef<HTMLElement | null>(null)
  const searchInput = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => castRows(index, data.npcs, data.sessions), [index, vault.version, data.npcs, data.sessions])
  // As facções também “aparecem” (marcadas à mão ou citadas numa sessão), para a cor do cartão.
  const factionRows = useMemo(() => castRows(index, data.factions, data.sessions), [index, vault.version, data.factions, data.sessions])
  const q = fold(query.trim())
  const { seen, attitude } = filters
  const players = data.players.filter((p) => !q || fold(`${p.name} ${p.player ?? ""} ${p.concept ?? ""}`).includes(q))
  const npcs = rows.filter((r) =>
    (!q || fold(`${r.name} ${r.place ?? ""} ${r.faction ?? ""}`).includes(q)) &&
    (seen === "todos" || (seen === "apareceu") === r.appeared) &&
    (!attitude || (attitude === "-" ? !r.attitude : r.attitude === attitude)))
  const factions = data.factions.filter((f) => !q || fold(noteName(f.target)).includes(q))
  const counts: Record<Tab, number> = {
    todos: data.players.length + rows.length + data.factions.length, jogadores: data.players.length, npcs: rows.length, faccoes: data.factions.length, relacoes: relations.edges.length,
  }

  // Remover sem confirmação: o aviso traz “Desfazer” (a nota continua na wiki).
  const removeNpc = (row: CastRow) => { setSelected(null); void undoable(data.campaign.home ?? "", `${row.name} saiu do Elenco.`, () => setHome("npcs", withoutPosition(data.data.npcs, row.item.position))) }
  const removeFaction = (item: TrackedLink) => { setSelected(null); void undoable(data.campaign.home ?? "", `${noteName(item.target)} saiu da campanha.`, () => setHome("faccoes", withoutPosition(data.data.faccoes, item.position))) }
  const unlinkPlayer = (p: PlayerCharacter) => { setSelected(null); void undoable(data.campaign.home!, `${p.name} desvinculado da campanha.`, () => setHome("personagens", withCampaignPlayer(index, data.campaign, p.path, null))) }
  const saveNpc = (item: TrackedLink, extra: string) => setHome("npcs", withTrackedLink(data.data.npcs, item.position, item.target, extra))
  const saveFaction = (item: TrackedLink, extra: string) => setHome("faccoes", withTrackedLink(data.data.faccoes, item.position, item.target, extra))

  const select = (next: Selected, from: HTMLElement) => {
    returnFocus.current = from
    setSelected(selected && sameSelection(selected, next) ? null : next)
  }
  const close = () => {
    setSelected(null)
    requestAnimationFrame(() => (returnFocus.current?.isConnected ? returnFocus.current : searchInput.current)?.focus())
  }
  // No celular o painel sobe por cima da lista: o foco vai para ele e Esc o fecha.
  useEffect(() => {
    if (!detailsOpen) return
    if (narrow) requestAnimationFrame(() => document.getElementById(`${detailId}-title`)?.focus())
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector(".modal")) close() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [chosen, detailsOpen, narrow])

  // O que estiver em uso nos filtros aparece como etiqueta com ✕.
  const chips: { label: string; clear(): void }[] = [
    ...(seen !== "todos" ? [{ label: `Situação: ${SEEN[seen]}`, clear: () => setFilters((c) => ({ ...c, seen: "todos" })) }] : []),
    ...(attitude ? [{ label: `Atitude: ${attitude === "-" ? "sem atitude" : attitude}`, clear: () => setFilters((c) => ({ ...c, attitude: "" })) }] : []),
    ...(prefs.group !== "nenhum" ? [{ label: `Agrupar: ${GROUPS[prefs.group].toLocaleLowerCase("pt-BR")}`, clear: () => setPrefs({ group: "nenhum" }) }] : []),
    ...(prefs.order !== "nome" ? [{ label: `Ordem: ${ORDERS[prefs.order].toLocaleLowerCase("pt-BR")}`, clear: () => setPrefs({ order: "nome" }) }] : []),
    ...(chosenViewers.length && chosenViewers.length < data.players.length ? [{
      label: `Reputação: ${chosenViewers.map((path) => data.players.find((p) => p.path === path)?.name ?? noteName(path)).join(", ")}`, clear: () => setViewers([]),
    }] : []),
  ]
  const show = (part: Tab) => tab === "todos" ? part !== "relacoes" : tab === part
  const openReputation = () => setDialog(<ReputationDialog data={data} rep={rep} onClose={() => setDialog(null)} />)
  const detail = selected ? <CastDetail data={data} selected={selected} rows={rows} factionRows={factionRows} rep={rep} relations={relations} id={detailId} focusOnRoute={fromLink} onClose={close}
    onReputation={canEdit ? openReputation : undefined}
    onSaveNpc={saveNpc} onSaveFaction={saveFaction} onRemoveNpc={removeNpc} onRemoveFaction={removeFaction} onUnlink={unlinkPlayer}
    onEditPlayer={(p) => setDialog(<EditPlayerDialog campaign={data.campaign} character={p} onClose={() => setDialog(null)} />)} /> : null

  return (
    <div className={`page campaign-cast-page${selected ? " has-detail" : ""}`}>
      <div className="page-head">
        <div>
          <span className="eyebrow">{data.campaign.name}</span>
          <h1 className="page-title">Elenco</h1>
        </div>
      </div>
      <div className="campaign-cast-bar">
        <label className="search campaign-cast-search">
          <Search size={15} aria-hidden="true" />
          <input ref={searchInput} className="input" type="search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }} placeholder="Buscar no elenco" aria-label="Buscar no elenco (nome, jogador, local ou facção)" />
        </label>
        <FiltersMenu narrow={narrow} active={chips.length} seen={seen} attitude={attitude} prefs={prefs} rows={rows} players={data.players} viewers={chosenViewers} onViewers={setViewers}
          onSeen={(value) => { setFilters((c) => ({ ...c, seen: value })); setLimit(PAGE) }} onAttitude={(value) => { setFilters((c) => ({ ...c, attitude: value })); setLimit(PAGE) }} onPrefs={setPrefs} />
        <button type="button" className="btn campaign-cast-rep" onClick={openReputation} disabled={!canEdit} aria-label="Reputação: marcar a reputação dos jogadores">
          <Gauge size={15} aria-hidden="true" /><span className={narrow ? "sr-only" : undefined}>Reputação</span>
        </button>
        {canEdit && <button type="button" className="btn primary campaign-cast-add" onClick={() => setAdding(true)} aria-label="Adicionar ao elenco"><Plus size={15} aria-hidden="true" /><span className={narrow ? "sr-only" : undefined}>Adicionar</span></button>}
        <OverflowMenu label="Mais ações do Elenco" items={[
          { label: "Gerar relações no Quadro", hint: relations.file.split("/").at(-1), icon: <Shapes size={15} />, disabled: data.readOnly || !relations.members.length, onSelect: () => void relations.generate() },
          { label: "Importar reputação…", icon: <Download size={15} />, disabled: !canEdit, onSelect: () => setDialog(<ImportReputationDialog data={data} onClose={() => setDialog(null)} />) },
          { label: "Escala da reputação…", hint: `${rep.scale.min} a +${rep.scale.max}`, icon: <Ruler size={15} />, disabled: !canEdit, onSelect: () => setDialog(<ScaleDialog data={data} onClose={() => setDialog(null)} />) },
        ]} />
      </div>
      <PanelTabs label="Tipos do elenco" idPrefix="elenco" value={tab} onChange={(value) => { setFromLink(false); setTab(value); setLimit(PAGE) }} tabs={[
        { value: "todos", label: "Todos", count: counts.todos }, { value: "jogadores", label: "Jogadores", count: counts.jogadores },
        { value: "npcs", label: "NPCs", count: counts.npcs }, { value: "faccoes", label: "Facções", count: counts.faccoes }, { value: "relacoes", label: "Relações", count: counts.relacoes },
      ]} />
      {chips.length > 0 && tab !== "relacoes" && <div className="row-wrap campaign-cast-chips" aria-label="Filtros em uso">
        {chips.map((chip) => <button key={chip.label} type="button" className="chip campaign-cast-chip" onClick={chip.clear} aria-label={`Tirar o filtro ${chip.label}`}>{chip.label}<X size={13} aria-hidden="true" /></button>)}
      </div>}
      <div className="campaign-cast-layout">
        <TabPanel idPrefix="elenco" value={tab}>
          <div className="campaign-cast-sections">
            {tab === "relacoes" && <CastRelations relations={relations} />}
            {show("jogadores") && <CastSection title="Jogadores" count={players.length} total={data.players.length}
              empty={data.players.length ? "Ninguém com esse nome." : "Nenhum personagem vinculado. Use “Adicionar” para criar ou escolher um personagem da wiki."}>
              <ul className="campaign-cast-grid">
                {players.map((p) => {
                  const value = shownReputation(rep, viewers, p.path)
                  const gone = goneStatus(index.note(p.path)?.meta.frontmatter?.data)
                  return <li key={p.path} className={gone ? "gone" : undefined}>
                    <button type="button" className={`campaign-cast-card${isSelected(selected, { kind: "pj", path: p.path }) ? " selected" : ""}`} aria-expanded={isSelected(selected, { kind: "pj", path: p.path })} aria-controls={detailId}
                      onClick={(e) => select({ kind: "pj", path: p.path }, e.currentTarget)}>
                      <NoteCrest path={p.path} name={p.name} size={36} round={false} />
                      <span className="campaign-cast-card-text">
                        <span className="cast-name"><strong>{p.name}</strong>{gone && <GoneMark status={gone} />}</span>
                        <span className="tiny faint">{[p.player, p.concept].filter(Boolean).join(" · ") || "Sem jogador anotado"}</span>
                        {value !== null && <RepBar value={value} scale={rep.scale} name={p.name} compact />}
                      </span>
                    </button>
                  </li>
                })}
              </ul>
            </CastSection>}
            {show("npcs") && <NpcSection data={data} rows={npcs} total={rows.length} prefs={prefs} limit={limit} setLimit={setLimit} selected={selected} detailId={detailId} onSelect={select} repView={repView}
              hint={tab === "npcs" || tab === "todos" ? "clique num cartão para ver e mudar" : undefined} />}
            {show("faccoes") && <CastSection title="Facções" count={factions.length} total={data.factions.length} hint="clique num cartão para ver e mudar"
              empty={data.factions.length ? "Nenhuma facção com esse nome." : "Organizações da wiki; a reputação de cada jogador com elas fica no botão “Reputação”. Use “Adicionar”."}>
              <ul className={prefs.mode === "grid" ? `campaign-cast-cards size-${prefs.size}` : "campaign-cast-list"}>
                {factions.map((item) => {
                  const row = factionRows.find((r) => r.item.position === item.position)
                  return <CastCard key={item.position} item={item} name={noteName(item.target)} faction appeared={row?.appeared ?? false} prefs={prefs} repView={repView}
                    selected={isSelected(selected, selectTracked("faccao", item))} detailId={detailId} onClick={(e) => select(selectTracked("faccao", item), e)} />
                })}
              </ul>
            </CastSection>}
          </div>
        </TabPanel>
        {detail}
      </div>
      {adding && <AddToCast data={data} onClose={() => setAdding(false)} onOpen={(node) => { setAdding(false); setDialog(node) }} closeDialog={() => setDialog(null)} />}
      {dialog}
    </div>
  )
}

function sameSelection(a: Selected, b: Selected): boolean {
  if (a.kind === "pj" || b.kind === "pj") return a.kind === "pj" && b.kind === "pj" && a.path === b.path
  return a.kind === b.kind && a.reference === b.reference && a.position === b.position
}
const isSelected = (current: Selected | null, item: Selected) => Boolean(current && sameSelection(current, item))

function CastSection({ title, count, total, hint, empty, children }: { title: string; count: number; total: number; hint?: string; empty: string; children: ReactNode }) {
  const id = useId()
  return <section className="campaign-cast-section" aria-labelledby={id}>
    <h2 id={id} className="campaign-cast-section-title">{title} · {count === total ? total : `${count} de ${total}`}{hint && count > 0 && <span className="tiny faint"> {hint}</span>}</h2>
    {count === 0 ? <p className="small muted">{empty}</p> : children}
  </section>
}

/**
 * A imagem do cartão médio e grande (24/11, como no desenho do João): um quadrado dentro do cartão, com margem, e o
 * ícone da atitude no canto. O símbolo da facção aparece inteiro (sem corte); sem imagem, o ícone da categoria; sem
 * artigo, o ícone de pessoa ou de escudo.
 */
function CastMedia({ note, faction = false, children }: { note: IndexedNote | undefined; faction?: boolean; children?: ReactNode }) {
  const Fallback = faction ? Shield : User
  return <span className={`campaign-cast-media${faction ? " symbol" : ""}`}>
    {note ? <ArticleArt note={note} size="cover" /> : <span className="wiki-article-art cover" aria-hidden="true"><Fallback className="wiki-art-emblem" /></span>}
    {children}
  </span>
}

/** Marca de morto (ou extinta) ao lado do nome: o cartão escuro não depende só da cor. */
function GoneMark({ status }: { status: string }) {
  return <span className="cast-gone" title={status}><Skull aria-hidden="true" /><span className="sr-only">, {status.toLocaleLowerCase("pt-BR")}</span></span>
}

/**
 * Cartão do NPC ou da facção, em todos os tamanhos: imagem (ou o quadrado pequeno), o nome, o ícone da atitude e a
 * reputação dos jogadores mostrados. A cor diz se já apareceu; morto, mais escuro. Os cartões da mesma fileira têm a
 * mesma altura (a reputação vai para o pé).
 */
function CastCard({ item, name, faction = false, attitude = "", appeared, prefs, repView, selected, detailId, onClick }: {
  item: TrackedLink; name: string; faction?: boolean; attitude?: string; appeared: boolean; prefs: Prefs; repView: RepView
  selected: boolean; detailId: string; onClick(from: HTMLElement): void
}) {
  const vault = useVault()
  const note = item.dest ? vault.index?.note(item.dest) : undefined
  const gone = goneStatus(note?.meta.frontmatter?.data)
  // Na grade, os três tamanhos têm o mesmo desenho (anexo 3, 25/11); só muda quantos cabem por fileira (7, 6 ou 5).
  const big = prefs.mode === "grid"
  const value = shownReputation(repView.rep, repView.viewers, item.dest)
  const said = [faction ? "" : attitude || "sem atitude", appeared ? "já apareceu" : "ainda não apareceu"].filter(Boolean).join(", ")
  return <li className={`campaign-cast-item ${appeared ? "seen" : "unseen"}${gone ? " gone" : ""}${selected ? " selected" : ""}`}>
    <button type="button" className="campaign-cast-card" aria-expanded={selected} aria-controls={detailId} onClick={(e) => onClick(e.currentTarget)}>
      {big ? <CastMedia note={note} faction={faction}><AttitudeBadge attitude={attitude} /></CastMedia>
        : <span className="cast-crest"><NoteCrest path={item.dest} name={name} size={28} round={false} /><AttitudeBadge attitude={attitude} /></span>}
      <span className="campaign-cast-card-text">
        <span className="cast-name">
          <strong className={item.dest ? undefined : "wikilink broken"}>{name}</strong>
          {gone && <GoneMark status={gone} />}
        </span>
        <span className="sr-only">{said}</span>
      </span>
      {value !== null && <RepBar value={value} scale={repView.scale} name={name} compact={!big || prefs.size === "small"} />}
    </button>
  </li>
}

/**
 * NPCs (T9): pensado para mais de 100. Agrupar por local, facção, atitude ou situação; na grade, “Mostrar mais” completa
 * fileiras inteiras (U28) e leva o foco ao primeiro cartão novo. O cartão mostra o nome, o ícone da atitude e a
 * reputação; a cor diz se já apareceu (24/11: sem o selo “ainda não apareceu”).
 */
function NpcSection({ data, rows, total, prefs, limit, setLimit, selected, detailId, onSelect, hint, repView }: {
  data: CampaignData; rows: CastRow[]; total: number; prefs: Prefs; limit: number; setLimit(value: number): void
  selected: Selected | null; detailId: string; onSelect(next: Selected, from: HTMLElement): void; hint?: string; repView: RepView
}) {
  const gridRef = useRef<HTMLUListElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const firstNew = useRef<number | null>(null)
  const grid = prefs.mode === "grid"
  const columns = useGridColumns(gridRef, prefs.size === "small" ? 96 : prefs.size === "large" ? 150 : 120, `${prefs.mode}-${prefs.size}-${prefs.group}-${total > 0}`)
  const last = (r: CastRow) => r.seen[r.seen.length - 1]
  const sorted = [...rows].sort((a, b) =>
    prefs.order === "nome" ? a.name.localeCompare(b.name, "pt-BR")
      : prefs.order === "recente" ? data.sessions.indexOf(last(b)!) - data.sessions.indexOf(last(a)!) || a.name.localeCompare(b.name, "pt-BR")
        : b.item.position - a.item.position)
  const keyOf = (r: CastRow) => prefs.group === "local" ? r.place ?? "Sem local"
    : prefs.group === "faccao" ? r.faction ?? "Sem facção"
      : prefs.group === "atitude" ? r.attitude || "Sem atitude"
        : prefs.group === "situacao" ? (r.appeared ? "Já apareceram" : "Ainda não apareceram") : ""
  // Na grade sem grupos, o limite fecha a última fileira; com grupos, cada grupo quebra a fileira e vale o limite simples.
  const visibleLimit = grid && prefs.group === "nenhum" ? fullRows(sorted.length, limit, columns) : limit
  const groups = new Map<string, CastRow[]>()
  for (const r of sorted.slice(0, visibleLimit)) { const key = keyOf(r); groups.set(key, [...(groups.get(key) ?? []), r]) }
  const more = () => { firstNew.current = visibleLimit; setLimit(grid && prefs.group === "nenhum" ? nextLimit(sorted.length, visibleLimit, columns, PAGE) : visibleLimit + PAGE) }
  useEffect(() => {
    if (firstNew.current === null) return
    listRef.current?.querySelectorAll<HTMLElement>("li")[firstNew.current]?.querySelector<HTMLElement>("button")?.focus()
    firstNew.current = null
  }, [visibleLimit])
  return <CastSection title="NPCs" count={rows.length} total={total} hint={hint}
    empty={total ? "Nenhum NPC com esses filtros." : "Os NPCs moram na wiki; aqui ficam a atitude deles com o grupo e se já apareceram. Use “Adicionar”."}>
    <div ref={listRef} className="stack" style={{ gap: 12 }}>
      {[...groups].map(([group, list], i) => <div key={group || "todos"} className="stack" style={{ gap: grid ? 8 : 0 }}>
        {group && <h3 className="campaign-roster-group">{group} · {list.length}</h3>}
        <ul ref={i === 0 ? gridRef : undefined} className={grid ? `campaign-cast-cards npcs size-${prefs.size}` : "campaign-cast-list"}>
          {list.map((row) => <CastCard key={row.item.position} item={row.item} name={row.name} attitude={row.attitude} appeared={row.appeared} prefs={prefs} repView={repView}
            selected={isSelected(selected, selectTracked("npc", row.item))} detailId={detailId} onClick={(from) => onSelect(selectTracked("npc", row.item), from)} />)}
        </ul>
      </div>)}
    </div>
    {sorted.length > visibleLimit && <button className="btn sm ghost" style={{ justifySelf: "start" }} onClick={more}>Mostrar mais {Math.min(grid && prefs.group === "nenhum" ? nextLimit(sorted.length, visibleLimit, columns, PAGE) - visibleLimit : PAGE, sorted.length - visibleLimit)} de {sorted.length - visibleLimit}</button>}
  </CastSection>
}

/**
 * “Filtros e exibição”: Situação, Atitude, Agrupar e Ordem dos NPCs, Lista ou Grade e o tamanho dos cartões, e de
 * quais jogadores é a reputação mostrada (dois ou mais: a média).
 */
function FiltersMenu({ narrow, active, seen, attitude, prefs, rows, players, viewers, onViewers, onSeen, onAttitude, onPrefs }: {
  narrow: boolean; active: number; seen: Seen; attitude: string; prefs: Prefs; rows: CastRow[]
  players: PlayerCharacter[]; viewers: string[]; onViewers(value: string[]): void
  onSeen(value: Seen): void; onAttitude(value: string): void; onPrefs(next: Partial<Prefs>): void
}) {
  const ref = useRef<HTMLDetailsElement>(null)
  const id = useId()
  // Fecha ao clicar fora ou com Esc, como os outros menus.
  useEffect(() => {
    const onDown = (event: MouseEvent) => { if (ref.current?.open && !ref.current.contains(event.target as Node)) ref.current.open = false }
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && ref.current?.open) { ref.current.open = false; ref.current.querySelector("summary")?.focus() } }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [])
  const counts = { todos: rows.length, apareceu: rows.filter((r) => r.appeared).length, ainda: rows.filter((r) => !r.appeared).length }
  return <details ref={ref} className="campaign-cast-filters">
    <summary className="btn" aria-label={`Filtros e exibição${active ? `, ${active} em uso` : ""}`}>
      <SlidersHorizontal size={15} aria-hidden="true" /><span className={narrow ? "sr-only" : undefined}>Filtros e exibição</span>
      {active > 0 && <span className="chip campaign-cast-filter-count" aria-hidden="true">{active}</span>}
    </summary>
    <div className="campaign-cast-filters-body">
      <div className="field"><span id={`${id}-situacao`}>Situação dos NPCs</span>
        <ChoiceGroup labelledBy={`${id}-situacao`} value={seen} onChange={onSeen} options={[
          { value: "todos", label: `Todos ${counts.todos}` }, { value: "apareceu", label: `Apareceram ${counts.apareceu}` }, { value: "ainda", label: `Ainda não ${counts.ainda}` },
        ]} />
      </div>
      <label className="field"><span>Atitude</span>
        <select className="select" value={attitude} onChange={(e) => onAttitude(e.target.value)}>
          <option value="">Todas</option>
          {ATTITUDES.map((a) => <option key={a} value={a}>{a}</option>)}
          <option value="-">Sem atitude</option>
        </select>
      </label>
      <label className="field"><span>Agrupar</span>
        <select className="select" value={prefs.group} onChange={(e) => onPrefs({ group: e.target.value as Group })}>
          {(Object.keys(GROUPS) as Group[]).map((g) => <option key={g} value={g}>{GROUPS[g]}</option>)}
        </select>
      </label>
      <label className="field"><span>Ordem</span>
        <select className="select" value={prefs.order} onChange={(e) => onPrefs({ order: e.target.value as Order })}>
          {(Object.keys(ORDERS) as Order[]).map((o) => <option key={o} value={o}>{ORDERS[o]}</option>)}
        </select>
      </label>
      <div className="field"><span id={`${id}-exibir`}>Exibir</span>
        <ChoiceGroup labelledBy={`${id}-exibir`} value={prefs.mode} onChange={(mode) => onPrefs({ mode })} options={[{ value: "list", label: "Lista" }, { value: "grid", label: "Grade" }]} />
      </div>
      {prefs.mode === "grid" && <div className="field"><span id={`${id}-cartoes`}>Cartões</span>
        <ChoiceGroup labelledBy={`${id}-cartoes`} value={prefs.size} onChange={(size) => onPrefs({ size })} options={[{ value: "small", label: "Pequenos" }, { value: "medium", label: "Médios" }, { value: "large", label: "Grandes" }]} />
      </div>}
      {players.length > 0 && <fieldset className="field campaign-cast-viewers">
        <legend>Reputação de</legend>
        {players.map((p) => {
          const all = !viewers.length
          const on = all || viewers.includes(p.path)
          return <label key={p.path} className="row campaign-cast-viewer">
            <input type="checkbox" checked={on} onChange={() => {
              const current = all ? players.map((x) => x.path) : viewers
              const next = on ? current.filter((x) => x !== p.path) : [...current, p.path]
              // Desmarcar o último ou marcar todos volta a “todos”.
              onViewers(next.length === players.length ? [] : next.length ? next : [])
            }} />
            <span>{p.name}</span>
          </label>
        })}
        <span className="tiny faint">{players.length > 1 ? "Com dois ou mais, o cartão mostra a média." : "A reputação dele com cada personagem."}</span>
      </fieldset>}
    </div>
  </details>
}

/** Painel do cartão escolhido: tudo o que antes ficava em cada cartão. */
function CastDetail({ data, selected, rows, factionRows, rep, relations, id, focusOnRoute, onClose, onReputation, onSaveNpc, onSaveFaction, onRemoveNpc, onRemoveFaction, onUnlink, onEditPlayer }: {
  data: CampaignData; selected: Selected; rows: CastRow[]; factionRows: CastRow[]; rep: ResolvedReputation; relations: ReturnType<typeof useCastRelations>; id: string; focusOnRoute: boolean; onClose(): void
  onReputation?: () => void
  onSaveNpc(item: TrackedLink, extra: string): void; onSaveFaction(item: TrackedLink, extra: string): void
  onRemoveNpc(row: CastRow): void; onRemoveFaction(item: TrackedLink): void; onUnlink(p: PlayerCharacter): void; onEditPlayer(p: PlayerCharacter): void
}) {
  const vault = useVault()
  const canEdit = !data.readOnly && Boolean(data.campaign.home)
  const player = selected.kind === "pj" ? data.players.find((p) => p.path === selected.path) : undefined
  const row = selected.kind === "npc" ? rows.find((r) => r.item.position === selected.position) : undefined
  const faction = selected.kind === "faccao" ? data.factions.find((f) => f.position === selected.position) : undefined
  const factionRow = faction ? factionRows.find((r) => r.item.position === faction.position) : undefined
  // Some do painel o que saiu da campanha (Desfazer traz de volta pela lista).
  if (!player && !row && !faction) return null
  const path = player?.path ?? row?.item.dest ?? faction?.dest
  const name = player?.name ?? row?.name ?? noteName(faction!.target)
  const kindLabel = player ? "Personagem de jogador" : row ? "NPC" : "Facção"
  const sub = player ? [player.player, player.concept].filter(Boolean).join(" · ") : row ? [row.place, row.faction].filter(Boolean).join(" · ") : ""
  const links = path ? relations.edges.filter((e) => e.from === path || e.to === path) : []
  const known = row ? ATTITUDES.includes(row.attitude as (typeof ATTITUDES)[number]) : false
  const seenRow = row ?? factionRow
  const others = data.players.filter((p) => p.path !== path)
  const titleId = `${id}-title`
  return <aside id={id} className="campaign-cast-detail" aria-labelledby={titleId}>
    <div className="campaign-cast-detail-head">
      <span className="panel-title">Detalhes</span>
      <button type="button" className="icon-btn sm" onClick={onClose} aria-label="Fechar os detalhes"><X size={16} /></button>
    </div>
    <div className="campaign-cast-detail-who">
      <NoteCrest path={path} name={name} size={48} round={!faction} />
      <div className="campaign-cast-card-text">
        <h2 id={titleId} tabIndex={-1} data-route-focus={focusOnRoute || undefined}>{name}</h2>
        <span className="small muted">{[kindLabel, sub].filter(Boolean).join(" · ")}</span>
      </div>
    </div>
    {row && <>
      <div className="campaign-cast-detail-part">
        <span className="campaign-cast-detail-label" id={`${id}-atitude`}>Atitude com o grupo</span>
        {data.readOnly ? <span className={`chip ${attitudeColor(row.attitude)}`}>{row.attitude || "sem atitude"}</span>
          : <ChoiceGroup labelledBy={`${id}-atitude`} value={known ? row.attitude : ""} onChange={(value) => onSaveNpc(row.item, npcExtra(value, row.marked))}
            options={[...ATTITUDES.map((a) => ({ value: a as string, label: a })), { value: "", label: row.attitude && !known ? row.attitude : "sem" }]} />}
      </div>
    </>}
    {seenRow && <>
      <div className="campaign-cast-detail-part">
        {/* Apareceu: marcado à mão ou porque uma sessão cita o personagem (aí não dá para desmarcar daqui). */}
        <button type="button" className={`chip campaign-appeared ${seenRow.appeared ? "green" : ""}`} aria-pressed={seenRow.appeared} disabled={data.readOnly || (seenRow.seen.length > 0 && !seenRow.marked)}
          onClick={() => (row ? onSaveNpc : onSaveFaction)(seenRow.item, npcExtra(seenRow.attitude, !seenRow.marked))}>
          {seenRow.appeared ? <Check size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />} {seenRow.appeared ? "Já apareceu" : "Ainda não apareceu"}
        </button>
        <span className="tiny faint">{seenRow.seen.length && !seenRow.marked ? `citado em ${noteName(seenRow.seen[0]!.path)}` : seenRow.marked ? "marcado à mão" : "marque quando entrar em cena"}</span>
      </div>
      {seenRow.seen.length > 0 && <div className="campaign-cast-detail-part">
        <span className="campaign-cast-detail-label">Visto em</span>
        <ul className="campaign-cast-detail-list">{seenRow.seen.map((s) => <li key={s.path}><a href={href(sessionRoute(s))}>{noteName(s.path)}</a></li>)}</ul>
      </div>}
    </>}
    {path && others.length > 0 && <div className="campaign-cast-detail-part">
      <span className="campaign-cast-detail-label">Reputação</span>
      <ul className="campaign-cast-detail-list cast-rep-detail">{others.map((p) =>
        <li key={p.path}><span className="truncate">{p.name}</span><RepBar value={reputationValue(rep, p.path, path)} scale={rep.scale} name={`${name}, de ${p.name}`} compact /></li>)}</ul>
      {onReputation && <button type="button" className="btn sm" onClick={onReputation}><Gauge size={14} aria-hidden="true" /> Marcar reputação</button>}
    </div>}
    <div className="campaign-cast-detail-part">
      <span className="campaign-cast-detail-label">Relações</span>
      {/* O mesmo formato da aba Relações: “A — rótulo — B”; o escolhido fica em texto, o outro é link. */}
      {links.length ? <ul className="campaign-cast-detail-list">{links.map((e) => {
        const end = (p: string) => p === path ? <span>{relations.title(p)}</span> : <a href={href(noteRoute(p))}>{relations.title(p)}</a>
        return <li key={`${e.from}>${e.to}>${e.label}`}>{end(e.from)} <span className="faint">— {e.label} —</span> {end(e.to)}</li>
      })}</ul> : <span className="tiny faint">Nenhuma com o elenco. Vêm dos artigos da wiki (Aliados, Inimigos, Membro de…).</span>}
    </div>
    <div className="row-wrap campaign-cast-detail-actions">
      {path && vault.index?.note(path) && <button type="button" className="btn sm" onClick={() => navigate(noteRoute(path))}><BookOpen size={14} aria-hidden="true" /> Abrir artigo</button>}
      {player && canEdit && <button type="button" className="btn sm" onClick={() => onEditPlayer(player)} aria-label={`Trocar jogador de ${player.name}`}><Pencil size={14} aria-hidden="true" /> Trocar jogador</button>}
      {player && canEdit && <button type="button" className="btn sm ghost danger" onClick={() => onUnlink(player)} aria-label={`Desvincular ${player.name} da campanha`}><Unlink size={14} aria-hidden="true" /> Desvincular</button>}
      {row && !data.readOnly && <button type="button" className="btn sm ghost danger" onClick={() => onRemoveNpc(row)}><Trash size={14} aria-hidden="true" /> Tirar da campanha</button>}
      {faction && !data.readOnly && <button type="button" className="btn sm ghost danger" onClick={() => onRemoveFaction(faction)}><Trash size={14} aria-hidden="true" /> Tirar da campanha</button>}
    </div>
  </aside>
}

/**
 * “Adicionar ao elenco”: os cinco botões de antes (Personagem, Novo NPC, NPC da wiki, Nova facção, Facção da wiki)
 * num só lugar. Digite o nome: o que já está na wiki aparece para escolher; se não estiver, cria.
 */
function AddToCast({ data, onClose, onOpen, closeDialog }: { data: CampaignData; onClose(): void; onOpen(dialog: ReactNode): void; closeDialog(): void }) {
  const vault = useVault()
  const index = vault.index!
  const { setHome } = useCampaignEdits(data)
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)
  const root = data.campaign.wiki ? `Wikis/${data.campaign.wiki}/` : "Wikis/"
  const taken = useMemo(() => new Set([...data.npcs, ...data.factions].map((i) => i.dest).filter((d): d is string => Boolean(d)).concat(data.players.map((p) => p.path))), [data])
  const q = fold(query.trim())
  const found = useMemo(() => index.notesIn(root)
    .map((note) => ({ note, kind: articleKind(note.meta.frontmatter?.data?.tipo)?.id }))
    .filter(({ note, kind }) => (kind === "personagem" || kind === "organizacao") && !taken.has(note.path) && (!q || fold(noteName(note.path)).includes(q)))
    .sort((a, b) => noteName(a.note.path).localeCompare(noteName(b.note.path), "pt-BR"))
    .slice(0, 8), [index, vault.version, root, taken, q])
  const name = query.trim()
  const quoted = name ? ` “${name}”` : ""
  const add = async (path: string, kind: string | undefined) => {
    setBusy(true)
    try {
      const target = index.linkTarget(path, data.campaign.home!)
      await (kind === "organizacao" ? setHome("faccoes", withTrackedLink(data.data.faccoes, -1, target, "0")) : setHome("npcs", withTrackedLink(data.data.npcs, -1, target, "neutro")))
      onClose()
    } finally { setBusy(false) }
  }
  return <Modal title="Adicionar ao elenco" onClose={onClose}>
    <div className="stack campaign-cast-add-body">
      <label className="search">
        <Search size={15} aria-hidden="true" />
        <input className="input" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome do personagem ou da facção" aria-label="Nome para adicionar ao elenco" />
      </label>
      <div className="stack" style={{ gap: 4 }}>
        <span className="campaign-cast-detail-label">Da wiki{data.campaign.wiki ? ` ${data.campaign.wiki}` : ""}</span>
        {found.length === 0 && <span className="small muted">{q ? "Nada na wiki com esse nome." : "Nenhum personagem ou organização da wiki fora do elenco."}</span>}
        <ul className="campaign-cast-add-list">{found.map(({ note, kind }) => <li key={note.path}>
          <button type="button" className="list-item" disabled={busy} onClick={() => void add(note.path, kind)}>
            {kind === "organizacao" ? <Library size={15} aria-hidden="true" /> : <Users size={15} aria-hidden="true" />}
            <span className="grow truncate">{noteName(note.path)}</span>
            <span className="meta">{kind === "organizacao" ? "como facção" : "como NPC"}</span>
          </button>
          {kind === "personagem" && <button type="button" className="btn sm ghost" disabled={busy} aria-label={`Vincular ${noteName(note.path)} como personagem de jogador`}
            onClick={() => onOpen(<NewPlayerDialog campaign={data.campaign} initialSelected={note.path} onClose={closeDialog} />)}>Jogador</button>}
        </li>)}</ul>
      </div>
      <div className="stack" style={{ gap: 4 }}>
        <span className="campaign-cast-detail-label">Criar</span>
        <div className="row-wrap">
          <button type="button" className="btn sm" onClick={() => onOpen(<NewNpcDialog data={data} initialName={name} onClose={closeDialog} />)}><UserPlus size={14} aria-hidden="true" /> NPC{quoted}</button>
          <button type="button" className="btn sm" onClick={() => onOpen(<NewNpcDialog data={data} initialName={name} initialKind="organizacao" onClose={closeDialog} />)}><Library size={14} aria-hidden="true" /> Facção{quoted}</button>
          <button type="button" className="btn sm" onClick={() => onOpen(<NewPlayerDialog campaign={data.campaign} initialName={name} onClose={closeDialog} />)}><Users size={14} aria-hidden="true" /> Personagem de jogador{quoted}</button>
        </div>
      </div>
    </div>
  </Modal>
}
