import { useMemo, useState, type ReactNode } from "react"
import { useSinglePane } from "../../lib/tabs"
import { BookOpen, Check, Minus, Plus, Search, Trash, UserPlus, Pencil, Unlink } from "lucide-react"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { NoteCrest } from "../../components/kit/Emblem"
import { ATTITUDES, castRows, npcExtra, withCampaignPlayer, type CastRow, type PlayerCharacter, reputationOf, withoutPosition, withTrackedLink, type TrackedLink } from "../../core/campaigns"
import { noteName } from "../../core/text"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { EditPlayerDialog, NewNpcDialog, NewPlayerDialog, WikiNotePicker } from "./campaign-dialogs"
import { useCampaignEdits } from "./campaign-edits"
import { sessionRoute, type CampaignData } from "./campaign-state"
import { attitudeColor } from "./DashboardCards"

export function CastView({ data }: { data: CampaignData }) {
  const [newPlayer, setNewPlayer] = useState(false)
  const [editing, setEditing] = useState<PlayerCharacter>()
  const [unlinking, setUnlinking] = useState<string | null>(null)
  const vault = useVault()
  const { setHome } = useCampaignEdits(data)
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
                {/* Desvincular pede confirmação: o personagem sai da lista da campanha. */}
                {unlinking === p.path ? (
                  <button className="btn sm danger" autoFocus onBlur={() => setUnlinking(null)} onClick={() => { setUnlinking(null); setHome("personagens", withCampaignPlayer(vault.index!, data.campaign, p.path, null)) }}>Confirmar</button>
                ) : (
                  <button className="btn sm ghost" onClick={() => setUnlinking(p.path)} aria-label={`Desvincular ${p.name} da campanha`}><Unlink size={14} /> Desvincular</button>
                )}
              </div>}
            </div>
          ))}
        </div>
      </section>
      <NpcRoster data={data} />
      <FactionSection data={data} />
      {editing && <EditPlayerDialog campaign={data.campaign} character={editing} onClose={() => setEditing(undefined)} />}
      {newPlayer && <NewPlayerDialog campaign={data.campaign} onClose={() => setNewPlayer(false)} />}
    </div>
  )
}

type Seen = "todos" | "apareceu" | "ainda"
type Group = "nenhum" | "local" | "faccao" | "atitude" | "situacao"
type Order = "nome" | "recente" | "adicao"
const PAGE = 60
const PREFS = "runas-codex:campanha:elenco"
const readPrefs = (): { group: Group; order: Order } => {
  try { const saved = JSON.parse(localStorage.getItem(PREFS) ?? "{}") as { group?: Group; order?: Order }; return { group: saved.group ?? "nenhum", order: saved.order ?? "nome" } } catch { return { group: "nenhum", order: "nome" } }
}

/**
 * NPCs da campanha (T9): pensado para mais de 100. Busca, filtro de “já apareceu” e de atitude, agrupamento por local,
 * facção, atitude ou situação, e a lista em partes de 60. “Apareceu” vem sozinho quando uma sessão cita o NPC e pode
 * ser marcado à mão (fica na nota da campanha, junto da atitude: `[[NPC]] (hostil, apareceu)`).
 */
function NpcRoster({ data }: { data: CampaignData }) {
  const vault = useVault()
  const { setHome } = useCampaignEdits(data)
  const [picking, setPicking] = useState(false)
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState("")
  const [seen, setSeen] = useState<Seen>("todos")
  const [attitude, setAttitude] = useState("")
  const [prefs, setPrefsState] = useState(readPrefs)
  const [limit, setLimit] = useState(PAGE)
  const narrow = useSinglePane()
  const setPrefs = (next: Partial<typeof prefs>) => setPrefsState((current) => { const value = { ...current, ...next }; try { localStorage.setItem(PREFS, JSON.stringify(value)) } catch { /* só não é lembrado */ } return value })
  const rows = useMemo(() => castRows(vault.index!, data.npcs, data.sessions), [vault.index, vault.version, data.npcs, data.sessions])
  const exclude = useMemo(() => new Set(data.npcs.map((i) => i.dest).filter((d): d is string => Boolean(d))), [data.npcs])
  const root = data.campaign.wiki ? `Wikis/${data.campaign.wiki}/` : "Wikis/"
  const save = (item: TrackedLink, extra: string) => setHome("npcs", withTrackedLink(data.data.npcs, item.position, item.target, extra))
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
  const groups = new Map<string, CastRow[]>()
  for (const r of sorted.slice(0, limit)) { const k = keyOf(r); groups.set(k, [...(groups.get(k) ?? []), r]) }
  const counts = { todos: rows.length, apareceu: rows.filter((r) => r.appeared).length, ainda: rows.filter((r) => !r.appeared).length }
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
            <ChoiceGroup label="Situação" value={seen} onChange={(v) => { setSeen(v); setLimit(PAGE) }} options={[
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
          <p className="tiny muted" aria-live="polite">{filtered.length === rows.length ? `${rows.length} NPCs` : `${filtered.length} de ${rows.length} NPCs`}</p>
          {[...groups].map(([group, list]) => (
            <div key={group || "todos"} className="stack" style={{ gap: 0 }}>
              {group && <h3 className="campaign-roster-group">{group} · {list.length}</h3>}
              <ul className="campaign-roster-list">
                {list.map((r) => <NpcRow key={r.item.position} row={r} data={data} onSave={save} onRemove={() => setHome("npcs", withoutPosition(data.data.npcs, r.item.position))} />)}
              </ul>
            </div>
          ))}
          {sorted.length > limit && <button className="btn sm ghost" style={{ justifySelf: "start" }} onClick={() => setLimit(limit + PAGE)}>Mostrar mais {Math.min(PAGE, sorted.length - limit)} de {sorted.length - limit}</button>}
        </>
      )}
      {picking && (
        <WikiNotePicker title="Acompanhar NPC" root={root} exclude={exclude} onClose={() => setPicking(false)}
          onPick={async (path) => setHome("npcs", withTrackedLink(data.data.npcs, -1, vault.index!.linkTarget(path, data.campaign.home!), "neutro"))} />
      )}
      {creating && <NewNpcDialog data={data} onClose={() => setCreating(false)} />}
    </section>
  )
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

