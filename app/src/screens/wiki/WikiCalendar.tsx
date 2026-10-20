import { ResizablePanel } from "../../components/ResizablePanel"
import { worldEventOn } from "../../core/wiki-tools"
import { useMemo, useState } from "react"
import { CalendarDays, ChevronLeft, ChevronRight, Pencil } from "lucide-react"
import { addDays, addMonths, CalendarError, dateProblem, parseWorldDate, dayNumber, equivalentYears, eraOf, formatDate, formatYear, holidaysOn, monthLength, moons, parseCalendar, relative, season, weekday, weekdayIndex, worldDateText, type Calendar, type MoonState, type WorldDate } from "../../core/calendar"
import { findCodeBlocks, replaceCodeBlock, setBlockLine } from "../../core/codeblocks"
import { addCorrespondence, calendarOffsets, convertBetween, syncedTodays } from "../../core/calendar-sync"
import { noteName } from "../../core/text"
import { calendarFor, calendarInNote, datesMissingAbbr, listCalendars, noteDates, timelineEvents, type CalendarRef } from "../../core/wiki"
import { flushOpenNotes } from "../../lib/vault-notes"
import { useNoteSet } from "../../lib/note-set"
import { href, navigate } from "../../lib/router"
import { useToast } from "../../components/ui"
import { useVault } from "../../platform/VaultProvider"
import { articleRoute, useWiki } from "./wiki-state"

const MOON_GLYPHS = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"]

export function moonGlyph(state: MoonState): string {
  return MOON_GLYPHS[Math.round(state.age * 8) % 8]!
}

/** Grade de um mês do calendário fictício (dias intercalares, sem semana, viram uma faixa). */
function MonthGrid({ calendar, year, month, selected, onPick, marks }: { calendar: Calendar; year: number; month: number; selected?: WorldDate; onPick?(date: WorldDate): void; marks?: (date: WorldDate) => { label: string; color?: string; to?: string }[] }) {
  const length = monthLength(calendar, year, month)
  const days = Array.from({ length }, (_, i) => ({ year, month, day: i + 1 }))
  const intercalary = calendar.months[month - 1]?.intercalary || !calendar.weekdays.length
  const offset = intercalary ? 0 : weekdayIndex(calendar, { year, month, day: 1 })!
  const today = calendar.today
  const isToday = (d: WorldDate) => today && d.year === today.year && d.month === today.month && d.day === today.day
  const isSelected = (d: WorldDate) => selected && d.year === selected.year && d.month === selected.month && d.day === selected.day
  const cell = (d: WorldDate) => {
    const dayMoons = moons(calendar, d).filter((m) => m.fullToday || m.newToday)
    const items = marks?.(d) ?? []
    return (
      <button key={d.day} className={`fcell month-cell ${isToday(d) ? "today" : ""} ${isSelected(d) ? "picked" : ""}`} onClick={() => onPick?.(d)} aria-label={formatDate(calendar, d)}>
        <span className="row between">
          <span className="day-number">{d.day}</span>
          <span className="cell-moons">
            {dayMoons.map((m) => (
              <span key={m.moon.name} title={`${m.moon.name}: ${m.phase}`} style={m.moon.color ? { color: m.moon.color } : undefined}>
                {moonGlyph(m)}
              </span>
            ))}
          </span>
        </span>
        <span className="cell-events">
          {holidaysOn(calendar, d).map((h) => (
            <span key={h.name} className="event-pill" style={{ ["--ev" as string]: h.color ?? "var(--gold)" }}>
              {h.name}
            </span>
          ))}
          {items.slice(0, 3).map((item, i) => (
            <span key={i} className="event-pill" style={{ ["--ev" as string]: item.color ?? "var(--violet)" }}>
              {item.label}
            </span>
          ))}
          {items.length > 3 && <span className="tiny faint">+{items.length - 3}</span>}
        </span>
      </button>
    )
  }
  if (intercalary) return <div className="fmonth-strip">{days.map(cell)}</div>
  return (
    <div className="month fmonth" style={{ gridTemplateColumns: `repeat(${calendar.weekdays.length}, minmax(0, 1fr))` }}>
      {calendar.weekdays.map((w) => (
        <div key={w} className="month-head">
          {w}
        </div>
      ))}
      {Array.from({ length: offset }, (_, i) => (
        <span key={`v${i}`} />
      ))}
      {days.map(cell)}
    </div>
  )
}

