import { addDays } from "./dates"
import { withNewStatus } from "./edit"
import { nextOccurrence, parseRecurrence } from "./recurrence"
import { taskToLine, type ParseContext, type Task } from "./task"
import { CANCELLED, DONE, DEFAULT_CORE_STATUSES, DEFAULT_CUSTOM_STATUSES, type Status, type StatusType } from "./status"

/**
 * Tarefas na Agenda (U37): prazo, atraso, "falhou" e hábitos diários sem sintaxe nova, para tudo continuar abrindo no
 * Tasks do Obsidian.
 * - Atrasada = aberta com 📅 antes de hoje; vence hoje = 📅 hoje.
 * - Falhou = cancelada (❌) depois do prazo. O Obsidian mostra as duas como canceladas; o app separa pela data.
 * - Hábito diário = 🔁 every day com 🏁 delete: ao concluir, a ocorrência feita sai e só a próxima fica.
 */
export type TaskState = "atrasada" | "hoje" | "proxima" | "sem-prazo" | "feita" | "cancelada" | "falhou"

/** Onde a Agenda grava as tarefas criadas por ela (as que já estão em outras notas ficam onde estão). */
export const AGENDA_TASKS_PATH = "Agenda/Tarefas.md"

const OPEN: ReadonlySet<StatusType> = new Set(["TODO", "IN_PROGRESS", "ON_HOLD"])

export function isOpen(task: Task): boolean {
  return OPEN.has(task.status.type)
}

/** Cancelada depois do prazo (o dia do prazo ainda conta como dentro dele). */
export function isFailed(task: Task): boolean {
  return task.status.type === "CANCELLED" && !!task.dueDate && !!task.cancelledDate && task.cancelledDate > task.dueDate
}

export function taskState(task: Task, today: string): TaskState {
  if (task.status.type === "DONE") return "feita"
  if (task.status.type === "CANCELLED") return isFailed(task) ? "falhou" : "cancelada"
  if (!task.dueDate) return "sem-prazo"
  if (task.dueDate < today) return "atrasada"
  return task.dueDate === today ? "hoje" : "proxima"
}

/** Repete todo dia (com ou sem "when done"). */
export function isDaily(task: Task): boolean {
  return /^every day( when done)?$/i.test(task.recurrenceText.trim())
}

/** Hábito diário: repete todo dia e apaga a ocorrência concluída. */
export function isHabit(task: Task): boolean {
  return isDaily(task) && task.onCompletion === "delete"
}

/** Só uma tarefa aberta e com o prazo vencido pode falhar. */
export function canFail(task: Task, today: string): boolean {
  return isOpen(task) && !!task.dueDate && task.dueDate < today
}

/** O estado "cancelada" do cofre (o personalizado, se o usuário trocou o símbolo), ou o padrão do Tasks. */
export function cancelledStatus(ctx: ParseContext): Status {
  return (ctx.registry.statuses as Status[]).find((status) => status.type === "CANCELLED") ?? CANCELLED
}

/**
 * Marca como falhou: cancela com ❌ hoje e, se a tarefa repete, cria a próxima ocorrência — o Tasks só cria ao concluir,
 * mas a linha nova é a mesma que ele gravaria (mesma regra, mesmas datas, sem ✅ nem ❌).
 */
export function failTask(task: Task, ctx: ParseContext, today = ctx.today): Task[] {
  const cancelled = withNewStatus(task, cancelledStatus(ctx), ctx, today)
  const failed = cancelled.find((t) => t.status.type === "CANCELLED") ?? cancelled[0]!
  const failedWithDate: Task = { ...failed, cancelledDate: failed.cancelledDate ?? today }
  if (!task.recurrence) return [failedWithDate]
  const dates = nextOccurrence(task.recurrence, task, today, ctx.settings.removeScheduledDateOnRecurrence)
  if (!dates) return [failedWithDate]
  const next: Task = {
    ...task,
    ...dates,
    // O estado da próxima é o mesmo que o Tasks daria ao concluir (A fazer, ou o que o cofre configurou).
    status: ctx.registry.nextRecurrence((ctx.registry.statuses as Status[]).find((status) => status.type === "DONE") ?? DONE),
    blockLink: "",
    id: "",
    dependsOn: [],
    createdDate: ctx.settings.setCreatedDate ? today : null,
    cancelledDate: null,
    doneDate: null,
    recurrence: parseRecurrence(task.recurrenceText, dates, today, ctx.settings.removeScheduledDateOnRecurrence) ?? task.recurrence,
  }
  return ctx.settings.recurrenceOnNextLine ? [failedWithDate, next] : [next, failedWithDate]
}

