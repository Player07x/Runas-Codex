import { maskNonContent, parseFrontmatter } from "../parse"
import { daysBetween, isValidDate } from "./dates"
import { parseRecurrence, type Recurrence } from "./recurrence"
import { deserialize, serialize, type OnCompletion, type Priority } from "./serializer"
import { DEFAULT_TASKS_SETTINGS, statusRegistry, type TasksSettings } from "./settings"
import type { Status, StatusRegistry } from "./status"

/**
 * Uma tarefa do plugin Tasks dentro de uma nota: a linha `- [ ] …` lida com o formato escolhido, com o lugar de onde
 * veio (caminho, linha, título acima) para as ações voltarem à nota de origem.
 */
export interface Task {
  path: string
  /** Linha no arquivo (0 = primeira). */
  line: number
  /** O título mais próximo acima da tarefa, ou `null`. */
  heading: string | null
  /** Recuo antes do marcador (espaços, tabs e `>` de citação/callout). */
  indentation: string
  listMarker: string
  status: Status
  description: string
  priority: Priority
  createdDate: string | null
  startDate: string | null
  scheduledDate: string | null
  dueDate: string | null
  doneDate: string | null
  cancelledDate: string | null
  /** A agendada veio do nome do arquivo (não é gravada). */
  scheduledDateIsInferred: boolean
  /** O texto da recorrência como está na linha. */
  recurrenceText: string
  /** A regra entendida; `null` se não há 🔁 ou o texto não é uma regra válida. */
  recurrence: Recurrence | null
  onCompletion: OnCompletion
  id: string
  dependsOn: string[]
  tags: string[]
  /** ` ^id` do fim da linha, com o espaço. */
  blockLink: string
  /** A linha como está no arquivo. */
  originalMarkdown: string
  /** Espaços de quebra de linha do Markdown (dois ou mais no fim), preservados ao regravar. */
  markdownHardBreak: string
  /** Linha da tarefa-mãe (lista aninhada), ou `null`. */
  parentLine: number | null
}

/** Recuo, marcador, caractere do estado e o resto (taskRegex do Tasks). */
export const TASK_LINE = /^([\s\t>]*)([-*+]|[0-9]+[.)]) +\[(.)\] *(.*)/u
const BLOCK_LINK = / \^[a-zA-Z0-9-]+$/u

export interface ParseContext {
  settings: TasksSettings
  registry: StatusRegistry
  /** Hoje (`AAAA-MM-DD`), para regras de recorrência sem data de referência. */
  today: string
}

