import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { toneStyle, type Tone } from "../../core/tones"
import { isoDate, type AgendaEvent, type Occurrence } from "../../core/agenda"
import { addDays, dayLabel, layoutDay, moveDay, startOfDay } from "../../core/agenda-grid"
import { ListRow } from "../../components/kit/Layout"

export { addDays, startOfDay }
export const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
const WEEKDAY_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]
const HOUR = 44

export const sameDay = (a: Date, b: Date) => isoDate(a) === isoDate(b)
const pad = (n: number) => String(n).padStart(2, "0")
export const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Cor do evento: a escolhida na nota; sessão sem cor em dourado (vermelho é só perigo, ADR 0001); o resto em lavanda. */
export function eventColor(event: AgendaEvent): string {
  return `var(--${event.color ?? (isSessionEvent(event) ? "gold" : "cyan")})`
}

/** Tom da campanha de um evento de sessão sem cor própria (ADR 0027); a Agenda fornece pelo contexto. */
export const EventTones = createContext<(event: AgendaEvent) => Tone | null>(() => null)

/** Classe e estilo do evento: `--ev` na cor dele, ou no tom da campanha quando houver (e as cores próprias valerem). */
export function useEventLook() {
  const toneOf = useContext(EventTones)
  return (event: AgendaEvent, extra?: CSSProperties): { className: string; style: CSSProperties } => {
    const tone = toneOf(event)
    return { className: tone ? "toned" : "", style: { ...extra, ...toneStyle(tone), ["--ev" as string]: tone ? `var(--tone, ${eventColor(event)})` : eventColor(event) } }
  }
}

export const isSessionEvent = (event: AgendaEvent) => Boolean(event.session) || /^sess/i.test(event.category ?? "")

/** Nome completo de um evento para o leitor de tela e a dica: título, horário, local e categoria. */
export function occurrenceLabel(o: Occurrence): string {
  const when = o.event.allDay ? "dia inteiro" : `${hhmm(o.start)}${o.event.endTime ? ` às ${hhmm(o.end)}` : ""}`
  return [o.event.title, when, o.event.location, o.event.category].filter(Boolean).join(", ")
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
  /** Resumo do tempo livre do dia (ex.: "6h"), quando configurado. */
  freeLabel?(day: Date): string | null
}

/**
 * Mês (AGE-1, AGE-2): grade de datas da WAI-ARIA, com uma parada de Tab. As setas, Home/End e PageUp/PageDown
 * escolhem o dia (core/agenda-grid.ts); Enter abre o dia no painel. Os eventos ficam fora do Tab: o painel Dia lista
 * os mesmos como botões.
 */
