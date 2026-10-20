import { useEffect, useRef } from "react"
import { isoDate, type AgendaEvent, type Occurrence } from "../../core/agenda"

export const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
const HOUR = 44

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const sameDay = (a: Date, b: Date) => isoDate(a) === isoDate(b)
const pad = (n: number) => String(n).padStart(2, "0")
export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export function eventColor(event: AgendaEvent): string {
  return `var(--${event.color ?? (/^sess/i.test(event.category ?? "") ? "red" : "cyan")})`
}

/** Ocorrências que encostam no dia. */
export function onDay(list: Occurrence[], day: Date): Occurrence[] {
  const start = startOfDay(day)
  const end = addDays(start, 1)
  return list.filter((o) => o.start < end && o.end > start)
}

interface ViewProps {
  occurrences: Occurrence[]
  today: Date
  selectedDay: Date
  selectedKey?: string
  onPickDay(day: Date): void
  onPick(occurrence: Occurrence): void
  onCreate(day: Date, time?: string): void
  /** Resumo do tempo livre do dia (ex.: "6 h livres"), quando configurado. */
  freeLabel?(day: Date): string | null
}

export function MonthView({ month, occurrences, today, selectedDay, selectedKey, onPickDay, onPick, onCreate, freeLabel }: ViewProps & { month: Date }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = addDays(first, -first.getDay())
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  return (
    <div className="month" role="grid" aria-label="Mês">
      {WEEKDAYS.map((w) => (
        <div key={w} className="month-head">
          {w}
        </div>
      ))}
      {days.map((day) => {
        const items = onDay(occurrences, day)
        return (
          <div
            key={day.toISOString()}
            role="gridcell"
            tabIndex={0}
            className={`month-cell ${day.getMonth() !== month.getMonth() ? "outside" : ""} ${sameDay(day, today) ? "today" : ""} ${sameDay(day, selectedDay) ? "picked" : ""}`}
            onClick={() => onPickDay(day)}
            onDoubleClick={() => onCreate(day)}
            onKeyDown={(event) => event.key === "Enter" && onPickDay(day)}
            data-day={isoDate(day)}
          >
            <span className="day-number">{day.getDate()}</span>
            {freeLabel?.(day) && <span className="cell-free tiny" title="Tempo livre no dia">{freeLabel(day)}</span>}
            <span className="cell-events">
              {items.slice(0, 3).map((o) => (
                <button
                  key={o.key}
                  className={`event-pill ${o.key === selectedKey ? "active" : ""} ${o.event.completed ? "done" : ""}`}
                  style={{ ["--ev" as string]: eventColor(o.event) }}
                  onClick={(event) => {
                    event.stopPropagation()
                    onPick(o)
                  }}
                  title={o.event.title}
                >
                  {!o.event.allDay && sameDay(o.start, day) && <b>{hhmm(o.start)}</b>} {o.event.title}
                </button>
              ))}
              {items.length > 3 && <span className="tiny faint">+{items.length - 3}</span>}
            </span>
            <span className="cell-dots">
              {items.slice(0, 4).map((o) => (
                <span key={o.key} className="dot" style={{ background: eventColor(o.event) }} />
              ))}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Eventos com horário lado a lado quando se sobrepõem. */
function layoutDay(list: Occurrence[], day: Date): { occurrence: Occurrence; top: number; height: number; column: number; columns: number }[] {
  const dayStart = startOfDay(day).getTime()
  const items = list
    .map((occurrence) => {
      const from = Math.max(occurrence.start.getTime(), dayStart)
      const to = Math.min(occurrence.end.getTime(), dayStart + 86_400_000)
      return { occurrence, from, to, column: 0, columns: 1 }
    })
    .sort((a, b) => a.from - b.from || b.to - a.to)
  let cluster: typeof items = []
  let clusterEnd = 0
  const close = () => {
    const columns = Math.max(1, ...cluster.map((i) => i.column + 1))
    for (const item of cluster) item.columns = columns
    cluster = []
  }
  for (const item of items) {
    if (cluster.length && item.from >= clusterEnd) close()
    const used = new Set(cluster.filter((i) => i.to > item.from).map((i) => i.column))
    while (used.has(item.column)) item.column++
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.to)
  }
  close()
  return items.map(({ occurrence, from, to, column, columns }) => ({
    occurrence,
    top: ((from - dayStart) / 3_600_000) * HOUR,
    height: Math.max(22, ((to - from) / 3_600_000) * HOUR - 2),
    column,
    columns,
  }))
}

/** Semana ou dia: grade de horas, com os eventos de dia inteiro em cima. */
export function TimeGrid({ days, occurrences, today, selectedKey, onPick, onCreate, onPickDay, freeLabel }: ViewProps & { days: Date[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Começa às 7h (ou na hora atual, se for depois).
    if (scroller.current) scroller.current.scrollTop = Math.max(0, Math.min(new Date().getHours() - 1, 7)) * HOUR
  }, [])
  const now = new Date()
  return (
    <div className="timegrid" style={{ ["--days" as string]: days.length }}>
      <div className="timegrid-head">
        <span />
        {days.map((day) => {
          const allDay = onDay(occurrences, day).filter((o) => o.event.allDay)
          return (
            <div key={day.toISOString()} className={`timegrid-day-head ${sameDay(day, today) ? "today" : ""}`}>
              <button className="ghost-link" onClick={() => onPickDay(day)}>
                {WEEKDAYS[day.getDay()]} <strong>{day.getDate()}</strong>
              </button>
              {freeLabel?.(day) && <span className="cell-free tiny" title="Tempo livre no dia">{freeLabel(day)}</span>}
              {allDay.map((o) => (
                <button key={o.key} className={`event-pill ${o.key === selectedKey ? "active" : ""}`} style={{ ["--ev" as string]: eventColor(o.event) }} onClick={() => onPick(o)}>
                  {o.event.title}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <div className="timegrid-body" ref={scroller}>
        <div className="timegrid-hours">
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h}>{pad(h)}h</span>
          ))}
        </div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={`timegrid-col ${sameDay(day, today) ? "today" : ""}`}
            onDoubleClick={(event) => {
              const y = event.clientY - event.currentTarget.getBoundingClientRect().top
              const hour = Math.max(0, Math.min(23, Math.floor(y / HOUR)))
              onCreate(day, `${pad(hour)}:00`)
            }}
          >
            {layoutDay(
              onDay(occurrences, day).filter((o) => !o.event.allDay),
              day,
            ).map(({ occurrence, top, height, column, columns }) => (
              <button
                key={occurrence.key}
                className={`week-event ${occurrence.key === selectedKey ? "active" : ""}`}
                style={{ top, height, left: `calc(${(column / columns) * 100}% + 2px)`, width: `calc(${100 / columns}% - 4px)`, ["--ev" as string]: eventColor(occurrence.event) }}
                onClick={() => onPick(occurrence)}
              >
                <b>{hhmm(occurrence.start)}</b> {occurrence.event.title}
                {occurrence.event.location && height > 40 && <span className="tiny faint block">{occurrence.event.location}</span>}
              </button>
            ))}
            {sameDay(day, now) && <span className="now-line" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListView({ from, occurrences, selectedKey, onPick }: { from: Date; occurrences: Occurrence[]; selectedKey?: string; onPick(o: Occurrence): void }) {
  const groups = new Map<string, Occurrence[]>()
  for (const o of occurrences) {
    const day = isoDate(o.start < from ? from : o.start)
    groups.set(day, [...(groups.get(day) ?? []), o])
  }
  if (!groups.size) return <p className="muted small">Nada marcado nos próximos 60 dias.</p>
  return (
    <div className="stack-lg">
      {[...groups].map(([day, list]) => (
        <div key={day} className="stack">
          <span className="eyebrow">{new Date(`${day}T12:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</span>
          {list.map((o) => (
            <button key={o.key} className={`list-item ${o.key === selectedKey ? "active" : ""}`} onClick={() => onPick(o)}>
              <span className="dot" style={{ background: eventColor(o.event) }} />
              <span className="mono small" style={{ width: 52 }}>
                {o.event.allDay ? "dia" : hhmm(o.start)}
              </span>
              <span className="grow truncate">{o.event.title}</span>
              {o.event.category && <span className="chip">{o.event.category}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
