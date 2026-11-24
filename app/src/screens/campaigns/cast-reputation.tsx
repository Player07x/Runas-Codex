import { useId, useMemo, useState, type CSSProperties, type InputHTMLAttributes } from "react"
import { Eye, HeartHandshake, Meh, Minus, Plus, Search, Smile, Swords } from "lucide-react"
import { listCampaigns, resolveTarget, reputationOf } from "../../core/campaigns"
import {
  averageReputation, campaignReputation, formatPoints, formatReputation, importablePairs, pipFills, reputationValue, resolveReputation,
  setReputation, validScale, withScale, withValues, SCALE_LIMIT, type RepScale, type ResolvedReputation,
} from "../../core/reputation"
import { noteName } from "../../core/text"
import { NoteCrest } from "../../components/kit/Emblem"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { FormDialog } from "./campaign-dialogs"
import { useUndoable } from "./campaign-edits"
import type { CampaignData } from "./campaign-state"

const fold = (text: string) => text.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "")

/** Número antigo das facções (a reputação do grupo, de −3 a +3), que vale enquanto o jogador não tem o dele. */
export function legacyReputation(data: CampaignData): Map<string, number> {
  return new Map(data.factions.flatMap((f) => {
    const value = f.dest ? reputationOf(f.extra) : 0
    return f.dest && value !== 0 ? [[f.dest, value] as const] : []
  }))
}

/** A reputação da campanha com os caminhos resolvidos (refeita quando o cofre muda). */
export function useReputation(data: CampaignData): ResolvedReputation {
  const vault = useVault()
  return useMemo(() => {
    const home = data.campaign.home
    return resolveReputation(data.reputation, (target) => (home && vault.index ? resolveTarget(vault.index, target, home) : null), legacyReputation(data))
  }, [data, vault.version])
}

/** Quais jogadores entram na reputação mostrada nos cartões (lista vazia: todos). */
export const parseViewers = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((p): p is string => typeof p === "string") : [])

/** Cor de cada ponto: do vermelho (mais negativo) ao dourado no meio e ao verde (mais positivo), como no desenho. */
const pipColor = (side: "neg" | "pos", distance: number, count: number) =>
  `color-mix(in oklab, var(${side === "neg" ? "--red" : "--green"}) ${Math.round(35 + (65 * distance) / Math.max(1, count))}%, var(--gold))`

/**
 * A barra da reputação: os pontos negativos à esquerda e os positivos à direita, com o número no meio. Ponto completo
 * pintado inteiro; a fração pinta parte do próximo (1,4 → um inteiro e 40% do seguinte).
 */
export function RepBar({ value, scale, name, compact = false }: { value: number; scale: RepScale; name: string; compact?: boolean }) {
  const { neg, pos } = pipFills(value, scale)
  const label = `Reputação com ${name}: ${formatReputation(value)}, numa escala de ${formatPoints(scale.min)} a ${formatPoints(scale.max)}`
  const pip = (side: "neg" | "pos", fill: number, i: number, count: number) =>
    <i key={i} style={{ "--fill": `${Math.round(fill * 100)}%`, "--pip": pipColor(side, i + 1, count) } as CSSProperties} />
  return <span className={`cast-rep${compact ? " compact" : ""}`} role="img" aria-label={label} title={label}>
    <span className="cast-rep-side neg">{neg.map((fill, i) => pip("neg", fill, i, neg.length)).reverse()}</span>
    <span className={`cast-rep-value ${value > 0 ? "pos" : value < 0 ? "neg" : ""}`}>{formatReputation(value)}</span>
    <span className="cast-rep-side pos">{pos.map((fill, i) => pip("pos", fill, i, pos.length))}</span>
  </span>
}

const ATTITUDE_ICONS = { alia: HeartHandshake, amig: Smile, neutr: Meh, desconf: Eye, host: Swords, inim: Swords }
const ATTITUDE_TONES = { alia: "green", amig: "cyan", neutr: "muted", desconf: "gold", host: "red", inim: "red" }

