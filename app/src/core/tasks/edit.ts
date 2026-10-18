import { nextOccurrence, parseRecurrence } from "./recurrence"
import { addDays, isValidDate } from "./dates"
import { parseTaskLine, taskToLine, type ParseContext, type Task } from "./task"
import { sameStatus, type Status } from "./status"

/**
 * Mudanças de estado com o comportamento do Tasks 8.6.0 (`Task.handleNewStatus` e `handleOnCompletion`): concluir põe
 * ✅ hoje, cancelar põe ❌, reabrir tira a data; concluir uma tarefa recorrente cria a próxima ocorrência (acima, ou
 * abaixo com a opção `recurrenceOnNextLine`); `🏁 delete` apaga a ocorrência concluída. O resultado é o que vai no
 * lugar da linha, na ordem do arquivo.
 */
export function withNewStatus(task: Task, newStatus: Status, ctx: ParseContext, today = ctx.today): Task[] {
  if (sameStatus(newStatus, task.status)) return [task]
  const { settings } = ctx
  const dateFor = (type: "DONE" | "CANCELLED", old: string | null, enabled: boolean) => (newStatus.type === type ? (task.status.type !== type ? (enabled ? today : null) : old) : null)
  const toggled: Task = { ...task, status: newStatus, doneDate: dateFor("DONE", task.doneDate, settings.setDoneDate), cancelledDate: dateFor("CANCELLED", task.cancelledDate, settings.setCancelledDate) }
  let result: Task[] = [toggled]
  if (newStatus.type === "DONE" && task.status.type !== "DONE" && task.recurrence) {
    const dates = nextOccurrence(task.recurrence, task, today, settings.removeScheduledDateOnRecurrence)
    if (dates) {
      const next: Task = {
        ...task,
        ...dates,
        status: ctx.registry.nextRecurrence(newStatus),
        // Ocorrência nova não leva a referência de bloco nem as dependências (#2654 do Tasks).
        blockLink: "",
        id: "",
        dependsOn: [],
        createdDate: settings.setCreatedDate ? today : null,
        cancelledDate: null,
        doneDate: null,
        recurrence: parseRecurrence(task.recurrenceText, dates, today, settings.removeScheduledDateOnRecurrence) ?? task.recurrence,
      }
      result = [next, toggled]
    }
  }
  // 🏁 delete: some a ocorrência que acabou de ser concluída (a próxima, se houver, fica).
  if (task.onCompletion === "delete" && toggled.status.type === "DONE" && toggled.status.type !== task.status.type) result = result.filter((t) => t !== toggled)
  return settings.recurrenceOnNextLine ? result.reverse() : result
}

/** O próximo estado ao clicar na caixa. */
export function toggled(task: Task, ctx: ParseContext, today = ctx.today): Task[] {
  return withNewStatus(task, ctx.registry.next(task.status), ctx, today)
}

export interface LineEdit {
  /** Linha trocada (0 = primeira). */
  line: number
  /** O que fica no lugar dela (pode ser mais de uma linha, ou nenhuma). */
  lines: string[]
}

/** O que muda numa linha de tarefa; `null` se a linha não é (mais) uma tarefa. */
export function editForLine(lineText: string, lineNumber: number, ctx: ParseContext, change: { status?: Status; today?: string } = {}): LineEdit | null {
  const cr = lineText.endsWith("\r") ? "\r" : ""
  // O filtro global não vale aqui: quem chama já sabe que a linha é uma caixa de seleção (ex.: o clique na caixa).
  const task = parseTaskLine(lineText, "", lineNumber, { ...ctx, settings: { ...ctx.settings, globalFilter: "" } })
  if (!task) return null
  if (ctx.settings.globalFilter && !lineText.includes(ctx.settings.globalFilter)) {
    // Fora do filtro global, o Tasks não mexe: a caixa só alterna entre ` ` e `x`, sem datas.
    const symbol = change.status?.symbol ?? (task.status.symbol === " " ? "x" : " ")
    return { line: lineNumber, lines: [lineText.replace(/^([\s\t>]*(?:[-*+]|[0-9]+[.)]) +\[)(.)\]/u, `$1${symbol}]`)] }
  }
  const today = change.today ?? ctx.today
  const tasks = change.status ? withNewStatus(task, change.status, ctx, today) : toggled(task, ctx, today)
  if (tasks.length === 1 && tasks[0] === task) return { line: lineNumber, lines: [lineText] }
  return { line: lineNumber, lines: tasks.map((t) => taskToLine(t, ctx.settings) + cr) }
}

