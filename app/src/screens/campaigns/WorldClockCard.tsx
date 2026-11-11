import { useEffect, useId, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronDown, Clock3, Plus, Trash2 } from "lucide-react"
import { addMonths, formatDate, noteDateText, parseWorldDate, type Calendar, type WorldDate } from "../../core/calendar"
import { noteName } from "../../core/text"
import { advanceWorldClock, clockProblem, clockText, durationText, handAngles, minutesPerDay, minutesPerTurn, nextPeriodIn, parseWorldClock, type WorldClock } from "../../core/world-clock"
import { worldDateAhead } from "../../core/world-today"
import { FormField, FormGrid } from "../../components/kit/FormField"
import { Notice } from "../../components/kit/Layout"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import { WorldDateField } from "../../components/kit/WorldDateField"
import { Modal, useToast } from "../../components/ui"
import { navigate } from "../../lib/router"
import { useSetWorldClock } from "../wiki/world-today"
import type { CampaignData } from "./campaign-state"
import { useFollowWiki, useSetCampaignTime } from "./campaign-time"

const calendarRoute = (path: string) => `/wiki/calendario/${encodeURIComponent(path)}`

/** O texto que o mostrador desenha, dito por extenso (é o `aria-label` do desenho e o que aparece ao lado). */
function clockSentence(clock: WorldClock, calendar: Calendar | null, today: WorldDate | undefined): string {
  const next = nextPeriodIn(clock)
  // Sufixos como “C.E.” já terminam em ponto: não dobra.
  return [`${clock.hora}, ${clock.periodo}`, today && calendar ? formatDate(calendar, today) : "", `${next.period} em ${durationText(next.minutes, clock)}`]
    .filter(Boolean).map((part) => part.replace(/\.$/, "")).join(". ")
}

/**
 * Mostrador do relógio (D11, D16): uma volta é um período, então o anel em `--cyan` mostra quanto dele passou; as
 * marcas seguem as horas do relógio e os números ficam só nos quartos (≥ 12 px). Nada se anima.
 */