/** Ícone da atitude no canto da imagem (ou ao lado do nome, no cartão pequeno). O texto vai no rótulo do cartão. */
export function AttitudeBadge({ attitude }: { attitude: string }) {
  const a = fold(attitude)
  const key = (Object.keys(ATTITUDE_ICONS) as (keyof typeof ATTITUDE_ICONS)[]).find((k) => a.startsWith(k))
  if (!key) return null
  const Icon = ATTITUDE_ICONS[key]
  return <span className={`cast-attitude ${ATTITUDE_TONES[key]}`} title={attitude} aria-hidden="true"><Icon /></span>
}

type Member = { path: string; name: string; kind: "npc" | "faccao" | "pj" }

function members(data: CampaignData): Member[] {
  return [
    ...data.npcs.flatMap((n) => (n.dest ? [{ path: n.dest, name: noteName(n.target), kind: "npc" as const }] : [])),
    ...data.factions.flatMap((f) => (f.dest ? [{ path: f.dest, name: noteName(f.target), kind: "faccao" as const }] : [])),
    ...data.players.map((p) => ({ path: p.path, name: p.name, kind: "pj" as const })),
  ]
}

const KIND_LABEL = { npc: "NPCs", faccao: "Facções", pj: "Jogadores" }

/**
 * “Reputação” (24/11): o mestre escolhe um ou mais jogadores e marca, personagem por personagem, o que eles ganharam
 * ou perderam. Com mais de um, o − e o + mudam cada um deles; o número no meio é a média. Grava ao clicar em Gravar.
 */
export function ReputationDialog({ data, rep, onClose }: { data: CampaignData; rep: ResolvedReputation; onClose(): void }) {
  const vault = useVault()
  const toast = useToast()
  const id = useId()
  const [chosen, setChosen] = useState<string[]>(() => (data.players.length === 1 ? [data.players[0]!.path] : []))
  const [draft, setDraft] = useState<Map<string, number>>(new Map())
  const [query, setQuery] = useState("")
  const scale = rep.scale
  const value = (player: string, target: string) => draft.get(`${player}>${target}`) ?? reputationValue(rep, player, target)
  const q = fold(query.trim())
  const list = members(data).filter((m) => !chosen.includes(m.path) && (!q || fold(m.name).includes(q)))
  const toggle = (path: string) => setChosen((c) => (c.includes(path) ? c.filter((p) => p !== path) : [...c, path]))
  const step = (target: string, delta: number) => setDraft((current) => {
    const next = new Map(current)
    for (const player of chosen) next.set(`${player}>${target}`, Math.max(scale.min, Math.min(scale.max, value(player, target) + delta)))
    return next
  })
  const changed = [...draft].filter(([key, v]) => { const [player, target] = key.split(">") as [string, string]; return reputationValue(rep, player, target) !== v })
  const save = async () => {
    const home = data.campaign.home!
    const index = vault.index!
    const note = index.note(home)
    if (!note) throw new Error("A nota da campanha sumiu.")
    const book = withValues(data.reputation, changed.map(([key, v]) => { const [player, target] = key.split(">") as [string, string]; return { player, target, value: v } }),
      (target) => resolveTarget(index, target, home), (path) => index.linkTarget(path, home), rep.legacy)
    await vault.save(home, setReputation(note.text, book))
    toast(changed.length === 1 ? "Reputação gravada." : `${changed.length} reputações gravadas.`)
  }
  const groups = (["npc", "faccao", "pj"] as const).map((kind) => [kind, list.filter((m) => m.kind === kind)] as const).filter(([, items]) => items.length)
  return <FormDialog title="Reputação" confirmLabel="Gravar" disabled={!changed.length} onConfirm={save} onClose={onClose} wide>
    <div className="stack cast-rep-dialog">
      <fieldset className="cast-rep-players">
        <legend className="campaign-cast-detail-label">Jogadores</legend>
        <div className="row-wrap">
          {data.players.map((p) => <button key={p.path} type="button" className={`chip cast-rep-player${chosen.includes(p.path) ? " on" : ""}`} aria-pressed={chosen.includes(p.path)} onClick={() => toggle(p.path)}>
            <NoteCrest path={p.path} name={p.name} size={20} round={false} />{p.name}
          </button>)}
          {data.players.length > 1 && <button type="button" className="btn sm ghost" onClick={() => setChosen(chosen.length === data.players.length ? [] : data.players.map((p) => p.path))}>
            {chosen.length === data.players.length ? "Nenhum" : "Todos"}
          </button>}
        </div>
      </fieldset>
      {!data.players.length ? <p className="small muted">Vincule personagens de jogador à campanha para marcar a reputação deles.</p>
        : !chosen.length ? <p className="small muted">Escolha um ou mais jogadores para marcar a reputação que eles ganharam ou perderam.</p>
          : <>
            <p className="tiny faint" id={`${id}-dica`}>
              {chosen.length > 1 ? "− e + mudam a reputação de cada jogador escolhido; no meio, a média." : "− e + mudam a reputação; no meio, o valor."} Escala de {formatPoints(scale.min)} a {formatPoints(scale.max)}.
            </p>
            <label className="search">
              <Search size={15} aria-hidden="true" />
              <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar personagem" aria-label="Buscar personagem para marcar a reputação" />
            </label>
            {!groups.length && <p className="small muted">Ninguém com esse nome no elenco.</p>}
            {groups.map(([kind, items]) => <div key={kind} className="stack" style={{ gap: 4 }}>
              <span className="campaign-cast-detail-label">{KIND_LABEL[kind]}</span>
              <ul className="cast-rep-rows" aria-describedby={`${id}-dica`}>
                {items.map((m) => {
                  const values = chosen.map((player) => value(player, m.path))
                  const avg = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
                  return <li key={m.path} className="cast-rep-row">
                    <NoteCrest path={m.path} name={m.name} size={28} round={false} />
                    <span className="cast-rep-row-name">
                      <strong>{m.name}</strong>
                      {chosen.length > 1 && <span className="tiny faint">{chosen.map((player, i) => `${data.players.find((p) => p.path === player)?.name ?? noteName(player)} ${formatPoints(values[i]!)}`).join(" · ")}</span>}
                    </span>
                    <RepBar value={avg} scale={scale} name={m.name} />
                    <span className="row cast-rep-steps">
                      <button type="button" className="icon-btn" disabled={values.every((v) => v <= scale.min)} onClick={() => step(m.path, -1)} aria-label={`Baixar a reputação com ${m.name}`}><Minus size={15} /></button>
                      <button type="button" className="icon-btn" disabled={values.every((v) => v >= scale.max)} onClick={() => step(m.path, 1)} aria-label={`Subir a reputação com ${m.name}`}><Plus size={15} /></button>
                    </span>
                  </li>
                })}
              </ul>
            </div>)}
          </>}
    </div>
  </FormDialog>
}

