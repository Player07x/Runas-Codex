import { useState } from "react"
import { EVENT_COLORS, type AgendaEvent, type EventInput, type Repeat } from "../../core/agenda"
import { Modal, Switch } from "../../components/ui"
import { WEEKDAYS } from "./views"

type RepeatChoice = "none" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom"

const SIMPLE_RULES: Record<string, RepeatChoice> = { "FREQ=WEEKLY;INTERVAL=2": "biweekly", "FREQ=MONTHLY": "monthly", "FREQ=YEARLY": "yearly" }
const REMINDER_OPTIONS: [number, string][] = [
  [0, "Na hora"],
  [15, "15 minutos antes"],
  [60, "1 hora antes"],
  [180, "3 horas antes"],
  [1440, "1 dia antes"],
  [2880, "2 dias antes"],
  [10080, "1 semana antes"],
]
const COLOR_NAMES: Record<string, string> = { red: "Vermelho", gold: "Dourado", cyan: "Lavanda", violet: "Violeta", green: "Verde" }

/** Separa `;UNTIL=AAAAMMDD…` de uma regra (o fim da repetição tem campo próprio). */
function splitUntil(rule: string): { rule: string; until?: string } {
  const m = /;UNTIL=(\d{4})(\d{2})(\d{2})[^;]*/i.exec(rule)
  return m ? { rule: rule.replace(m[0], ""), until: `${m[1]}-${m[2]}-${m[3]}` } : { rule }
}

function repeatChoice(repeat: Repeat): { choice: RepeatChoice; days: number[]; custom: string; until?: string } {
  if (repeat.kind === "none") return { choice: "none", days: [], custom: "" }
  if (repeat.kind === "weekly") return { choice: "weekly", days: repeat.days, custom: "" }
  const { rule, until } = splitUntil(repeat.rule)
  const choice = SIMPLE_RULES[rule]
  return choice ? { choice, days: [], custom: "", until } : { choice: "custom", days: [], custom: repeat.rule }
}

interface SessionOption {
  /** Pasta onde a nota da sessão nova é criada (`Campanhas/<campanha>/Sessões`). */
  folder: string
  label: string
}

interface Props {
  /** Evento existente (editar) ou valores iniciais (novo). */
  initial: Partial<EventInput> & Pick<EventInput, "date">
  editing?: AgendaEvent
  sessionNotes: string[]
  sessionFolders: SessionOption[]
  onSave(input: EventInput, createSessionIn: string | null): Promise<void>
  onClose(): void
}