/** Aplica a edição no texto inteiro da nota (só a linha da tarefa muda). */
export function applyLineEdit(text: string, edit: LineEdit): string {
  const lines = text.split("\n")
  lines.splice(edit.line, 1, ...edit.lines)
  return lines.join("\n")
}

/**
 * Marca (ou muda o estado de) a tarefa da linha `line` e devolve o texto novo. `expected` é a linha que a tela mostrou:
 * se o arquivo mudou e a linha não é mais aquela, recusa (evita concluir a tarefa errada ou duplicar a recorrência).
 */
export function changeTaskInText(text: string, line: number, ctx: ParseContext, change: { status?: Status; today?: string; expected?: string } = {}): string {
  const current = text.split("\n")[line]
  if (current === undefined || (change.expected !== undefined && current.replace(/\r$/, "") !== change.expected.replace(/\r$/, ""))) throw new Error("A tarefa mudou de lugar; recarregue a nota.")
  const edit = editForLine(current, line, ctx, change)
  if (!edit) throw new Error("A linha não é mais uma tarefa; recarregue a nota.")
  return applyLineEdit(text, edit)
}

// ---------- Outras ações (menu da tarefa nas consultas e na Agenda) ----------

export type DateField = "dueDate" | "scheduledDate" | "startDate" | "createdDate" | "doneDate" | "cancelledDate"

/** Troca campos da tarefa da linha (data, prioridade, descrição…) e regrava a linha no formato do Tasks. */
export function updateTaskInText(text: string, line: number, ctx: ParseContext, patch: Partial<Pick<Task, DateField | "priority" | "description" | "recurrenceText" | "onCompletion" | "id" | "dependsOn">>, expected?: string): string {
  const lines = text.split("\n")
  const current = lines[line]
  if (current === undefined || (expected !== undefined && current.replace(/\r$/, "") !== expected.replace(/\r$/, ""))) throw new Error("A tarefa mudou de lugar; recarregue a nota.")
  const task = parseTaskLine(current, "", line, { ...ctx, settings: { ...ctx.settings, globalFilter: "" } })
  if (!task) throw new Error("A linha não é mais uma tarefa; recarregue a nota.")
  const next: Task = { ...task, ...patch }
  if (patch.recurrenceText !== undefined || patch.dueDate !== undefined || patch.scheduledDate !== undefined || patch.startDate !== undefined) next.recurrence = next.recurrenceText ? parseRecurrence(next.recurrenceText, next, ctx.today, ctx.settings.removeScheduledDateOnRecurrence) : null
  if (patch.scheduledDate !== undefined) next.scheduledDateIsInferred = false
  lines[line] = taskToLine(next, ctx.settings) + (current.endsWith("\r") ? "\r" : "")
  return lines.join("\n")
}

/** O campo que o "adiar" muda (opção `postpone.dateField` do Tasks 8.6.0). */
export function postponeField(task: Task, preference: ParseContext["settings"]["postponeDateField"]): DateField | null {
  const order: Record<typeof preference, DateField[]> = {
    "due-scheduled-start": ["dueDate", "scheduledDate", "startDate"],
    "scheduled-due-start": ["scheduledDate", "dueDate", "startDate"],
    "start-scheduled-due": ["startDate", "scheduledDate", "dueDate"],
    due: ["dueDate"],
    scheduled: ["scheduledDate"],
    start: ["startDate"],
  }
  return order[preference].find((field) => task[field] !== null) ?? null
}

/**
 * Adia a data da tarefa: a partir da data dela, ou de hoje se já passou (como o "Postpone" do Tasks). `amount` em dias
 * (1 = amanhã, 7 = uma semana).
 */
export function postponedDate(current: string | null, today: string, amount: number): string {
  const base = current && isValidDate(current) && current >= today ? current : today
  return addDays(base, amount)
}
