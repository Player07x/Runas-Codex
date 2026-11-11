import { useId, useMemo, useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { AGENDA_TASKS_PATH, groupAgendaTasks } from "../../core/tasks/agenda"
import type { Task } from "../../core/tasks/task"
import { TaskRow } from "../../components/tasks/TaskRow"
import type { TaskActions } from "../../components/tasks/useTaskActions"
import "../../components/tasks/tasks.css"

const HIDDEN = new Set(["urgency", "created date", "done date", "cancelled date", "id", "depends on"] as const)

/**
 * Vista Tarefas da Agenda (U37): Atrasadas, Hoje, Próximas, Sem prazo, Hábitos e Feitas (7 dias). Lê as tarefas de
 * todas as notas no formato do Tasks; as criadas aqui vão para `Agenda/Tarefas.md`.
 */
export function AgendaTasks({ tasks, actions, today }: { tasks: Task[]; actions: TaskActions; today: string }) {
  const groups = useMemo(() => groupAgendaTasks(tasks, today), [tasks, today])
  const sections: { key: string; title: string; list: Task[]; empty?: string; className?: string }[] = [
    { key: "atrasadas", title: "Atrasadas", list: groups.atrasadas, className: "late" },
    { key: "hoje", title: "Hoje", list: groups.hoje, empty: "Nada vence hoje." },
    { key: "habitos", title: "Hábitos", list: groups.habitos, empty: "Nenhum hábito. Marque “Todo dia” ao criar uma tarefa." },
    { key: "proximas", title: "Próximas", list: groups.proximas },
    { key: "sem-prazo", title: "Sem prazo", list: groups.semPrazo },
  ]
  const options = { today, hidden: HIDDEN }
  return (
    <div className="agenda-tasks">
      <NewTaskForm actions={actions} today={today} />
      {sections.filter((s) => s.list.length > 0 || s.empty).map((section) => (
        <section key={section.key} className={`agenda-tasks-section ${section.className ?? ""}`} aria-labelledby={`agenda-tarefas-${section.key}`}>
          <h3 id={`agenda-tarefas-${section.key}`}>{section.title} <span className="count">{section.list.length}</span></h3>
          {section.list.length === 0 ? <p className="muted small">{section.empty}</p> : (
            <ul className="task-list">
              {section.list.map((t) => <TaskRow key={`${t.path}:${t.line}`} task={t} actions={actions} options={options} />)}
            </ul>
          )}
        </section>
      ))}
      {groups.feitas.length > 0 && (
        <details className="agenda-tasks-section">
          <summary>Feitas, canceladas e falhas nos últimos 7 dias ({groups.feitas.length})</summary>
          <ul className="task-list">
            {groups.feitas.map((t) => <TaskRow key={`${t.path}:${t.line}`} task={t} actions={actions} options={options} />)}
          </ul>
        </details>
      )}
      <p className="small muted">
        Tarefas de todas as notas, no formato do plugin Tasks (abrem iguais no Obsidian). “Falhou” é uma tarefa cancelada
        depois do prazo. As novas vão para {AGENDA_TASKS_PATH}.
      </p>
    </div>
  )
}

function NewTaskForm({ actions, today }: { actions: TaskActions; today: string }) {
  const id = useId()
  const [text, setText] = useState("")
  const [due, setDue] = useState("")
  const [habit, setHabit] = useState(false)
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim() || busy) return
    setBusy(true)
    const ok = await actions.create({ description: text, due: due || null, habit })
    setBusy(false)
    if (ok) (setText(""), setDue(""), setHabit(false))
  }
  return (
    <form className="agenda-tasks-add" onSubmit={(e) => void submit(e)} aria-label="Nova tarefa">
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Nova tarefa…" aria-label="O que fazer" disabled={actions.readOnly} />
      <input id={`${id}-prazo`} className="input" type="date" value={due} min={habit ? undefined : today} onChange={(e) => setDue(e.target.value)} aria-label={habit ? "Começa em (vazio: hoje)" : "Prazo (opcional)"} title={habit ? "Começa em (vazio: hoje)" : "Prazo (opcional)"} disabled={actions.readOnly} />
      <label className="check">
        <input type="checkbox" checked={habit} onChange={(e) => setHabit(e.target.checked)} disabled={actions.readOnly} /> Todo dia
      </label>
      <button type="submit" className="btn primary" disabled={actions.readOnly || busy || !text.trim()}>
        <Plus size={16} /> Adicionar
      </button>
    </form>
  )
}
