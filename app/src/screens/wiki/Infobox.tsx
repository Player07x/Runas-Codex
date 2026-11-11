import { useEffect, useRef, useState } from "react"
import { Check, Library, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { dateProblem, eraOf, formatDate, moons, parseWorldDate, relative, sameAbbr, season, weekday, yearsBetween, type Calendar, type WorldDate } from "../../core/calendar"
import { fichaValue } from "../../core/wiki-ficha"
import { setProperty as setPropertyText, type PropertyValue } from "../../core/properties"
import type { IndexedNote } from "../../core/vault-index"
import { articleKind, noteDates, RELATION_TYPES, type FieldDef } from "../../core/wiki"
import { Markdown } from "../../components/Markdown"
import { Embed } from "../../markdown/Embed"
import { CoverImagePicker } from "../../components/kit/CoverImagePicker"
import { noteToken, savedTokenFileName, tokenBarText, tokenFromSaved, tokenProperties, type WikiToken } from "../../core/wiki-token"
import { Modal } from "../../components/ui"
import type { LibraryItem } from "../../vtt/shared/library"
import type { TokenData } from "../../vtt/shared/scene"
import { FormField, FormGrid } from "../../components/kit/FormField"
import { TokenSizeField } from "../../components/kit/TokenSizeField"
import { useVault } from "../../platform/VaultProvider"
import { TOKEN_DISPOSITIONS } from "../../vtt/shared/scene"

/** Propriedades que não aparecem como linha da ficha. */
const HIDDEN = new Set(["tipo", "tags", "tag", "aliases", "alias", "calendario", "cssclasses", "cssclass", "trilha", "publish", "token", "token_tamanho", "token_disposicao", "token_barras", ...RELATION_TYPES.map((r) => r.key)])

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
      <TokenSection note={note} readOnly={readOnly} />
      {dates.some((d) => !d.date.calendar) && !calendar && <span className="tiny faint">{calendarError ?? "Data sem calendário: escreva a sigla depois da data (ex.: 3999-02-12 OC) para calcular idade, dia da semana e era."}</span>}
    </aside>
  )
}

const DISPOSITION_LABELS: Record<string, string> = { player: "Jogador", friendly: "Aliado", neutral: "Neutro", hostile: "Hostil", secret: "Secreto" }
const EMPTY_TOKEN: WikiToken = { size: 1, disposition: "neutral", bars: [] }

/**
 * “Token para a mesa” (U22, PR N): imagem, tamanho, disposição e barras, guardados nas chaves `token_*` da ficha. As
 * quatro chaves vão numa gravação só e as gravações saem uma de cada vez (cada uma confere a versão lida); campos de
 * texto gravam ao sair do campo.
 */