export function MonthView({ month, occurrences, today, selectedDay, selectedKey, onPickDay, onPick, onCreate, freeLabel, onOpenDay }: ViewProps & { month: Date; onOpenDay(day: Date): void }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = addDays(first, -first.getDay())
  const weeks = Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)))
  const grid = useRef<HTMLDivElement>(null)
  const keyboard = useRef(false)
  const lookOf = useEventLook()
  const selectedIso = isoDate(selectedDay)
  // O dia que recebe o Tab: o escolhido, se estiver na grade; senão o primeiro do mês.
  const focusIso = weeks.flat().some((d) => isoDate(d) === selectedIso) ? selectedIso : isoDate(first)

  // O foco acompanha o dia escolhido pelo teclado, mesmo quando a grade troca de mês.
  useEffect(() => {
    if (!keyboard.current) return
    keyboard.current = false
    grid.current?.querySelector<HTMLElement>(`[data-day="${focusIso}"]`)?.focus()
  }, [focusIso])

  const onKey = (event: KeyboardEvent<HTMLDivElement>, day: Date) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onOpenDay(day)
      return
    }
    const next = moveDay(day, event.key, event.shiftKey)
    if (!next) return
    event.preventDefault()
    keyboard.current = true
    onPickDay(next)
  }

  return (
    <div ref={grid} className="month" role="grid" aria-label={month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}>
      <div role="row" className="month-row month-head-row">
        {WEEKDAYS.map((w, i) => (
          <div key={w} role="columnheader" className="month-head" aria-label={WEEKDAY_NAMES[i]}>
            {w}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={isoDate(week[0]!)} role="row" className="month-row">
          {week.map((day) => {
            const iso = isoDate(day)
            const items = onDay(occurrences, day)
            const free = freeLabel?.(day) ?? null
            const picked = iso === selectedIso
            return (
              <div
                key={iso}
                role="gridcell"
                tabIndex={iso === focusIso ? 0 : -1}
                aria-selected={picked}
                aria-label={dayLabel(day, today, items.length, free)}
                className={`month-cell ${day.getMonth() !== month.getMonth() ? "outside" : ""} ${sameDay(day, today) ? "today" : ""} ${picked ? "picked" : ""}`}
                onClick={() => onPickDay(day)}
                onDoubleClick={() => onCreate(day)}
                onKeyDown={(event) => onKey(event, day)}
                data-day={iso}
              >
                <span className="cell-top" aria-hidden="true">
                  <span className="day-number">{day.getDate()}</span>
                  {free && <span className="cell-free">{free}</span>}
                </span>
                <span className="cell-events" aria-hidden="true">
                  {items.slice(0, 3).map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      tabIndex={-1}
                      className={`event-pill ${o.key === selectedKey ? "active" : ""} ${o.event.completed ? "done" : ""} ${o.event.allDay ? "all-day" : ""} ${lookOf(o.event).className}`}
                      style={lookOf(o.event).style}
                      onClick={(event) => {
                        event.stopPropagation()
                        onPick(o)
                      }}
                      title={occurrenceLabel(o)}
                    >
                      <span className="pill-title">{o.event.title}</span>
                      {!o.event.allDay && sameDay(o.start, day) && <span className="pill-time">{hhmm(o.start)}</span>}
                    </button>
                  ))}
                  {items.length > 3 && (
                    <button type="button" tabIndex={-1} className="cell-more" onClick={(event) => (event.stopPropagation(), onOpenDay(day))}>
                      +{items.length - 3} no dia
                    </button>
                  )}
                </span>
                <span className="cell-dots" aria-hidden="true">
                  {items.slice(0, 4).map((o) => (
                    <span key={o.key} className={`dot ${lookOf(o.event).className}`} style={lookOf(o.event, { background: "var(--ev)" }).style} />
                  ))}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/**
 * Semana ou dia (AGE-6): grade de horas, com os eventos de dia inteiro em cima. Cada coluna é uma parada de Tab: as
 * setas para cima e para baixo escolhem a hora, para os lados trocam de dia, e Enter cria o evento na hora escolhida.
 */
export function TimeGrid({ days, occurrences, today, selectedKey, onPick, onCreate, onPickDay, onShowMore, freeLabel }: ViewProps & { days: Date[]; onShowMore(day: Date): void }) {
  const scroller = useRef<HTMLDivElement>(null)
  const columns = useRef<HTMLDivElement>(null)
  const lookOf = useEventLook()
  const [focus, setFocus] = useState<{ day: number; hour: number } | null>(null)
  const [focusDay, setFocusDay] = useState(() => Math.max(0, days.findIndex((d) => sameDay(d, today))))
  useEffect(() => {
    // Começa às 7h (ou na hora atual, se for depois).
    if (scroller.current) scroller.current.scrollTop = Math.max(0, Math.min(new Date().getHours() - 1, 7)) * HOUR
  }, [])
  const now = new Date()
  const maxColumns = days.length === 1 ? 6 : 3

  const onKey = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    if (event.target !== event.currentTarget) return
    const hour = focus?.day === index ? focus.hour : Math.max(7, Math.min(23, now.getHours()))
    let next = { day: index, hour }
    if (event.key === "ArrowDown") next = { day: index, hour: Math.min(23, hour + 1) }
    else if (event.key === "ArrowUp") next = { day: index, hour: Math.max(0, hour - 1) }
    else if (event.key === "ArrowRight" && index < days.length - 1) next = { day: index + 1, hour }
    else if (event.key === "ArrowLeft" && index > 0) next = { day: index - 1, hour }
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onCreate(days[index]!, `${pad(hour)}:00`)
      return
    } else return
    event.preventDefault()
    setFocus(next)
    setFocusDay(next.day)
    if (next.day !== index) columns.current?.querySelectorAll<HTMLElement>(".timegrid-col")[next.day]?.focus()
    if (scroller.current) {
      const top = next.hour * HOUR
      if (top < scroller.current.scrollTop || top + HOUR > scroller.current.scrollTop + scroller.current.clientHeight) scroller.current.scrollTop = Math.max(0, top - HOUR)
    }
  }

  return (
    <div className="timegrid" style={{ ["--days" as string]: days.length }}>
      <div className="timegrid-head">
        <span />
        {days.map((day) => {
          const allDay = onDay(occurrences, day).filter((o) => o.event.allDay)
          return (
            <div key={day.toISOString()} className={`timegrid-day-head ${sameDay(day, today) ? "today" : ""}`}>
              <button type="button" className="ghost-link" onClick={() => onPickDay(day)} aria-label={`${day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}${sameDay(day, today) ? ", hoje" : ""}: ver o dia`}>
                {WEEKDAYS[day.getDay()]} <strong>{day.getDate()}</strong>
              </button>
              {freeLabel?.(day) && <span className="cell-free" title="Tempo livre no dia">{freeLabel(day)}</span>}
              {allDay.map((o) => (
                <button key={o.key} type="button" className={`event-pill all-day ${o.key === selectedKey ? "active" : ""} ${lookOf(o.event).className}`} style={lookOf(o.event).style} onClick={() => onPick(o)} aria-label={occurrenceLabel(o)}>
                  <span className="pill-title">{o.event.title}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
      <div className="timegrid-body" ref={scroller}>
        <div className="timegrid-hours" aria-hidden="true">
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h}>{pad(h)}h</span>
          ))}
        </div>
        <div className="timegrid-cols" ref={columns}>
          {days.map((day, index) => {
            const { placed, overflow } = layoutDay(onDay(occurrences, day).filter((o) => !o.event.allDay), day, HOUR, maxColumns)
            const hour = focus?.day === index ? focus.hour : null
            return (
              <div
                key={day.toISOString()}
                className={`timegrid-col ${sameDay(day, today) ? "today" : ""}`}
                tabIndex={index === focusDay ? 0 : -1}
                aria-label={`${day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}${hour !== null ? `, ${pad(hour)}:00` : ""}. Setas escolhem a hora; Enter cria um evento.`}
                onFocus={(event) => event.target === event.currentTarget && !focus && setFocus({ day: index, hour: Math.max(7, Math.min(23, now.getHours())) })}
                onBlur={(event) => !event.currentTarget.contains(event.relatedTarget as Node) && !columns.current?.contains(event.relatedTarget as Node) && setFocus(null)}
                onKeyDown={(event) => onKey(event, index)}
                onDoubleClick={(event) => {
                  const y = event.clientY - event.currentTarget.getBoundingClientRect().top
                  const h = Math.max(0, Math.min(23, Math.floor(y / HOUR)))
                  onCreate(day, `${pad(h)}:00`)
                }}
              >
                {hour !== null && <span className="hour-cursor" style={{ top: hour * HOUR }} aria-hidden="true">{pad(hour)}:00</span>}
                {placed.map(({ occurrence, top, height, column, columns: count }) => (
                  <button
                    key={occurrence.key}
                    type="button"
                    className={`week-event ${occurrence.key === selectedKey ? "active" : ""} ${lookOf(occurrence.event).className}`}
                    style={lookOf(occurrence.event, { top, height, left: `calc(${(column / count) * 100}% + 2px)`, width: `calc(${100 / count}% - 4px)` }).style}
                    onClick={() => onPick(occurrence)}
                    aria-label={occurrenceLabel(occurrence)}
                    title={occurrenceLabel(occurrence)}
                  >
                    <span className="week-event-title">{occurrence.event.title}</span> <span className="week-event-time">{hhmm(occurrence.start)}</span>
                    {occurrence.event.location && height > 40 && <span className="week-event-place">{occurrence.event.location}</span>}
                  </button>
                ))}
                {overflow.map((group) => (
                  <button
                    key={`mais-${group.top}`}
                    type="button"
                    className="week-more"
                    style={{ top: group.top, height: group.height, left: `calc(${(group.column / group.columns) * 100}% + 2px)`, width: `calc(${100 / group.columns}% - 4px)` }}
                    onClick={() => onShowMore(day)}
                    aria-label={`Mais ${group.hidden.length}: ${group.hidden.map((o) => o.event.title).join(", ")}`}
                  >
                    +{group.hidden.length}
                  </button>
                ))}
                {sameDay(day, now) && <span className="now-line" style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR }} />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Lista (AGE-7): um título por dia e linhas do kit; “Mostrar mais” estende o período sem trocar de página. */
export function ListView({ from, days, occurrences, selectedKey, onPick, onMore }: { from: Date; days: number; occurrences: Occurrence[]; selectedKey?: string; onPick(o: Occurrence): void; onMore(): void }) {
  const lookOf = useEventLook()
  const groups = new Map<string, Occurrence[]>()
  for (const o of occurrences) {
    const day = isoDate(o.start < from ? from : o.start)
    groups.set(day, [...(groups.get(day) ?? []), o])
  }
  return (
    <div className="agenda-list">
      {!groups.size && <p className="muted">Nada marcado nos próximos {days} dias.</p>}
      {[...groups].map(([day, list]) => (
        <section key={day} className="agenda-list-day" aria-labelledby={`dia-${day}`}>
          <h3 id={`dia-${day}`} className="agenda-list-title">{new Date(`${day}T12:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</h3>
          {list.map((o) => (
            <ListRow
              key={o.key}
              media={<span className={`dot ${lookOf(o.event).className}`} style={lookOf(o.event, { background: "var(--ev)" }).style} />}
              title={o.event.title}
              meta={[o.event.allDay ? "dia inteiro" : `${hhmm(o.start)}${o.event.endTime ? `–${hhmm(o.end)}` : ""}`, o.event.category, o.event.location].filter(Boolean).join(" · ")}
              onClick={() => onPick(o)}
              current={o.key === selectedKey}
            />
          ))}
        </section>
      ))}
      <button type="button" className="btn agenda-list-more" onClick={onMore}>
        Mostrar mais 60 dias
      </button>
    </div>
  )
}
