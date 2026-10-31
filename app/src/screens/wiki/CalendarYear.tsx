import { useEffect, useMemo, useRef, type KeyboardEvent } from "react"
import { formatDate, formatYear, holidaysOn, moons, type Calendar, type WorldDate } from "../../core/calendar"
import { moveDate, yearMonths } from "../../core/calendar-year"

const same = (a: WorldDate | null | undefined, b: WorldDate | null | undefined) => Boolean(a && b && a.year === b.year && a.month === b.month && a.day === b.day)
const dateKey = (d: WorldDate) => `${d.year}-${d.month}-${d.day}`

/**
 * Vista do ano inteiro (U9): os meses do calendário fictício em miniatura, com os dias intercalares numa faixa, a
 * estação, o ponto da lua cheia e o dos acontecimentos. Tocar no nome abre o mês; tocar num dia escolhe o dia no
 * painel. Uma parada de Tab: setas, Page Up/Down e Home/End andam pelos dias, como a Agenda.
 */
export function YearGrid({ calendar, year, selected, onPick, onOpenMonth, onYear, marks }: {
  calendar: Calendar; year: number; selected: WorldDate | null; onPick(date: WorldDate): void; onOpenMonth(month: number): void; onYear(year: number): void
  marks(date: WorldDate): { label: string }[]
}) {
  const months = useMemo(() => yearMonths(calendar, year), [calendar, year])
  const grid = useRef<HTMLDivElement>(null)
  const moved = useRef(false)
  const focus = selected?.year === year ? selected : calendar.today?.year === year ? calendar.today : { year, month: 1, day: 1 }
  // Só puxa o foco depois de uma tecla (abrir a vista não rouba o foco do seletor Mês | Ano).
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    grid.current?.querySelector<HTMLElement>(`[data-date="${dateKey(focus)}"]`)?.focus()
  }, [focus.year, focus.month, focus.day])
  const onKey = (event: KeyboardEvent, date: WorldDate) => {
    const next = moveDate(calendar, date, event.key)
    if (!next) return
    event.preventDefault()
    moved.current = true
    if (next.year !== year) onYear(next.year)
    onPick(next)
  }
  return (
    <div ref={grid} className="fyear" role="group" aria-label={`Ano ${formatYear(calendar, year)}`}>
      {months.map((m) => (
        <section key={m.month} className={`fyear-month${m.intercalary ? " intercalary" : ""}`}>
          <button type="button" className="fyear-month-head" onClick={() => onOpenMonth(m.month)} aria-label={`Abrir ${m.name} de ${formatYear(calendar, year)}`}>
            <strong>{m.name}</strong>
            {m.season && <span className="tiny muted">{m.season}</span>}
          </button>
          <div className={m.intercalary ? "fyear-strip" : "fyear-days"} style={m.intercalary ? undefined : { gridTemplateColumns: `repeat(${calendar.weekdays.length}, minmax(0, 1fr))` }}>
            {!m.intercalary && calendar.weekdays.map((w) => <span key={w} className="fyear-weekday" aria-hidden="true" title={w}>{w.slice(0, 1)}</span>)}
            {Array.from({ length: m.offset }, (_, i) => <span key={`v${i}`} aria-hidden="true" />)}
            {Array.from({ length: m.length }, (_, i) => {
              const date = { year, month: m.month, day: i + 1 }
              const full = moons(calendar, date).filter((moon) => moon.fullToday)
              const count = holidaysOn(calendar, date).length + marks(date).length
              const today = same(date, calendar.today)
              const notes = [today ? "hoje no mundo" : "", full.map((moon) => `${moon.moon.name} cheia`).join(", "), count ? `${count} ${count === 1 ? "acontecimento" : "acontecimentos"}` : ""].filter(Boolean)
              return (
                <button key={i} type="button" data-date={dateKey(date)} tabIndex={same(date, focus) ? 0 : -1}
                  className={`fyear-day${today ? " today" : ""}${same(date, selected) ? " picked" : ""}`}
                  aria-label={`${formatDate(calendar, date)}${notes.length ? `; ${notes.join("; ")}` : ""}`} aria-pressed={same(date, selected)}
                  onClick={() => onPick(date)} onKeyDown={(event) => onKey(event, date)}>
                  {i + 1}
                  {(count > 0 || full.length > 0) && (
                    <span className="fyear-dots" aria-hidden="true">
                      {full.length > 0 && <span className="fyear-dot moon" style={full[0]!.moon.color ? { background: full[0]!.moon.color } : undefined} />}
                      {count > 0 && <span className="fyear-dot event" />}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
