import { ArrowRight, CalendarDays, Clock as ClockIcon, Dices, Globe, MonitorPlay, Plus, Users } from "lucide-react"
import type { SessionInfo } from "../../core/campaigns"
import { href } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { useToast } from "../../components/ui"
import { Notice } from "../../components/kit/Layout"
import { useVault } from "../../platform/VaultProvider"
import { dayLabel, daysFrom, sessionRoute, worldDateLabel, type CampaignData } from "./campaign-state"

/** Cartão da próxima sessão no painel da campanha. */
export function NextSessionCard({ data, session, onNew, onScreen }: { data: CampaignData; session?: SessionInfo; onNew(): void; onScreen(): void }) {
  const toast = useToast()
  // Só o evento da Agenda, sem nota de sessão ainda (a mesma próxima sessão do Início).
  const eventOnly = !session && data.next?.event ? data.next : null
  if (eventOnly?.event) {
    const when = eventOnly.event.start
    return (
      <section className="card campaign-next">
        <span className="eyebrow" style={{ color: "var(--gold)" }}>Próxima sessão</span>
        <h2 className="campaign-next-title">{eventOnly.title}</h2>
        <span className="row small muted"><CalendarDays size={14} /> {when.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}{eventOnly.allDay ? "" : ` · ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`} · marcada na Agenda, ainda sem nota de sessão</span>
        <div className="row-wrap">
          <button className="btn primary" onClick={() => (data.readOnly ? toast("Libere a gravação em Configurações para criar sessões.") : onNew())}>
            <Plus size={16} /> Criar a nota da sessão
          </button>
          <a className="btn" href={href(vaultRoute(eventOnly.event.event.path))}>Abrir o evento</a>
          <button className="btn" onClick={onScreen}><MonitorPlay size={15} /> Tela do Mestre</button>
        </div>
      </section>
    )
  }
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
        <span className="eyebrow" style={{ color: "var(--gold)" }}>Próxima sessão</span>
        {when && (
          <span className="chip gold">
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

/**
 * CAM-1: sessão ainda “planejada” com a data já passada. Em vez de sumir da próxima sessão sem explicação, a tela
 * pergunta o que aconteceu e oferece o próximo passo.
 */
export function OverdueSessions({ data }: { data: CampaignData }) {
  const vault = useVault()
  const toast = useToast()
  if (!data.overdue.length) return null
  const mark = (s: SessionInfo, status: "realizada" | "cancelada") =>
    void vault.setProperty(s.path, "status", status).then(() => toast(status === "realizada" ? `${s.title}: realizada` : `${s.title}: cancelada`), (e: unknown) => toast(e instanceof Error ? e.message : String(e)))
  return (
    <div className="stack campaign-overdue">
      {data.overdue.map((s) => (
        <Notice
          key={s.path}
          tone="warn"
          title={`${s.title} estava marcada para ${s.date!.split("-").reverse().slice(0, 2).join("/")}`}
          actions={
            <>
              {!data.readOnly && <button className="btn sm" onClick={() => mark(s, "realizada")}>Marcar como realizada</button>}
              {!data.readOnly && <button className="btn sm ghost" onClick={() => mark(s, "cancelada")}>Cancelada</button>}
              <a className="btn sm ghost" href={href(sessionRoute(s))}>Remarcar</a>
            </>
          }
        >
          A data passou e ela continua como planejada. Foi jogada, cancelada ou vai para outro dia?
        </Notice>
      ))}
    </div>
  )
}
