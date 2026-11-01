import { useState } from "react"
import { NoteCrest } from "../../components/kit/Emblem"
import { Eye, EyeOff, ShieldCheck, X } from "lucide-react"
import { ClocksEditor } from "./ClocksEditor"
import { appendToSection, npcAppeared, npcAttitude, SECRETS_HEADING, setSecretRevealed, type QuestInfo, type SecretItem } from "../../core/campaigns"
import { questOfSecret, secretQuest, withQuestLink } from "../../core/campaign-insights"
import { useVault } from "../../platform/VaultProvider"
import { useQuestStatus } from "./quest-actions"
import { noteName } from "../../core/text"
import { href } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { campaignRoute, dayLabel, questRoute, sessionRoute, worldDateLabel, type CampaignData } from "./campaign-state"
import { revealSession, useCampaignEdits } from "./campaign-edits"

const MAX_LINES = 6
const SHOW_SECRETS = "runas-codex:campanha:mostrar-segredos"

/** Relógios de progresso e ameaças (bloco runas-relogios na nota da campanha). */
export function ClocksCard({ data }: { data: CampaignData }) {
  if ("error" in data.clocks) {
    return (
      <section className="card stack">
        <span className="section-title">Relógios</span>
        <p className="small" style={{ color: "var(--red)" }}>O bloco runas-relogios tem erro: {data.clocks.error}</p>
      </section>
    )
  }
  return (
    <section className="card stack">
      <span className="section-title">Relógios</span>
      {data.clocks.length === 0 && <span className="muted small">Nenhum relógio. Use para ameaças que avançam e metas do grupo.</span>}
      <ClocksEditor path={data.campaign.home} clocks={data.clocks} readOnly={data.readOnly || !data.campaign.home} />
    </section>
  )
}

export function QuestsCard({ data }: { data: CampaignData }) {
  const active = data.quests.filter((q) => q.status === "ativa")
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Missões ativas</span>
        <a className="btn ghost sm" href={href(campaignRoute(data.campaign.name, "missoes"))}>
          Quadro de missões
        </a>
      </div>
      {active.length === 0 && <span className="muted small">Nenhuma missão ativa.</span>}
      {active.slice(0, MAX_LINES).map((q) => (
        <a key={q.path} className="row card tight campaign-quest-line" href={href(noteRoute(q.path))}>
          {q.order && <span className="mono small faint">{q.order}</span>}
          <span className="grow truncate">{q.title}</span>
          {q.reward && <span className="chip gold">{q.reward}</span>}
        </a>
      ))}
      {active.length > MAX_LINES && <a className="small" href={href(campaignRoute(data.campaign.name, "missoes"))}>+{active.length - MAX_LINES} {active.length - MAX_LINES === 1 ? "missão ativa" : "missões ativas"}</a>}
    </section>
  )
}

/**
 * Segredos e pistas: checklist na nota da campanha; revelar registra a sessão. Uma pista pode apontar para a missão
 * que destrava (`- [ ] O selo é falso → [[O Selo do Conde]]`): revelá-la sugere ativar a missão.
 */