/** Bloco ```runas-calendario``` dentro de uma nota: o resumo e o mês de "hoje" (ou o erro do YAML). */
export function CalendarBlock({ code }: { code: string }) {
  const set = useNoteSet()
  const here = set.resolve?.("", "wiki")?.path
  let calendar: Calendar
  try {
    calendar = parseCalendar(code)
  } catch (error) {
    return (
      <div className="callout aviso calendar-block">
        <div className="callout-title">Calendário com erro</div>
        <div className="callout-body small">{error instanceof CalendarError ? error.message : String(error)}</div>
      </div>
    )
  }
  const shown = calendar.today ?? { year: 1, month: 1, day: 1 }
  return (
    <div className="calendar-block card">
      <div className="row between">
        <strong className="row" style={{ gap: 6 }}>
          <CalendarDays size={16} /> {calendar.name}
        </strong>
        {here && (
          <a className="btn sm" href={href(`/wiki/calendario/${encodeURIComponent(here)}`)}>
            Abrir calendário
          </a>
        )}
      </div>
      <span className="tiny muted">
        {calendar.months.filter((m) => !m.intercalary).length} meses · semana de {calendar.weekdays.length} dias
        {calendar.months.some((m) => m.intercalary) ? ` · ${calendar.months.filter((m) => m.intercalary).map((m) => m.name).join(", ")} fora da semana` : ""}
        {calendar.moons.length ? ` · luas: ${calendar.moons.map((m) => `${m.name} (${m.cycle} d)`).join(", ")}` : ""}
      </span>
      {calendar.today && (
        <span className="small">
          Hoje no mundo: <strong>{formatDate(calendar, calendar.today)}</strong>
          {weekday(calendar, calendar.today) ? ` · ${weekday(calendar, calendar.today)}` : ""} {moons(calendar, calendar.today).map((m) => moonGlyph(m)).join(" ")}
        </span>
      )}
      <span className="eyebrow">{calendar.months[shown.month - 1]?.name} de {formatYear(calendar, shown.year)}</span>
      <MonthGrid calendar={calendar} year={shown.year} month={shown.month} />
    </div>
  )
}

