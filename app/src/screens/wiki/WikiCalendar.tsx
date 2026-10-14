import { useState } from "react"
import { ArrowLeftRight, ChevronLeft, ChevronRight, FileText, Minus, Plus, Sparkles } from "lucide-react"
import { ARTICLES } from "../../data/wiki"
import { href } from "../../lib/router"
import {
  CAMPAIGN_TODAY, ORDEM_X_CAOS as CAL, addDays, dayNumber, eraOf, formatWorldDate, isFullMoonDay, monthLength, moonPhase, parseWorldDate, seasonOf, weekday, yearsBetween, type WorldDate,
} from "../../lib/fictional-calendar"
import { MoonIcon } from "../../components/MoonIcon"
import { Markdown } from "../../components/Markdown"

const FIXED_EVENTS = [
  { date: "4031-07-08", title: "Sessão 9: chegada a Valdris", color: "var(--red)" },
  { date: "4031-07-11", title: "Sessão 10: Mercado das Brasas", color: "var(--red)" },
  { date: "4031-07-15", title: "Sessão 11: esgotos", color: "var(--red)" },
  { date: "4031-07-16", title: "Sessão 12 (planejada)", color: "var(--red)" },
]
const RECURRING = [{ month: 7, day: 30, title: "Festival das Cinzas", color: "var(--gold)" }, { month: 3, day: 9, title: "Luto de Myrr", color: "var(--violet)" }]