/** Campo de número inteiro sem as setas: aceita só dígitos (e o sinal, se `signed`). */
export function IntegerInput({ value, onChange, signed = false, ...rest }: { value: string; onChange(value: string): void; signed?: boolean } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return <input {...rest} className={`input ${rest.className ?? ""}`} type="text" inputMode={signed ? "text" : "numeric"} autoComplete="off" value={value}
    onChange={(e) => onChange(e.target.value.replace(/[−–]/g, "-").replace(signed ? /[^\d+-]/g : /\D/g, ""))} />
}

/** “Escala da reputação…”: de quanto a quanto vão os pontos (−6 a +6, −3 a +9…). Os valores marcados mudam na proporção. */
export function ScaleDialog({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const vault = useVault()
  const toast = useToast()
  const id = useId()
  const [min, setMin] = useState(String(data.reputation.scale.min))
  const [max, setMax] = useState(formatPoints(data.reputation.scale.max))
  const scale = validScale(Number(min), Number(max.replace(/^\+/, "")))
  const same = scale && scale.min === data.reputation.scale.min && scale.max === data.reputation.scale.max
  return <FormDialog title="Escala da reputação" confirmLabel="Gravar" disabled={!scale || Boolean(same)} onClose={onClose} onConfirm={async () => {
    const home = data.campaign.home!
    const note = vault.index!.note(home)
    if (!note || !scale) throw new Error("Não foi possível gravar a escala.")
    await vault.save(home, setReputation(note.text, withScale(data.reputation, scale)))
    toast(`Escala de ${formatPoints(scale.min)} a ${formatPoints(scale.max)}.`)
  }}>
    <div className="campaign-form-row">
      <label className="field grow"><span>Menor</span>
        <IntegerInput signed value={min} onChange={setMin} aria-describedby={`${id}-dica`} aria-invalid={!scale || undefined} placeholder="-3" />
      </label>
      <label className="field grow"><span>Maior</span>
        <IntegerInput signed value={max} onChange={setMax} aria-describedby={`${id}-dica`} aria-invalid={!scale || undefined} placeholder="+3" />
      </label>
    </div>
    <p id={`${id}-dica`} className={`tiny ${scale ? "faint" : "clock-segments-error"}`}>
      {scale ? "Cada lado tem um ponto por número. Os valores já marcados mudam na mesma proporção (+2 de +3 vira +4 de +6)."
        : `O menor vai de −${SCALE_LIMIT} a 0 e o maior de +1 a +${SCALE_LIMIT}.`}
    </p>
  </FormDialog>
}

/**
 * “Importar reputação…”: copia, de outra campanha, a reputação dos jogadores com quem também está nesta (o estado de
 * agora, sem vínculo). Escalas diferentes passam pela proporção. Sem ninguém em comum, avisa e não grava.
 */
export function ImportReputationDialog({ data, onClose }: { data: CampaignData; onClose(): void }) {
  const vault = useVault()
  const index = vault.index!
  const undoable = useUndoable()
  const options = useMemo(() => listCampaigns(index).filter((c) => c.name !== data.campaign.name && c.home), [index, vault.version, data.campaign.name])
  const [source, setSource] = useState(options[0]?.name ?? "")
  const players = data.players.map((p) => p.path)
  const here = useMemo(() => new Set(members(data).map((m) => m.path)), [data])
  const pairs = useMemo(() => (source ? importablePairs(campaignReputation(index, source), players, here, data.reputation.scale) : []), [index, vault.version, source, data])
  const from = source ? campaignReputation(index, source) : null
  const differentScale = from && (from.scale.min !== data.reputation.scale.min || from.scale.max !== data.reputation.scale.max)
  const who = new Set(pairs.map((p) => p.player))
  return <FormDialog title="Importar reputação" confirmLabel="Importar" disabled={!pairs.length} onClose={onClose} onConfirm={async () => {
    const home = data.campaign.home!
    await undoable(home, `${pairs.length === 1 ? "1 reputação importada" : `${pairs.length} reputações importadas`} de ${source}.`, async () => {
      const note = index.note(home)
      if (!note) throw new Error("A nota da campanha sumiu.")
      const book = withValues(data.reputation, pairs, (target) => resolveTarget(index, target, home), (path) => index.linkTarget(path, home), legacyReputation(data))
      await vault.save(home, setReputation(note.text, book))
    })
  }}>
    {!options.length ? <p className="small muted">Não há outra campanha no cofre.</p> : <>
      <label className="field"><span>De qual campanha</span>
        <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
          {options.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </label>
      {pairs.length ? <p className="small">
        {pairs.length === 1 ? "1 reputação" : `${pairs.length} reputações`} de {who.size === 1 ? "1 jogador" : `${who.size} jogadores`} com personagens que também estão nesta campanha.
        {differentScale && ` A escala lá é de ${formatPoints(from!.scale.min)} a ${formatPoints(from!.scale.max)}; os valores mudam na proporção para ${formatPoints(data.reputation.scale.min)} a ${formatPoints(data.reputation.scale.max)}.`}
        {" "}O que já estiver marcado aqui para esses pares é trocado; nada fica vinculado.
      </p> : <p className="small campaign-rep-none" role="status">Não há reputação a importar: nenhum jogador de {source} tem reputação com personagens desta campanha.</p>}
    </>}
  </FormDialog>
}

/** Média dos jogadores mostrados, ou `null` (sem jogadores, ou o próprio jogador sozinho). */
export function shownReputation(rep: ResolvedReputation, viewers: string[], target: string | null): number | null {
  return target ? averageReputation(rep, viewers, target) : null
}
