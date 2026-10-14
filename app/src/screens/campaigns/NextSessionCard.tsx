import { ArrowRight, CalendarDays, Clock as ClockIcon, Dices, Globe, MonitorPlay, Plus, Users } from "lucide-react"
import type { SessionInfo } from "../../core/campaigns"
import { href } from "../../lib/router"
import { useToast } from "../../components/ui"
import { dayLabel, daysFrom, sessionRoute, worldDateLabel, type CampaignData } from "./campaign-state"

/** Cartão da próxima sessão no painel da campanha. */
export function NextSessionCard({ data, session, onNew, onScreen }: { data: CampaignData; session?: SessionInfo; onNew(): void; onScreen(): void }) {
  const toast = useToast()
  if (!session) {
    return (
      <section className="card campaign-next">
        <span className="eyebrow">Próxima sessão</span>
        <p className="muted">Nenhuma sessão planejada.</p>
        <div className="row-wrap">
          <button className="btn primary" onClick={() => (data.readOnly ? toast("Libere a gravação em Configurações para criar sessões.") : onNew())}>
            <Plus size={16} /> Nova sessão
          </button>
        </div>
      </section>
    )
  }
  const present = data.players.filter((p) => session.present.includes(p.path)).length
  const prepDone = session.prep.filter((p) => p.done).length
  const when = daysFrom(session.date)
  return (
    <section className="card campaign-next">
      <div className="row between">
        <span className="eyebrow" style={{ color: "var(--red)" }}>Próxima sessão</span>
        {when && (
          <span className="chip red">
            <ClockIcon size={13} /> {when}
          </span>
        )}
      </div>
      <h2 className="campaign-next-title">{session.title}</h2>
      <div className="row-wrap small muted">
        <span className="row">
          <CalendarDays size={14} /> {dayLabel(session.date, session.time)}
        </span>
        {session.worldDate && (
          <span className="row" style={{ color: "var(--gold)" }}>
            <Globe size={14} /> {worldDateLabel(data.calendar, session.worldDate)}
          </span>
        )}
      </div>
      <div className="row-wrap">
        {data.players.length > 0 && (
          <span className="chip">
            <Users size={13} /> {present}/{data.players.length} presentes marcados
          </span>
        )}
        {session.prep.length > 0 && <span className={`chip ${prepDone === session.prep.length ? "green" : "gold"}`}>Preparação {prepDone}/{session.prep.length}</span>}
      </div>
      <div className="row-wrap">
        <a className="btn primary" href={href(sessionRoute(session))}>
          Preparar <ArrowRight size={15} />
        </a>
        <button className="btn" onClick={onScreen}>
          <MonitorPlay size={15} /> Tela do Mestre
        </button>
        <a className="btn" href={href(data.campaign.mesa ? `/vtt/mesa/${encodeURIComponent(data.campaign.mesa)}` : "/vtt/criar")}>
          <Dices size={15} /> {data.campaign.mesa ? "Abrir mesa" : "Escolher mesa"}
        </a>
      </div>
    </section>
  )
}
