import { useState } from "react"
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Clock, Download, List, MapPin, Plus, Repeat, ScrollText, Upload, Columns3 } from "lucide-react"
import { EVENTS, TODAY } from "../data/agenda"
import type { AgendaEvent } from "../data/types"
import { href } from "../lib/router"
import { formatTime } from "../lib/navigation"
import { Modal, Segmented, Switch, useProtoAction } from "../components/ui"
import "./agenda.css"

type View = "mes" | "semana" | "lista"
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const eventsOn = (day: Date) => EVENTS.filter((e) => sameDay(new Date(e.start), day)).sort((a, b) => a.start.localeCompare(b.start))

const TASKS = [
  { text: "Mandar o lembrete no grupo", due: "2026-10-16", from: "Checklist de sábado" },
  { text: "Comprar pilhas para o leitor de dados", due: "2026-10-17", from: "Checklist de sábado" },
]

export function AgendaScreen() {
  const proto = useProtoAction()
  const [view, setView] = useState<View>("mes")
  const [selectedDay, setSelectedDay] = useState(TODAY)
  const [selected, setSelected] = useState<AgendaEvent | null>(EVENTS[0])
  const [creating, setCreating] = useState(false)

  const first = new Date(2026, 9, 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const days = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  const weekStart = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - TODAY.getDay())
  const week = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i))
  const listDays = days.filter((d) => d.getMonth() === 9 && d >= new Date(2026, 9, 1) && eventsOn(d).length > 0)

  return (
    <div className="page agenda">
      <div className="page-head">
        <div>
          <span className="eyebrow">Agenda real · lembretes no Android e no desktop</span>
          <h1 className="page-title">Outubro de 2026</h1>
        </div>
        <div className="row-wrap">
          <div className="row" style={{ gap: 2 }}>
            <button className="icon-btn" aria-label="Mês anterior" onClick={proto("ir para setembro")}>
              <ChevronLeft size={18} />
            </button>
            <button className="btn sm" onClick={() => setSelectedDay(TODAY)}>Hoje</button>
            <button className="icon-btn" aria-label="Próximo mês" onClick={proto("ir para novembro")}>
              <ChevronRight size={18} />
            </button>
          </div>
          <Segmented<View>
            label="Visão"
            value={view}
            onChange={setView}
            options={[
              { value: "mes", label: "Mês", icon: <CalendarDays size={14} /> },
              { value: "semana", label: "Semana", icon: <Columns3 size={14} /> },
              { value: "lista", label: "Lista", icon: <List size={14} /> },
            ]}
          />
          <button className="btn primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Evento
          </button>
        </div>
      </div>

      <div className="agenda-layout">
        <div className="card flat agenda-main">
          {view === "mes" && (
            <div className="month">
              {WEEKDAYS.map((w) => (
                <div key={w} className="month-head">{w}</div>
              ))}
              {days.map((day) => {
                const items = eventsOn(day)
                const outside = day.getMonth() !== 9
                return (
                  <button
                    key={day.toISOString()}
                    className={`month-cell ${outside ? "outside" : ""} ${sameDay(day, TODAY) ? "today" : ""} ${sameDay(day, selectedDay) ? "picked" : ""}`}
                    onClick={() => {
                      setSelectedDay(day)
                      if (items[0]) setSelected(items[0])
                    }}
                  >
                    <span className="day-number">{day.getDate()}</span>
                    <span className="cell-events">
                      {items.slice(0, 3).map((e) => (
                        <span key={e.id} className="event-pill" style={{ ["--ev" as string]: `var(--${e.color})` }}>
                          {!e.allDay && <b>{formatTime(e.start)}</b>} {e.title}
                        </span>
                      ))}
                    </span>
                    <span className="cell-dots">
                      {items.map((e) => (
                        <span key={e.id} className="dot" style={{ background: `var(--${e.color})` }} />
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {view === "semana" && (
            <div className="week">
              <div className="week-hours">
                {Array.from({ length: 16 }, (_, i) => (
                  <span key={i}>{String(i + 8).padStart(2, "0")}h</span>
                ))}
              </div>
              {week.map((day) => (
                <div key={day.toISOString()} className={`week-day ${sameDay(day, TODAY) ? "today" : ""}`}>
                  <div className="week-head">
                    {WEEKDAYS[day.getDay()]} <strong>{day.getDate()}</strong>
                  </div>
                  <div className="week-body">
                    {eventsOn(day).map((e) => {
                      const s = new Date(e.start)
                      const end = e.end ? new Date(e.end) : new Date(s.getTime() + 3600_000)
                      const top = e.allDay ? 0 : Math.max(0, (s.getHours() + s.getMinutes() / 60 - 8) * 40)
                      const height = e.allDay ? 24 : Math.max(26, ((end.getTime() - s.getTime()) / 3600_000) * 40)
                      return (
                        <button key={e.id} className="week-event" style={{ top, height, ["--ev" as string]: `var(--${e.color})` }} onClick={() => setSelected(e)}>
                          <b>{e.allDay ? "Dia todo" : formatTime(e.start)}</b> {e.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "lista" && (
            <div className="stack-lg">
              {listDays.map((day) => (
                <div key={day.toISOString()} className="stack">
                  <span className="eyebrow">{day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
                  {eventsOn(day).map((e) => (
                    <button key={e.id} className="list-item" onClick={() => setSelected(e)}>
                      <span className="dot" style={{ background: `var(--${e.color})` }} />
                      <span className="mono small" style={{ width: 52 }}>{e.allDay ? "dia" : formatTime(e.start)}</span>
                      <span className="grow truncate">{e.title}</span>
                      <span className="chip">{e.category}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="stack-lg agenda-side">
          <section className="card">
            <span className="eyebrow">{selectedDay.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
            <div className="list" style={{ marginTop: 8 }}>
              {eventsOn(selectedDay).length === 0 && <span className="muted small">Nada marcado.</span>}
              {eventsOn(selectedDay).map((e) => (
                <button key={e.id} className={`list-item ${selected?.id === e.id ? "active" : ""}`} onClick={() => setSelected(e)}>
                  <span className="dot" style={{ background: `var(--${e.color})` }} />
                  <span className="grow truncate">{e.title}</span>
                  <span className="meta">{e.allDay ? "dia todo" : formatTime(e.start)}</span>
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section className="card event-detail" style={{ ["--ev" as string]: `var(--${selected.color})` }}>
              <span className="chip" style={{ color: "var(--ev)" }}>{selected.category}</span>
              <h2 style={{ fontSize: 18 }}>{selected.title}</h2>
              <div className="stack small">
                <span className="row muted">
                  <Clock size={15} />
                  {new Date(selected.start).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                  {!selected.allDay && ` · ${formatTime(selected.start)}${selected.end ? `–${formatTime(selected.end)}` : ""}`}
                </span>
                {selected.location && (
                  <span className="row muted">
                    <MapPin size={15} /> {selected.location}
                  </span>
                )}
                {selected.recurrence && (
                  <span className="row muted">
                    <Repeat size={15} /> {selected.recurrence}
                  </span>
                )}
                <span className="row muted">
                  <Bell size={15} /> Lembrete: {selected.reminder ?? "nenhum"}
                </span>
              </div>
              {selected.campaignId && (
                <div className="row-wrap">
                  <a className="btn sm primary" href={href(`/campanhas/${selected.campaignId}${selected.sessionId ? `/sessao/${selected.sessionId}` : ""}`)}>
                    <ScrollText size={14} /> Abrir sessão
                  </a>
                  <span className="tiny faint">Evento e sessão são o mesmo registro.</span>
                </div>
              )}
              <span className="tiny faint mono">Agenda/{selected.title}.md</span>
            </section>
          )}

          <section className="card">
            <span className="section-title">Tarefas com prazo</span>
            <div className="list" style={{ marginTop: 8 }}>
              {TASKS.map((t) => (
                <label key={t.text} className="check">
                  <input type="checkbox" />
                  <span className="grow small">{t.text}</span>
                  <span className="meta tiny faint">{new Date(t.due + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                </label>
              ))}
            </div>
            <span className="tiny faint">Vêm das notas (checklists com 📅).</span>
          </section>

          <div className="row-wrap">
            <button className="btn sm" onClick={proto("importar .ics")}>
              <Upload size={14} /> Importar .ics
            </button>
            <button className="btn sm" onClick={proto("exportar .ics")}>
              <Download size={14} /> Exportar .ics
            </button>
          </div>
        </aside>
      </div>

      {creating && (
        <Modal
          title="Novo evento"
          onClose={() => setCreating(false)}
          footer={
            <>
              <button className="btn" onClick={() => setCreating(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => setCreating(false)}>Salvar evento</button>
            </>
          }
        >
          <label className="field">
            <span>Título</span>
            <input className="input" defaultValue="Sessão 13 — As Cinzas de Valdris" />
          </label>
          <div className="grid-cards" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field">
              <span>Início</span>
              <input className="input" type="datetime-local" defaultValue="2026-10-24T19:30" />
            </label>
            <label className="field">
              <span>Fim</span>
              <input className="input" type="datetime-local" defaultValue="2026-10-24T23:30" />
            </label>
          </div>
          <div className="grid-cards" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <label className="field">
              <span>Repetir</span>
              <select className="select" defaultValue="semana">
                <option value="nao">Não repete</option>
                <option value="semana">Toda semana</option>
                <option value="quinzena">A cada 2 semanas</option>
                <option value="mes">Todo mês</option>
                <option value="custom">Personalizado (RRULE)…</option>
              </select>
            </label>
            <label className="field">
              <span>Lembrete</span>
              <select className="select" defaultValue="1d">
                <option>Nenhum</option>
                <option>Na hora</option>
                <option>1 hora antes</option>
                <option value="1d">1 dia antes</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Ligar a uma campanha</span>
            <select className="select" defaultValue="cinzas">
              <option value="">Nenhuma</option>
              <option value="cinzas">As Cinzas de Valdris — cria a Sessão 13</option>
            </select>
          </label>
          <div className="row between">
            <span className="small">Contagem regressiva na tela inicial</span>
            <Switch on label="Contagem regressiva" />
          </div>
        </Modal>
      )}
    </div>
  )
}