export function EventDialog({ initial, editing, sessionNotes, sessionFolders, onSave, onClose }: Props) {
  const start = repeatChoice(initial.repeat ?? { kind: "none" })
  const [title, setTitle] = useState(initial.title ?? "")
  const [allDay, setAllDay] = useState(initial.allDay ?? false)
  const [date, setDate] = useState(initial.date)
  const [endDate, setEndDate] = useState(initial.endDate ?? "")
  const [startTime, setStartTime] = useState(initial.startTime ?? "19:00")
  const [endTime, setEndTime] = useState(initial.endTime ?? "")
  const [choice, setChoice] = useState<RepeatChoice>(start.choice)
  const [days, setDays] = useState<number[]>(start.days.length ? start.days : [new Date(`${initial.date}T12:00`).getDay()])
  const [custom, setCustom] = useState(start.custom || "FREQ=WEEKLY;BYDAY=SA")
  const [until, setUntil] = useState(initial.until ?? start.until ?? "")
  const [reminders, setReminders] = useState<number[]>(initial.reminders ?? [])
  const [location, setLocation] = useState(initial.location ?? "")
  const [category, setCategory] = useState(initial.category ?? "")
  const [color, setColor] = useState(initial.color ?? "")
  const [session, setSession] = useState(initial.session ?? "")
  const [createSession, setCreateSession] = useState("")
  const [countdown, setCountdown] = useState(initial.countdown ?? false)
  const [notes, setNotes] = useState(initial.notes ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const untilRule = until ? `;UNTIL=${until.replace(/-/g, "")}` : ""
  const repeat: Repeat =
    choice === "none" ? { kind: "none" }
    : choice === "weekly" ? { kind: "weekly", days: days.length ? [...days].sort() : [new Date(`${date}T12:00`).getDay()] }
    : choice === "biweekly" ? { kind: "rrule", rule: `FREQ=WEEKLY;INTERVAL=2${untilRule}` }
    : choice === "monthly" ? { kind: "rrule", rule: `FREQ=MONTHLY${untilRule}` }
    : choice === "yearly" ? { kind: "rrule", rule: `FREQ=YEARLY${untilRule}` }
    : { kind: "rrule", rule: custom.trim().replace(/^RRULE:/i, "") }

  const problem =
    !title.trim() ? "Dê um título ao evento."
    : !date ? "Escolha a data."
    : !allDay && !/^\d{2}:\d{2}$/.test(startTime) ? "Escolha o horário de início."
    : endDate && endDate < date ? "O fim não pode ser antes do início."
    : choice === "custom" && !/^FREQ=/i.test(custom.trim()) ? "A regra personalizada começa com FREQ= (formato RRULE do iCalendar)."
    : null

  const save = async () => {
    if (problem) return setError(problem)
    setBusy(true)
    setError(undefined)
    const input: EventInput = {
      title: title.trim(),
      allDay,
      date,
      ...(endDate && endDate > date && choice === "none" ? { endDate } : {}),
      ...(allDay ? {} : { startTime, ...(endTime ? { endTime } : {}) }),
      repeat,
      ...(choice === "weekly" && until ? { until } : {}),
      skipDates: editing?.repeat.kind === "rrule" && repeat.kind === "rrule" ? editing.skipDates : [],
      ...(editing?.completed !== undefined ? { completed: editing.completed } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
      ...(color ? { color: color as EventInput["color"] } : {}),
      reminders: [...new Set(reminders)].sort((a, b) => a - b),
      ...(session.trim() ? { session: session.trim().replace(/\.md$/i, "") } : {}),
      countdown,
      notes,
    }
    try {
      await onSave(input, !session.trim() && createSession ? createSession : null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={editing ? "Editar evento" : "Novo evento"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="btn primary" onClick={() => void save()} disabled={busy} aria-label="Salvar evento">
            {busy ? "Gravando…" : "Salvar evento"}
          </button>
        </>
      }
    >
      <form
        className="stack event-form"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <label className="field">
          <span>Título</span>
          <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título do evento" />
        </label>
        <div className="row between">
          <span className="small">Dia inteiro</span>
          <Switch on={allDay} onChange={setAllDay} label="Dia inteiro" />
        </div>
        <div className="form-grid">
          <label className="field">
            <span>{choice === "none" ? "Data" : "Começa em"}</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => {
                // O dia da semana da repetição acompanha a data, enquanto for só o dia da data anterior.
                const weekday = (value: string) => new Date(`${value}T12:00`).getDay()
                if (e.target.value && days.length === 1 && days[0] === weekday(date)) setDays([weekday(e.target.value)])
                setDate(e.target.value)
              }}
              aria-label="Data do evento"
              required
            />
          </label>
          {choice === "none" && (
            <label className="field">
              <span>Até (vários dias)</span>
              <input className="input" type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} aria-label="Último dia" />
            </label>
          )}
          {!allDay && (
            <>
              <label className="field">
                <span>Início</span>
                <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Hora de início" />
              </label>
              <label className="field">
                <span>Fim</span>
                <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="Hora do fim" />
              </label>
            </>
          )}
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Repetir</span>
            <select className="select" value={choice} onChange={(e) => setChoice(e.target.value as RepeatChoice)} aria-label="Repetir">
              <option value="none">Não repete</option>
              <option value="weekly">Toda semana</option>
              <option value="biweekly">A cada 2 semanas</option>
              <option value="monthly">Todo mês</option>
              <option value="yearly">Todo ano</option>
              <option value="custom">Personalizado (RRULE)…</option>
            </select>
          </label>
          {choice !== "none" && choice !== "custom" && (
            <label className="field">
              <span>Termina em (opcional)</span>
              <input className="input" type="date" value={until} min={date} onChange={(e) => setUntil(e.target.value)} aria-label="Fim da repetição" />
            </label>
          )}
        </div>
        {choice === "weekly" && (
          <div className="row-wrap" role="group" aria-label="Dias da semana">
            {WEEKDAYS.map((name, day) => (
              <button
                key={name}
                type="button"
                className={`chip weekday ${days.includes(day) ? "on" : ""}`}
                aria-pressed={days.includes(day)}
                onClick={() => setDays(days.includes(day) ? days.filter((d) => d !== day) : [...days, day])}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {choice === "custom" && (
          <label className="field">
            <span>Regra (RRULE do iCalendar)</span>
            <input className="input mono" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Regra de repetição" />
            <span className="tiny faint">Ex.: FREQ=MONTHLY;BYDAY=1SA (todo primeiro sábado) · FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10</span>
          </label>
        )}

        <div className="form-grid">
          <label className="field">
            <span>Lembrete</span>
            <select
              className="select"
              value={reminders[0] ?? ""}
              onChange={(e) => setReminders(e.target.value === "" ? [] : [Number(e.target.value), ...reminders.slice(1)])}
              aria-label="Lembrete"
            >
              <option value="">Nenhum</option>
              {[...REMINDER_OPTIONS, ...reminders.filter((m) => !REMINDER_OPTIONS.some(([v]) => v === m)).map((m) => [m, `${m} minutos antes`] as [number, string])].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Segundo lembrete</span>
            <select className="select" value={reminders[1] ?? ""} onChange={(e) => setReminders(e.target.value === "" ? reminders.slice(0, 1) : [reminders[0] ?? 0, Number(e.target.value)])} aria-label="Segundo lembrete" disabled={!reminders.length}>
              <option value="">Nenhum</option>
              {REMINDER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Local</span>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Local" />
          </label>
          <label className="field">
            <span>Categoria</span>
            <input className="input" list="agenda-categorias" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria" />
            <datalist id="agenda-categorias">
              {["Sessão", "Pessoal", "Tarefa", "Projeto"].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="row-wrap" role="radiogroup" aria-label="Cor">
          <button type="button" className={`color-swatch none ${!color ? "on" : ""}`} onClick={() => setColor("")} aria-label="Cor automática" title="Automática" />
          {EVENT_COLORS.map((c) => (
            <button key={c} type="button" className={`color-swatch ${color === c ? "on" : ""}`} style={{ background: `var(--${c})` }} onClick={() => setColor(c)} aria-label={COLOR_NAMES[c]} title={COLOR_NAMES[c]} />
          ))}
        </div>

        <label className="field">
          <span>Nota da sessão (link)</span>
          <input className="input" list="agenda-sessoes" value={session} onChange={(e) => setSession(e.target.value)} placeholder="Campanhas/…/Sessão 13" aria-label="Nota da sessão" />
          <datalist id="agenda-sessoes">
            {sessionNotes.map((path) => (
              <option key={path} value={path.replace(/\.md$/i, "")} />
            ))}
          </datalist>
        </label>
        {!session.trim() && sessionFolders.length > 0 && (
          <label className="field">
            <span>Ou criar a nota da sessão em</span>
            <select className="select" value={createSession} onChange={(e) => setCreateSession(e.target.value)} aria-label="Criar nota da sessão em">
              <option value="">Não criar</option>
              {sessionFolders.map((f) => (
                <option key={f.folder} value={f.folder}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="row between">
          <span className="small">Contagem regressiva na tela inicial</span>
          <Switch on={countdown} onChange={setCountdown} label="Contagem regressiva" />
        </div>
        {!editing && (
          <label className="field">
            <span>Anotações e checklist de preparação</span>
            <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"- [ ] Imprimir mapas\n- [ ] Separar miniaturas"} aria-label="Anotações do evento" />
          </label>
        )}
        {error && <p className="small" style={{ color: "var(--red)" }}>{error}</p>}
        <span className="tiny faint">O evento é uma nota em Agenda/ no formato do plugin Full Calendar (o Obsidian mostra igual).</span>
      </form>
    </Modal>
  )
}
