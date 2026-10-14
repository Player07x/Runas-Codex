import { useState } from "react"
import { Eye, EyeOff, Minus, Plus, ShieldCheck, Trash, X } from "lucide-react"
import { appendToSection, SECRETS_HEADING, setClocks, setSecretRevealed, type Clock } from "../../core/campaigns"
import { noteName } from "../../core/text"
import { href } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { ClockDial } from "../../components/ui"
import { campaignRoute, dayLabel, sessionRoute, worldDateLabel, type CampaignData } from "./campaign-state"
import { revealSession, useCampaignEdits } from "./campaign-edits"

/** Relógios de progresso e ameaças (bloco runas-relogios na nota da campanha). */
export function ClocksCard({ data }: { data: CampaignData }) {
  const { editHome } = useCampaignEdits(data)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState("")
  const [segments, setSegments] = useState("6")
  const [kind, setKind] = useState<Clock["kind"]>("ameaca")
  if ("error" in data.clocks) {
    return (
      <section className="card stack">
        <span className="section-title">Relógios</span>
        <p className="small" style={{ color: "var(--red)" }}>O bloco runas-relogios tem erro: {data.clocks.error}</p>
      </section>
    )
  }
  const clocks = data.clocks
  const save = (next: Clock[]) => editHome((text) => setClocks(text, next))
  const set = (i: number, filled: number) => save(clocks.map((c, j) => (j === i ? { ...c, filled: Math.max(0, Math.min(c.segments, filled)) } : c)))
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Relógios</span>
        {!data.readOnly && (
          <button className="icon-btn sm" onClick={() => setAdding(!adding)} aria-label="Novo relógio" title="Novo relógio">
            <Plus size={15} />
          </button>
        )}
      </div>
      {clocks.length === 0 && !adding && <span className="muted small">Nenhum relógio. Use para ameaças que avançam e metas do grupo.</span>}
      <div className="campaign-clocks">
        {clocks.map((c, i) => (
          <div key={`${c.name}-${i}`} className="campaign-clock">
            <ClockDial segments={c.segments} filled={c.filled} color={c.kind === "ameaca" ? "var(--red)" : "var(--green)"} />
            <span className="small">{c.name}</span>
            <span className="tiny faint">
              {c.filled}/{c.segments} · {c.kind === "ameaca" ? "ameaça" : "progresso"}
            </span>
            {!data.readOnly && (
              <span className="row" style={{ gap: 2 }}>
                <button className="icon-btn sm" onClick={() => set(i, c.filled - 1)} aria-label={`Voltar ${c.name}`}>
                  <Minus size={14} />
                </button>
                <button className="icon-btn sm" onClick={() => set(i, c.filled + 1)} aria-label={`Avançar ${c.name}`}>
                  <Plus size={14} />
                </button>
                <button className="icon-btn sm" onClick={() => save(clocks.filter((_, j) => j !== i))} aria-label={`Apagar ${c.name}`}>
                  <Trash size={13} />
                </button>
              </span>
            )}
          </div>
        ))}
      </div>
      {adding && (
        <form
          className="campaign-inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            save([...clocks, { name: name.trim(), segments: Number(segments), filled: 0, kind }])
            setName("")
            setAdding(false)
          }}
        >
          <input className="input" autoFocus placeholder="Nome do relógio" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do relógio" />
          <select className="select" value={segments} onChange={(e) => setSegments(e.target.value)} aria-label="Segmentos">
            {[4, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n} partes
              </option>
            ))}
          </select>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value as Clock["kind"])} aria-label="Tipo">
            <option value="ameaca">Ameaça</option>
            <option value="progresso">Progresso</option>
          </select>
          <button className="btn sm primary">Criar</button>
        </form>
      )}
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
      {active.slice(0, 6).map((q) => (
        <a key={q.path} className="row card tight campaign-quest-line" href={href(noteRoute(q.path))}>
          {q.order && <span className="mono small faint">{q.order}</span>}
          <span className="grow truncate">{q.title}</span>
          {q.reward && <span className="chip gold">{q.reward}</span>}
        </a>
      ))}
    </section>
  )
}

/** Segredos e pistas: checklist na nota da campanha; revelar registra a sessão. */
export function SecretsCard({ data }: { data: CampaignData }) {
  const { editHome } = useCampaignEdits(data)
  const [show, setShow] = useState(false)
  const [text, setText] = useState("")
  const session = revealSession(data)
  const sessionTarget = session ? session.path.replace(/\.md$/, "") : undefined
  return (
    <section className="card stack">
      <div className="row between">
        <span className="section-title">Segredos e pistas</span>
        <button className="icon-btn sm" onClick={() => setShow(!show)} aria-label={show ? "Esconder segredos" : "Mostrar segredos"} title="Mostrar/esconder (para jogar com a tela à vista)">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {data.secrets.length === 0 && <span className="muted small">Nenhum segredo anotado.</span>}
      {data.secrets.map((s) => (
        <label key={s.line} className={`campaign-secret ${s.done ? "done" : ""}`}>
          <input
            type="checkbox"
            checked={s.done}
            disabled={data.readOnly}
            onChange={(e) => editHome((t) => setSecretRevealed(t, s, e.target.checked, sessionTarget))}
          />
          <span className="grow" style={{ filter: show ? "none" : "blur(5px)" }}>{s.clean}</span>
          {s.revealedIn && <span className="chip green">{noteName(s.revealedIn)}</span>}
        </label>
      ))}
      {!data.readOnly && (
        <form
          className="campaign-inline-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!text.trim()) return
            editHome((t) => appendToSection(t, SECRETS_HEADING, `- [ ] ${text.trim()}`))
            setText("")
          }}
        >
          <input className="input" placeholder="Nova pista…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Nova pista" />
          <button className="btn sm">Anotar</button>
        </form>
      )}
      <span className="tiny faint">Marcar registra a sessão ({session ? noteName(session.path) : "nenhuma ainda"}).</span>
    </section>
  )
}

export function CastCard({ data }: { data: CampaignData }) {
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
          <span className="campaign-avatar" style={p.color ? { background: p.color } : undefined}>{p.name[0]}</span>
          <span className="grow">
            <strong className="small">{p.name}</strong>
            <span className="tiny faint" style={{ display: "block" }}>{[p.player, p.concept].filter(Boolean).join(" · ")}</span>
          </span>
        </a>
      ))}
      {data.npcs.length > 0 && <span className="eyebrow">NPCs</span>}
      {data.npcs.slice(0, 6).map((n) => (
        <div key={n.position} className="row small">
          {n.dest ? (
            <a className="wikilink cross grow truncate" href={href(noteRoute(n.dest))}>
              {noteName(n.target)}
            </a>
          ) : (
            <span className="wikilink broken grow truncate">{noteName(n.target)}</span>
          )}
          {n.extra && <span className={`chip ${attitudeColor(n.extra)}`}>{n.extra}</span>}
        </div>
      ))}
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
        </form>
      )}
    </div>
  )
}

/** Linha do tempo da campanha: cada sessão com a data real e a data no mundo. */
export function TimelineCard({ data }: { data: CampaignData }) {
  const sessions = data.sessions.filter((s) => s.status !== "cancelada")
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
    </section>
  )
}
