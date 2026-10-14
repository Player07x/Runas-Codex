import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, Dices, Feather, FileText, Library, Plus, ScrollText, Users } from "lucide-react"
import { href } from "../lib/router"
import { ALL_NOTES } from "../lib/links"
import { formatDate, formatTime, routeOfNote } from "../lib/navigation"
import { CAMPAIGNS } from "../data/campaigns"
import { NOTES } from "../data/notes"
import { ARTICLES } from "../data/wiki"
import { BOOKS } from "../data/books"
import { MESAS } from "../data/mesas"
import { expandEvents, nextSession, type AgendaEvent, type Occurrence } from "../core/agenda"
import { agendaEvents } from "../lib/agenda-data"
import { vaultRoute } from "../lib/vault-notes"
import { useVault } from "../platform/VaultProvider"
import "./home.css"

const campaign = CAMPAIGNS[0]
const session = campaign.sessions.find((s) => s.status === "planejada")!
const recent = [...ALL_NOTES].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4)
const spaces = [
  { title: "Notas", sub: "Capture suas ideias", count: NOTES.length, unit: "notas", icon: Feather, path: "/notas" },
  { title: "Agenda", sub: "Dê tempo às histórias", count: -1, unit: "eventos", icon: CalendarDays, path: "/agenda" },
  { title: "Wiki", sub: "Construa seu universo", count: ARTICLES.length, unit: "artigos", icon: Library, path: "/wiki" },
  { title: "Campanhas", sub: "Conecte os capítulos", count: CAMPAIGNS.length, unit: "campanhas", icon: ScrollText, path: "/campanhas" },
  { title: "Livros", sub: "Escreva a próxima página", count: BOOKS.length, unit: "livros", icon: BookOpen, path: "/livros" },
  { title: "VTT", sub: "Reúna seu grupo", count: MESAS.length, unit: "mesas", icon: Dices, path: "/vtt" },
]
const spaceLabel: Record<string, string> = { wiki: "Wiki", campanhas: "Campanhas" }
const TODAY = new Date()
const weekday = formatDate(TODAY.toISOString(), { weekday: "long" })

export function Home() {
  return (
    <div className="home">
      <header className="home-heading">
        <div>
          <span className="home-kicker">MESA DO JOÃO / PAINEL DO MESTRE</span>
          <h1>Seu próximo capítulo.</h1>
        </div>
        <span className="home-date">
          {weekday.charAt(0).toUpperCase() + weekday.slice(1)}
          <br />
          <strong>{formatDate(TODAY.toISOString(), { day: "numeric", month: "long" })}, {TODAY.getFullYear()}</strong>
        </span>
      </header>
      <NextSession />
      <div className="home-section-head">
        <h2>Explore seu universo</h2>
        <span>06 espaços · infinitas histórias</span>
      </div>
      <Spaces />
      <div className="home-columns">
        <Recent />
        <Horizon />
        <div className="home-quick">
          <span className="home-kicker">CENTELHAS</span>
          <h2>
            Grandes mundos.
            <br />
            <em>Pequenas ideias.</em>
          </h2>
          <p>Guarde aquele personagem, lugar ou reviravolta que acabou de surgir.</p>
          <Capture />
          <a href={href("/wiki")} className="quick-link">
            Explorar Ordem x Caos <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
      <footer className="home-footer">
        RUNAS-CODEX <span>A aventura começa com uma ideia.</span>
      </footer>
    </div>
  )
}

/** Eventos da Agenda do cofre aberto (vazio sem cofre). */
function useAgendaEvents(): AgendaEvent[] {
  const vault = useVault()
  return useMemo(() => (vault.index ? agendaEvents(vault.index) : []), [vault.index, vault.version])
}

