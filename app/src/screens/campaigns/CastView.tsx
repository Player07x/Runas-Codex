import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSinglePane } from "../../lib/tabs"
import { useRemembered } from "../../lib/remembered"
import { BookOpen, CalendarDays, Check, CircleDot, Minus, Plus, Search, Trash, UserPlus, Pencil, Unlink } from "lucide-react"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { NoteCrest } from "../../components/kit/Emblem"
import { ATTITUDES, castRows, npcExtra, withCampaignPlayer, type CastRow, type PlayerCharacter, reputationOf, withReputation, withoutPosition, withTrackedLink, type TrackedLink } from "../../core/campaigns"
import { fullRows, nextLimit } from "../../core/grid-rows"
import { useGridColumns } from "../../components/kit/useGridColumns"
import { noteName } from "../../core/text"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { ArticleArt } from "../wiki/ArticleArt"
import { EditPlayerDialog, NewNpcDialog, NewPlayerDialog, WikiNotePicker } from "./campaign-dialogs"
import { useCampaignEdits, useUndoable } from "./campaign-edits"
import { sessionRoute, type CampaignData } from "./campaign-state"
import { attitudeColor } from "./DashboardCards"
import { CastRelations } from "./CastRelations"

export function CastView({ data }: { data: CampaignData }) {
  const [newPlayer, setNewPlayer] = useState(false)
  const [editing, setEditing] = useState<PlayerCharacter>()
  const vault = useVault()
  const { setHome } = useCampaignEdits(data)
  const undoable = useUndoable()
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Personagens dos jogadores, NPCs e facções</span>
          <h1 className="page-title">Elenco</h1>
        </div>
      </div>
      <section className="card stack">
        <div className="row between">
          <h2 className="section-title">Personagens dos jogadores</h2>
          {!data.readOnly && data.campaign.home && (
            <button className="btn sm" onClick={() => setNewPlayer(true)}>
              <UserPlus size={14} /> Personagem
            </button>
          )}
        </div>
        {data.players.length === 0 && <span className="muted small">Nenhum personagem vinculado. Crie ou selecione um personagem da wiki.</span>}
        <div className="campaign-cast-grid">
          {data.players.map((p) => (
            <div key={p.path} className="card tight stack">
              <a className="row link campaign-person" href={href(noteRoute(p.path))}>
                <NoteCrest path={p.path} name={p.name} size={36} />
                <span className="grow">
                  <strong className="small">{p.name}</strong>
                  <span className="tiny faint" style={{ display: "block" }}>{[p.player, p.concept].filter(Boolean).join(" · ") || "Sem jogador anotado"}</span>
                </span>
              </a>
              {!data.readOnly && data.campaign.home && <div className="row-wrap">
                <button className="btn sm" onClick={() => setEditing(p)} aria-label={`Trocar jogador de ${p.name}`}><Pencil size={14} /> Jogador</button>
                {/* Sem confirmação: o aviso traz “Desfazer” (a nota do personagem continua na wiki). */}
                <button className="btn sm ghost" onClick={() => void undoable(data.campaign.home!, `${p.name} desvinculado da campanha.`, () => setHome("personagens", withCampaignPlayer(vault.index!, data.campaign, p.path, null)))} aria-label={`Desvincular ${p.name} da campanha`}><Unlink size={14} /> Desvincular</button>
              </div>}
            </div>
          ))}
        </div>
      </section>
      <NpcRoster data={data} />
      <FactionSection data={data} />
      <CastRelations data={data} />
      {editing && <EditPlayerDialog campaign={data.campaign} character={editing} onClose={() => setEditing(undefined)} />}
      {newPlayer && <NewPlayerDialog campaign={data.campaign} onClose={() => setNewPlayer(false)} />}
    </div>
  )
}
type Seen = "todos" | "apareceu" | "ainda"
const parseCastFilters = (raw: unknown): { seen: Seen; attitude: string } => {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  return { seen: value.seen === "apareceu" || value.seen === "ainda" ? value.seen : "todos", attitude: typeof value.attitude === "string" ? value.attitude : "" }
}
type Group = "nenhum" | "local" | "faccao" | "atitude" | "situacao"
type Order = "nome" | "recente" | "adicao"
/** Lista (linhas) ou grade (cartões com a imagem do artigo), como nas categorias da Wiki. */
type Mode = "list" | "grid"
type CardSize = "small" | "medium" | "large"
const PAGE = 60
type Prefs = { group: Group; order: Order; mode: Mode; size: CardSize }
const prefsKey = (root: string, section: "npcs" | "faccoes") => `runas-codex:campanha:elenco${section === "faccoes" ? "-faccoes" : ""}:${root}`
const readPrefs = (key: string): Prefs => {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<Prefs>
    return { group: saved.group ?? "nenhum", order: saved.order ?? "nome", mode: saved.mode === "grid" ? "grid" : "list", size: saved.size === "small" || saved.size === "large" ? saved.size : "medium" }
  } catch { return { group: "nenhum", order: "nome", mode: "list", size: "medium" } }
}
/** Exibição e tamanho lembrados por seção e por campanha, no aparelho (U33). */
function useSectionPrefs(root: string, section: "npcs" | "faccoes") {
  const key = prefsKey(root, section)
  const [prefs, setState] = useState(() => readPrefs(key))
  const set = (next: Partial<Prefs>) => setState((current) => {
    const value = { ...current, ...next }
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* preferência opcional */ }
    return value
  })
  return [prefs, set] as const
}

