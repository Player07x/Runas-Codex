import { useTasksVault } from "../../lib/tasks"
import { useState, type ReactNode } from "react"
import { FileText, Pencil, SkipForward } from "lucide-react"
import { isValidDate } from "../../core/tasks/dates"
import { postponeField } from "../../core/tasks/edit"
import type { QueryElement, TaskElement } from "../../core/tasks/query"
import { statusRegistry } from "../../core/tasks/settings"
import type { Status } from "../../core/tasks/status"
import { urgency, type Task } from "../../core/tasks/task"
import { noteName } from "../../core/text"
import { navigate } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { TaskEditDialog } from "./TaskEditDialog"
import type { TaskActions } from "./useTaskActions"

const PRIORITY_ICON: Record<string, string> = { "0": "🔺", "1": "⏫", "2": "🔼", "4": "🔽", "5": "⏬" }
const PRIORITY_LABEL: Record<string, string> = { "0": "Altíssima", "1": "Alta", "2": "Média", "3": "Normal", "4": "Baixa", "5": "Baixíssima" }

const DATE_FIELDS: { field: "createdDate" | "startDate" | "scheduledDate" | "dueDate" | "cancelledDate" | "doneDate"; element: TaskElement; icon: string; label: string }[] = [
  { field: "createdDate", element: "created date", icon: "➕", label: "Criada" },
  { field: "startDate", element: "start date", icon: "🛫", label: "Início" },
  { field: "scheduledDate", element: "scheduled date", icon: "⏳", label: "Agendada" },
  { field: "dueDate", element: "due date", icon: "📅", label: "Prazo" },
  { field: "cancelledDate", element: "cancelled date", icon: "❌", label: "Cancelada" },
  { field: "doneDate", element: "done date", icon: "✅", label: "Concluída" },
]