/** "Faltam 2 dias e 9 h", atualizado a cada minuto. */
function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  const minutes = Math.max(0, Math.round((to.getTime() - now.getTime()) / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const text = minutes < 60 ? (minutes ? `Começa em ${minutes} min` : "Começando agora") : days ? `Faltam ${days} ${days === 1 ? "dia" : "dias"}${hours ? ` e ${hours} h` : ""}` : `Faltam ${hours} h`
  return <span className="session-countdown">{text}</span>
}

function NextSession() {
  const events = useAgendaEvents()
  const next = useMemo<Occurrence | undefined>(() => nextSession(events, new Date()), [events])
  const confirmed = Object.values(session.attendance).filter(Boolean).length
  return (
    <section className="home-session">
      <div className="session-copy">
        <span className="home-kicker">
          <span className="status-dot" /> Campanha em andamento
        </span>
        <p className="session-world">{campaign.title}</p>
        <h2>
          Toda história
          <br />
          pede uma próxima
          <br />
          <em>sessão.</em>
        </h2>
        <p className="session-description">{next ? next.event.title : `Sessão ${session.number} · ${session.title}`}</p>
        {next && <Countdown to={next.start} />}
        <div className="session-meta">
          <span>
            <CalendarDays size={16} />
            {next
              ? `${next.start.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}${next.event.allDay ? "" : ` · ${String(next.start.getHours()).padStart(2, "0")}:${String(next.start.getMinutes()).padStart(2, "0")}`}`
              : `${formatDate(session.date, { day: "numeric", month: "long" })} · ${formatTime(session.date)}`}
          </span>
          <span>
            <Users size={16} />
            {confirmed}/{campaign.players.length} confirmados
          </span>
        </div>
        <div className="session-buttons">
          <a className="btn primary lg" href={href(`/campanhas/${campaign.id}/sessao/${session.id}`)}>
            Preparar sessão <ArrowRight size={17} />
          </a>
          <a className="btn lg" href={href(`/vtt/mesa/${campaign.mesaId}`)}>
            <Dices size={17} /> Abrir mesa
          </a>
        </div>
      </div>
      <div className="orbital-art" aria-hidden="true">
        <div className="orbit-ring ring-one" />
        <div className="orbit-ring ring-two" />
        <div className="orbit-ring ring-three" />
        <span className="orbit-center">ᚱ</span>
        <span className="orbit-star">✦</span>
        <span className="orbit-caption">VALDRIS / CAPÍTULO XII</span>
      </div>
    </section>
  )
}

function Spaces() {
  const agendaCount = useAgendaEvents().length
  return (
    <section className="home-spaces" aria-label="Seus espaços">
      {spaces.map((s, i) => (
        <a href={href(s.path)} key={s.path}>
          <div className="space-top">
            <s.icon size={23} />
            <span>0{i + 1}</span>
          </div>
          <h3>{s.title}</h3>
          <p>{s.sub}</p>
          <footer>
            <span>
              {s.count < 0 ? agendaCount : s.count} {s.unit}
            </span>
            <ArrowUpRight size={18} />
          </footer>
        </a>
      ))}
    </section>
  )
}

function Recent() {
  return (
    <section>
      <div className="home-section-head">
        <h2>Retome o fio</h2>
        <span>Últimas edições</span>
      </div>
      {recent.map((n) => (
        <a className="home-note" key={n.id} href={href(routeOfNote(n))}>
          <FileText size={19} />
          <div>
            <h3>{n.title}</h3>
            <small>
              {spaceLabel[n.space] ?? "Notas"} · {formatDate(n.updated, { day: "numeric", month: "short" })}
            </small>
          </div>
          <ArrowUpRight size={16} />
        </a>
      ))}
    </section>
  )
}

function Horizon() {
  const events = useAgendaEvents()
  const upcoming = useMemo(() => {
    const now = new Date()
    return expandEvents(events, now, new Date(now.getTime() + 90 * 86_400_000)).slice(0, 3)
  }, [events])
  return (
    <section>
      <div className="home-section-head">
        <h2>No horizonte</h2>
        <a href={href("/agenda")}>
          Agenda <ArrowUpRight size={15} />
        </a>
      </div>
      {upcoming.length === 0 && <p className="muted small">Nada marcado nos próximos 90 dias.</p>}
      {upcoming.map((o) => (
        <a className="home-event" key={o.key} href={href(vaultRoute(o.event.path))}>
          <div className="date-stamp">
            <strong>{o.start.getDate()}</strong>
            <span>{o.start.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
          </div>
          <div>
            <small>{o.event.category ?? "Evento"}</small>
            <h3>{o.event.title}</h3>
            <span>{o.event.allDay ? "Dia inteiro" : `${String(o.start.getHours()).padStart(2, "0")}:${String(o.start.getMinutes()).padStart(2, "0")}`}</span>
          </div>
          <ArrowUpRight size={17} />
        </a>
      ))}
    </section>
  )
}

/** Captura rápida: por enquanto os rascunhos vivem só nesta tela (a gravação no cofre chega na etapa 3a). */
function Capture() {
  const [text, setText] = useState("")
  const [drafts, setDrafts] = useState<string[]>([])
  return (
    <div className="home-capture">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!text.trim()) return
          setDrafts((d) => [text.trim(), ...d])
          setText("")
        }}
      >
        <Feather size={19} />
        <input aria-label="Captura rápida" placeholder="Uma ideia antes que ela escape…" value={text} onChange={(event) => setText(event.target.value)} />
        <button className="btn primary" disabled={!text.trim()}>
          <Plus size={16} /> Capturar
        </button>
      </form>
      <small>Rascunhos temporários · disponíveis enquanto esta tela estiver aberta</small>
      {drafts.length > 0 && (
        <ul aria-live="polite">
          {drafts.map((draft, i) => (
            <li key={i}>
              <Check size={14} />
              {draft}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