const MODES = [{ value: "list", label: "Lista" }, { value: "grid", label: "Grade" }] as const
const SIZES = [{ value: "small", label: "Pequeno" }, { value: "medium", label: "Médio" }, { value: "large", label: "Grande" }] as const

/** Exibição (Lista · Grade) e, só na grade, Tamanho; igual nas duas seções. */
function ViewControls({ prefs, setPrefs, label }: { prefs: Prefs; setPrefs(next: Partial<Prefs>): void; label: string }) {
  // Sem rótulo no invólucro: cada ChoiceGroup já diz o que escolhe.
  return <div className="campaign-cast-view-controls">
    <ChoiceGroup label={`Exibição ${label}`} value={prefs.mode} onChange={(mode) => setPrefs({ mode })} options={MODES} />
    {prefs.mode === "grid" && <ChoiceGroup label={`Tamanho dos cartões ${label}`} value={prefs.size} onChange={(size) => setPrefs({ size })} options={SIZES} />}
  </div>
}

/**
 * NPCs da campanha (T9): pensado para mais de 100. Busca, filtro de “já apareceu” e de atitude, agrupamento por local,
 * facção, atitude ou situação. Na grade, “Mostrar mais” completa fileiras inteiras (U28) e leva o foco ao primeiro
 * cartão novo. “Apareceu” vem sozinho quando uma sessão cita o NPC e pode ser marcado à mão.
 */
