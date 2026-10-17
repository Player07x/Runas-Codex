import { useState } from "react"
import { Check, Pencil } from "lucide-react"
import { dateProblem, eraOf, formatDate, moons, noteDateText, parseWorldDate, relative, sameAbbr, season, weekday, worldDateText, yearsBetween, type Calendar, type WorldDate } from "../../core/calendar"
import type { PropertyValue } from "../../core/properties"
import type { IndexedNote } from "../../core/vault-index"
import { articleKind, noteDates, RELATION_TYPES, type FieldDef } from "../../core/wiki"
import { Markdown } from "../../components/Markdown"
import { Embed } from "../../markdown/Embed"

/** Propriedades que não aparecem como linha da ficha. */
const HIDDEN = new Set(["tipo", "tags", "tag", "aliases", "alias", "calendario", "cssclasses", "cssclass", "trilha", "publish", ...RELATION_TYPES.map((r) => r.key)])

const asText = (value: unknown) => (Array.isArray(value) ? value.map(String).join(", ") : value === null || value === undefined ? "" : String(value))

/** Data do mundo com o que o app calcula: dia da semana, lua cheia, estação, era e tempo até hoje. */
export function WorldDateInfo({ calendar, date, label, birth }: { calendar: Calendar; date: WorldDate; label?: string; birth?: { born: WorldDate; died?: WorldDate } }) {
  const problem = dateProblem(calendar, date)
  if (problem) return <span className="computed bad">Data inválida: {problem}</span>
  const day = weekday(calendar, date)
  const era = eraOf(calendar, date.year)
  const full = moons(calendar, date).filter((m) => m.fullToday)
  const now = calendar.today
  let age: string | null = null
  if (birth && now) {
    const until = birth.died ?? now
    const years = yearsBetween(birth.born, until)
    age = birth.died ? `morreu com ${years} ${years === 1 ? "ano" : "anos"}` : years >= 0 ? `${years} ${years === 1 ? "ano" : "anos"}` : "ainda não nasceu"
  }
  return (
    <>
      <span>{formatDate(calendar, date)}</span>
      <span className="computed" title={label}>
        {age && <strong>{age}</strong>}
        {day && <span>{day}</span>}
        {season(calendar, date) && <span>{season(calendar, date)}</span>}
        {era && <span>{era.year}º ano da {era.era.name}</span>}
        {full.map((m) => (
          <span key={m.moon.name} style={m.moon.color ? { color: m.moon.color } : undefined}>
            ● {m.moon.name} cheia
          </span>
        ))}
        {now && <span>{relative(calendar, date, now)}</span>}
      </span>
    </>
  )
}

interface Props {
  note: IndexedNote
  /** O calendário das datas sem sigla (formato antigo). */
  calendar: Calendar | null
  /** Os calendários que a sigla de uma data pode escolher. */
  calendars: Calendar[]
  calendarError?: string
  readOnly: boolean
  onSet(key: string, value: PropertyValue | undefined): Promise<void>
}

/** Ficha do artigo: campos do tipo, datas calculadas e as outras propriedades. */
export function Infobox({ note, calendar, calendars, calendarError, readOnly, onSet }: Props) {
  const [editing, setEditing] = useState(false)
  const data = note.meta.frontmatter?.data ?? {}
  const kind = articleKind(data.tipo)
  const fields = kind?.fields ?? []
  const fieldKeys = new Set(fields.map((f) => f.key))
  const dates = noteDates(data)
  const born = parseWorldDate(data.nascimento_mundo)
  const died = parseWorldDate(data.morte_mundo)
  const image = fields.find((f) => f.kind === "imagem" && asText(data[f.key]).trim())
  const extraDates = dates.filter((d) => !fieldKeys.has(d.key))
  const extra = Object.entries(data).filter(([key, value]) => !HIDDEN.has(key) && !fieldKeys.has(key) && !key.endsWith("_mundo") && value !== null && value !== "" && !(Array.isArray(value) && !value.length))

  // Cada data usa o calendário da sua sigla; sem sigla, o da nota.
  const calendarOf = (date: WorldDate) => (date.calendar ? (calendars.find((c) => sameAbbr(c.abbr, date.calendar!)) ?? null) : calendar)
  const sameCalendar = (a: WorldDate | null, b: WorldDate | null) => Boolean(a && b && calendarOf(a) === calendarOf(b))
  const unknown = (date: WorldDate, text: string) => <span>{text} <span className="computed bad">{date.calendar ? `Nenhum calendário com a sigla “${date.calendar}”.` : ""}</span></span>

  const row = (field: FieldDef) => {
    const value = data[field.key]
    if (editing) return <FieldEditor key={field.key} field={field} value={value} calendar={calendar} calendars={calendars} onSet={onSet} />
    if (field.kind === "imagem") return null
    const text = asText(value).trim()
    if (!text) return null
    let content
    if (field.kind === "data") {
      const date = parseWorldDate(value)
      const own = date && calendarOf(date)
      content = date && own ? <WorldDateInfo calendar={own} date={date} label={field.label} birth={field.key === "nascimento_mundo" ? { born: date, ...(died && sameCalendar(date, died) ? { died } : {}) } : field.key === "morte_mundo" && born && sameCalendar(born, date) ? { born, died: date } : undefined} /> : date ? unknown(date, text) : <span>{text}</span>
    } else if (field.kind === "link" || field.kind === "links") {
      content = <Markdown source={Array.isArray(value) ? value.map(String).join(" · ") : text} className="inline-md" />
    } else {
      content = <Markdown source={text} className="inline-md" />
    }
    return (
      <div key={field.key}>
        <dt>{field.label}</dt>
        <dd>{content}</dd>
      </div>
    )
  }

  return (
    <aside className="infobox" aria-label="Ficha do artigo">
      <div className="row between">
        <span className="eyebrow">{kind?.label ?? "Artigo"}</span>
        {!readOnly && kind && kind.fields.length > 0 && (
          <button className="btn ghost sm" onClick={() => setEditing(!editing)} aria-label={editing ? "Concluir ficha" : "Editar ficha"}>
            {editing ? <Check size={14} /> : <Pencil size={14} />} {editing ? "Pronto" : "Editar"}
          </button>
        )}
      </div>
      {image && !editing && (
        <div className="infobox-portrait">
          <Embed target={asText(data[image.key]).replace(/^\s*!?\[\[|\]\]\s*$/g, "")} />
        </div>
      )}
      <dl>
        {fields.map(row)}
        {!editing &&
          extraDates.map((d) => (
            <div key={d.key}>
              <dt>{d.label}</dt>
              <dd>{calendarOf(d.date) ? <WorldDateInfo calendar={calendarOf(d.date)!} date={d.date} label={d.label} /> : unknown(d.date, asText(data[d.key]))}</dd>
            </div>
          ))}
        {!editing &&
          extra.map(([key, value]) => (
            <div key={key}>
              <dt>{key.replace(/_/g, " ")}</dt>
              <dd>
                <Markdown source={asText(value)} className="inline-md" />
              </dd>
            </div>
          ))}
      </dl>
      {dates.some((d) => !d.date.calendar) && !calendar && <span className="tiny faint">{calendarError ?? "Data sem calendário: escreva a sigla depois da data (ex.: 3999-02-12 OC) para calcular idade, dia da semana e era."}</span>}
    </aside>
  )
}

