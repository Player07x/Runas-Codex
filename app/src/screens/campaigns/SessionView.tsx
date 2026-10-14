import { useState } from "react"
import { CalendarDays, ClipboardList, Dices, Globe, MessageSquareHeart, Send } from "lucide-react"
import type { Campaign } from "../../data/types"
import { PREP_STEPS } from "../../data/campaigns"
import { href } from "../../lib/router"
import { formatDate, formatTime } from "../../lib/navigation"
import { ORDEM_X_CAOS, formatWorldDate, parseWorldDate } from "../../lib/fictional-calendar"
import { Progress, Segmented, useToast } from "../../components/ui"

type Phase = "antes" | "durante" | "depois"

export function SessionView({ campaign, sessionId }: { campaign: Campaign; sessionId: string }) {
  const toast = useToast()
  const session = campaign.sessions.find((s) => s.id === sessionId) ?? campaign.sessions[0]
  const [phase, setPhase] = useState<Phase>(session.status === "realizada" ? "depois" : "antes")
  const [steps, setSteps] = useState(PREP_STEPS)
  const [attendance, setAttendance] = useState(session.attendance)
  const doneCount = steps.filter((s) => s.done).length

  return (
    <div className="page session">
      <div className="session-layout">
        <aside className="card flat stack session-list">
          <span className="eyebrow">Sessões</span>
          <div className="list">
            {campaign.sessions.map((s) => (
              <a key={s.id} className={`list-item ${s.id === session.id ? "active" : ""}`} href={href(`/campanhas/${campaign.id}/sessao/${s.id}`)}>
                <span className="mono small faint">{s.number}</span>
                <span className="grow truncate">{s.title}</span>
                <span className={`chip ${s.status === "planejada" ? "red" : ""}`}>{s.status}</span>
              </a>
            ))}
          </div>
        </aside>

        <div className="stack-lg">
          <div className="page-head">
            <div>
              <span className="eyebrow">Sessão {session.number} · {session.status}</span>
              <h1 className="page-title">{session.title}</h1>
              <span className="row-wrap small muted">
                <span className="row">
                  <CalendarDays size={14} /> {formatDate(session.date, { weekday: "long", day: "2-digit", month: "long" })} às {formatTime(session.date)}
                </span>
                {session.worldDate && (
                  <span className="row" style={{ color: "var(--gold)" }}>
                    <Globe size={14} /> {formatWorldDate(ORDEM_X_CAOS, parseWorldDate(session.worldDate))}
                  </span>
                )}
              </span>
            </div>
            <Segmented<Phase>
              label="Momento"
              value={phase}
              onChange={setPhase}
              options={[
                { value: "antes", label: "Antes" },
                { value: "durante", label: "Durante" },
                { value: "depois", label: "Depois" },
              ]}
            />
          </div>

          <section className="card stack">
            <span className="section-title">Presença</span>
            <div className="row-wrap">
              {campaign.players.map((p) => (
                <button key={p.id} className={`chip ${attendance[p.id] ? "green" : "red"}`} onClick={() => setAttendance({ ...attendance, [p.id]: !attendance[p.id] })}>
                  {attendance[p.id] ? "✓" : "✗"} {p.name} ({p.character})
                </button>
              ))}
            </div>
          </section>

          {phase === "antes" && (
            <section className="card stack">
              <div className="row between">
                <span className="section-title row">
                  <ClipboardList size={16} /> Preparação guiada
                </span>
                <span className="chip gold">
                  {doneCount}/{steps.length}
                </span>
              </div>
              <Progress value={doneCount} max={steps.length} color="var(--gold)" />
              <span className="tiny faint">Roteiro offline no estilo “Mestre Metódico” / Lazy DM. Cada passo vira item de checklist da sessão.</span>
              {steps.map((step) => (
                <label key={step.id} className={`prep-step ${step.done ? "done" : ""}`}>
                  <input type="checkbox" checked={step.done} onChange={() => setSteps(steps.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)))} />
                  <span className="grow">
                    <strong className="small">{step.title}</strong>
                    <textarea className="textarea" defaultValue={step.text} rows={2} style={{ minHeight: 0, marginTop: 4 }} />
                  </span>
                </label>
              ))}
            </section>
          )}

          {phase === "durante" && (
            <section className="card stack">
              <span className="section-title">Anotações rápidas da sessão</span>
              <textarea className="textarea" rows={8} defaultValue={"- Ilsa desconfia da carta\n- Torvak quer ir direto ao Conde\n- "} />
              <div className="row-wrap">
                <button className="btn sm" onClick={() => toast("Marcado: segredo revelado nesta sessão")}>Marcar segredo revelado</button>
                <button className="btn sm" onClick={() => toast("Data do mundo avançou 1 dia")}>+1 dia no mundo</button>
                <a className="btn sm" href={href(`/vtt/mesa/${campaign.mesaId}`)}>
                  <Dices size={14} /> Ir para a mesa
                </a>
              </div>
            </section>
          )}

          {phase === "depois" && (
            <>
              <section className="card stack">
                <span className="section-title">Resumo</span>
                <textarea className="textarea" rows={4} defaultValue={session.summary ?? "Anteriormente: o grupo recebeu uma carta selada da Ordem…"} />
                <span className="tiny faint">O “Anteriormente…” da próxima sessão é montado a partir daqui.</span>
              </section>
              <section className="card stack">
                <span className="section-title row">
                  <MessageSquareHeart size={16} /> Avaliação anônima dos jogadores
                </span>
                <div className="row-wrap">
                  <span className="chip green">Nota 9,2</span>
                  <span className="chip">4/4 responderam</span>
                </div>
                <p className="small muted">“A cena do Aldren foi ótima.” · “Combate um pouco longo.”</p>
                <button className="btn sm" onClick={() => toast("Protótipo: formulário enviado para quem está na sala")}>
                  <Send size={14} /> Enviar formulário pela sala
                </button>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