function NpcRoster({ data }: { data: CampaignData }) {
  const vault = useVault()
  const { setHome } = useCampaignEdits(data)
  const undoable = useUndoable()
  const narrow = useSinglePane()
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useRemembered(`runas-codex:campanha:elenco-filtros:${data.campaign.root}`, parseCastFilters)
  const [prefs, setPrefs] = useSectionPrefs(data.campaign.root, "npcs")
  const [limit, setLimit] = useState(PAGE)
  const gridRef = useRef<HTMLUListElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const firstNew = useRef<number | null>(null)
  const columns = useGridColumns(gridRef, prefs.size === "small" ? 145 : prefs.size === "large" ? 270 : 190, `${prefs.mode}-${prefs.size}-${prefs.group}-${data.npcs.length > 0}`)
  const { seen, attitude } = filters
  const setSeen = (value: Seen) => { setFilters((current) => ({ ...current, seen: value })); setLimit(PAGE) }
  const setAttitude = (value: string) => { setFilters((current) => ({ ...current, attitude: value })); setLimit(PAGE) }
  const rows = useMemo(() => castRows(vault.index!, data.npcs, data.sessions), [vault.index, vault.version, data.npcs, data.sessions])
  const root = data.campaign.wiki ? `Wikis/${data.campaign.wiki}/` : "Wikis/"
  const exclude = useMemo(() => new Set(data.npcs.map((i) => i.dest).filter((d): d is string => Boolean(d))), [data.npcs])
  const q = query.trim().toLocaleLowerCase("pt-BR")
  const filtered = rows.filter((r) =>
    (!q || `${r.name} ${r.place ?? ""} ${r.faction ?? ""}`.toLocaleLowerCase("pt-BR").includes(q)) &&
    (seen === "todos" || (seen === "apareceu") === r.appeared) &&
    (!attitude || (attitude === "-" ? !r.attitude : r.attitude === attitude)))
  const last = (r: CastRow) => r.seen[r.seen.length - 1]
  const sorted = [...filtered].sort((a, b) =>
    prefs.order === "nome" ? a.name.localeCompare(b.name, "pt-BR")
      : prefs.order === "recente" ? data.sessions.indexOf(last(b)!) - data.sessions.indexOf(last(a)!) || a.name.localeCompare(b.name, "pt-BR")
        : b.item.position - a.item.position)
  const keyOf = (r: CastRow) => prefs.group === "local" ? r.place ?? "Sem local"
    : prefs.group === "faccao" ? r.faction ?? "Sem facção"
      : prefs.group === "atitude" ? r.attitude || "Sem atitude"
        : prefs.group === "situacao" ? (r.appeared ? "Já apareceram" : "Ainda não apareceram") : ""
  // Na grade sem grupos, o limite fecha a última fileira; com grupos, cada grupo quebra a fileira e vale o limite simples.
  const visibleLimit = prefs.mode === "grid" && prefs.group === "nenhum" ? fullRows(sorted.length, limit, columns) : limit
  const groups = new Map<string, CastRow[]>()
  for (const r of sorted.slice(0, visibleLimit)) { const key = keyOf(r); groups.set(key, [...(groups.get(key) ?? []), r]) }
  const counts = { todos: rows.length, apareceu: rows.filter((r) => r.appeared).length, ainda: rows.filter((r) => !r.appeared).length }
  const remove = (row: CastRow) => void undoable(data.campaign.home ?? "", `${row.name} saiu do Elenco.`, () => setHome("npcs", withoutPosition(data.data.npcs, row.item.position)))
  const save = (item: TrackedLink, extra: string) => setHome("npcs", withTrackedLink(data.data.npcs, item.position, item.target, extra))
  const more = () => { firstNew.current = visibleLimit; setLimit(prefs.mode === "grid" && prefs.group === "nenhum" ? nextLimit(sorted.length, visibleLimit, columns, PAGE) : visibleLimit + PAGE) }
  // Depois do “Mostrar mais”, o foco vai para o primeiro NPC que apareceu.
  useEffect(() => {
    if (firstNew.current === null) return
    const items = listRef.current?.querySelectorAll<HTMLElement>("li")
    items?.[firstNew.current]?.querySelector<HTMLElement>("a, button, select")?.focus()
    firstNew.current = null
  }, [visibleLimit])
  return (
    <section className="card stack campaign-roster" aria-labelledby="elenco-npcs">
      <div className="row between">
        <h2 id="elenco-npcs" className="section-title">NPCs · {rows.length}</h2>
        {!data.readOnly && data.campaign.home && (
          <div className="row-wrap">
            <button className="btn sm" onClick={() => setCreating(true)}><UserPlus size={14} /> Novo NPC</button>
            <button className="btn sm" onClick={() => setPicking(true)}><Plus size={14} /> NPC da wiki</button>
          </div>
        )}
      </div>
      {rows.length === 0 ? (
        <span className="muted small">Os NPCs moram na wiki; aqui ficam a atitude deles com o grupo e se já apareceram.</span>
      ) : (
        <>
          <div className="campaign-roster-tools">
            <label className="search grow">
              <Search size={15} />
              <input className="input" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }} placeholder={`Buscar entre ${rows.length} NPCs (nome, local, facção)`} aria-label="Buscar NPC" />
            </label>
            <ChoiceGroup label="Situação" value={seen} onChange={setSeen} options={[
              { value: "todos", label: `Todos ${counts.todos}` }, { value: "apareceu", label: `Apareceram ${counts.apareceu}` }, { value: "ainda", label: `Ainda não ${counts.ainda}` },
            ]} />
            <Collapsible narrow={narrow} active={Boolean(attitude) || prefs.group !== "nenhum" || prefs.order !== "nome"}>
              <label className="field"><span>Atitude</span>
                <select className="select" value={attitude} onChange={(e) => setAttitude(e.target.value)}>
                  <option value="">Todas</option>
                  {ATTITUDES.map((a) => <option key={a} value={a}>{a}</option>)}
                  <option value="-">Sem atitude</option>
                </select>
              </label>
              <label className="field"><span>Agrupar</span>
                <select className="select" value={prefs.group} onChange={(e) => setPrefs({ group: e.target.value as Group })}>
                  <option value="nenhum">Sem grupos</option><option value="local">Por local</option><option value="faccao">Por facção</option><option value="atitude">Por atitude</option><option value="situacao">Apareceram ou não</option>
                </select>
              </label>
              <label className="field"><span>Ordem</span>
                <select className="select" value={prefs.order} onChange={(e) => setPrefs({ order: e.target.value as Order })}>
                  <option value="nome">Nome</option><option value="recente">Visto há menos tempo</option><option value="adicao">Últimos acrescentados</option>
                </select>
              </label>
            </Collapsible>
          </div>
          <div className="row between campaign-roster-count">
            <p className="tiny muted" aria-live="polite">{filtered.length === rows.length ? `${rows.length} NPCs` : `${filtered.length} de ${rows.length} NPCs`}</p>
            <ViewControls prefs={prefs} setPrefs={setPrefs} label="dos NPCs" />
          </div>
          <div ref={listRef} className="stack" style={{ gap: 12 }}>
            {[...groups].map(([group, list], i) => <div key={group || "todos"} className="stack" style={{ gap: prefs.mode === "grid" ? 8 : 0 }}>
              {group && <h3 className="campaign-roster-group">{group} · {list.length}</h3>}
              <ul ref={i === 0 ? gridRef : undefined} className={prefs.mode === "grid" ? `campaign-roster-grid size-${prefs.size}` : "campaign-roster-list"}>
                {list.map((row) => prefs.mode === "grid"
                  ? <NpcCard key={row.item.position} row={row} data={data} onSave={save} onRemove={() => remove(row)} compact={prefs.size === "small"} />
                  : <NpcRow key={row.item.position} row={row} data={data} onSave={save} onRemove={() => remove(row)} />)}
              </ul>
            </div>)}
          </div>
          {sorted.length > visibleLimit && <button className="btn sm ghost" style={{ justifySelf: "start" }} onClick={more}>Mostrar mais {Math.min(prefs.mode === "grid" && prefs.group === "nenhum" ? nextLimit(sorted.length, visibleLimit, columns, PAGE) - visibleLimit : PAGE, sorted.length - visibleLimit)} de {sorted.length - visibleLimit}</button>}
        </>
      )}
      {picking && <WikiNotePicker title="Acompanhar NPC" root={root} exclude={exclude} onClose={() => setPicking(false)} onPick={async (path) => { await setHome("npcs", withTrackedLink(data.data.npcs, -1, vault.index!.linkTarget(path, data.campaign.home!), "neutro")) }} />}
      {creating && <NewNpcDialog data={data} onClose={() => setCreating(false)} />}
    </section>
  )
}

