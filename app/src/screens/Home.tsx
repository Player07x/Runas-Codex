import { useState } from "react"
import { ArrowRight, BookOpen, CalendarDays, Clock, Dices, Feather, Library, NotebookPen, ScrollText, Send, Users } from "lucide-react"
import { href, navigate } from "../lib/router"
import { ALL_NOTES, brokenLinks } from "../lib/links"
import { formatDate, formatTime, relativeDays, routeOfNote } from "../lib/navigation"
import { CAMPAIGN_TODAY, ORDEM_X_CAOS, formatWorldDate, moonPhase, dayNumber, weekday } from "../lib/fictional-calendar"
import { EVENTS, TODAY } from "../data/agenda"
import { CAMPAIGNS } from "../data/campaigns"
import { NOTES } from "../data/notes"
import { ARTICLES } from "../data/wiki"
import { BOOKS } from "../data/books"
import { MESAS } from "../data/mesas"
import { useToast } from "../components/ui"
import { MoonIcon } from "../components/MoonIcon"
import "./home.css"

export function Home() {
  const toast = useToast()
  const [capture, setCapture] = useState("")
  const campaign = CAMPAIGNS[0]
  const next = campaign.sessions.find((s) => s.status === "planejada")!
  const confirmed = Object.values(next.attendance).filter(Boolean).length
  const upcoming = EVENTS.filter((e) => new Date(e.start) >= new Date("2026-10-13T00:00:00")).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 4)
  const recent = [...ALL_NOTES].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 6)
  const toWrite = brokenLinks("wiki")
  const day = dayNumber(ORDEM_X_CAOS, CAMPAIGN_TODAY)

  const spaces = [
    { to: "/notas", icon: <NotebookPen />, label: "Notas", info: `${NOTES.length} notas`, color: "var(--gold)" },
    { to: "/agenda", icon: <CalendarDays />, label: "Agenda", info: `${upcoming.length} próximos`, color: "var(--cyan)" },
    { to: "/wiki", icon: <Library />, label: "Wiki", info: `${ARTICLES.length} artigos`, color: "var(--violet)" },
    { to: "/campanhas", icon: <ScrollText />, label: "Campanhas", info: `${CAMPAIGNS.filter((c) => c.status === "ativa").length} ativa`, color: "var(--red)" },
    { to: "/livros", icon: <BookOpen />, label: "Livros", info: `${BOOKS.length} livros`, color: "var(--green)" },
    { to: "/vtt", icon: <Dices />, label: "VTT", info: `${MESAS.length} mesas`, color: "var(--red)" },
  ]

  return (
    <div className="page home">
      <div className="page-head">
        <div>
          <span className="eyebrow">{TODAY.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
          <h1 className="page-title">Bom dia, João</h1>
          <span className="muted small row">
            <MoonIcon fraction={moonPhase(ORDEM_X_CAOS.moons[0], day).fraction} color="var(--cyan)" size={14} />
            No mundo: {weekday(ORDEM_X_CAOS, CAMPAIGN_TODAY)}, {formatWorldDate(ORDEM_X_CAOS, CAMPAIGN_TODAY, true)}
          </span>
        </div>
      </div>

      <form
        className="capture"
        onSubmit={(event) => {
          event.preventDefault()
          if (!capture.trim()) return
          toast(`Nota salva em Notas/Caixa de entrada.md`)
          setCapture("")
        }}
      >
        <Feather size={18} color="var(--gold)" />
        <input className="grow" value={capture} onChange={(event) => setCapture(event.target.value)} placeholder="Anotar algo rápido… (vai para Notas)" aria-label="Captura rápida" />
        <button className="btn primary sm" type="submit">
          <Send size={14} /> Salvar
        </button>
      </form>

      <div className="home-grid">
        <section className="card next-session">
          <div className="card-head">
            <span className="eyebrow" style={{ color: "var(--red)" }}>Próxima sessão</span>
            <span className="chip red">
              <Clock size={13} /> {relativeDays(next.date, TODAY)}
            </span>
          </div>
          <h2 className="display" style={{ fontSize: 22 }}>
            Sessão {next.number} — {next.title}
          </h2>
          <p className="muted">
            {campaign.title} · {formatDate(next.date, { weekday: "long", day: "2-digit", month: "long" })} às {formatTime(next.date)}
          </p>
          <div className="countdown">
            {[
              ["4", "dias"],
              ["9", "horas"],
              ["30", "min"],
            ].map(([value, unit]) => (
              <div key={unit}>
                <strong>{value}</strong>
                <span>{unit}</span>
              </div>
            ))}
          </div>
          <div className="row-wrap">
            <span className="chip">
              <Users size={13} /> {confirmed}/{campaign.players.length} confirmados
            </span>
            <span className="chip gold">Preparação 3/7</span>
          </div>
          <div className="row-wrap">
            <a className="btn primary" href={href(`/campanhas/${campaign.id}/sessao/${next.id}`)}>
              Preparar sessão <ArrowRight size={15} />
            </a>
            <a className="btn" href={href("/vtt/mesa/cinzas")}>
              <Dices size={15} /> Abrir mesa
            </a>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <span className="section-title">Agenda</span>
            <a className="btn ghost sm" href={href("/agenda")}>
              Ver tudo
            </a>
          </div>
          <div className="list">
            {upcoming.map((event) => (
              <a key={event.id} className="list-item" href={href("/agenda")}>
                <span className="dot" style={{ background: `var(--${event.color})` }} />
                <span className="grow truncate">{event.title}</span>
                <span className="meta">
                  {relativeDays(event.start, TODAY)}
                  {!event.allDay && ` · ${formatTime(event.start)}`}
                </span>
              </a>
            ))}
          </div>
        </section>
      </div>

      <section className="space-tiles">
        {spaces.map((space) => (
          <a key={space.to} className="card link space-tile" href={href(space.to)} style={{ ["--tile" as string]: space.color }}>
            {space.icon}
            <strong>{space.label}</strong>
            <span className="muted small">{space.info}</span>
          </a>
        ))}
      </section>

      <div className="home-grid">
        <section className="card">
          <div className="card-head">
            <span className="section-title">Editadas recentemente</span>
          </div>
          <div className="list">
            {recent.map((note) => (
              <button key={note.id} className="list-item" onClick={() => navigate(routeOfNote(note))}>
                <span className="chip" style={{ minWidth: 74, justifyContent: "center" }}>
                  {note.space === "wiki" ? "Wiki" : note.space === "campanhas" ? "Campanha" : "Notas"}
                </span>
                <span className="grow truncate">{note.title}</span>
                <span className="meta">{relativeDays(note.updated, TODAY)}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-head">
            <span className="section-title">A escrever na wiki</span>
            <span className="chip">{toWrite.length}</span>
          </div>
          <p className="muted small" style={{ marginBottom: 8 }}>
            Links que apontam para artigos que ainda não existem.
          </p>
          <div className="list">
            {toWrite.map((item) => (
              <button key={item.target} className="list-item" onClick={() => toast(`Protótipo: criaria “${item.target}” na wiki`)}>
                <span className="wikilink broken">{item.target}</span>
                <span className="meta">citado em {item.from.map((n) => n.title).join(", ")}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