export function SecretsCard({ data }: { data: CampaignData }) {
  const vault = useVault()
  const { editHome } = useCampaignEdits(data)
  const setStatus = useQuestStatus(data)
  const [show, setShowState] = useState(() => { try { return localStorage.getItem(SHOW_SECRETS) === "1" } catch { return false } })
  const setShow = (value: boolean) => { setShowState(value); try { localStorage.setItem(SHOW_SECRETS, value ? "1" : "0") } catch { /* só não é lembrado */ } }
  const [text, setText] = useState("")
  const [unlocks, setUnlocks] = useState("")
  // Missão que a pista recém-revelada destrava e ainda não está ativa.
  const [suggest, setSuggest] = useState<QuestInfo | null>(null)
  const session = revealSession(data)
  const sessionTarget = session ? session.path.replace(/\.md$/, "") : undefined
  const from = data.campaign.home ?? data.campaign.root
  const open = data.quests.filter((q) => q.status !== "concluida" && q.status !== "falhou")
  const reveal = (secret: SecretItem, revealed: boolean) => {
    const quest = questOfSecret(vault.index!, secret, data.quests, from)
    void editHome((t) => setSecretRevealed(t, secret, revealed, sessionTarget)).then((ok) => {
      setSuggest(ok && revealed && quest && (quest.status === "ideia" || quest.status === "pausada") ? quest : null)
    })
  }
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Segredos e pistas</span>
        <button className="icon-btn sm" onClick={() => setShow(!show)} aria-pressed={show} aria-label="Mostrar segredos" title="Mostrar/esconder (para jogar com a tela à vista)">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {data.secrets.length === 0 && <span className="muted small">Nenhum segredo anotado.</span>}
      {data.secrets.map((s) => {
        const link = secretQuest(s.clean)
        const quest = link ? questOfSecret(vault.index!, s, data.quests, from) : undefined
        return (
          <label key={s.line} className={`campaign-secret ${s.done ? "done" : ""}`}>
            <input type="checkbox" checked={s.done} disabled={data.readOnly} onChange={(e) => reveal(s, e.target.checked)} />
            {/* Escondido, o texto sai também para o leitor de tela; o borrão é só o desenho. */}
            <span className="grow" style={{ filter: show ? "none" : "blur(5px)" }} aria-hidden={!show}>
              {link ? link.text : s.clean}
              {link && show && (quest
                ? <> <a className="chip violet campaign-secret-quest" href={href(questRoute(data.campaign.name, quest.path))}>→ {quest.title}</a></>
                : <> <span className="chip">→ {noteName(link.target)}</span></>)}
            </span>
            {!show && <span className="sr-only">Segredo oculto</span>}
            {s.revealedIn && <span className="chip green">{noteName(s.revealedIn)}</span>}
          </label>
        )
      })}
      <div role="status" className="campaign-advance-slot">
        {suggest && (
          <div className="campaign-advance stack">
            <span className="small">A pista leva a “{suggest.title}”, que está em {suggest.status === "ideia" ? "Ideias" : "Em pausa"}. Ativar a missão?</span>
            <div className="row-wrap">
              <button type="button" className="btn sm primary" onClick={() => void setStatus(suggest, "ativa").then((ok) => ok && setSuggest(null))}>Ativar a missão</button>
              <button type="button" className="btn sm ghost" onClick={() => setSuggest(null)}>Agora não</button>
            </div>
          </div>
        )}
      </div>
      {!data.readOnly && (
        <form
          className="campaign-inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            const quest = open.find((q) => q.path === unlocks)
            const line = quest ? withQuestLink(text, vault.index!.linkTarget(quest.path, from)) : text.trim()
            void editHome((t) => appendToSection(t, SECRETS_HEADING, `- [ ] ${line}`)).then((ok) => {
              if (!ok) return
              setText("")
              setUnlocks("")
            })
          }}
        >
          <input className="input" placeholder="Nova pista…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Nova pista" />
          {open.length > 0 && (
            <select className="select" value={unlocks} onChange={(e) => setUnlocks(e.target.value)} aria-label="Missão que a pista destrava">
              <option value="">Não destrava missão</option>
              {open.map((q) => <option key={q.path} value={q.path}>Destrava: {q.order ? `${q.order} ` : ""}{q.title}</option>)}
            </select>
          )}
          <button className="btn sm">Anotar</button>
        </form>
      )}
      <span className="tiny faint">Marcar registra a sessão ({session ? noteName(session.path) : "nenhuma ainda"}).</span>
    </section>
  )
}

export function CastCard({ data }: { data: CampaignData }) {
  // Primeiro os NPCs que já apareceram na campanha (os mais à mão na mesa).
  const npcs = [...data.npcs].sort((a, b) => Number(npcAppeared(b.extra)) - Number(npcAppeared(a.extra)))
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Elenco</span>
        <a className="btn ghost sm" href={href(campaignRoute(data.campaign.name, "elenco"))}>
          Ver tudo
        </a>
      </div>
      {data.players.map((p) => (
        <a key={p.path} className="row campaign-person" href={href(noteRoute(p.path))}>
          <NoteCrest path={p.path} name={p.name} size={32} />
          <span className="grow">
            <strong className="small">{p.name}</strong>
            <span className="tiny faint" style={{ display: "block" }}>{[p.player, p.concept].filter(Boolean).join(" · ")}</span>
          </span>
        </a>
      ))}
      {data.npcs.length > 0 && <span className="eyebrow">NPCs</span>}
      {npcs.slice(0, MAX_LINES).map((n) => (
        <div key={n.position} className="row small">
          {n.dest ? (
            <a className="wikilink cross grow truncate" href={href(noteRoute(n.dest))}>
              {noteName(n.target)}
            </a>
          ) : (
            <span className="wikilink broken grow truncate">{noteName(n.target)}</span>
          )}
          {npcAttitude(n.extra) && <span className={`chip ${attitudeColor(npcAttitude(n.extra))}`}>{npcAttitude(n.extra)}</span>}
        </div>
      ))}
      {data.npcs.length > MAX_LINES && <a className="small" href={href(campaignRoute(data.campaign.name, "elenco"))}>+{data.npcs.length - MAX_LINES} NPCs no Elenco</a>}
      {data.players.length === 0 && data.npcs.length === 0 && <span className="muted small">Ninguém ainda. Acrescente os personagens dos jogadores e os NPCs da wiki no Elenco.</span>}
    </section>
  )
}