/** Tela Calendário da wiki. */
export function WikiCalendar({ path }: { path?: string }) {
  const vault = useVault()
  const toast = useToast()
  const { wiki, calendar: main, players } = useWiki()
  const index = vault.index!
  const all = useMemo(() => listCalendars(index, wiki!.root), [index, wiki, vault.version])
  const chosenNote = path ? index.note(path) : undefined
  const chosen = chosenNote ? calendarInNote(chosenNote) : null
  const ref: CalendarRef | null = chosen && "calendar" in chosen ? chosen : main
  const error = chosen && "error" in chosen ? chosen.error : all.find((c) => "error" in c && (!path || c.path === path)) && !ref ? (all.find((c) => "error" in c) as { error: string }).error : null
  const calendar = ref?.calendar ?? null
  const [shown, setShown] = useState<{ year: number; month: number } | null>(null)
  const [selected, setSelected] = useState<WorldDate | null>(null)
  const readOnly = vault.info?.readOnly ?? true

  const today = calendar?.today ?? { year: 1, month: 1, day: 1 }
  const view = shown ?? { year: today.year, month: today.month }

  // Acontecimentos (data_mundo) e aniversários (nascimento_mundo) dos artigos neste calendário.
  const events = useMemo(() => (ref ? timelineEvents(index, wiki!.root, ref) : []), [index, wiki, ref, vault.version])
  const births = useMemo(() => {
    if (!ref) return []
    return index.notesIn(wiki!.root).flatMap((note) => {
      const born = noteDates(note.meta.frontmatter?.data).find((d) => d.key === "nascimento_mundo")?.date
      const found = born && calendarFor(index, note.path, born)
      return born && found && "calendar" in found && found.path === ref.path ? [{ path: note.path, born }] : []
    })
  }, [index, wiki, ref, vault.version])
  const calendarForForRecurrence = (path:string) => { const start=noteDates(index.note(path)?.meta.frontmatter?.data).find(d=>d.key==="data_mundo")?.date; const found=calendarFor(index,path,start); return found && "calendar" in found && found.path===ref?.path }
  const marks = (d: WorldDate) => {
    if (!calendar) return []
    const day = dayNumber(calendar, d)
    return [
      ...events.filter((e) => e.startDay <= day && e.endDay >= day && !(players && index.note(e.path)?.meta.frontmatter?.data?.segredo === true) && !index.note(e.path)?.meta.frontmatter?.data?.recorrencia_mundo).map((e) => ({ label: e.title, color: "var(--violet)", to: e.path })),
      ...index.notesIn(wiki!.root).filter(n=>{const data=n.meta.frontmatter?.data;return data?.recorrencia_mundo && !(players && data.segredo===true) && calendarForForRecurrence(n.path) && worldEventOn(data,calendar,d)}).map(n=>({label:n.name,color:"var(--violet)",to:n.path})),
      ...births.filter((b) => b.born.month === d.month && b.born.day === d.day && b.born.year <= d.year).map((b) => ({ label: `${noteName(b.path)} (${d.year - b.born.year})`, color: "var(--gold)", to: b.path })),
    ]
  }

  const refs = all.filter((c): c is CalendarRef => "calendar" in c)
  const [syncToday, setSyncToday] = useState(true)
  const linked = ref ? refs.filter((c) => c.path !== ref.path && calendarOffsets(refs, ref.path).has(c.path)) : []
  // Troca só a linha `hoje:` do bloco de um calendário.
  const writeToday = async (path: string, next: WorldDate) => {
    const note = index.note(path)
    const block = note ? findCodeBlocks(note.text, "runas-calendario")[0] : undefined
    if (!note || !block) return
    await vault.save(note.path, replaceCodeBlock(note.text, block, setBlockLine(block.content, "hoje", `"${worldDateText(next)}"`)))
  }
  const setToday = async (next: WorldDate, sync = syncToday) => {
    if (!ref) return
    const problem = dateProblem(ref.calendar, next)
    if (problem) throw new Error(problem)
    await writeToday(ref.path, next)
    // Calendários sincronizados andam junto: o mesmo dia, convertido pela correspondência.
    if (sync) for (const other of syncedTodays(refs, ref, next)) await writeToday(other.ref.path, other.today)
    setShown({ year: next.year, month: next.month })
  }
  const advance = (days: number | "mes") => {
    if (!calendar) return
    if (readOnly) return toast("Libere a gravação em Configurações para avançar o dia do mundo.")
    const next = days === "mes" ? addMonths(calendar, today, 1) : addDays(calendar, today, days)
    void setToday(next).catch((err: unknown) => toast(err instanceof Error ? err.message : String(err)))
  }

  if (!calendar) {
    return (
      <div className="page">
        <div className="card stack">
          <strong>Nenhum calendário nesta wiki</strong>
          <span className="muted small">{error ?? "Crie um artigo do tipo Calendário (Wiki › Novo artigo › Calendário): ele traz um bloco runas-calendario de exemplo para editar."}</span>
          {error && path && (
            <a className="btn sm" href={href(articleRoute(path))}>
              Corrigir o calendário
            </a>
          )}
        </div>
        <CalendarHelp />
      </div>
    )
  }

  const pick = selected ?? today
  const pickProblem = dateProblem(calendar, pick)
  // O dia escolhido nos calendários sincronizados (direta ou indiretamente, nos dois sentidos).
  const conversions = pickProblem ? [] : linked.flatMap((target) => { const date = convertBetween(refs, ref!, pick, target); return date ? [{ target, date }] : [] })
  const dayEvents = marks(pick)

  return (
    <div className="page wiki-calendar">
      {!players && !readOnly && <AbbrMigration root={wiki!.root} />}
      <div className="page-head">
        <div>
          <span className="eyebrow">{calendar.name} · sigla {calendar.abbr}</span>
          <h1 className="page-title">
            {calendar.months[view.month - 1]?.name} de {formatYear(calendar, view.year)}
          </h1>
          {calendar.today && (
            <span className="small muted">
              Hoje no mundo: <strong>{formatDate(calendar, calendar.today)}</strong>
              {weekday(calendar, calendar.today) ? ` · ${weekday(calendar, calendar.today)}` : ""}
            </span>
          )}
        </div>
        <div className="row-wrap">
          {all.length > 1 && (
            <select className="select" value={ref!.path} onChange={(e) => navigate(`/wiki/calendario/${encodeURIComponent(e.target.value)}`)} aria-label="Calendário">
              {all.map((c) => (
                <option key={c.path} value={c.path}>
                  {"calendar" in c ? c.calendar.name : `${noteName(c.path)} (com erro)`}
                </option>
              ))}
            </select>
          )}
          <div className="row" style={{ gap: 2 }}>
            <button className="icon-btn" onClick={() => setShown(view.month === 1 ? { year: view.year - 1, month: calendar.months.length } : { year: view.year, month: view.month - 1 })} aria-label="Mês anterior">
              <ChevronLeft size={18} />
            </button>
            <button className="btn sm" onClick={() => (setShown(null), setSelected(null))}>
              Hoje
            </button>
            <button className="icon-btn" onClick={() => setShown(view.month === calendar.months.length ? { year: view.year + 1, month: 1 } : { year: view.year, month: view.month + 1 })} aria-label="Próximo mês">
              <ChevronRight size={18} />
            </button>
          </div>
          <a className="btn sm ghost" href={href(articleRoute(ref!.path))} title="Editar o bloco do calendário">
            <Pencil size={14} /> Editar
          </a>
        </div>
      </div>

      <div className="agenda-layout">
        <div className="card flat agenda-main">
          <MonthGrid calendar={calendar} year={view.year} month={view.month} selected={pick} onPick={setSelected} marks={marks} />
        </div>
        <ResizablePanel id="agenda" label="Detalhes do calendário" side="right" width={320} className="stack-lg agenda-side">
          <section className="card stack">
            <span className="eyebrow">Dia escolhido</span>
            {pickProblem ? (
              <span className="small" style={{ color: "var(--red)" }}>{pickProblem}</span>
            ) : (
              <>
                <strong>{formatDate(calendar, pick)}</strong>
                <span className="small muted">
                  {[weekday(calendar, pick), season(calendar, pick), eraOf(calendar, pick.year) && `${eraOf(calendar, pick.year)!.year}º ano da ${eraOf(calendar, pick.year)!.era.name}`].filter(Boolean).join(" · ")}
                </span>
                {equivalentYears(calendar, pick.year).length > 0 && <span className="small muted">Também: {equivalentYears(calendar, pick.year).join(", ")}</span>}
                {conversions.map((c) => (
                  <span key={c.target.path} className="small muted">
                    {c.target.calendar.name}: {formatDate(c.target.calendar, c.date)}
                  </span>
                ))}
                <div className="stack" style={{ gap: 2 }}>
                  {moons(calendar, pick).map((m) => (
                    <span key={m.moon.name} className="small" style={m.moon.color ? { color: m.moon.color } : undefined}>
                      {moonGlyph(m)} {m.moon.name}: {m.phase}
                    </span>
                  ))}
                </div>
                {holidaysOn(calendar, pick).map((h) => (
                  <span key={h.name} className="chip gold">
                    {h.name}
                  </span>
                ))}
                {dayEvents.map((e, i) => (
                  <a key={i} href={href(articleRoute(e.to!))} className="list-item small">
                    {e.label}
                  </a>
                ))}
                {calendar.today && <span className="tiny faint">Em relação a hoje: {relative(calendar, pick, calendar.today)}</span>}
              </>
            )}
          </section>
          <section className="card stack">
            <span className="eyebrow">Avançar o dia do mundo</span>
            <span className="tiny muted">Atualiza idades, luas e "há quanto tempo" em toda a wiki.</span>
            <div className="row-wrap">
              <button className="btn sm" onClick={() => advance(1)} disabled={readOnly}>
                +1 dia
              </button>
              <button className="btn sm" onClick={() => advance(calendar.weekdays.length || 7)} disabled={readOnly}>
                +1 semana
              </button>
              <button className="btn sm" onClick={() => advance("mes")} disabled={readOnly}>
                +1 mês
              </button>
              {selected && !pickProblem && (
                <button className="btn sm primary" onClick={() => (readOnly ? toast("Cofre em somente leitura.") : void setToday(pick))} disabled={readOnly}>
                  Este dia vira hoje
                </button>
              )}
            </div>
            <TypedToday key={`${ref!.path}:${calendar.today ? worldDateText(calendar.today) : ""}`} calendar={calendar} readOnly={readOnly} onSet={(next) => setToday(next)} />
            {linked.length > 0 && (
              <label className="check small">
                <input type="checkbox" checked={syncToday} onChange={(e) => setSyncToday(e.target.checked)} /> Atualizar também {linked.map((c) => c.calendar.name).join(", ")}
              </label>
            )}
          </section>
          {refs.length > 1 && <SyncCalendars key={ref!.path} refs={refs} current={ref!} readOnly={readOnly} onAlign={() => calendar.today && setToday(calendar.today, true)} />}
          <CalendarHelp compact />
        </ResizablePanel>
      </div>
    </div>
  )
}