function Dial({ clock, label }: { clock: WorldClock; label: string }) {
  const { hour, minute, progress } = handAngles(clock)
  const point = (deg: number, r: number) => { const a = (deg - 90) * Math.PI / 180; return [80 + Math.cos(a) * r, 80 + Math.sin(a) * r] as const }
  const marks = clock.horas <= 24 ? Array.from({ length: clock.horas }, (_, i) => (i / clock.horas) * 360) : [0, 90, 180, 270]
  const quarters = clock.horas % 4 === 0 ? [0, 1, 2, 3].map((q) => ({ deg: q * 90, text: String(q === 0 ? clock.horas : (clock.horas / 4) * q) })) : [{ deg: 0, text: String(clock.horas) }]
  const [ex, ey] = point(Math.min(progress, 0.9999) * 360, 70)
  const arc = progress <= 0 ? "" : `M80 10 A70 70 0 ${progress > 0.5 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
  const [hx, hy] = point(hour, 34), [mx, my] = point(minute, 50)
  return <svg className="world-clock-dial" viewBox="0 0 160 160" role="img" aria-label={label}>
    <circle className="ring" cx="80" cy="80" r="70" />
    {arc && <path className="progress" d={arc} />}
    <circle className="face" cx="80" cy="80" r="62" />
    {marks.map((deg) => { const [x1, y1] = point(deg, 56), [x2, y2] = point(deg, 61); return <line key={deg} className="tick" x1={x1} y1={y1} x2={x2} y2={y2} /> })}
    {quarters.map((q) => { const [x, y] = point(q.deg, 43); return <text key={q.deg} className="num" x={x} y={y + 5} textAnchor="middle">{q.text}</text> })}
    <line className="minute" x1="80" y1="80" x2={mx} y2={my} />
    <line className="hour" x1="80" y1="80" x2={hx} y2={hy} />
    <circle className="pin" cx="80" cy="80" r="5" />
  </svg>
}

/**
 * Relógio do mundo no Painel (U30), no lugar dos relógios de ameaça (que foram para Missões › Relógios). A hora e o
 * período ficam no bloco do calendário da wiki da campanha, com o “hoje”: avançar o relógio vira o dia quando passa
 * do último período. Sem botão principal no cartão (D2); “Avançar” é um menu que diz quanto avança (D8).
 */
export function WorldClockCard({ data }: { data: CampaignData }) {
  const toast = useToast()
  const setClock = useSetWorldClock()
  const setCampaignTime = useSetCampaignTime()
  const followWiki = useFollowWiki()
  const [dialog, setDialog] = useState<"ajustar" | "configurar" | null>(null)
  const [said, setSaid] = useState("")
  const { calendar, calendarRef: ref } = data
  const clock = useMemo(() => parseWorldClock(calendar), [calendar])
  const today = calendar?.today

  if (!calendar || !ref) return <section className="card stack world-clock-card">
    <span className="section-title row"><Clock3 size={16} aria-hidden="true" /> Relógio do mundo</span>
    <Notice title="Esta campanha ainda não tem calendário do mundo." actions={<button type="button" className="btn sm" onClick={() => navigate("/wiki/calendario")}>Abrir os calendários</button>}>
      {data.campaign.wiki ? `O relógio usa o “hoje” do calendário da wiki ${data.campaign.wiki}. Crie um em Wiki › Novo artigo › Calendário.` : "O relógio usa o “hoje” do calendário da wiki da campanha. Ligue uma wiki à campanha (propriedade wiki da nota da campanha)."}
    </Notice>
  </section>

  const write = async (next: WorldClock, nextToday?: WorldDate) => {
    try {
      // U39: o ponteiro e a data são da campanha (gravados na nota dela); sem data nenhuma, fica no calendário.
      const when = nextToday ?? today
      if (when) await setCampaignTime(data, when, next)
      else await setClock(ref, next)
      const text = clockSentence(next, calendar, nextToday ?? today)
      setSaid(text)
      return true
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
      return false
    }
  }
  // A regra do relógio (horas, minutos, períodos) é do mundo: vai para o calendário, sem trocar a hora da wiki.
  const saveRule = async (rule: WorldClock) => {
    const wiki = parseWorldClock(ref.calendar)
    try {
      await setClock(ref, { ...rule, hora: wiki.hora, periodo: rule.periodos.includes(wiki.periodo) ? wiki.periodo : rule.periodos[0]! })
      if (data.ownTime && today) await setCampaignTime(data, today, { ...rule, hora: clock.hora, periodo: rule.periodos.includes(clock.periodo) ? clock.periodo : rule.periodos[0]! })
      return true
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err))
      return false
    }
  }
  const advance = (minutes: number) => { const next = advanceWorldClock(calendar, today, clock, minutes); void write(next.clock, next.today) }
  const toDate = (date: WorldDate) => void write(clock, date)

  const next = nextPeriodIn(clock)
  const week = calendar.weekdays.length || 7
  // “Até a próxima sessão”: a data da próxima sessão marcada ou, sem ela, a da última jogada, se ficam depois de hoje.
  const ahead = [data.upcoming, [...data.sessions].reverse().find((s) => s.status === "realizada")]
    .flatMap((s) => { const date = s ? worldDateAhead(calendar, s.worldDate) : null; return s && date ? [{ session: s, date }] : [] })[0]
  const advanceItems: MenuEntry[] = [
    { label: `Até ${next.newDay ? "o próximo dia" : `a ${next.period}`}`, hint: `próximo período, ${durationText(next.minutes, clock)}`, onSelect: () => advance(next.minutes) },
    { label: "1 dia", onSelect: () => advance(minutesPerDay(clock)) },
    { label: `1 semana (${week} dias)`, onSelect: () => advance(minutesPerDay(clock) * week) },
    ...(today ? [{ label: "1 mês", onSelect: () => toDate(addMonths(calendar, today, 1)) }] : []),
    ...(ahead ? ["separator" as const, { label: `Até a ${noteName(ahead.session.path)}`, hint: formatDate(calendar, ahead.date), onSelect: () => toDate(ahead.date) }] : []),
  ]
  const moreItems: MenuEntry[] = [
    { label: "Ajustar data e hora…", onSelect: () => setDialog("ajustar"), disabled: data.readOnly },
    { label: "Configurar o relógio…", onSelect: () => setDialog("configurar"), disabled: data.readOnly },
    ...(data.ownTime ? [{ label: "Voltar a seguir a wiki", hint: "a data e a hora do calendário", onSelect: () => void followWiki(data).then(() => setSaid("A campanha segue a data da wiki")).catch((err: unknown) => toast(err instanceof Error ? err.message : String(err))), disabled: data.readOnly }] : []),
    "separator",
    { label: "Abrir o calendário", onSelect: () => navigate(calendarRoute(ref.path)) },
  ]
  const sentence = clockSentence(clock, calendar, today)
  const step = Math.min(10, clock.minutos)

  return <section className="card stack world-clock-card">
    <div className="world-clock-head">
      <span className="section-title row"><Clock3 size={16} aria-hidden="true" /> Relógio do mundo</span>
      <span className="small muted world-clock-calendar" title={data.ownTime ? "Data e hora gravadas na nota da campanha" : "Segue o “hoje” do calendário da wiki; mudar daqui dá à campanha a sua própria data"}>{calendar.name} · {data.ownTime ? "tempo desta campanha" : "segue a wiki"}</span>
      <OverflowMenu label="Mais ações do relógio" items={moreItems} />
    </div>
    <div className="world-clock">
      <Dial clock={clock} label={`Relógio do mundo: ${sentence}`} />
      <div className="world-clock-text">
        <span className="world-clock-time">{clock.hora}</span>
        <span>{today ? formatDate(calendar, today) : "Sem data no mundo: use Ajustar data e hora."}</span>
        <span className="world-clock-periods">
          {clock.periodos.map((period, at) => <span key={period} className={period === clock.periodo ? "now" : "muted"}>{at > 0 && "· "}{period === clock.periodo ? `${period}, agora` : period}</span>)}
        </span>
        <span className="small muted">{next.period} em {durationText(next.minutes, clock)}{next.newDay ? ", no dia seguinte" : ""}</span>
      </div>
    </div>
    <div className="world-clock-actions">
      <button type="button" className="btn sm" disabled={data.readOnly} onClick={() => advance(step)}>+{step} min</button>
      <button type="button" className="btn sm" disabled={data.readOnly} onClick={() => advance(clock.minutos)}>+1 h</button>
      {data.readOnly
        ? <button type="button" className="btn sm" disabled>Avançar <ChevronDown size={14} aria-hidden="true" /></button>
        : <OverflowMenu label="Avançar o mundo" heading="Avançar o mundo" triggerClassName="btn sm" align="start" trigger={<>Avançar <ChevronDown size={14} aria-hidden="true" /></>} items={advanceItems} />}
    </div>
    {data.readOnly && <p className="small muted">O cofre está só para leitura: o relógio não avança daqui.</p>}
    <p className="sr-only" role="status">{said && `Agora: ${said}.`}</p>
    {dialog === "ajustar" && <AdjustDialog calendar={calendar} clock={clock} today={today} onClose={() => setDialog(null)} onSave={(c, d) => write(c, d)} />}
    {dialog === "configurar" && <ConfigureDialog clock={clock} onClose={() => setDialog(null)} onSave={(c) => saveRule(c)} />}
  </section>
}

/** Ajustar data e hora: data, hora e período juntos, gravados de uma vez no bloco do calendário. */
function AdjustDialog({ calendar, clock, today, onClose, onSave }: {
  calendar: Calendar; clock: WorldClock; today: WorldDate | undefined; onClose(): void; onSave(clock: WorldClock, today?: WorldDate): Promise<boolean>
}) {
  const [date, setDate] = useState(today ? noteDateText(today, calendar) : "")
  const [hora, setHora] = useState(clock.hora)
  const [periodo, setPeriodo] = useState(clock.periodo)
  const [errors, setErrors] = useState<{ date?: string; hora?: string }>({})
  const [busy, setBusy] = useState(false)
  const save = async () => {
    const parsed = date.trim() ? parseWorldDate(date) : null
    const dateError = date.trim() && !parsed ? "Preencha dia, mês e ano." : !date.trim() && today ? "A data não pode ficar vazia." : undefined
    const next = { ...clock, hora: hora.trim().padStart(5, "0"), periodo }
    const horaError = clockProblem(next) ?? undefined
    if (dateError || horaError) return setErrors({ date: dateError, hora: horaError })
    setBusy(true)
    const done = await onSave(next, parsed ? { year: parsed.year, month: parsed.month, day: parsed.day } : undefined)
    setBusy(false)
    if (done) onClose()
  }
  return <Modal title="Ajustar data e hora" onClose={onClose} footer={<>
    <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
    <button type="button" className="btn primary" onClick={() => void save()} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
  </>}>
    <form onSubmit={(event) => { event.preventDefault(); void save() }}>
      <FormGrid>
        <FormField label="Data no mundo" wide group error={errors.date} hint={`Dia, mês e ano (${calendar.name})`}>
          {(control) => <WorldDateField id={control.id} value={date} onChange={(value) => { setDate(value); setErrors({}) }} calendars={[calendar]} calendar={calendar} describedBy={control.describedBy} invalid={control.invalid} labelledBy={control.labelId} />}
        </FormField>
        <FormField label="Hora (HH:MM)" error={errors.hora} hint={`De 00:00 a ${clockText(minutesPerTurn(clock) - 1, clock)}`}>
          {(control) => <input id={control.id} className="input mono" inputMode="numeric" autoComplete="off" value={hora} onChange={(event) => { setHora(event.target.value); setErrors({}) }} aria-describedby={control.describedBy} aria-invalid={control.invalid || undefined} />}
        </FormField>
        <FormField label="Período">
          {(control) => <select id={control.id} className="select" value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
            {clock.periodos.map((period) => <option key={period} value={period}>{period}</option>)}
          </select>}
        </FormField>
      </FormGrid>
    </form>
  </Modal>
}

interface PeriodRow { key: number; name: string; was?: string }

/** Configurar o relógio: horas por volta, minutos por hora e um campo por período (subir, descer, remover). */
function ConfigureDialog({ clock, onClose, onSave }: { clock: WorldClock; onClose(): void; onSave(clock: WorldClock): Promise<boolean> }) {
  const ids = useId()
  const [horas, setHoras] = useState(String(clock.horas))
  const [minutos, setMinutos] = useState(String(clock.minutos))
  const [rows, setRows] = useState<PeriodRow[]>(() => clock.periodos.map((name, key) => ({ key, name, was: name })))
  const [nextKey, setNextKey] = useState(clock.periodos.length)
  const [error, setError] = useState<{ horas?: string; minutos?: string; periodos?: string }>({})
  const [busy, setBusy] = useState(false)
  const move = (at: number, by: -1 | 1) => setRows((list) => { const copy = [...list]; const [row] = copy.splice(at, 1); copy.splice(at + by, 0, row!); return copy })
  // O campo do período novo recebe o foco depois de desenhado.
  const [focusKey, setFocusKey] = useState<number | null>(null)
  useEffect(() => { if (focusKey !== null) document.getElementById(`${ids}-periodo-${focusKey}`)?.focus() }, [focusKey, ids])
  const add = () => { setRows((list) => [...list, { key: nextKey, name: "" }]); setFocusKey(nextKey); setNextKey((k) => k + 1) }

  const save = async () => {
    const h = Number(horas), m = Number(minutos)
    const periodos = rows.map((row) => row.name.trim())
    // O período atual acompanha a troca de nome; se foi removido, o relógio fica no primeiro.
    const current = rows.find((row) => row.was === clock.periodo)?.name.trim() ?? periodos[0] ?? ""
    const [hh = 0, mm = 0] = clock.hora.split(":").map(Number)
    const fits = hh < h && mm < m
    const next: WorldClock = { hora: fits ? clock.hora : "00:00", periodo: current, horas: h, minutos: m, periodos }
    const problem = clockProblem(next)
    if (problem) {
      return setError(/Horas/.test(problem) ? { horas: problem } : /Minutos/.test(problem) ? { minutos: problem } : { periodos: problem })
    }
    setBusy(true)
    const done = await onSave(next)
    setBusy(false)
    if (done) onClose()
  }

  return <Modal title="Configurar o relógio" onClose={onClose} footer={<>
    <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Cancelar</button>
    <button type="button" className="btn primary" onClick={() => void save()} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
  </>}>
    <form onSubmit={(event) => { event.preventDefault(); void save() }}>
      <FormGrid>
        <FormField label="Horas por volta" error={error.horas} hint="Uma volta do mostrador é um período">
          {(control) => <input id={control.id} className="input mono" inputMode="numeric" value={horas} onChange={(event) => { setHoras(event.target.value.replace(/\D/g, "").slice(0, 2)); setError({}) }} aria-describedby={control.describedBy} aria-invalid={control.invalid || undefined} />}
        </FormField>
        <FormField label="Minutos por hora" error={error.minutos} hint="De 1 a 99">
          {(control) => <input id={control.id} className="input mono" inputMode="numeric" value={minutos} onChange={(event) => { setMinutos(event.target.value.replace(/\D/g, "").slice(0, 2)); setError({}) }} aria-describedby={control.describedBy} aria-invalid={control.invalid || undefined} />}
        </FormField>
        <FormField label="Períodos, em ordem" wide group error={error.periodos} hint="Uma volta completa passa ao próximo período; depois do último, o dia avança.">
          {(control) => <div className="world-clock-period-list">
            <ol>
              {rows.map((row, at) => <li key={row.key}>
                <input id={`${ids}-periodo-${row.key}`} className="input" value={row.name} aria-label={`Período ${at + 1}`} aria-describedby={control.describedBy} aria-invalid={control.invalid || undefined}
                  onChange={(event) => { const name = event.target.value; setRows((list) => list.map((r) => (r.key === row.key ? { ...r, name } : r))); setError({}) }} />
                <button type="button" className="icon-btn" aria-label={`Subir ${row.name || `período ${at + 1}`}`} title="Subir" disabled={at === 0} onClick={() => move(at, -1)}><ArrowUp size={16} /></button>
                <button type="button" className="icon-btn" aria-label={`Descer ${row.name || `período ${at + 1}`}`} title="Descer" disabled={at === rows.length - 1} onClick={() => move(at, 1)}><ArrowDown size={16} /></button>
                <button type="button" className="icon-btn" aria-label={`Remover ${row.name || `período ${at + 1}`}`} title="Remover" disabled={rows.length === 1} onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}><Trash2 size={16} /></button>
              </li>)}
            </ol>
            <button type="button" className="btn sm ghost" onClick={add}><Plus size={15} aria-hidden="true" /> Acrescentar período</button>
          </div>}
        </FormField>
      </FormGrid>
    </form>
  </Modal>
}