const shortDate = (d: string) => (isValidDate(d) ? new Date(`${d}T12:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: d.slice(0, 4) === String(new Date().getFullYear()) ? undefined : "numeric" }) : "data inválida")

/** Descrição com [[links]] clicáveis e #etiquetas destacadas (sem passar pelo leitor inteiro, que é pesado em listas longas). */
export function TaskText({ task, hideTags, globalFilter }: { task: Task; hideTags?: boolean; globalFilter?: string }) {
  const { vault } = useTasksVault()
  let text = task.description
  if (globalFilter) text = text.replace(new RegExp(`(^|\\s)${globalFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|\\s)`), "$1$2").replace(/\s{2,}/g, " ").trim()
  const parts: ReactNode[] = []
  const re = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]|(^|\s)(#[^ !@#$%^&*(),.?":{}|<>]+)/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    parts.push(text.slice(last, m.index))
    if (m[1]) {
      const target = m[1]
      const dest = vault?.index?.resolve({ kind: "wiki", embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: false }, task.path).dest
      parts.push(
        <a key={m.index} href="#" className={`wikilink ${dest ? "" : "broken"}`} onClick={(e) => (e.preventDefault(), dest && navigate(vaultRoute(dest)))}>
          {m[2] ?? target}
        </a>,
      )
    } else if (!hideTags) {
      parts.push(m[3], <span key={m.index} className="tag">{m[4]}</span>)
    } else parts.push(m[3])
    last = m.index + m[0].length
  }
  parts.push(text.slice(last))
  return <span className="task-text">{parts}</span>
}

export interface TaskRowOptions {
  hidden?: ReadonlySet<TaskElement | QueryElement>
  shortMode?: boolean
  today: string
}

/** Uma tarefa numa lista (consultas, Agenda, checklist), com as ações sobre a original. */
export function TaskRow({ task, actions, options, children, draggable }: { task: Task; actions: TaskActions; options: TaskRowOptions; children?: ReactNode; draggable?: boolean }) {
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const hidden = options.hidden ?? new Set()
  const show = (e: TaskElement | QueryElement) => !hidden.has(e)
  const registry = statusRegistry(actions.settings)
  const statuses = registry.statuses
  const canPostpone = !actions.readOnly && show("postpone button") && task.status.type !== "DONE" && task.status.type !== "CANCELLED" && task.status.type !== "NON_TASK" && postponeField(task, actions.settings.postponeDateField) !== null && DATE_FIELDS.every((d) => !task[d.field] || isValidDate(task[d.field]!))
  const late = task.dueDate && isValidDate(task.dueDate) && task.dueDate < options.today && task.status.type !== "DONE" && task.status.type !== "CANCELLED"
  const field = (icon: string, label: string, value: string) => (options.shortMode ? <span className="task-field" title={`${label}: ${value}`}>{icon}</span> : <span className="task-field" title={label}>{icon} {value}</span>)
  return (
    <li
      className={`task-row ${task.status.type === "DONE" || task.status.type === "CANCELLED" ? "is-done" : ""}`}
      data-task={task.status.symbol}
      data-status-type={task.status.type}
      draggable={draggable}
      onDragStart={draggable ? (e) => e.dataTransfer.setData("text/x-runas-task", `${task.path}:${task.line}`) : undefined}
    >
      <span className="task-main">
        <label className="task-box-hit">
          <input
            type="checkbox"
            className="task-box"
            checked={task.status.symbol !== " "}
            disabled={actions.readOnly}
            aria-label={`${task.status.symbol === " " ? "Marcar" : "Mudar o estado de"}: ${task.description}`}
            title={`${task.status.name} (clique: ${registry.next(task.status).name}; botão direito: outros estados)`}
            onChange={() => void actions.toggle(task)}
            onContextMenu={(e) => {
              if (actions.readOnly) return
              e.preventDefault()
              setMenu(true)
            }}
          />
        </label>
        <span className="task-body">
          <TaskText task={task} hideTags={!show("tags")} globalFilter={actions.settings.removeGlobalFilter ? actions.settings.globalFilter : undefined} />
          {show("id") && task.id && field("🆔", "Id", task.id)}
          {show("depends on") && task.dependsOn.length > 0 && field("⛔", "Depende de", task.dependsOn.join(", "))}
          {show("priority") && PRIORITY_ICON[task.priority] && <span className="task-field" title={`Prioridade ${PRIORITY_LABEL[task.priority]}`}>{PRIORITY_ICON[task.priority]}</span>}
          {show("recurrence rule") && task.recurrenceText && field("🔁", "Repete", task.recurrence?.text ?? task.recurrenceText)}
          {show("on completion") && task.onCompletion && field("🏁", "Ao concluir", task.onCompletion)}
          {DATE_FIELDS.map((d) => {
            const value = task[d.field]
            if (!value || !show(d.element)) return null
            return (
              <span key={d.field} className={`task-field ${d.field === "dueDate" && late ? "late" : ""}`} title={`${d.label}${d.field === "scheduledDate" && task.scheduledDateIsInferred ? " (do nome do arquivo)" : ""}`}>
                {d.icon}
                {options.shortMode ? null : ` ${shortDate(value)}`}
              </span>
            )
          })}
          {show("urgency") && <span className="task-field faint" title="Urgência">{urgency(task, options.today).toFixed(2)}</span>}
          {/* A nota de origem fica com as datas, não com os botões: ao lado deles ela espremia o texto da tarefa. */}
          {show("backlink") && (
            <a href="#" className="task-backlink tiny" onClick={(e) => (e.preventDefault(), navigate(vaultRoute(task.path)))} title={task.path}>
              <FileText size={12} /> {noteName(task.path)}
              {task.heading ? ` › ${task.heading}` : ""}
            </a>
          )}
        </span>
        <span className="task-actions">
          {canPostpone && (
            <button className="icon-btn task-btn" title="Adiar um dia (botão direito: mais opções)" aria-label="Adiar um dia" onClick={() => void actions.postpone(task, 1)} onContextMenu={(e) => (e.preventDefault(), setMenu(true))}>
              <SkipForward size={14} />
            </button>
          )}
          {!actions.readOnly && show("edit button") && (
            <button className="icon-btn task-btn" title="Editar tarefa" aria-label="Editar tarefa" onClick={() => setEditing(true)}>
              <Pencil size={14} />
            </button>
          )}
        </span>
      </span>
      {children}
      {menu && (
        <TaskMenu
          task={task}
          statuses={statuses as Status[]}
          canPostpone={canPostpone}
          onStatus={(s) => (setMenu(false), void actions.setStatus(task, s))}
          onPostpone={(days) => (setMenu(false), void actions.postpone(task, days))}
          onFixed={(days) => (setMenu(false), void actions.setPostponeDate(task, days))}
          onClose={() => setMenu(false)}
        />
      )}
      {editing && <TaskEditDialog task={task} actions={actions} onClose={() => setEditing(false)} />}
    </li>
  )
}

function TaskMenu({ task, statuses, canPostpone, onStatus, onPostpone, onFixed, onClose }: { task: Task; statuses: Status[]; canPostpone: boolean; onStatus(s: Status): void; onPostpone(days: number): void; onFixed(days: number | null): void; onClose(): void }) {
  return (
    <div className="task-menu card" role="menu" aria-label="Ações da tarefa" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <span className="eyebrow">Estado</span>
      {statuses.map((s) => (
        <button key={s.symbol} role="menuitem" className={`menu-item ${s.symbol === task.status.symbol ? "active" : ""}`} onClick={() => onStatus(s)}>
          <code>[{s.symbol}]</code> {s.name}
        </button>
      ))}
      {canPostpone && (
        <>
          <span className="eyebrow">Adiar</span>
          {[
            [1, "1 dia"],
            [2, "2 dias"],
            [3, "3 dias"],
            [7, "1 semana"],
            [14, "2 semanas"],
            [28, "4 semanas"],
          ].map(([days, label]) => (
            <button key={days} role="menuitem" className="menu-item" onClick={() => onPostpone(days as number)}>
              {label}
            </button>
          ))}
          <span className="eyebrow">Mudar para</span>
          <button role="menuitem" className="menu-item" onClick={() => onFixed(0)}>
            Hoje
          </button>
          <button role="menuitem" className="menu-item" onClick={() => onFixed(1)}>
            Amanhã
          </button>
          <button role="menuitem" className="menu-item" onClick={() => onFixed(null)}>
            Tirar a data
          </button>
        </>
      )}
      <button className="btn sm ghost" onClick={onClose}>
        Fechar
      </button>
    </div>
  )
}