/**
 * Facções da campanha (U34): o mesmo cabeçalho dos NPCs (“Nova facção” e “Facção da wiki”), Lista ou Grade, e a
 * reputação do grupo de −3 a +3 com o número em texto; o −/+ troca só o número e guarda o texto entre parênteses.
 */
function FactionSection({ data }: { data: CampaignData }) {
  const vault = useVault()
  const { setHome } = useCampaignEdits(data)
  const undoable = useUndoable()
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [prefs, setPrefs] = useSectionPrefs(data.campaign.root, "faccoes")
  const factions = data.factions
  const root = data.campaign.wiki ? `Wikis/${data.campaign.wiki}/` : "Wikis/"
  const exclude = useMemo(() => new Set(factions.map((i) => i.dest).filter((d): d is string => Boolean(d))), [factions])
  const save = (item: TrackedLink, extra: string) => setHome("faccoes", withTrackedLink(data.data.faccoes, item.position, item.target, extra))
  const remove = (position: number, name: string) => void undoable(data.campaign.home ?? "", `${name} saiu da campanha.`, () => setHome("faccoes", withoutPosition(data.data.faccoes, position)))
  return <section className="card stack campaign-roster" aria-labelledby="elenco-faccoes">
    <div className="row between">
      <h2 id="elenco-faccoes" className="section-title">Facções · {factions.length}</h2>
      {!data.readOnly && data.campaign.home && <div className="row-wrap">
        <button className="btn sm" onClick={() => setCreating(true)}><UserPlus size={14} /> Nova facção</button>
        <button className="btn sm" onClick={() => setPicking(true)}><Plus size={14} /> Facção da wiki</button>
      </div>}
    </div>
    {factions.length === 0
      ? <span className="muted small">Organizações da wiki com a reputação do grupo (−3 a +3).</span>
      : <>
        <div className="row between campaign-roster-count">
          <p className="tiny muted">{factions.length === 1 ? "1 facção" : `${factions.length} facções`}</p>
          <ViewControls prefs={prefs} setPrefs={setPrefs} label="das facções" />
        </div>
        <ul className={prefs.mode === "grid" ? `campaign-faction-grid size-${prefs.size}` : "campaign-faction-list"}>{factions.map((item) => {
          const name = noteName(item.target), rep = reputationOf(item.extra)
          const repText = rep > 0 ? `+${rep}` : String(rep)
          const note = item.dest ? vault.index?.note(item.dest) : undefined
          return <li key={item.position} className="campaign-tracked">
            {prefs.mode === "grid" && note ? <ArticleArt note={note} size="thumb" /> : <NoteCrest path={item.dest} name={name} size={28} />}
            {item.dest ? <a className="wikilink cross grow truncate" href={href(noteRoute(item.dest))}>{name}</a> : <span className="wikilink broken grow truncate" title="A nota não existe">{name}</span>}
            {prefs.mode === "grid" && prefs.size === "small"
              ? <span className={`chip ${rep > 0 ? "green" : rep < 0 ? "red" : ""} mono`} aria-live="polite"><span className="sr-only">Reputação com {name}: </span>{repText}</span>
              : <span className="row campaign-faction-reputation" style={{ gap: 2 }}>
              <button className="icon-btn sm" disabled={data.readOnly || rep <= -3} onClick={() => save(item, withReputation(item.extra, rep - 1))} aria-label={`Baixar a reputação com ${name}`}><Minus size={14} /></button>
              <span className={`chip ${rep > 0 ? "green" : rep < 0 ? "red" : ""} mono`} aria-live="polite"><span className="sr-only">Reputação com {name}: </span>{repText}</span>
              <button className="icon-btn sm" disabled={data.readOnly || rep >= 3} onClick={() => save(item, withReputation(item.extra, rep + 1))} aria-label={`Subir a reputação com ${name}`}><Plus size={14} /></button>
            </span>}
            <OverflowMenu label={`Ações de ${name}`} items={[...(prefs.mode === "grid" && prefs.size === "small" ? [
              { label: `Subir a reputação (${rep >= 3 ? "já no máximo" : rep + 1 > 0 ? `+${rep + 1}` : rep + 1})`, icon: <Plus size={15} />, disabled: data.readOnly || rep >= 3, onSelect: () => void save(item, withReputation(item.extra, rep + 1)) },
              { label: `Baixar a reputação (${rep <= -3 ? "já no mínimo" : rep - 1 > 0 ? `+${rep - 1}` : rep - 1})`, icon: <Minus size={15} />, disabled: data.readOnly || rep <= -3, onSelect: () => void save(item, withReputation(item.extra, rep - 1)) },
              "separator" as const,
            ] : []), ...(item.dest ? [{ label: "Abrir na Wiki", icon: <BookOpen size={15} />, onSelect: () => navigate(noteRoute(item.dest!)) }] : []), { label: "Tirar da campanha", icon: <Trash size={15} />, danger: true, disabled: data.readOnly, onSelect: () => remove(item.position, name) }]} />
          </li>
        })}</ul>
      </>}
    {picking && <WikiNotePicker title="Acompanhar facção" root={root} exclude={exclude} onClose={() => setPicking(false)} onPick={async (path) => { await setHome("faccoes", withTrackedLink(data.data.faccoes, -1, vault.index!.linkTarget(path, data.campaign.home!), "0")) }} />}
    {creating && <NewNpcDialog data={data} initialKind="organizacao" onClose={() => setCreating(false)} />}
  </section>
}

