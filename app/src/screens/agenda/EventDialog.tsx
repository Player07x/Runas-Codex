import { useState } from "react"
import { EVENT_COLORS, type AgendaEvent, type EventInput, type Repeat } from "../../core/agenda"
import { Modal, Switch } from "../../components/ui"
import { Notice } from "../../components/kit/Layout"
import { isAndroidApp } from "../../platform/reminders"
import { useVault } from "../../platform/VaultProvider"
import { TaskEditDialog } from "../../components/tasks/TaskEditDialog"
import { useTasksSettings, useTasksVault } from "../../lib/tasks"
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
  const [occupies, setOccupies] = useState(initial.busy !== false)
  const [notes, setNotes] = useState(initial.notes ?? "")
  const [addingTask, setAddingTask] = useState(false)
  const tasksSettings = useTasksSettings(useTasksVault().vault?.info?.path)
  const platformKind = useVault().platform.kind
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

  // Cada problema aponta o campo que precisa mudar: ele recebe o foco e o aviso fica ligado a ele.
  const [problem, problemAt]: [string | null, string | null] =
    !title.trim() ? ["Dê um título ao evento.", "evento-titulo"]
    : !date ? ["Escolha a data.", "evento-data"]
    : !allDay && !/^\d{2}:\d{2}$/.test(startTime) ? ["Escolha o horário de início.", "evento-inicio"]
    : endDate && endDate < date ? ["O último dia não pode ser antes do primeiro.", "evento-ate"]
    : choice === "custom" && !/^FREQ=/i.test(custom.trim()) ? ["A regra personalizada começa com FREQ= (formato RRULE do iCalendar).", "evento-regra"]
    : [null, null]
  const [problemField, setProblemField] = useState<string | null>(null)
  const reminderHint = isAndroidApp() ? "Dispara pelo Android, mesmo com o app fechado." : platformKind === "electron" ? "Dispara como notificação do sistema enquanto o app está aberto, mesmo minimizado." : "No navegador, só dispara com esta aba aberta."

  const save = async () => {
    if (problem) {
      setError(problem)
      setProblemField(problemAt)
      requestAnimationFrame(() => document.getElementById(problemAt ?? "")?.focus())
      return
    }
    setProblemField(null)
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
      ...(occupies ? {} : { busy: false }),
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

  // Seções opcionais abrem sozinhas quando já têm valor (ao editar), para nada ficar escondido.
  const hasDetails = Boolean(location || category || color || !occupies)
  const hasSession = Boolean(session || createSession)

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
        {error && (
          <div id="evento-erro">
            <Notice tone="danger" title="Falta algo para salvar">{error}</Notice>
          </div>
        )}
        <label className="field">
          <span>Título</span>
          <input id="evento-titulo" className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título do evento" aria-invalid={problemField === "evento-titulo" || undefined} aria-describedby={problemField === "evento-titulo" ? "evento-erro" : undefined} />
        </label>

        <fieldset className="event-section">
          <legend>Quando</legend>
          <div className="row between">
            <span className="small" id="evento-dia-inteiro">Dia inteiro</span>
            <Switch on={allDay} onChange={setAllDay} label="Dia inteiro" />
          </div>
          <div className="form-grid">
            <label className="field">
              <span>{choice === "none" ? "Data" : "Começa em"}</span>
              <input
                id="evento-data"
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
                aria-invalid={problemField === "evento-data" || undefined}
                aria-describedby={problemField === "evento-data" ? "evento-erro" : undefined}
                required
              />
            </label>
            {choice === "none" && (
              <label className="field">
                <span>Até (vários dias) · opcional</span>
                <input id="evento-ate" className="input" type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} aria-label="Último dia" aria-invalid={problemField === "evento-ate" || undefined} aria-describedby={problemField === "evento-ate" ? "evento-erro" : undefined} />
              </label>
            )}
            {!allDay && (
              <>
                <label className="field">
                  <span>Início</span>
                  <input id="evento-inicio" className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} aria-label="Hora de início" aria-invalid={problemField === "evento-inicio" || undefined} aria-describedby={problemField === "evento-inicio" ? "evento-erro" : undefined} />
                </label>
                <label className="field">
                  <span>Fim · opcional</span>
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
                <span>Termina em · opcional</span>
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
              <input id="evento-regra" className="input mono" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Regra de repetição" aria-invalid={problemField === "evento-regra" || undefined} aria-describedby={problemField === "evento-regra" ? "evento-erro evento-regra-ajuda" : "evento-regra-ajuda"} />
              <span id="evento-regra-ajuda" className="small muted">Ex.: FREQ=MONTHLY;BYDAY=1SA (todo primeiro sábado) · FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10</span>
            </label>
          )}
        </fieldset>

        <fieldset className="event-section">
          <legend>Avisos</legend>
          <div className="form-grid">
            <label className="field">
              <span>Lembrete</span>
              <select
                className="select"
                value={reminders[0] ?? ""}
                onChange={(e) => setReminders(e.target.value === "" ? [] : [Number(e.target.value), ...reminders.slice(1)])}
                aria-label="Lembrete"
                aria-describedby="evento-lembrete-ajuda"
              >
                <option value="">Nenhum</option>
                {[...REMINDER_OPTIONS, ...reminders.filter((m) => !REMINDER_OPTIONS.some(([v]) => v === m)).map((m) => [m, `${m} minutos antes`] as [number, string])].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span id="evento-lembrete-ajuda" className="small muted">{reminderHint}</span>
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
          </div>
          <div className="row between">
            <span className="small">Contagem regressiva na tela inicial</span>
            <Switch on={countdown} onChange={setCountdown} label="Contagem regressiva" />
          </div>
        </fieldset>

        <details className="event-section" open={hasDetails || undefined}>
          <summary><span>Detalhes</span> <small className="muted">local, categoria, cor, ocupa o tempo · opcional</small></summary>
          <div className="form-grid">
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
          <div className="color-choices" role="radiogroup" aria-labelledby="evento-cor">
            <span id="evento-cor" className="small">Cor</span>
            {["", ...EVENT_COLORS].map((c) => (
              <label key={c || "auto"} className={`color-choice ${color === c ? "on" : ""}`}>
                <input type="radio" name="evento-cor" value={c} checked={color === c} onChange={() => setColor(c)} />
                <span className={`color-swatch ${c ? "" : "none"}`} style={c ? { background: `var(--${c})` } : undefined} aria-hidden="true" />
                <span>{c ? COLOR_NAMES[c] : "Automática"}</span>
              </label>
            ))}
          </div>
          <div className="row between">
            <span className="small">Ocupa o tempo (conta no tempo livre)</span>
            <Switch on={occupies} onChange={setOccupies} label="Ocupa o tempo" />
          </div>
        </details>

        <details className="event-section" open={hasSession || undefined}>
          <summary><span>Sessão</span> <small className="muted">ligar ou criar a nota da sessão · opcional</small></summary>
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
        </details>

        {!editing && (
          <details className="event-section" open={Boolean(notes) || undefined}>
            <summary><span>Preparação</span> <small className="muted">anotações e tarefas · opcional</small></summary>
            <label className="field">
              <span>Anotações e checklist de preparação</span>
              <textarea className="input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"- [ ] Imprimir mapas\n- [ ] Separar miniaturas 📅 2026-10-20"} aria-label="Anotações do evento" aria-describedby="evento-notas-ajuda" />
              <span className="row between">
                <span id="evento-notas-ajuda" className="small muted">Aceita a sintaxe do plugin Tasks (datas, prioridade, 🔁 recorrência).</span>
                <button type="button" className="btn sm ghost" onClick={() => setAddingTask(true)}>
                  Inserir tarefa
                </button>
              </span>
            </label>
          </details>
        )}
        <span className="small muted">O evento é uma nota em Agenda/ no formato do plugin Full Calendar (o Obsidian mostra igual).</span>
      </form>
      {addingTask && <TaskEditDialog settings={tasksSettings} onLines={(lines) => setNotes((n) => `${n.replace(/\s*$/, "")}${n.trim() ? "\n" : ""}${lines.join("\n")}\n`)} onClose={() => setAddingTask(false)} />}
    </Modal>
  )
}
