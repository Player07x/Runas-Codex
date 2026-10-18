import { useTasksVault } from "../../lib/tasks"
import { useMemo, useState } from "react"
import { parseTypedDate } from "../../core/tasks/date-text"
import { isValidDate } from "../../core/tasks/dates"
import { applyTaskEdit, blankTask, replaceTaskLine } from "../../core/tasks/edit"
import { parseRecurrence } from "../../core/tasks/recurrence"
import { TASK_ID, type OnCompletion, type Priority } from "../../core/tasks/serializer"
import { statusRegistry, type TasksSettings } from "../../core/tasks/settings"
import { parseContext, type Task } from "../../core/tasks/task"
import { flushOpenNotes } from "../../lib/vault-notes"
import { Modal } from "../ui"
import type { TaskActions } from "./useTaskActions"

type DateKey = "createdDate" | "startDate" | "scheduledDate" | "dueDate" | "doneDate" | "cancelledDate"
const DATES: { key: DateKey; label: string; icon: string }[] = [
  { key: "dueDate", label: "Prazo", icon: "📅" },
  { key: "scheduledDate", label: "Agendada", icon: "⏳" },
  { key: "startDate", label: "Início", icon: "🛫" },
  { key: "createdDate", label: "Criada", icon: "➕" },
  { key: "doneDate", label: "Concluída", icon: "✅" },
  { key: "cancelledDate", label: "Cancelada", icon: "❌" },
]
const PRIORITIES: { value: Priority; label: string }[] = [
  { value: "0", label: "🔺 Altíssima" },
  { value: "1", label: "⏫ Alta" },
  { value: "2", label: "🔼 Média" },
  { value: "3", label: "Normal" },
  { value: "4", label: "🔽 Baixa" },
  { value: "5", label: "⏬ Baixíssima" },
]

const randomId = () => Math.random().toString(36).slice(2, 8)

interface Props {
  /** Tarefa do cofre a editar (grava na nota de origem). */
  task?: Task
  actions?: TaskActions
  /** Sem `task`: a linha de partida (ex.: a linha do cursor) e quem recebe as linhas prontas. */
  initialLine?: string
  settings?: TasksSettings
  onLines?(lines: string[]): void
  onClose(): void
}

