import { useVaultCounts } from "../lib/vault-counts"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, Dices, Feather, FileText, Library, Plus, ScrollText, Users } from "lucide-react"
import { href } from "../lib/router"
import { formatDate } from "../lib/navigation"
import { expandEvents, nextSession, type AgendaEvent, type Occurrence } from "../core/agenda"
import { agendaEvents } from "../lib/agenda-data"
import { vaultRoute } from "../lib/vault-notes"
import { useVault } from "../platform/VaultProvider"
import { nextCampaignSession } from "../core/campaigns"
import { sessionRoute } from "./campaigns/campaign-state"
import "./home.css"

const spaces = [
  { title: "Notas", sub: "Capture suas ideias", unit: "notas", icon: Feather, path: "/notas" },
  { title: "Agenda", sub: "Dê tempo às histórias", unit: "eventos", icon: CalendarDays, path: "/agenda" },
  { title: "Wiki", sub: "Construa seu universo", unit: "artigos", icon: Library, path: "/wiki" },
  { title: "Campanhas", sub: "Conecte os capítulos", unit: "campanhas", icon: ScrollText, path: "/campanhas" },
  { title: "Livros", sub: "Escreva a próxima página", unit: "livros", icon: BookOpen, path: "/livros" },
  { title: "VTT", sub: "Reúna seu grupo", unit: "mesas", icon: Dices, path: "/vtt" },
]
const TODAY = new Date()
const weekday = formatDate(TODAY.toISOString(), { weekday: "long" })

export function Home() {
  const vault = useVault()
  return (
    <div className="home">
      <header className="home-heading">
        <div>
          <span className="home-kicker">{vault.info?.name ?? "Seu universo"} / PAINEL DO MESTRE</span>
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
            Explorar a Wiki <ArrowUpRight size={17} />
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
  const vault = useVault()
  const events = useAgendaEvents()
  const next = useMemo<Occurrence | undefined>(() => nextSession(events, new Date()), [events])
  const found = useMemo(
    () => (vault.index ? nextCampaignSession(vault.index, new Date(), next ? { ...(next.event.session ? { session: next.event.session } : {}), from: next.event.path } : undefined) : null),
    [vault.index, vault.version, next],
  )
  const session = found?.session
  const present = found ? found.players.filter((p) => session!.present.includes(p.path)).length : 0
  const when = next?.start ?? (session?.date ? new Date(`${session.date}T${session.time ?? "12:00"}`) : undefined)
  return (
    <section className="home-session">
      <div className="session-copy">
        <span className="home-kicker">
          <span className="status-dot" /> {found ? "Campanha em andamento" : "Nenhuma sessão marcada"}
        </span>
        <p className="session-world">{found?.campaign.name ?? "Crie uma campanha e marque a primeira sessão"}</p>
        <h2>
          Toda história
          <br />
          pede uma próxima
          <br />
          <em>sessão.</em>
        </h2>
        <p className="session-description">{next ? next.event.title : session ? session.title : "Sem sessão na Agenda nem nas campanhas."}</p>
        {when && <Countdown to={when} />}
        <div className="session-meta">
          {when && (
            <span>
              <CalendarDays size={16} />
              {`${when.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}${next?.event.allDay || (!next && !session?.time) ? "" : ` · ${String(when.getHours()).padStart(2, "0")}:${String(when.getMinutes()).padStart(2, "0")}`}`}
            </span>
          )}
          {found && found.players.length > 0 && (
            <span>
              <Users size={16} />
              {present}/{found.players.length} presentes marcados
            </span>
          )}
        </div>
        <div className="session-buttons">
          <a className="btn primary lg" href={href(session ? sessionRoute(session) : "/campanhas")}>
            {session ? "Preparar sessão" : "Ver campanhas"} <ArrowRight size={17} />
          </a>
          <a className="btn lg" href={href(found?.campaign.mesa ? `/vtt/mesa/${encodeURIComponent(found.campaign.mesa)}` : "/vtt")}>
            <Dices size={17} /> {found?.campaign.mesa ? "Abrir mesa" : "Ir para o VTT"}
          </a>
        </div>
      </div>
      <div className="orbital-art" aria-hidden="true">
        <div className="orbit-ring ring-one" />
        <div className="orbit-ring ring-two" />
        <div className="orbit-ring ring-three" />
        <span className="orbit-center">ᚱ</span>
        <span className="orbit-star">✦</span>
        <span className="orbit-caption">{found ? `${found.campaign.name} / SESSÃO ${found.session.number ?? ""}`.toUpperCase() : "RUNAS-CODEX"}</span>
      </div>
    </section>
  )
}

function Spaces() {
  const counts = useVaultCounts()
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
              {counts[s.path === "/vtt" ? "mesas" : s.path.slice(1) as keyof typeof counts]} {counts[s.path === "/vtt" ? "mesas" : s.path.slice(1) as keyof typeof counts] === 1 ? s.unit.slice(0,-1) : s.unit}
            </span>
            <ArrowUpRight size={18} />
          </footer>
        </a>
      ))}
    </section>
  )
}

function Recent() {
  const vault = useVault()
  const recent = useMemo(() => vault.index?.allNotes().sort((a,b) => b.mtime - a.mtime).slice(0,4) ?? [], [vault.index, vault.version])
  return <section><div className="home-section-head"><h2>Retome o fio</h2><span>Últimas edições</span></div>
    {recent.length === 0 && <p className="small muted">Nenhuma nota escrita neste cofre.</p>}
    {recent.map(note => <a className="home-note" key={note.path} href={href(vaultRoute(note.path))}><FileText size={19}/><div><h3>{note.name}</h3><small>{note.path.split("/")[0]} · {new Date(note.mtime).toLocaleDateString("pt-BR",{day:"numeric",month:"short"})}</small></div><ArrowUpRight size={16}/></a>)}
  </section>
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