export function WikiCalendar() {
  const [today, setToday] = useState<WorldDate>(CAMPAIGN_TODAY)
  const [view, setView] = useState({ year: CAMPAIGN_TODAY.year, month: CAMPAIGN_TODAY.month })
  const [converter, setConverter] = useState("4031")
  const monthCount = CAL.months.length + 1
  const days = monthLength(CAL, view.month)
  const firstWeekday = CAL.weekdays.indexOf(weekday(CAL, { ...view, day: 1 }))
  const monthName = CAL.months[view.month - 1]?.name ?? CAL.intercalary.name
  const calendarNote = ARTICLES.find((a) => a.kind === "calendario")!
  const definition = calendarNote.markdown.match(/```runas-calendario[\s\S]*?```/)?.[0] ?? ""

  const shift = (delta: number) => {
    let month = view.month + delta
    let year = view.year
    if (month < 1) {
      month = monthCount
      year -= 1
    }
    if (month > monthCount) {
      month = 1
      year += 1
    }
    setView({ year, month })
  }

  const eventsFor = (date: WorldDate) => {
    const key = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
    const fixed = FIXED_EVENTS.filter((e) => e.date === key)
    const rec = RECURRING.filter((e) => e.month === date.month && e.day === date.day)
    const birthdays = ARTICLES.filter((a) => a.kind === "personagem" && a.worldDate)
      .map((a) => ({ a, d: parseWorldDate(a.worldDate!) }))
      .filter(({ d }) => d.month === date.month && d.day === date.day)
      .map(({ a, d }) => ({ title: `Aniversário: ${a.title} (${date.year - d.year})`, color: "var(--cyan)" }))
    return [...fixed, ...rec, ...birthdays]
  }

  const notesUsing = ARTICLES.flatMap((a) => a.infobox.filter((f) => f.worldDate).map((f) => ({ a, f, d: parseWorldDate(f.worldDate!) })))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow" style={{ color: "var(--violet)" }}>{CAL.name}</span>
          <h1 className="page-title">
            {monthName} de {view.year.toLocaleString("pt-BR")} {CAL.suffix}
          </h1>
          <span className="muted small">
            {(view.year - CAL.alias.offset).toLocaleString("pt-BR")} {CAL.alias.suffix} · {CAL.months[view.month - 1]?.season ?? "Intercalares"} · {eraOf(CAL, view.year)}
          </span>
        </div>
        <div className="row">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </button>
          <button className="btn sm" onClick={() => setView({ year: today.year, month: today.month })}>Hoje no mundo</button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="Próximo mês">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="agenda-layout">
        <div className="card flat agenda-main">
          <div className="fmonth" style={{ gridTemplateColumns: `repeat(${CAL.weekdays.length}, minmax(0, 1fr))` }}>
            {CAL.weekdays.map((w) => (
              <div key={w} className="month-head">{w}</div>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`v${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = { ...view, day: i + 1 }
              const n = dayNumber(CAL, date)
              const isToday = date.year === today.year && date.month === today.month && date.day === today.day
              const items = eventsFor(date)
              return (
                <div key={i} className={`month-cell fcell ${isToday ? "today" : ""}`}>
                  <div className="row between">
                    <span className="day-number">{i + 1}</span>
                    <span className="row cell-moons" style={{ gap: 2 }}>
                      {CAL.moons.map((moon) => (
                        <MoonIcon key={moon.name} fraction={moonPhase(moon, n).fraction} color={moon.color} size={13} />
                      ))}
                    </span>
                  </div>
                  <span className="cell-events">
                    {CAL.moons.filter((moon) => isFullMoonDay(moon, n)).map((moon) => (
                      <span key={moon.name} className="event-pill" style={{ ["--ev" as string]: moon.color }}>{moon.name} cheia</span>
                    ))}
                    {items.map((e) => (
                      <span key={e.title} className="event-pill" style={{ ["--ev" as string]: e.color }}>{e.title}</span>
                    ))}
                  </span>
                  <span className="cell-dots">
                    {items.map((e) => (
                      <span key={e.title} className="dot" style={{ background: e.color }} />
                    ))}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <aside className="stack-lg agenda-side">
          <section className="card stack">
            <span className="eyebrow">Hoje no mundo da campanha</span>
            <strong className="display" style={{ fontSize: 17 }}>{formatWorldDate(CAL, today, true)}</strong>
            <span className="muted small">
              {weekday(CAL, today)} · {seasonOf(CAL, today)} · {eraOf(CAL, today.year)}
            </span>
            <div className="row-wrap small">
              {CAL.moons.map((moon) => {
                const m = moonPhase(moon, dayNumber(CAL, today))
                return (
                  <span key={moon.name} className="chip">
                    <MoonIcon fraction={m.fraction} color={moon.color} size={13} /> {moon.name} {m.phase}
                  </span>
                )
              })}
            </div>
            <div className="row-wrap">
              <button className="btn sm" onClick={() => setToday(addDays(CAL, today, -1))}>
                <Minus size={13} /> 1 dia
              </button>
              <button className="btn sm" onClick={() => setToday(addDays(CAL, today, 1))}>
                <Plus size={13} /> 1 dia
              </button>
              <button className="btn sm" onClick={() => setToday(addDays(CAL, today, CAL.weekdays.length))}>
                <Plus size={13} /> 1 semana
              </button>
              <button className="btn sm" onClick={() => setToday(addDays(CAL, today, 365))}>
                <Plus size={13} /> 1 ano
              </button>
            </div>
          </section>

          <section className="card stack">
            <span className="section-title row">
              <Sparkles size={15} color="var(--gold)" /> Calculado sozinho
            </span>
            <span className="tiny faint">Notas que usam este calendário. Avance o dia e veja mudar.</span>
            <div className="list">
              {notesUsing.map(({ a, f, d }) => {
                const years = yearsBetween(d, today)
                return (
                  <a key={a.id + f.label} className="list-item small" href={href(`/wiki/artigo/${a.id}`)}>
                    <span className="grow truncate">
                      <strong>{a.title}</strong> <span className="muted">· {f.label.toLowerCase()}</span>
                    </span>
                    <span className="chip gold">{f.label === "Nascimento" ? `${years} anos` : `há ${years} anos`}</span>
                  </a>
                )
              })}
            </div>
          </section>

          <section className="card stack">
            <span className="section-title row">
              <ArrowLeftRight size={15} /> Converter
            </span>
            <div className="row">
              <input className="input mono" value={converter} onChange={(e) => setConverter(e.target.value.replace(/[^\d-]/g, ""))} aria-label="Ano C.E." />
              <span className="muted">C.E. =</span>
              <strong className="mono">{(Number(converter || 0) - CAL.alias.offset).toLocaleString("pt-BR")} Logi</strong>
            </div>
          </section>

          <section className="card stack">
            <div className="row between">
              <span className="section-title">Definição</span>
              <a className="btn ghost sm" href={href(`/wiki/artigo/${calendarNote.id}`)}>
                <FileText size={14} /> Abrir nota
              </a>
            </div>
            <Markdown source={definition} />
            <span className="tiny faint">O calendário é uma nota comum: o Obsidian mostra este bloco como código.</span>
          </section>
        </aside>
      </div>
    </div>
  )
}
