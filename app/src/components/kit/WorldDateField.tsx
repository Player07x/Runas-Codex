import "./kit.css"
import { useEffect, useRef, useState } from "react"
import { parseWorldDate, sameAbbr, worldDateText, type Calendar } from "../../core/calendar"

interface Parts { day: string; month: string; year: string; abbr: string }

const partsOf = (value: string, fallback: string): Parts => {
  const date = parseWorldDate(value)
  return date ? { day: String(date.day), month: String(date.month), year: String(date.year), abbr: date.calendar ?? fallback } : { day: "", month: "", year: "", abbr: fallback }
}

/** O texto gravado: “ANO-MM-DD SIGLA” com tudo preenchido, vazio sem nada, e o que houver quando falta parte (o erro aparece). */
function textOf(parts: Parts): string {
  const { day, month, year, abbr } = parts
  if (!day && !month && !year) return ""
  const [d, m, y] = [Number(day), Number(month), Number(year)]
  if (day && month && year && Number.isInteger(d) && Number.isInteger(m) && Number.isInteger(y)) return `${worldDateText({ year: y, month: m, day: d })} ${abbr}`.trim()
  return `${year}-${month}-${day} ${abbr}`.trim()
}

/**
 * Data do mundo (D12): dia, mês do calendário (pelo nome) e ano, com a sigla escrita ao lado (ou uma lista, quando a
 * wiki tem mais de um calendário). Grava “ANO-MM-DD SIGLA”, o formato das datas no frontmatter. Sem calendário, um
 * campo de texto no mesmo formato.
 */
export function WorldDateField({ id, value, onChange, calendars, calendar, describedBy, invalid, labelledBy }: {
  id?: string; value: string; onChange(value: string): void; calendars: readonly Calendar[]; calendar?: Calendar | null; describedBy?: string; invalid?: boolean; labelledBy?: string
}) {
  const fallback = (calendar ?? calendars[0])?.abbr ?? ""
  const [parts, setParts] = useState<Parts>(() => partsOf(value, fallback))
  const emitted = useRef(value)
  useEffect(() => {
    if (value === emitted.current) return
    emitted.current = value
    setParts(partsOf(value, fallback))
  }, [value, fallback])

  if (!calendars.length) return <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={describedBy} aria-invalid={invalid || undefined} aria-labelledby={labelledBy} inputMode="text" />

  const own = calendars.find((c) => sameAbbr(c.abbr, parts.abbr)) ?? calendar ?? calendars[0]!
  const set = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch }
    setParts(next)
    const text = textOf(next)
    emitted.current = text
    onChange(text)
  }
  const common = { "aria-describedby": describedBy, "aria-invalid": invalid || undefined }
  return <div className="kit-date">
    <input id={id} className="input" inputMode="numeric" aria-label="Dia" {...common} value={parts.day} onChange={(e) => set({ day: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })} />
    <select className="select" aria-label="Mês" {...common} value={parts.month} onChange={(e) => set({ month: e.target.value })}>
      <option value="">Mês</option>
      {own.months.map((month, at) => <option key={`${month.name}-${at}`} value={String(at + 1)}>{month.name}</option>)}
    </select>
    <input className="input" inputMode="numeric" aria-label="Ano" {...common} value={parts.year} onChange={(e) => set({ year: e.target.value.replace(/(?!^-)[^\d]/g, "").slice(0, 7) })} />
    {calendars.length > 1
      ? <select className="select kit-date-abbr" aria-label="Calendário" value={own.abbr} onChange={(e) => set({ abbr: e.target.value })}>
          {calendars.map((c) => <option key={c.abbr} value={c.abbr}>{c.abbr}</option>)}
        </select>
      : <span className="kit-date-abbr" title={own.name}>{own.abbr}</span>}
  </div>
}