export function parseContext(settings: TasksSettings = DEFAULT_TASKS_SETTINGS, today = new Date()): ParseContext {
  const pad = (n: number) => String(n).padStart(2, "0")
  return { settings, registry: statusRegistry(settings), today: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` }
}

function hardBreak(line: string): string {
  if (!line.endsWith("  ")) return ""
  let spaces = "  "
  while (line.endsWith(spaces + " ")) spaces += " "
  return spaces
}

/** Data agendada tirada do nome do arquivo (opção "usar o nome do arquivo como data agendada"). */
export function dateFromPath(path: string, settings: TasksSettings): string | null {
  if (!settings.useFilenameAsScheduledDate) return null
  if (settings.filenameAsDateFolders.length && !settings.filenameAsDateFolders.some((folder) => path.startsWith(folder + "/"))) return null
  const base = path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf(".") >= 0 ? path.lastIndexOf(".") : undefined)
  if (settings.filenameAsScheduledDateFormat) {
    const custom = dateWithFormat(base, settings.filenameAsScheduledDateFormat)
    if (custom) return custom
  }
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(base) ?? /(\d{4})(\d{2})(\d{2})/.exec(base)
  const date = m ? `${m[1]}-${m[2]}-${m[3]}` : null
  return date && isValidDate(date) ? date : null
}

/** Formato do moment só com YYYY, MM, DD (e texto entre colchetes), em modo estrito como o Tasks usa. */
function dateWithFormat(value: string, format: string): string | null {
  let pattern = ""
  const order: ("Y" | "M" | "D")[] = []
  for (const token of format.match(/\[[^\]]*\]|YYYY|MM|DD|./g) ?? []) {
    if (token === "YYYY") (pattern += "(\\d{4})", order.push("Y"))
    else if (token === "MM") (pattern += "(\\d{2})", order.push("M"))
    else if (token === "DD") (pattern += "(\\d{2})", order.push("D"))
    else pattern += (token.startsWith("[") ? token.slice(1, -1) : token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }
  const m = new RegExp(`^${pattern}$`).exec(value)
  if (!m || order.length !== 3) return null
  const part = (k: "Y" | "M" | "D") => m[order.indexOf(k) + 1]!
  const date = `${part("Y")}-${part("M")}-${part("D")}`
  return isValidDate(date) ? date : null
}

/** Lê uma linha; `null` se não é tarefa (ou não tem o filtro global). */
export function parseTaskLine(line: string, path: string, lineNumber: number, ctx: ParseContext, heading: string | null = null, fallbackDate: string | null = null): Task | null {
  const text = line.replace(/\r$/, "")
  const m = TASK_LINE.exec(text)
  if (!m) return null
  let body = m[4]!.trim()
  if (!body.includes(ctx.settings.globalFilter)) return null
  const blockLink = BLOCK_LINK.exec(body)?.[0] ?? ""
  if (blockLink) body = body.replace(BLOCK_LINK, "").trim()
  const fields = deserialize(body, ctx.settings.taskFormat)
  let scheduledDateIsInferred = false
  if (fallbackDate && !fields.startDate && !fields.dueDate && !fields.scheduledDate) {
    fields.scheduledDate = fallbackDate
    scheduledDateIsInferred = true
  }
  const recurrence = fields.recurrenceText ? parseRecurrence(fields.recurrenceText, fields, ctx.today, ctx.settings.removeScheduledDateOnRecurrence) : null
  const tags = fields.tags.filter((tag) => tag !== ctx.settings.globalFilter)
  return {
    ...fields,
    tags,
    path,
    line: lineNumber,
    heading,
    indentation: m[1]!,
    listMarker: m[2]!,
    status: ctx.registry.bySymbolOrCreate(m[3]!),
    scheduledDateIsInferred,
    recurrence,
    blockLink,
    originalMarkdown: text,
    markdownHardBreak: hardBreak(text),
    parentLine: null,
  }
}

/** A linha da tarefa como o Tasks a grava (campos na ordem canônica). */
export function taskToLine(task: Task, settings: TasksSettings = DEFAULT_TASKS_SETTINGS): string {
  // Regra que o rrule entende: grava o texto canônico (como o Tasks); senão mantém o texto da linha.
  const recurrenceText = task.recurrence ? task.recurrence.text : task.recurrenceText
  return `${task.indentation}${task.listMarker} [${task.status.symbol}] ${serialize({ ...task, recurrenceText }, settings.taskFormat)}${task.markdownHardBreak}`
}

const HEADING = /^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/

/** Todas as tarefas de uma nota, fora do frontmatter, de código e de comentários. */
export function tasksInNote(path: string, text: string, ctx: ParseContext): Task[] {
  if (!text.includes("[")) return []
  const lines = text.split("\n")
  const masked = maskNonContent(text).split("\n")
  const fm = parseFrontmatter(text)
  const start = fm ? text.slice(0, fm.end).split("\n").length - 1 : 0
  const fallback = dateFromPath(path, ctx.settings)
  const out: Task[] = []
  // Pilha de recuos para achar a tarefa-mãe de cada item de lista.
  const stack: { width: number; line: number; task: boolean }[] = []
  let heading: string | null = null
  for (let i = start; i < lines.length; i++) {
    const shown = masked[i]!.replace(/\r$/, "")
    const h = HEADING.exec(shown)
    if (h) {
      heading = lines[i]!.replace(/\r$/, "").replace(/^ {0,3}#{1,6}[ \t]+/, "").replace(/[ \t]+#+[ \t]*$|[ \t]*$/, "")
      stack.length = 0
      continue
    }
    const item = /^([\s\t>]*)([-*+]|[0-9]+[.)]) /.exec(shown)
    if (!item) {
      if (shown.trim() && !/^[\s>]/.test(shown)) stack.length = 0
      continue
    }
    const width = item[1]!.replace(/\t/g, "    ").length
    while (stack.length && stack[stack.length - 1]!.width >= width) stack.pop()
    const parent = stack.length ? stack[stack.length - 1]! : null
    const task = TASK_LINE.test(shown) ? parseTaskLine(lines[i]!, path, i, ctx, heading, fallback) : null
    if (task) {
      task.parentLine = parent?.task ? parent.line : null
      out.push(task)
    }
    stack.push({ width, line: i, task: task !== null })
  }
  return out
}

// ---------- Propriedades derivadas ----------

/** Concluída para as consultas: DONE, CANCELLED ou NON_TASK. */
export function isDone(task: Task): boolean {
  return task.status.type === "DONE" || task.status.type === "CANCELLED" || task.status.type === "NON_TASK"
}

/** Bloqueada: depende de um id de tarefa ainda por fazer (só dependências diretas). */
export function isBlocked(task: Task, all: readonly Task[]): boolean {
  if (!task.dependsOn.length || isDone(task)) return false
  return task.dependsOn.some((id) => all.some((t) => t.id === id && !isDone(t)))
}

export function isBlocking(task: Task, all: readonly Task[]): boolean {
  if (!task.id || isDone(task)) return false
  return all.some((t) => !isDone(t) && t.dependsOn.includes(task.id))
}

/** Pontuação de urgência do Tasks (src/Task/Urgency.ts). `today` = `AAAA-MM-DD`. */
export function urgency(task: Task, today: string): number {
  let score = 0
  if (task.dueDate && isValidDate(task.dueDate)) {
    const overdue = daysBetween(task.dueDate, today)
    const multiplier = overdue >= 7 ? 1 : overdue >= -14 ? ((overdue + 14) * 0.8) / 21 + 0.2 : 0.2
    score += multiplier * 12
  }
  if (task.scheduledDate && isValidDate(task.scheduledDate) && today >= task.scheduledDate) score += 5
  if (task.startDate && isValidDate(task.startDate) && today < task.startDate) score += -3
  const coefficient: Record<Priority, number> = { "0": 1.5, "1": 1, "2": 0.65, "3": 0.325, "4": 0, "5": -0.3 }
  return score + coefficient[task.priority] * 6
}

/** A data "acontece": a mais cedo entre início, agendada e prazo. */
export function happensDate(task: Task): string | null {
  return [task.startDate, task.scheduledDate, task.dueDate].filter((d): d is string => d !== null && isValidDate(d)).sort()[0] ?? null
}