function NpcRow({ row, data, onSave, onRemove }: { row: CastRow; data: CampaignData; onSave(item: TrackedLink, extra: string): void; onRemove(): void }) {
  const { item } = row
  const last = row.seen[row.seen.length - 1]
  const known = ATTITUDES.includes(row.attitude as (typeof ATTITUDES)[number])
  return (
    <li className="campaign-roster-row">
      <NoteCrest path={item.dest} name={row.name} size={28} />
      <span className="grow campaign-roster-name">
        {item.dest ? <a className="wikilink cross truncate" href={href(noteRoute(item.dest))}>{row.name}</a> : <span className="wikilink broken truncate" title="A nota não existe">{row.name}</span>}
        <span className="tiny faint truncate">
          {[row.place, row.faction].filter(Boolean).join(" · ")}
          {last && <>{row.place || row.faction ? " · " : ""}<a href={href(sessionRoute(last))}>visto em {noteName(last.path)}</a>{row.seen.length > 1 ? ` (${row.seen.length} sessões)` : ""}</>}
        </span>
      </span>
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
      <OverflowMenu label={`Ações de ${row.name}`} items={[
        ...(item.dest ? [{ label: "Abrir na Wiki", icon: <BookOpen size={15} />, onSelect: () => navigate(noteRoute(item.dest!)) }] : []),
        { label: "Tirar da campanha", icon: <Trash size={15} />, danger: true, disabled: data.readOnly, onSelect: onRemove },
      ]} />
    </li>
  )
}

/** Facções da wiki com a reputação do grupo (−3 a +3). */
function FactionSection({ data }: { data: CampaignData }) {
  const vault = useVault()
  const { setHome } = useCampaignEdits(data)
  const [picking, setPicking] = useState(false)
  const items = data.factions
  const exclude = useMemo(() => new Set(items.map((i) => i.dest).filter((d): d is string => Boolean(d))), [items])
  const save = (item: TrackedLink, extra: string) => setHome("faccoes", withTrackedLink(data.data.faccoes, item.position, item.target, extra))
  const root = data.campaign.wiki ? `Wikis/${data.campaign.wiki}/` : "Wikis/"
  return (
    <section className="card stack">
      <div className="row between">
        <h2 className="section-title">Facções</h2>
        {!data.readOnly && data.campaign.home && (
          <button className="btn sm" onClick={() => setPicking(true)}>
            <Plus size={14} /> Facção da wiki
          </button>
        )}
      </div>
      {items.length === 0 && <span className="muted small">Organizações da wiki com a reputação do grupo (−3 a +3).</span>}
      {items.map((item) => {
        const rep = reputationOf(item.extra)
        return (
          <div key={item.position} className="campaign-tracked">
            <NoteCrest path={item.dest} name={noteName(item.target)} size={28} />
            {item.dest ? (
              <a className="wikilink cross grow truncate" href={href(noteRoute(item.dest))}>{noteName(item.target)}</a>
            ) : (
              <span className="wikilink broken grow truncate" title="A nota não existe">{noteName(item.target)}</span>
            )}
            <span className="row" style={{ gap: 2 }}>
              <button className="icon-btn sm" disabled={data.readOnly || rep <= -3} onClick={() => save(item, String(rep - 1))} aria-label={`Diminuir reputação com ${noteName(item.target)}`}>
                <Minus size={14} />
              </button>
              <span className={`chip ${rep > 0 ? "green" : rep < 0 ? "red" : ""} mono`}>{rep > 0 ? `+${rep}` : rep}</span>
              <button className="icon-btn sm" disabled={data.readOnly || rep >= 3} onClick={() => save(item, `+${rep + 1}`.replace("+-", "-"))} aria-label={`Aumentar reputação com ${noteName(item.target)}`}>
                <Plus size={14} />
              </button>
            </span>
            <OverflowMenu label={`Ações de ${noteName(item.target)}`} items={[
              ...(item.dest ? [{ label: "Abrir na Wiki", icon: <BookOpen size={15} />, onSelect: () => navigate(noteRoute(item.dest!)) }] : []),
              { label: "Tirar da campanha", icon: <Trash size={15} />, danger: true, disabled: data.readOnly, onSelect: () => setHome("faccoes", withoutPosition(data.data.faccoes, item.position)) },
            ]} />
          </div>
        )
      })}
      {picking && (
        <WikiNotePicker title="Acompanhar facção" root={root} exclude={exclude} onClose={() => setPicking(false)}
          onPick={async (path) => setHome("faccoes", withTrackedLink(data.data.faccoes, -1, vault.index!.linkTarget(path, data.campaign.home!), "0"))} />
      )}
    </section>
  )
}