export function attitudeColor(attitude: string): string {
  const a = attitude.toLocaleLowerCase("pt-BR")
  if (a.startsWith("alia") || a.startsWith("amig")) return "green"
  if (a.startsWith("host") || a.startsWith("inim")) return "red"
  if (a.startsWith("desconf")) return "gold"
  return ""
}

/** Limites combinados na sessão zero (Linhas e Véus), nas propriedades `linhas` e `veus`. */
export function SafetyCard({ data }: { data: CampaignData }) {
  const { setHome } = useCampaignEdits(data)
  const lists: { key: "linhas" | "veus"; label: string; hint: string }[] = [
    { key: "linhas", label: "Linhas", hint: "não aparece no jogo" },
    { key: "veus", label: "Véus", hint: "acontece fora de cena" },
  ]
  return (
    <section className="card stack">
      <span className="section-title row">
        <ShieldCheck size={15} /> Limites combinados
      </span>
      {lists.map(({ key, label, hint }) => (
        <SafetyList key={key} label={label} hint={hint} items={listOf(data.data[key])} readOnly={data.readOnly} onChange={(items) => setHome(key, items)} />
      ))}
    </section>
  )
}

const listOf = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : typeof value === "string" && value.trim() ? [value] : [])

function SafetyList({ label, hint, items, readOnly, onChange }: { label: string; hint: string; items: string[]; readOnly: boolean; onChange(items: string[]): void }) {
  const [text, setText] = useState("")
  return (
    <div className="stack" style={{ gap: 4 }}>
      <span className="small">
        <strong>{label}</strong> <span className="faint">— {hint}</span>
      </span>
      <div className="row-wrap">
        {items.length === 0 && <span className="tiny faint">Nada combinado.</span>}
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="chip">
            {item}
            {!readOnly && (
              <button className="chip-x" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Tirar ${item}`}>
                <X size={11} />
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <form
          className="campaign-inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            onChange([...items, text.trim()])
            setText("")
          }}
        >
          <input className="input" placeholder={`Acrescentar em ${label}`} value={text} onChange={(e) => setText(e.target.value)} aria-label={`Acrescentar em ${label}`} />
          <button className="btn sm" disabled={!text.trim()}>Acrescentar</button>
        </form>
      )}
    </div>
  )
}

/** Linha do tempo da campanha: cada sessão com a data real e a data no mundo. */
export function TimelineCard({ data }: { data: CampaignData }) {
  const all = data.sessions.filter((s) => s.status !== "cancelada")
  // As últimas cinco jogadas e as duas próximas; o resto fica na aba Sessões.
  const played = all.filter((s) => s.status !== "planejada")
  const sessions = [...played.slice(-5), ...all.filter((s) => s.status === "planejada").slice(0, 2)]
  const hidden = all.length - sessions.length
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Linha do tempo</span>
        <a className="btn ghost sm" href={href(campaignRoute(data.campaign.name, "sessoes"))}>
          Sessões
        </a>
      </div>
      {sessions.length === 0 && <span className="muted small">Nenhuma sessão ainda.</span>}
      <ol className="campaign-timeline">
        {sessions.map((s) => (
          <li key={s.path} className={s.status}>
            <a href={href(sessionRoute(s))}>
              <strong className="small">{s.title}</strong>
            </a>
            <span className="tiny faint">{dayLabel(s.date, s.time)}</span>
            {s.worldDate && <span className="tiny" style={{ color: "var(--gold)" }}>{worldDateLabel(data.calendar, s.worldDate)}</span>}
          </li>
        ))}
      </ol>
      {hidden > 0 && <a className="small" href={href(campaignRoute(data.campaign.name, "sessoes"))}>Ver todas as {all.length} sessões</a>}
    </section>
  )
}