function CalendarHelp({ compact }: { compact?: boolean }) {
  return (
    <details className="card calendar-help" open={!compact}>
      <summary className="small">Como escrever um calendário</summary>
      <p className="small muted">
        Numa nota da wiki, um bloco <code>```runas-calendario</code> em YAML: <code>meses</code> (nome, dias, estação, <code>intercalar: true</code> para dias fora da semana), <code>semana</code>,{" "}
        <code>bissexto</code> (a_cada, exceto_a_cada, salvo_a_cada, mes, dias), <code>luas</code> (ciclo e uma data de cheia), <code>eras</code>, <code>feriados</code> (MM-DD todo ano ou uma data),{" "}
        <code>equivalentes</code> (outra contagem de anos), <code>correspondencias</code> (o mesmo dia em outro calendário: sincroniza os dois, e o cartão "Sincronizar calendários" grava isso para você) e <code>hoje</code>.
      </p>
      <p className="small muted">
        Dê ao calendário uma <code>sigla</code> (ex.: <code>sigla: OC</code>). Nos artigos, as datas ficam em propriedades que terminam em <code>_mundo</code>, no formato <code>ANO-MM-DD SIGLA</code>:{" "}
        <code>nascimento_mundo: "3999-02-12 OC"</code>, <code>data_mundo</code>, <code>morte_mundo</code>… É a sigla que escolhe o calendário. A ficha calcula idade, dia da semana, lua, estação, era e "há quanto tempo".
      </p>
    </details>
  )
}

/** Datas antigas, sem sigla: regrava cada uma como "ANO-MM-DD SIGLA", com o calendário que já valia para ela. */
function AbbrMigration({ root }: { root: string }) {
  const vault = useVault()
  const toast = useToast()
  const index = vault.index!
  const [busy, setBusy] = useState(false)
  const pending = useMemo(() => index.notesIn(root).flatMap((note) => { const dates = datesMissingAbbr(index, note.path); return dates.length ? [{ path: note.path, dates }] : [] }), [index, root, vault.version])
  if (!pending.length) return null
  const run = async () => {
    setBusy(true)
    try {
      await flushOpenNotes()
      for (const note of pending) for (const d of note.dates) await vault.setProperty(note.path, d.key, d.text)
      toast(`Sigla acrescentada às datas de ${pending.length} ${pending.length === 1 ? "nota" : "notas"}.`)
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="card row-wrap" style={{ marginBottom: 12 }} role="status">
      <span className="small" style={{ flex: "1 1 260px" }}>
        {pending.length} {pending.length === 1 ? "nota tem" : "notas têm"} datas sem a sigla do calendário (ex.: <code>{pending[0]!.dates[0]!.text}</code>). As datas agora levam a sigla, que escolhe o calendário.
      </span>
      <button className="btn sm primary" disabled={busy} onClick={() => void run()}>Acrescentar a sigla</button>
    </div>
  )
}

/** Digitar o dia de hoje do mundo, em vez de avançar pelos botões. */
function TypedToday({ calendar, readOnly, onSet }: { calendar: Calendar; readOnly: boolean; onSet(next: WorldDate): Promise<void> }) {
  const toast = useToast()
  const [text, setText] = useState(calendar.today ? worldDateText(calendar.today) : "")
  const [error, setError] = useState("")
  const submit = () => {
    const date = parseWorldDate(text.trim())
    const problem = !date ? "Use ANO-MM-DD (ex.: 4031-07-15)." : dateProblem(calendar, date)
    if (problem) return setError(problem)
    setError("")
    onSet(date!).then(() => toast(`Hoje no mundo: ${formatDate(calendar, date!)}`), (err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }
  return (
    <form className="stack" style={{ gap: 4 }} onSubmit={(e) => { e.preventDefault(); if (!readOnly) submit() }}>
      <span className="tiny muted">Ou digite o dia de hoje:</span>
      <div className="row" style={{ gap: 6 }}>
        <input className="input sm mono" value={text} onChange={(e) => setText(e.target.value)} placeholder="ANO-MM-DD" aria-label="Dia de hoje no mundo" disabled={readOnly} style={{ flex: 1, minWidth: 0 }} />
        <button className="btn sm primary" disabled={readOnly || !text.trim()}>Definir hoje</button>
      </div>
      {error && <span className="tiny" role="alert" style={{ color: "var(--red)" }}>{error}</span>}
    </form>
  )
}

/**
 * Sincronizar com outro calendário: grava uma correspondência (o mesmo dia nos dois) no bloco deste calendário. Com
 * ela, o "hoje" dos dois anda junto, as datas se convertem e a linha do tempo põe os dois no mesmo eixo.
 */
function SyncCalendars({ refs, current, readOnly, onAlign }: { refs: CalendarRef[]; current: CalendarRef; readOnly: boolean; onAlign(): void }) {
  const vault = useVault()
  const toast = useToast()
  const others = refs.filter((c) => c.path !== current.path)
  const offsets = calendarOffsets(refs, current.path)
  const [target, setTarget] = useState(others.find((c) => !offsets.has(c.path))?.path ?? others[0]?.path ?? "")
  const [here, setHere] = useState("")
  const [there, setThere] = useState("")
  const [error, setError] = useState("")
  const other = others.find((c) => c.path === target)
  const mismatched = current.calendar.today ? syncedTodays(refs, current, current.calendar.today).filter((s) => !s.ref.calendar.today || worldDateText(s.ref.calendar.today) !== worldDateText(s.today)) : []
  const save = async () => {
    const a = parseWorldDate(here.trim())
    const b = parseWorldDate(there.trim())
    const problem = !a || !b ? "Use ANO-MM-DD nas duas datas." : dateProblem(current.calendar, a) ?? (other ? dateProblem(other.calendar, b) : "Escolha o outro calendário.")
    if (problem) return setError(problem)
    const note = vault.index!.note(current.path)
    const block = note ? findCodeBlocks(note.text, "runas-calendario")[0] : undefined
    if (!note || !block || !other) return
    setError("")
    await vault.save(note.path, replaceCodeBlock(note.text, block, addCorrespondence(block.content, noteName(other.path), a!, b!)))
    toast(`${current.calendar.name} e ${other.calendar.name} sincronizados.`)
    setHere("")
    setThere("")
  }
  return (
    <section className="card stack">
      <span className="eyebrow">Sincronizar calendários</span>
      {offsets.size > 1 ? (
        <span className="small">
          Ligado a: {others.filter((c) => offsets.has(c.path)).map((c) => `${c.calendar.name}${current.calendar.today ? ` (hoje: ${formatDate(c.calendar, syncedTodays(refs, current, current.calendar.today).find((s) => s.ref.path === c.path)!.today)})` : ""}`).join("; ")}
        </span>
      ) : (
        <span className="tiny muted">Diga qual dia deste calendário é o mesmo dia no outro. Daí o app calcula a diferença e mantém os dois alinhados.</span>
      )}
      {mismatched.length > 0 && !readOnly && (
        <div className="stack" style={{ gap: 4 }}>
          <span className="tiny" style={{ color: "var(--gold)" }}>O hoje de {mismatched.map((m) => m.ref.calendar.name).join(", ")} não bate com este.</span>
          <button className="btn sm" onClick={onAlign}>Alinhar o hoje deles com este</button>
        </div>
      )}
      {!readOnly && others.length > 0 && (
        <form className="stack" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); void save().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err))) }}>
          <label className="field">
            <span className="tiny muted">O dia</span>
            <input className="input sm mono" value={here} onChange={(e) => setHere(e.target.value)} placeholder={`ANO-MM-DD (${current.calendar.abbr})`} aria-label={`Dia em ${current.calendar.name}`} />
          </label>
          <label className="field">
            <span className="tiny muted">é o mesmo dia que, no calendário</span>
            <select className="select" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Outro calendário">
              {others.map((c) => <option key={c.path} value={c.path}>{c.calendar.name} ({c.calendar.abbr})</option>)}
            </select>
          </label>
          <input className="input sm mono" value={there} onChange={(e) => setThere(e.target.value)} placeholder={`ANO-MM-DD (${other?.calendar.abbr ?? ""})`} aria-label="Dia no outro calendário" />
          {error && <span className="tiny" role="alert" style={{ color: "var(--red)" }}>{error}</span>}
          <button className="btn sm primary" disabled={!here.trim() || !there.trim()}>Sincronizar</button>
        </form>
      )}
    </section>
  )
}