/** "Criar ou editar tarefa" do Tasks: todos os campos, datas por extenso (pt ou en), e a mesma transição de estado do clique. */
export function TaskEditDialog({ task, actions, initialLine, settings: given, onLines, onClose }: Props) {
  const { vault, toast } = useTasksVault()
  const settings = actions?.settings ?? given!
  const ctx = useMemo(() => parseContext(settings), [settings])
  const base = useMemo(() => task ?? blankTask(initialLine ?? "- [ ] ", ctx), [task, initialLine, ctx])
  const registry = statusRegistry(settings)
  const [description, setDescription] = useState(base.description)
  const [status, setStatus] = useState(base.status.symbol)
  const [priority, setPriority] = useState<Priority>(base.priority)
  const [dates, setDates] = useState<Record<DateKey, string>>(() => Object.fromEntries(DATES.map((d) => [d.key, base[d.key] ?? ""])) as Record<DateKey, string>)
  const [recurrence, setRecurrence] = useState(base.recurrence?.text ?? base.recurrenceText)
  const [onCompletion, setOnCompletion] = useState<OnCompletion>(base.onCompletion)
  const [id, setId] = useState(base.id)
  const [dependsOn, setDependsOn] = useState(base.dependsOn.join(", "))
  const [forwardOnly, setForwardOnly] = useState(true)
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const parsed = Object.fromEntries(DATES.map((d) => [d.key, dates[d.key].trim() ? parseTypedDate(dates[d.key], now, forwardOnly) : null])) as Record<DateKey, string | null>
  const badDate = DATES.find((d) => dates[d.key].trim() && !parsed[d.key])
  const recurrenceOk = !recurrence.trim() || parseRecurrence(recurrence.trim(), { dueDate: parsed.dueDate, scheduledDate: parsed.scheduledDate, startDate: parsed.startDate }, ctx.today) !== null
  const idOk = !id || new RegExp(`^${TASK_ID.source}$`).test(id)
  const deps = dependsOn.split(",").map((s) => s.trim()).filter(Boolean)
  const depsOk = deps.every((d) => new RegExp(`^${TASK_ID.source}$`).test(d))
  const knownIds = useMemo(() => [...new Set((vault?.index?.allNotes() ?? []).flatMap((n) => [...n.text.matchAll(/🆔️? *([a-zA-Z0-9-_]+)/g)].map((m) => m[1]!)))].sort(), [vault?.index])
  const valid = description.trim() !== "" && !badDate && recurrenceOk && idOk && depsOk

  const lines = () => {
    const newStatus = registry.bySymbolOrCreate(status)
    return applyTaskEdit(
      base,
      {
        description: description.trim(),
        priority,
        ...Object.fromEntries(DATES.map((d) => [d.key, parsed[d.key]])),
        recurrenceText: recurrence.trim(),
        onCompletion,
        id: id.trim(),
        dependsOn: deps,
      },
      newStatus,
      ctx,
    )
  }

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      if (task) {
        await flushOpenNotes()
        const note = vault?.index?.note(task.path)
        if (!note) throw new Error(`A nota ${task.path} não existe mais.`)
        await vault!.save(task.path, replaceTaskLine(note.text, task.line, lines(), task.originalMarkdown))
      } else onLines?.(lines())
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={task ? "Editar tarefa" : "Nova tarefa"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={!valid || saving} onClick={() => void save()}>
            {task ? "Salvar" : "Inserir"}
          </button>
        </>
      }
    >
      <form className="stack task-edit" onSubmit={(e) => (e.preventDefault(), void save())}>
        <label className="field">
          <span>Descrição</span>
          <input className="input" value={description} autoFocus onChange={(e) => setDescription(e.target.value)} aria-label="Descrição da tarefa" />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>Estado</span>
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Estado">
              {[...registry.statuses, ...(registry.statuses.some((s) => s.symbol === base.status.symbol) ? [] : [base.status])].map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  [{s.symbol}] {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prioridade</span>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)} aria-label="Prioridade">
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          {DATES.map((d) => (
            <label className="field" key={d.key}>
              <span>
                {d.icon} {d.label}
              </span>
              <input className="input" value={dates[d.key]} placeholder="ex.: amanhã, sexta, 2026-10-30" onChange={(e) => setDates({ ...dates, [d.key]: e.target.value })} aria-label={d.label} aria-invalid={Boolean(dates[d.key].trim() && !parsed[d.key])} />
              <span className={`tiny ${dates[d.key].trim() && !parsed[d.key] ? "danger-text" : "faint"}`}>
                {dates[d.key].trim() ? (parsed[d.key] && isValidDate(parsed[d.key]!) ? new Date(`${parsed[d.key]}T12:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "data não entendida") : "sem data"}
              </span>
            </label>
          ))}
        </div>
        <label className="check small">
          <input type="checkbox" checked={forwardOnly} onChange={(e) => setForwardOnly(e.target.checked)} /> Só datas futuras (para “sexta”, “segunda”…)
        </label>
        <div className="form-grid">
          <label className="field">
            <span>🔁 Repete (em inglês, como no Tasks)</span>
            <input className="input" value={recurrence} placeholder="every week, every month on the 1st, every day when done" onChange={(e) => setRecurrence(e.target.value)} aria-label="Regra de repetição" aria-invalid={!recurrenceOk} />
            {!recurrenceOk && <span className="tiny danger-text">Regra não entendida.</span>}
          </label>
          <label className="field">
            <span>🏁 Ao concluir</span>
            <select className="select" value={onCompletion} onChange={(e) => setOnCompletion(e.target.value as OnCompletion)} aria-label="Ao concluir">
              <option value="">Nada (padrão)</option>
              <option value="keep">Manter (keep)</option>
              <option value="delete">Apagar a ocorrência concluída (delete)</option>
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>🆔 Id</span>
            <span className="row">
              <input className="input grow" value={id} onChange={(e) => setId(e.target.value)} aria-label="Id da tarefa" aria-invalid={!idOk} />
              <button type="button" className="btn sm" onClick={() => setId(randomId())}>
                Gerar
              </button>
            </span>
          </label>
          <label className="field">
            <span>⛔ Depende de (ids, separados por vírgula)</span>
            <input className="input" list="task-known-ids" value={dependsOn} onChange={(e) => setDependsOn(e.target.value)} aria-label="Depende de" aria-invalid={!depsOk} />
            <datalist id="task-known-ids">
              {knownIds.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </label>
        </div>
        <code className="tiny faint task-preview">{valid ? lines().join("\n") : "…"}</code>
      </form>
    </Modal>
  )
}