/** No celular, atitude, grupos e ordem ficam recolhidos para a lista aparecer logo. */
function Collapsible({ narrow, active, children }: { narrow: boolean; active: boolean; children: ReactNode }) {
  if (!narrow) return <>{children}</>
  return (
    <details className="campaign-roster-more">
      <summary>Filtros e grupos{active ? " (em uso)" : ""}</summary>
      <div className="stack">{children}</div>
    </details>
  )
}

type NpcProps = { row: CastRow; data: CampaignData; onSave(item: TrackedLink, extra: string): void; onRemove(): void }

/** Local, facção e a última sessão em que o NPC foi visto. */
function NpcWhere({ row }: { row: CastRow }) {
  const last = row.seen[row.seen.length - 1]
  return (
    <span className="tiny faint truncate">
      {[row.place, row.faction].filter(Boolean).join(" · ")}
      {last && <>{row.place || row.faction ? " · " : ""}<a href={href(sessionRoute(last))}>visto em {noteName(last.path)}</a>{row.seen.length > 1 ? ` (${row.seen.length} sessões)` : ""}</>}
    </span>
  )
}

function NpcRow({ row, data, onSave, onRemove }: NpcProps) {
  const { item } = row
  return (
    <li className="campaign-roster-row">
      <NoteCrest path={item.dest} name={row.name} size={28} />
      <span className="grow campaign-roster-name">
        {item.dest ? <a className="wikilink cross truncate" href={href(noteRoute(item.dest))}>{row.name}</a> : <span className="wikilink broken truncate" title="A nota não existe">{row.name}</span>}
        <NpcWhere row={row} />
      </span>
      <NpcControls row={row} data={data} onSave={onSave} onRemove={onRemove} />
    </li>
  )
}