function TokenSection({ note, readOnly }: { note: IndexedNote; readOnly: boolean }) {
  const vault = useVault()
  const initial = noteToken(note.meta.frontmatter?.data ?? {})
  const [token, setToken] = useState<WikiToken>(initial ?? EMPTY_TOKEN)
  const [error, setError] = useState<string>()
  const [importing, setImporting] = useState(false)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const commit = (next: WikiToken) => {
    setToken(next)
    if (readOnly) return
    queue.current = queue.current.then(async () => {
      const current = vault.index?.note(note.path)
      if (!current) return
      const text = Object.entries(tokenProperties(next)).reduce((t, [key, value]) => setPropertyText(t, key, value as PropertyValue | undefined), current.text)
      if (text !== current.text) await vault.save(note.path, text)
      setError(undefined)
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }
  const bar = (index: number, patch: Partial<WikiToken["bars"][number]>) => ({ ...token, bars: token.bars.map((item, i) => i === index ? { ...item, ...patch } : item) })
  const number = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0
  return <details className="infobox-token" open={Boolean(initial)}>
    <summary>Token para a mesa</summary>
    <FormGrid>
      <FormField label="Tamanho" hint="Em células da grade, de 0,25 a 20">
        {(c) => <TokenSizeField id={c.id} describedBy={c.describedBy} disabled={readOnly} value={token.size} onCommit={(size) => commit({ ...token, size })} />}
      </FormField>
      <FormField label="Disposição">
        {(c) => <select id={c.id} aria-describedby={c.describedBy} className="select" disabled={readOnly} value={token.disposition} onChange={(event) => commit({ ...token, disposition: event.target.value as WikiToken["disposition"] })}>
          {TOKEN_DISPOSITIONS.map((value) => <option key={value} value={value}>{DISPOSITION_LABELS[value] ?? value}</option>)}
        </select>}
      </FormField>
      <FormField label="Barras" wide group hint={token.bars.length ? token.bars.map(tokenBarText).join(" · ") : "Sem barras: a mesa usa as que você puser no token."}>
        {() => <div className="stack infobox-token-bars">
          {token.bars.map((item, index) => <div key={index} className="infobox-token-bar" role="group" aria-label={`Barra ${index + 1}`}>
            <label><span className="small muted">Nome</span><input className="input" disabled={readOnly} value={item.label} onChange={(event) => setToken(bar(index, { label: event.target.value }))} onBlur={() => commit(token)} /></label>
            <label><span className="small muted">Valor</span><input className="input" type="number" inputMode="numeric" disabled={readOnly} value={item.value} onChange={(event) => setToken(bar(index, { value: number(event.target.value) }))} onBlur={() => commit(token)} /></label>
            <label><span className="small muted">Máximo</span><input className="input" type="number" inputMode="numeric" disabled={readOnly} value={item.max} onChange={(event) => setToken(bar(index, { max: number(event.target.value) }))} onBlur={() => commit(token)} /></label>
            <button className="btn sm ghost" type="button" disabled={readOnly} onClick={() => commit({ ...token, bars: token.bars.filter((_, i) => i !== index) })}><Trash2 size={14} /> Remover</button>
          </div>)}
          {!readOnly && <button className="btn sm" type="button" onClick={() => commit({ ...token, bars: [...token.bars, { label: token.bars.length ? `Barra ${token.bars.length + 1}` : "PV", value: 10, max: 10, color: "#82aaa6" }] })}><Plus size={14} /> Acrescentar barra</button>}
        </div>}
      </FormField>
      <FormField label="Imagem do token" wide group hint={token.image ? undefined : "Sem imagem própria, a mesa usa o retrato ou o brasão."}>
        {() => readOnly
          ? <span className="small">{token.image ? token.image.split("/").pop() : "Usa o retrato"}</span>
          : <CoverImagePicker legend="Imagem do token" value={token.image ? `[[${token.image}]]` : ""} nearNote={note.path} onChange={(value) => { const image = value.replace(/^!?\[\[|\]\]$/g, "").trim(); const { image: _old, ...rest } = token; commit(image ? { ...rest, image } : rest) }} />}
      </FormField>
    </FormGrid>
    {!readOnly && <div className="row"><button type="button" className="btn sm" onClick={() => setImporting(true)}><Library size={14} /> Importar de um token salvo…</button></div>}
    {error && <p role="alert" className="small infobox-token-error">{error}</p>}
    {importing && <SavedTokenDialog note={note} onClose={() => setImporting(false)} onImported={(next) => { setImporting(false); commit(next(token)) }} />}
  </details>
}

/**
 * “Importar de um token salvo…” (U22): lista os tokens da biblioteca da mesa; o escolhido copia a imagem para o cofre
 * (um anexo perto da nota), vira o token da ficha e passa a lembrar a nota (`notePath`), como o “Da wiki” da mesa.
 * A biblioteca é do VTT: carrega só quando o diálogo abre.
 */
function SavedTokenDialog({ note, onClose, onImported }: { note: IndexedNote; onClose(): void; onImported(next: (current: WikiToken) => WikiToken): void }) {
  const vault = useVault()
  const [items, setItems] = useState<LibraryItem[] | null>(null)
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState<string>()
  const [error, setError] = useState<string>()
  useEffect(() => {
    let alive = true
    void import("../../vtt/library").then(async ({ library }) => {
      const list = library ? (await library.list()).filter((item) => item.kind === "token") : []
      if (alive) setItems(list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")))
    }).catch((err: unknown) => { if (alive) { setItems([]); setError(err instanceof Error ? err.message : String(err)) } })
    return () => { alive = false }
  }, [])
  const q = query.trim().toLocaleLowerCase("pt-BR")
  const shown = (items ?? []).filter((item) => !q || item.name.toLocaleLowerCase("pt-BR").includes(q))
  const choose = async (item: LibraryItem) => {
    setBusy(item.id); setError(undefined)
    try {
      const { library } = await import("../../vtt/library")
      if (!library) throw new Error("A biblioteca da mesa não está disponível neste aparelho.")
      const data = item.data as TokenData
      const image = data.image ? await vault.addAttachment(savedTokenFileName(item.name, data.image), await library.asset(data.image), note.path) : undefined
      const target = image ? vault.index?.linkTarget(image, note.path) ?? image : undefined
      onImported((current) => tokenFromSaved(data, target, current))
      // O item salvo passa a lembrar a nota: na mesa, “Importar de novo da nota” funciona com ele também.
      await library.save({ ...item, data: { ...data, notePath: note.path } }, (asset) => library.asset(asset))
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); setBusy(undefined) }
  }
  return <Modal title="Importar de um token salvo" onClose={() => !busy && onClose()} footer={<button className="btn ghost" onClick={onClose} disabled={Boolean(busy)}>Cancelar</button>}>
    <div className="stack">
      <p className="small muted">A imagem, o tamanho, a disposição e as barras do token escolhido passam para a ficha de {note.name}.</p>
      {items && items.length > 0 && <label className="search"><Search size={15} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar token salvo" aria-label="Buscar token salvo" /></label>}
      {items === null && <p className="small muted" role="status">Abrindo a biblioteca da mesa…</p>}
      {items?.length === 0 && !error && <p className="small muted">Nenhum token salvo. Na mesa, use “Guardar na biblioteca” no menu de um token.</p>}
      {items && items.length > 0 && shown.length === 0 && <p className="small muted" role="status">Nenhum token com “{query}”.</p>}
      {shown.length > 0 && <ul className="stack infobox-saved-tokens" aria-label="Tokens salvos">
        {shown.map((item) => {
          const data = item.data as TokenData
          const detail = [DISPOSITION_LABELS[data.disposition] ?? data.disposition, ...data.bars.map(tokenBarText)].join(" · ")
          return <li key={item.id} className="row between infobox-saved-token">
            <span className="grow" style={{ minWidth: 0 }}><strong className="truncate" style={{ display: "block" }}>{item.name}</strong><span className="small muted">{detail}</span></span>
            <button type="button" className="btn sm" disabled={Boolean(busy)} aria-label={`Usar ${item.name}`} onClick={() => void choose(item)}>{busy === item.id ? "Importando…" : "Usar"}</button>
          </li>
        })}
      </ul>}
      {error && <p role="alert" className="small infobox-token-error">{error}</p>}
    </div>
  </Modal>
}

function FieldEditor({ field, value, calendar, calendars, onSet }: { field: FieldDef; value: unknown; calendar: Calendar | null; calendars: Calendar[]; onSet(key: string, value: PropertyValue | undefined): Promise<void> }) {
  const initial = field.kind === "links" ? (Array.isArray(value) ? value.map(String) : value ? [String(value)] : []).map((v) => v.replace(/^\[\[|\]\]$/g, "")).join(", ") : field.kind === "link" || field.kind === "imagem" ? asText(value).replace(/^!?\[\[|\]\]$/g, "") : asText(value)
  const [text, setText] = useState(initial)
  const [error, setError] = useState<string>()
  const save = async () => {
    // As mesmas regras do Novo artigo (core/wiki-ficha.ts); a data leva a sigla do calendário no fim: "3999-02-12 OC".
    if (field.kind !== "data" && text === initial) return
    const result = fichaValue(field, text, calendars, calendar?.abbr)
    if ("error" in result) return setError(result.error)
    const next: PropertyValue = result.value
    if (field.kind === "data" && next === (typeof value === "string" ? value.trim() : value ?? null)) return setError(undefined)
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
            placeholder={field.kind === "data" ? `ANO-MM-DD ${calendar?.abbr ?? calendars[0]?.abbr ?? "SIGLA"}` : field.kind === "links" ? "Nota 1, Nota 2" : field.kind === "link" || field.kind === "imagem" ? "Nome da nota ou do arquivo" : ""}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            aria-label={field.label}
          />
        </div>
        {error && <span className="tiny" style={{ color: "var(--red)" }}>{error}</span>}
      </dd>
    </div>
  )
}