function FieldEditor({ field, value, calendar, calendars, onSet }: { field: FieldDef; value: unknown; calendar: Calendar | null; calendars: Calendar[]; onSet(key: string, value: PropertyValue | undefined): Promise<void> }) {
  const parsed = field.kind === "data" ? parseWorldDate(value) : null
  const initial = field.kind === "links" ? (Array.isArray(value) ? value.map(String) : value ? [String(value)] : []).map((v) => v.replace(/^\[\[|\]\]$/g, "")).join(", ") : field.kind === "link" || field.kind === "imagem" ? asText(value).replace(/^!?\[\[|\]\]$/g, "") : parsed ? worldDateText(parsed) : asText(value)
  // A data é gravada com a sigla do calendário escolhido: "3999-02-12 OC".
  const initialAbbr = (parsed?.calendar && calendars.find((c) => sameAbbr(c.abbr, parsed.calendar!))?.abbr) ?? parsed?.calendar ?? calendar?.abbr ?? calendars[0]?.abbr ?? ""
  const [text, setText] = useState(initial)
  const [abbr, setAbbr] = useState(initialAbbr)
  const [error, setError] = useState<string>()
  const save = async (chosen = abbr) => {
    const trimmed = text.trim()
    let next: PropertyValue | undefined
    if (field.kind === "data") {
      const date = parseWorldDate(trimmed)
      if (trimmed && !date) return setError("Use ANO-MM-DD (ex.: 4031-07-15).")
      const sigla = date?.calendar ?? chosen
      const target = calendars.find((c) => sameAbbr(c.abbr, sigla))
      if (date && !target) return setError(sigla ? `Nenhum calendário com a sigla “${sigla}”.` : "Crie um calendário na wiki para datar artigos.")
      const problem = date && target ? dateProblem(target, date) : null
      if (problem) return setError(problem)
      next = date && target ? noteDateText(date, target) : null
      if (next === (typeof value === "string" ? value.trim() : value ?? null)) return setError(undefined)
    } else {
      if (text === initial) return
      if (field.kind === "links") next = trimmed ? trimmed.split(",").map((t) => t.trim()).filter(Boolean).map((t) => `[[${t}]]`) : []
      else if (field.kind === "link" || field.kind === "imagem") next = trimmed ? `[[${trimmed}]]` : null
      else if (field.kind === "numero") next = trimmed === "" ? null : Number.isFinite(Number(trimmed)) ? Number(trimmed) : trimmed
      else next = trimmed || null
    }
    setError(undefined)
    await onSet(field.key, next).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }
  return (
    <div>
      <dt>{field.label}</dt>
      <dd>
        <div className="row" style={{ gap: 6 }}>
          <input
            className="input sm"
            value={text}
            placeholder={field.kind === "data" ? "ANO-MM-DD" : field.kind === "links" ? "Nota 1, Nota 2" : field.kind === "link" || field.kind === "imagem" ? "Nome da nota ou do arquivo" : ""}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            aria-label={field.label}
          />
          {field.kind === "data" && calendars.length > 0 && (
            <select className="select sm infobox-calendar" value={abbr} aria-label={`Calendário de ${field.label}`} title="Calendário desta data" onChange={(e) => { setAbbr(e.target.value); if (text.trim()) void save(e.target.value) }}>
              {!calendars.some((c) => c.abbr === abbr) && <option value={abbr}>{abbr || "—"}</option>}
              {calendars.map((c) => <option key={c.abbr + c.name} value={c.abbr}>{c.abbr} · {c.name}</option>)}
            </select>
          )}
        </div>
        {error && <span className="tiny" style={{ color: "var(--red)" }}>{error}</span>}
      </dd>
    </div>
  )
}