/** Cartão da grade: a imagem do artigo da wiki (ou o ícone da categoria), o nome e os mesmos controles da lista. */
function NpcCard({ row, data, onSave, onRemove, compact }: NpcProps & { compact?: boolean }) {
  const vault = useVault()
  const { item } = row
  const note = item.dest ? vault.index?.note(item.dest) : undefined
  const art = note ? <ArticleArt note={note} size="cover" /> : <span className="wiki-article-art cover" aria-hidden="true"><span className="wiki-art-initial">{Array.from(row.name.trim())[0]?.toLocaleUpperCase("pt-BR") ?? "?"}</span></span>
  return (
    <li className="campaign-npc-card">
      {item.dest ? (
        <a className="campaign-npc-card-head" href={href(noteRoute(item.dest))}>{art}<strong>{row.name}</strong></a>
      ) : (
        <span className="campaign-npc-card-head" title="A nota não existe">{art}<strong className="wikilink broken">{row.name}</strong></span>
      )}
      {compact
        ? <div className="campaign-npc-card-body campaign-npc-card-compact">
          {/* Pequeno (U33): retrato, nome e atitude em texto; o resto vai para o ⋯ (nada some). */}
          <span className="row-wrap campaign-npc-card-tags"><span className={`chip ${attitudeColor(row.attitude)}`}>{row.attitude || "sem atitude"}</span>{row.appeared && <span className="chip green"><Check size={12} aria-hidden="true" /> apareceu</span>}</span>
          <OverflowMenu label={`Ações de ${row.name}`} items={npcMenu(row, data, onSave, onRemove, true)} />
        </div>
        : <div className="campaign-npc-card-body">
          <NpcWhere row={row} />
          <div className="campaign-npc-card-controls"><NpcControls row={row} data={data} onSave={onSave} onRemove={onRemove} /></div>
        </div>}
    </li>
  )
}

