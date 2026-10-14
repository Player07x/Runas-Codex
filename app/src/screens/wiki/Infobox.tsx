import { useState } from "react"
import { Check, Pencil } from "lucide-react"
import { dateProblem, eraOf, formatDate, moons, parseWorldDate, relative, season, weekday, yearsBetween, type Calendar, type WorldDate } from "../../core/calendar"
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
  calendar: Calendar | null
  calendarError?: string
  readOnly: boolean
  onSet(key: string, value: PropertyValue | undefined): Promise<void>
}

/** Ficha do artigo: campos do tipo, datas calculadas e as outras propriedades. */
export function Infobox({ note, calendar, calendarError, readOnly, onSet }: Props) {
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

  const row = (field: FieldDef) => {
    const value = data[field.key]
    if (editing) return <FieldEditor key={field.key} field={field} value={value} calendar={calendar} onSet={onSet} />
    if (field.kind === "imagem") return null
    const text = asText(value).trim()
    if (!text) return null
    let content
    if (field.kind === "data") {
      const date = parseWorldDate(value)
      content = date && calendar ? <WorldDateInfo calendar={calendar} date={date} label={field.label} birth={field.key === "nascimento_mundo" ? { born: date, ...(died ? { died } : {}) } : field.key === "morte_mundo" && born ? { born, died: date } : undefined} /> : <span>{text}</span>
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
              <dd>{calendar ? <WorldDateInfo calendar={calendar} date={d.date} label={d.label} /> : asText(data[d.key])}</dd>
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
      {dates.length > 0 && !calendar && <span className="tiny faint">{calendarError ?? "Sem calendário: ponha `calendario: \"[[Nome do calendário]]\"` nas propriedades para calcular idade, dia da semana e era."}</span>}
    </aside>
  )
}

function FieldEditor({ field, value, calendar, onSet }: { field: FieldDef; value: unknown; calendar: Calendar | null; onSet(key: string, value: PropertyValue | undefined): Promise<void> }) {
  const initial = field.kind === "links" ? (Array.isArray(value) ? value.map(String) : value ? [String(value)] : []).map((v) => v.replace(/^\[\[|\]\]$/g, "")).join(", ") : field.kind === "link" || field.kind === "imagem" ? asText(value).replace(/^!?\[\[|\]\]$/g, "") : asText(value)
  const [text, setText] = useState(initial)
  const [error, setError] = useState<string>()
  const save = async () => {
    if (text === initial) return
    const trimmed = text.trim()
    let next: PropertyValue | undefined
    if (field.kind === "data") {
      const date = parseWorldDate(trimmed)
      if (trimmed && !date) return setError("Use ANO-MM-DD (ex.: 4031-07-15).")
      const problem = date && calendar ? dateProblem(calendar, date) : null
      if (problem) return setError(problem)
      next = trimmed || null
    } else if (field.kind === "links") next = trimmed ? trimmed.split(",").map((t) => t.trim()).filter(Boolean).map((t) => `[[${t}]]`) : []
    else if (field.kind === "link" || field.kind === "imagem") next = trimmed ? `[[${trimmed}]]` : null
    else if (field.kind === "numero") next = trimmed === "" ? null : Number.isFinite(Number(trimmed)) ? Number(trimmed) : trimmed
    else next = trimmed || null
    setError(undefined)
    await onSet(field.key, next).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }
  return (
    <div>
      <dt>{field.label}</dt>
      <dd>
        <input
          className="input sm"
          value={text}
          placeholder={field.kind === "data" ? "ANO-MM-DD" : field.kind === "links" ? "Nota 1, Nota 2" : field.kind === "link" || field.kind === "imagem" ? "Nome da nota ou do arquivo" : ""}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => void save()}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          aria-label={field.label}
        />
        {error && <span className="tiny" style={{ color: "var(--red)" }}>{error}</span>}
      </dd>
    </div>
  )
}
