import { useMemo, useState } from "react"
import { BookOpen, Minus, Plus, Trash, UserPlus, Pencil, Unlink } from "lucide-react"
import { OverflowMenu } from "../../components/kit/OverflowMenu"
import { NoteCrest } from "../../components/kit/Emblem"
import { ATTITUDES, withCampaignPlayer, type PlayerCharacter, npcSightings, reputationOf, withoutPosition, withTrackedLink, type TrackedLink } from "../../core/campaigns"
import { noteName } from "../../core/text"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
import { EditPlayerDialog, NewPlayerDialog, WikiNotePicker } from "./campaign-dialogs"
import { useCampaignEdits } from "./campaign-edits"
import { sessionRoute, type CampaignData } from "./campaign-state"
import { attitudeColor } from "./DashboardCards"

export function CastView({ data }: { data: CampaignData }) {
  const [newPlayer, setNewPlayer] = useState(false)
  const [editing, setEditing] = useState<PlayerCharacter>()
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
          <span className="section-title">Personagens dos jogadores</span>
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
                <button className="btn sm ghost" onClick={() => setHome("personagens", withCampaignPlayer(vault.index!, data.campaign, p.path, null))} aria-label={`Desvincular ${p.name} da campanha`}><Unlink size={14} /> Desvincular</button>
              </div>}
            </div>
          ))}
        </div>
      </section>
      <TrackedSection data={data} kind="npcs" />
      <TrackedSection data={data} kind="faccoes" />
      {editing && <EditPlayerDialog campaign={data.campaign} character={editing} onClose={() => setEditing(undefined)} />}
      {newPlayer && <NewPlayerDialog campaign={data.campaign} onClose={() => setNewPlayer(false)} />}
    </div>
  )
}

/** NPCs (`npcs`) e facções (`faccoes`) da wiki, com a atitude ou a reputação entre parênteses. */
function TrackedSection({ data, kind }: { data: CampaignData; kind: "npcs" | "faccoes" }) {
  const vault = useVault()
  const { setHome } = useCampaignEdits(data)
  const [picking, setPicking] = useState(false)
  const items = kind === "npcs" ? data.npcs : data.factions
  const exclude = useMemo(() => new Set(items.map((i) => i.dest).filter((d): d is string => Boolean(d))), [items])
  const save = (item: TrackedLink, extra: string) => setHome(kind, withTrackedLink(data.data[kind], item.position, item.target, extra))
  const title = kind === "npcs" ? "NPCs" : "Facções"
  const root = data.campaign.wiki ? `Wikis/${data.campaign.wiki}/` : "Wikis/"
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">{title}</span>
        {!data.readOnly && data.campaign.home && (
          <button className="btn sm" onClick={() => setPicking(true)}>
            <Plus size={14} /> {kind === "npcs" ? "NPC da wiki" : "Facção da wiki"}
          </button>
        )}
      </div>
      {items.length === 0 && (
        <span className="muted small">
          {kind === "npcs" ? "Os NPCs moram na wiki; aqui fica só a atitude deles com o grupo." : "Organizações da wiki com a reputação do grupo (−3 a +3)."}
        </span>
      )}
      {items.map((item) => {
        const seen = kind === "npcs" ? npcSightings(vault.index!, item.dest, data.sessions) : null
        const rep = reputationOf(item.extra)
        return (
          <div key={item.position} className="campaign-tracked">
            <NoteCrest path={item.dest} name={noteName(item.target)} size={28} />
            {item.dest ? (
              <a className="wikilink cross grow truncate" href={href(noteRoute(item.dest))}>{noteName(item.target)}</a>
            ) : (
              <span className="wikilink broken grow truncate" title="A nota não existe">{noteName(item.target)}</span>
            )}
            {seen && (
              <span className="tiny faint campaign-seen">
                {seen.lastSeen ? <a href={href(sessionRoute(seen.lastSeen))}>visto em {noteName(seen.lastSeen.path)}</a> : "ainda não apareceu"}
                {seen.mentions > 1 && ` · ${seen.mentions} sessões`}
              </span>
            )}
            {kind === "npcs" ? (
              <select className={`select campaign-attitude ${attitudeColor(item.extra)}`} disabled={data.readOnly} value={ATTITUDES.includes(item.extra as (typeof ATTITUDES)[number]) ? item.extra : ""} onChange={(e) => save(item, e.target.value)} aria-label={`Atitude de ${noteName(item.target)}`}>
                <option value="">{item.extra && !ATTITUDES.includes(item.extra as (typeof ATTITUDES)[number]) ? item.extra : "sem atitude"}</option>
                {ATTITUDES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            ) : (
              <span className="row" style={{ gap: 2 }}>
                <button className="icon-btn sm" disabled={data.readOnly || rep <= -3} onClick={() => save(item, String(rep - 1))} aria-label={`Diminuir reputação com ${noteName(item.target)}`}>
                  <Minus size={14} />
                </button>
                <span className={`chip ${rep > 0 ? "green" : rep < 0 ? "red" : ""} mono`}>{rep > 0 ? `+${rep}` : rep}</span>
                <button className="icon-btn sm" disabled={data.readOnly || rep >= 3} onClick={() => save(item, `+${rep + 1}`.replace("+-", "-"))} aria-label={`Aumentar reputação com ${noteName(item.target)}`}>
                  <Plus size={14} />
                </button>
              </span>
            )}
            <OverflowMenu label={`Ações de ${noteName(item.target)}`} items={[
              ...(item.dest ? [{ label: "Abrir na Wiki", icon: <BookOpen size={15} />, onSelect: () => navigate(noteRoute(item.dest!)) }] : []),
              { label: "Tirar da campanha", icon: <Trash size={15} />, danger: true, disabled: data.readOnly, onSelect: () => setHome(kind, withoutPosition(data.data[kind], item.position)) },
            ]} />
          </div>
        )
      })}
      {picking && (
        <WikiNotePicker
          title={kind === "npcs" ? "Acompanhar NPC" : "Acompanhar facção"}
          root={root}
          exclude={exclude}
          onClose={() => setPicking(false)}
          onPick={async (path) => setHome(kind, withTrackedLink(data.data[kind], -1, vault.index!.linkTarget(path, data.campaign.home!), kind === "npcs" ? "neutro" : "0"))}
        />
      )}
    </section>
  )
}
