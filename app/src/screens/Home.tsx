import { useState } from "react"
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, Dices, Feather, FileText, Library, Plus, ScrollText, Users } from "lucide-react"
import { href } from "../lib/router"
import { ALL_NOTES } from "../lib/links"
import { formatDate, formatTime, routeOfNote } from "../lib/navigation"
import { CAMPAIGNS } from "../data/campaigns"
import { EVENTS, TODAY } from "../data/agenda"
import { NOTES } from "../data/notes"
import { ARTICLES } from "../data/wiki"
import { BOOKS } from "../data/books"
import { MESAS } from "../data/mesas"
import "./home.css"

const campaign = CAMPAIGNS[0]
const session = campaign.sessions.find((s) => s.status === "planejada")!
const recent = [...ALL_NOTES].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4)
const upcoming = EVENTS.filter((e) => new Date(e.start) >= TODAY).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 3)
const spaces = [
  { title: "Notas", sub: "Capture suas ideias", count: NOTES.length, unit: "notas", icon: Feather, path: "/notas" },
  { title: "Agenda", sub: "Dê tempo às histórias", count: EVENTS.length, unit: "eventos", icon: CalendarDays, path: "/agenda" },
  { title: "Wiki", sub: "Construa seu universo", count: ARTICLES.length, unit: "artigos", icon: Library, path: "/wiki" },
  { title: "Campanhas", sub: "Conecte os capítulos", count: CAMPAIGNS.length, unit: "campanhas", icon: ScrollText, path: "/campanhas" },
  { title: "Livros", sub: "Escreva a próxima página", count: BOOKS.length, unit: "livros", icon: BookOpen, path: "/livros" },
  { title: "VTT", sub: "Reúna seu grupo", count: MESAS.length, unit: "mesas", icon: Dices, path: "/vtt" },
]
const spaceLabel: Record<string, string> = { wiki: "Wiki", campanhas: "Campanhas" }
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

function NextSession() {
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
        <p className="session-description">
          Sessão {session.number} · {session.title}
        </p>
        <div className="session-meta">
          <span>
            <CalendarDays size={16} />
            {formatDate(session.date, { day: "numeric", month: "long" })} · {formatTime(session.date)}
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
              {s.count} {s.unit}
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
  return (
    <section>
      <div className="home-section-head">
        <h2>No horizonte</h2>
        <a href={href("/agenda")}>
          Agenda <ArrowUpRight size={15} />
        </a>
      </div>
      {upcoming.map((e) => (
        <a className="home-event" key={e.id} href={href("/agenda")}>
          <div className="date-stamp">
            <strong>{new Date(e.start).getDate()}</strong>
            <span>{formatDate(e.start, { month: "short" })}</span>
          </div>
          <div>
            <small>{e.category}</small>
            <h3>{e.title}</h3>
            <span>{e.allDay ? "Dia inteiro" : formatTime(e.start)}</span>
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