/** Atitude, “apareceu” e as ações; iguais na lista e na grade. */
function NpcControls({ row, data, onSave, onRemove }: NpcProps) {
  const { item } = row
  const known = ATTITUDES.includes(row.attitude as (typeof ATTITUDES)[number])
  return (
    <>
      <select className={`select campaign-attitude ${attitudeColor(row.attitude)}`} disabled={data.readOnly} value={known ? row.attitude : ""} onChange={(e) => onSave(item, npcExtra(e.target.value, row.marked))} aria-label={`Atitude de ${row.name}`}>
        <option value="">{row.attitude && !known ? row.attitude : "sem atitude"}</option>
        {ATTITUDES.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      {/* Apareceu: marcado à mão ou porque uma sessão cita o NPC (aí não dá para desmarcar daqui). */}
      <button type="button" className={`chip campaign-appeared ${row.appeared ? "green" : ""}`} aria-pressed={row.appeared} disabled={data.readOnly || (row.seen.length > 0 && !row.marked)}
        title={row.seen.length && !row.marked ? "Citado numa sessão: já conta como apareceu" : row.marked ? "Desmarcar “apareceu”" : "Marcar que já apareceu na campanha"}
        onClick={() => onSave(item, npcExtra(row.attitude, !row.marked))}>
        {row.appeared ? <Check size={13} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />} {row.appeared ? "Apareceu" : "Ainda não"}
        <span className="sr-only"> — {row.name}</span>
      </button>
      <OverflowMenu label={`Ações de ${row.name}`} items={npcMenu(row, data, onSave, onRemove, false)} />
    </>
  )
}

/** O ⋯ do NPC; no cartão Pequeno ele também leva a atitude, o “apareceu” e a última sessão em que o NPC foi visto. */
function npcMenu(row: CastRow, data: CampaignData, onSave: NpcProps["onSave"], onRemove: () => void, compact: boolean): MenuEntry[] {
  const { item } = row
  const last = row.seen[row.seen.length - 1]
  const extra: MenuEntry[] = compact ? [
    ...ATTITUDES.filter((a) => a !== row.attitude).map((a) => ({ label: `Atitude: ${a}`, icon: <CircleDot size={15} />, disabled: data.readOnly, onSelect: () => onSave(item, npcExtra(a, row.marked)) })),
    { label: row.marked ? "Desmarcar “apareceu”" : row.appeared ? "Já apareceu (citado numa sessão)" : "Marcar que já apareceu", icon: row.appeared ? <Check size={15} /> : <Minus size={15} />, disabled: data.readOnly || (row.seen.length > 0 && !row.marked), onSelect: () => onSave(item, npcExtra(row.attitude, !row.marked)) },
    ...(last ? [{ label: `Abrir ${noteName(last.path)}`, hint: row.seen.length > 1 ? `${row.seen.length} sessões` : "visto aqui", icon: <CalendarDays size={15} />, onSelect: () => navigate(sessionRoute(last)) }] : []),
    "separator",
  ] : []
  return [
    ...extra,
    ...(item.dest ? [{ label: "Abrir na Wiki", icon: <BookOpen size={15} />, onSelect: () => navigate(noteRoute(item.dest!)) }] : []),
    { label: "Tirar da campanha", icon: <Trash size={15} />, danger: true, disabled: data.readOnly, onSelect: onRemove },
  ]
}