/** Troca a linha da tarefa pelo resultado de `failTask` (recusa se a linha mudou desde a leitura). */
export function failTaskInText(text: string, task: Task, ctx: ParseContext, today = ctx.today): string {
  const lines = text.split("\n")
  const current = lines[task.line]
  if (current === undefined || current.replace(/\r$/, "") !== task.originalMarkdown.replace(/\r$/, "")) throw new Error("A tarefa mudou de lugar; recarregue a nota.")
  const cr = current.endsWith("\r") ? "\r" : ""
  lines.splice(task.line, 1, ...failTask(task, ctx, today).map((t) => taskToLine(t, ctx.settings) + cr))
  return lines.join("\n")
}

export interface NewAgendaTask {
  description: string
  /** Prazo (`AAAA-MM-DD`); hábitos começam hoje se ficar vazio. */
  due: string | null
  habit: boolean
}

/** A linha no formato do Tasks: `- [ ] texto 🔁 every day 🏁 delete 📅 2026-11-11`. */
export function agendaTaskLine(input: NewAgendaTask, today: string): string {
  const description = input.description.replace(/\s+/g, " ").trim()
  if (!description) throw new Error("Escreva o que é a tarefa.")
  const due = input.due ?? (input.habit ? today : null)
  return ["- [ ]", description, input.habit ? "🔁 every day 🏁 delete" : "", due ? `📅 ${due}` : ""].filter(Boolean).join(" ")
}

/** Acrescenta a linha no fim do texto da nota de tarefas (com uma quebra de linha antes, se faltar). */
export function appendTaskLine(text: string, line: string): string {
  if (!text.trim()) return `${line}\n`
  return text.endsWith("\n") ? `${text}${line}\n` : `${text}\n${line}\n`
}

/** O texto de uma nota de tarefas nova. */
export function newAgendaTasksNote(line: string): string {
  return `# Tarefas\n\n${line}\n`
}

export interface AgendaTaskGroups {
  atrasadas: Task[]
  hoje: Task[]
  proximas: Task[]
  semPrazo: Task[]
  habitos: Task[]
  /** Feitas, canceladas e falhas dos últimos `doneDays` dias, as mais recentes primeiro. */
  feitas: Task[]
}

const byDue = (a: Task, b: Task) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") || a.description.localeCompare(b.description, "pt-BR")

/** As seções da vista Tarefas. Hábitos (abertos) vão só para "Hábitos", mesmo atrasados. */
export function groupAgendaTasks(tasks: Task[], today: string, doneDays = 7): AgendaTaskGroups {
  const groups: AgendaTaskGroups = { atrasadas: [], hoje: [], proximas: [], semPrazo: [], habitos: [], feitas: [] }
  const since = addDays(today, -doneDays)
  for (const task of tasks) {
    const state = taskState(task, today)
    if (state === "feita" || state === "cancelada" || state === "falhou") {
      const when = task.doneDate ?? task.cancelledDate
      if (when && when > since) groups.feitas.push(task)
      continue
    }
    if (task.status.type === "NON_TASK" || task.status.type === "EMPTY") continue
    if (isDaily(task)) groups.habitos.push(task)
    else if (state === "atrasada") groups.atrasadas.push(task)
    else if (state === "hoje") groups.hoje.push(task)
    else if (state === "proxima") groups.proximas.push(task)
    else groups.semPrazo.push(task)
  }
  for (const list of [groups.atrasadas, groups.hoje, groups.proximas, groups.semPrazo, groups.habitos]) list.sort(byDue)
  groups.feitas.sort((a, b) => (b.doneDate ?? b.cancelledDate ?? "").localeCompare(a.doneDate ?? a.cancelledDate ?? ""))
  return groups
}

const STATUS_PT: Record<StatusType, string> = { TODO: "A fazer", DONE: "Feita", IN_PROGRESS: "Em andamento", CANCELLED: "Cancelada", ON_HOLD: "Em espera", NON_TASK: "Não é tarefa", EMPTY: "Vazia" }
const DEFAULT_NAMES = new Set([...DEFAULT_CORE_STATUSES, ...DEFAULT_CUSTOM_STATUSES].map((s) => `${s.symbol}|${s.name}`).concat(["h|On Hold"]))

/** O nome do estado em português; um estado que o usuário criou fica com o nome dele. */
export function statusLabel(status: Status): string {
  return DEFAULT_NAMES.has(`${status.symbol}|${status.name}`) ? STATUS_PT[status.type] : status.name
}

/** A regra de repetição em português, para as mais comuns; as outras ficam como o Tasks escreve. */
export function recurrenceLabel(text: string): string {
  const rule = text.trim().toLowerCase()
  const whenDone = rule.endsWith(" when done")
  const base = whenDone ? rule.slice(0, -" when done".length) : rule
  const known: Record<string, string> = {
    "every day": "Todo dia",
    "every week": "Toda semana",
    "every month": "Todo mês",
    "every year": "Todo ano",
    "every weekday": "Dias úteis",
    "every 2 weeks": "A cada 2 semanas",
  }
  const label = known[base] ?? /^every (\d+) days$/.exec(base)?.[1]?.replace(/^/, "A cada ").concat(" dias")
  if (!label) return text
  return whenDone ? `${label}, a partir da conclusão` : label
}
