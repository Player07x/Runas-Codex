import { dateProblem, formatDate, parseWorldDate, relative, sameAbbr, yearsBetween, type Calendar } from "../../core/calendar"
import type { FieldDef } from "../../core/wiki"
import { fichaValue, type FichaInput, type FichaValues } from "../../core/wiki-ficha"
import { CoverImagePicker } from "../../components/kit/CoverImagePicker"
import { FormField, FormGrid } from "../../components/kit/FormField"
import { NoteCombobox, NoteListField } from "../../components/kit/NoteCombobox"
import { WorldDateField } from "../../components/kit/WorldDateField"

const filled = (input: FichaInput | undefined) => (Array.isArray(input) ? input.length > 0 : Boolean(input?.trim()))
const wide = (field: FieldDef) => field.kind === "data" || field.kind === "links"

/**
 * Ordem na grade: campos curtos (texto, número, link) primeiro, dois por fileira; depois os largos (datas e listas),
 * um por fileira. Assim nenhuma fileira fica com buraco e a ordem de leitura é a ordem da tela.
 */
export const fichaLayout = (fields: FieldDef[]) => ({
  grid: [...fields.filter((field) => field.kind !== "imagem" && !wide(field)), ...fields.filter(wide)],
  images: fields.filter((field) => field.kind === "imagem"),
})

/**
 * Os campos da ficha de um tipo, controlados (sem `useWiki`): o Novo artigo, o Novo NPC e a Nova facção usam o mesmo
 * desenho. Link pelo `NoteCombobox`, lista de links em fichas, data pelo `WorldDateField`, imagem pelo
 * `CoverImagePicker` dentro de “Imagem (opcional)”.
 */
export function FichaFields({ fields, values, onChange, calendars, calendar, root, from, errors = {}, showAge = false }: {
  fields: FieldDef[]
  values: FichaValues
  onChange(key: string, value: FichaInput): void
  calendars: readonly Calendar[]
  calendar?: Calendar | null
  /** Raiz da wiki: os links sugerem notas dela. */
  root: string
  /** Caminho da nota que vai nascer (links mais curtos e o anexo “Do computador…” perto dela). */
  from: string
  errors?: Record<string, string>
  /** Mostra idade na data de nascimento/morte durante a criação do artigo. */
  showAge?: boolean
}) {
  if (!fields.length) return <p className="small muted">Este tipo não tem campos de ficha.</p>
  const { grid, images } = fichaLayout(fields)
  const text = (key: string) => { const value = values[key]; return Array.isArray(value) ? value.join(", ") : value ?? "" }

  const calendarFor = (date: ReturnType<typeof parseWorldDate>) => date ? (date.calendar ? calendars.find((item) => sameAbbr(item.abbr, date.calendar!)) ?? null : calendar ?? calendars[0] ?? null) : null
  const lifeHint = (field: FieldDef, date: ReturnType<typeof parseWorldDate>): string | undefined => {
    if (!showAge || !date || (field.key !== "nascimento_mundo" && field.key !== "morte_mundo")) return undefined
    const own = calendarFor(date)
    if (!own || dateProblem(own, date)) return undefined
    if (field.key === "nascimento_mundo") {
      if (!own.today) return undefined
      const age = yearsBetween(date, own.today)
      return age >= 0 ? `Hoje teria ${age} ${age === 1 ? "ano" : "anos"}` : "Ainda não nasceu"
    }
    const born = parseWorldDate(values.nascimento_mundo)
    const birthCalendar = calendarFor(born)
    const age = born && birthCalendar === own && !dateProblem(own, born) ? yearsBetween(born, date) : null
    return [age === null ? undefined : `Morreu com ${age} ${age === 1 ? "ano" : "anos"}`, own.today ? relative(own, date, own.today) : undefined].filter(Boolean).join(" · ") || undefined
  }

  const dateHint = (field: FieldDef): { hint?: string; error?: string } => {
    const value = text(field.key)
    if (!value.trim()) return { hint: calendars.length ? `Dia, mês e ano${calendars.length > 1 ? ", e a sigla do calendário" : ` (${(calendar ?? calendars[0])!.name})`}` : "Sem calendário nesta wiki: escreva ANO-MM-DD e a sigla." }
    const result = fichaValue(field, value, calendars, calendar?.abbr)
    if ("error" in result) return { error: result.error }
    const date = parseWorldDate(result.value)
    const own = date?.calendar ? calendars.find((c) => sameAbbr(c.abbr, date.calendar!)) : undefined
    return { hint: date && own ? [formatDate(own, date), lifeHint(field, date)].filter(Boolean).join(" · ") : undefined }
  }

  return <>
    <FormGrid>
      {grid.map((field) => {
        const own = field.kind === "data" ? dateHint(field) : {}
        const error = errors[field.key] ?? own.error
        const hint = own.hint ?? (field.kind === "link" ? "Artigo da wiki" : field.kind === "links" ? "Busque um artigo e tecle Enter para acrescentar" : undefined)
        return <FormField key={field.key} label={field.label} hint={hint} error={error} wide={wide(field)} group={field.kind === "data" || field.kind === "links"}>
          {(control) => field.kind === "link"
            ? <NoteCombobox id={control.id} value={text(field.key)} onChange={(value) => onChange(field.key, value)} root={root} from={from} describedBy={control.describedBy} invalid={control.invalid} />
            : field.kind === "links"
              ? <NoteListField id={control.id} name={field.label} value={Array.isArray(values[field.key]) ? values[field.key] as string[] : []} onChange={(value) => onChange(field.key, value)} root={root} from={from} describedBy={control.describedBy} invalid={control.invalid} />
              : field.kind === "data"
                ? <WorldDateField id={control.id} value={text(field.key)} onChange={(value) => onChange(field.key, value)} calendars={calendars} calendar={calendar} describedBy={control.describedBy} invalid={control.invalid} labelledBy={control.labelId} />
                : <input id={control.id} className="input" inputMode={field.kind === "numero" ? "decimal" : undefined} value={text(field.key)} onChange={(event) => onChange(field.key, event.target.value)} aria-describedby={control.describedBy} aria-invalid={control.invalid || undefined} />}
        </FormField>
      })}
    </FormGrid>
    {images.map((field) => <details key={field.key} className="ficha-image" open={filled(values[field.key])}>
      <summary>{field.label} (opcional)</summary>
      <CoverImagePicker legend={field.label} nearNote={from} value={text(field.key) ? `[[${text(field.key)}]]` : ""} onChange={(link) => onChange(field.key, link.replace(/^\[\[|\]\]$/g, ""))} />
    </details>)}
  </>
}
