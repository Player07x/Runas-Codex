/**
 * O texto de uma tarefa depois da caixa (`- [ ] …`), nos dois formatos do Tasks 8.6.0: emojis (o padrão) e campos
 * do Dataview (`[due:: 2026-10-18]`). As expressões e a ordem de gravação são as de
 * `src/TaskSerializer/DefaultTaskSerializer.ts` e `DataviewTaskSerializer.ts`: os campos são lidos do fim para o
 * começo, em qualquer ordem, e as etiquetas no meio deles voltam para a descrição.
 */

export type Priority = "0" | "1" | "2" | "3" | "4" | "5"
export const PRIORITY = { Highest: "0", High: "1", Medium: "2", None: "3", Low: "4", Lowest: "5" } as const satisfies Record<string, Priority>
export const PRIORITY_NAMES: Record<Priority, string> = { "0": "Highest", "1": "High", "2": "Medium", "3": "Normal", "4": "Low", "5": "Lowest" }

export type OnCompletion = "" | "keep" | "delete"

/** Os campos que o formato guarda na linha (a recorrência ainda como texto). */
export interface TaskFields {
  description: string
  priority: Priority
  createdDate: string | null
  startDate: string | null
  scheduledDate: string | null
  dueDate: string | null
  doneDate: string | null
  cancelledDate: string | null
  recurrenceText: string
  onCompletion: OnCompletion
  id: string
  dependsOn: string[]
  tags: string[]
}

export const TASK_ID = /[a-zA-Z0-9-_]+/
const TASK_ID_SEQUENCE = new RegExp(TASK_ID.source + "( *, *" + TASK_ID.source + " *)*")

/** Etiquetas como o Tasks reconhece (mais solto que o Obsidian: `#123` conta). */
export const HASHTAGS = /(^|\s)#[^ !@#$%^&*(),.?":{}|<>]+/g
const HASHTAGS_FROM_END = new RegExp(HASHTAGS.source + "$")

export function extractHashtags(description: string): string[] {
  return description.match(HASHTAGS)?.map((tag) => tag.trim()) ?? []
}

interface Symbols {
  priority: Record<Exclude<Priority, "3">, string>
  created: string
  start: string
  scheduled: string
  due: string
  done: string
  cancelled: string
  recurrence: string
  onCompletion: string
  id: string
  dependsOn: string
  regex: Record<"priority" | "start" | "created" | "scheduled" | "due" | "done" | "cancelled" | "recurrence" | "onCompletion" | "id" | "dependsOn", RegExp>
  parsePriority(value: string): Priority
  /** Embrulha um campo já escrito (o Dataview põe entre colchetes). */
  wrap(component: string): string
}

function fieldRegex(symbols: string, value: string): RegExp {
  // ️? aceita o seletor de variação depois do emoji; termina em $ porque os campos saem do fim.
  return new RegExp(symbols + "️?" + (value ? " *" + value : "") + "$")
}
const dateField = (symbols: string) => fieldRegex(symbols, "(\\d{4}-\\d{2}-\\d{2})")

const EMOJI: Symbols = {
  priority: { "0": "🔺", "1": "⏫", "2": "🔼", "4": "🔽", "5": "⏬" },
  created: "➕",
  start: "🛫",
  scheduled: "⏳",
  due: "📅",
  done: "✅",
  cancelled: "❌",
  recurrence: "🔁",
  onCompletion: "🏁",
  id: "🆔",
  dependsOn: "⛔",
  regex: {
    priority: fieldRegex("(🔺|⏫|🔼|🔽|⏬)", ""),
    start: dateField("🛫"),
    created: dateField("➕"),
    scheduled: dateField("(?:⏳|⌛)"),
    due: dateField("(?:📅|📆|🗓)"),
    done: dateField("✅"),
    cancelled: dateField("❌"),
    recurrence: fieldRegex("🔁", "([a-zA-Z0-9, !]+)"),
    onCompletion: fieldRegex("🏁", "([a-zA-Z]+)"),
    dependsOn: fieldRegex("⛔", "(" + TASK_ID_SEQUENCE.source + ")"),
    id: fieldRegex("🆔", "(" + TASK_ID.source + ")"),
  },
  parsePriority: (value) => (({ "🔺": "0", "⏫": "1", "🔼": "2", "🔽": "4", "⏬": "5" }) as Record<string, Priority>)[value] ?? "3",
  wrap: (component) => component,
}

/** `[chave:: valor]` ou `(chave:: valor)`, sem misturar os pares (toInlineFieldRegex do Tasks). */
function inlineField(inner: string): RegExp {
  return new RegExp("(?:(?=[^\\]]+\\])\\[|(?=[^)]+\\))\\() *" + inner + " *[)\\]](?: *,)?$")
}

const DATAVIEW: Symbols = {
  priority: { "0": "priority:: highest", "1": "priority:: high", "2": "priority:: medium", "4": "priority:: low", "5": "priority:: lowest" },
  created: "created::",
  start: "start::",
  scheduled: "scheduled::",
  due: "due::",
  done: "completion::",
  cancelled: "cancelled::",
  recurrence: "repeat::",
  onCompletion: "onCompletion::",
  id: "id::",
  dependsOn: "dependsOn::",
  regex: {
    priority: inlineField("priority:: *(highest|high|medium|low|lowest)"),
    start: inlineField("start:: *(\\d{4}-\\d{2}-\\d{2})"),
    created: inlineField("created:: *(\\d{4}-\\d{2}-\\d{2})"),
    scheduled: inlineField("scheduled:: *(\\d{4}-\\d{2}-\\d{2})"),
    due: inlineField("due:: *(\\d{4}-\\d{2}-\\d{2})"),
    done: inlineField("completion:: *(\\d{4}-\\d{2}-\\d{2})"),
    cancelled: inlineField("cancelled:: *(\\d{4}-\\d{2}-\\d{2})"),
    recurrence: inlineField("repeat:: *([a-zA-Z0-9, !]+)"),
    onCompletion: inlineField("onCompletion:: *([a-zA-Z]+)"),
    dependsOn: inlineField("dependsOn:: *(" + TASK_ID_SEQUENCE.source + ")"),
    id: inlineField("id:: *(" + TASK_ID.source + ")"),
  },
  parsePriority: (value) => (({ highest: "0", high: "1", medium: "2", low: "4", lowest: "5" }) as Record<string, Priority>)[value.toLowerCase()] ?? "3",
  // Dois espaços antes: evita um defeito de exibição do Obsidian com campos entre colchetes seguidos (#1913 do Tasks).
  wrap: (component) => (component ? `  [${component.trim()}]` : ""),
}

export type TaskFormat = "tasksPluginEmoji" | "dataview"
const FORMATS: Record<TaskFormat, Symbols> = { tasksPluginEmoji: EMOJI, dataview: DATAVIEW }

export function parseOnCompletion(value: string): OnCompletion {
  const v = value.trim().toLowerCase()
  return v === "delete" ? "delete" : v === "keep" ? "keep" : ""
}

/** Lê os campos do texto depois da caixa (sem a referência de bloco do fim). */
export function deserialize(body: string, format: TaskFormat = "tasksPluginEmoji"): TaskFields {
  const { regex, parsePriority } = FORMATS[format]
  const out: TaskFields = { description: "", priority: "3", createdDate: null, startDate: null, scheduledDate: null, dueDate: null, doneDate: null, cancelledDate: null, recurrenceText: "", onCompletion: "", id: "", dependsOn: [], tags: [] }
  let line = body
  let matched = false
  let trailingTags = ""
  const take = (re: RegExp, set: (m: RegExpMatchArray) => void) => {
    const m = line.match(re)
    if (m) {
      set(m)
      line = line.replace(re, "").trim()
      matched = true
    }
  }
  // Até 21 passadas, como o Tasks (proteção contra laço infinito).
  for (let runs = 0; runs <= 20; runs++) {
    matched = false
    take(regex.priority, (m) => (out.priority = parsePriority(m[1]!)))
    take(regex.done, (m) => (out.doneDate = m[1]!))
    take(regex.cancelled, (m) => (out.cancelledDate = m[1]!))
    take(regex.due, (m) => (out.dueDate = m[1]!))
    take(regex.scheduled, (m) => (out.scheduledDate = m[1]!))
    take(regex.start, (m) => (out.startDate = m[1]!))
    take(regex.created, (m) => (out.createdDate = m[1]!))
    take(regex.recurrence, (m) => (out.recurrenceText = m[1]!.trim()))
    take(regex.onCompletion, (m) => (out.onCompletion = parseOnCompletion(m[1]!)))
    take(HASHTAGS_FROM_END, (m) => {
      const tag = m[0].trim()
      trailingTags = trailingTags ? `${tag} ${trailingTags}` : tag
    })
    take(regex.id, (m) => (out.id = m[1]!.trim()))
    take(regex.dependsOn, (m) => (out.dependsOn = m[1]!.replace(/ /g, "").split(",").filter(Boolean)))
    if (!matched) break
  }
  if (trailingTags) line += (line ? " " : "") + trailingTags
  out.description = line
  out.tags = extractHashtags(line)
  return out
}

/** Os campos que a gravação escreve (a recorrência já no texto canônico do rrule). */
export interface SerializableTask extends Omit<TaskFields, "tags"> {
  scheduledDateIsInferred?: boolean
  blockLink: string
}

/** Escreve o texto depois da caixa, na ordem do Tasks: descrição, id, depende de, prioridade, recorrência, ao concluir, datas, bloco. */
export function serialize(task: SerializableTask, format: TaskFormat = "tasksPluginEmoji"): string {
  const s = FORMATS[format]
  const field = (symbol: string, value: string | null) => (value ? s.wrap(` ${symbol} ${value}`) : "")
  const priority = task.priority === "3" ? "" : s.wrap(" " + s.priority[task.priority])
  return [
    task.description,
    field(s.id, task.id),
    field(s.dependsOn, task.dependsOn.join(",")),
    priority,
    field(s.recurrence, task.recurrenceText),
    field(s.onCompletion, task.onCompletion),
    field(s.created, task.createdDate),
    field(s.start, task.startDate),
    task.scheduledDateIsInferred ? "" : field(s.scheduled, task.scheduledDate),
    field(s.due, task.dueDate),
    field(s.cancelled, task.cancelledDate),
    field(s.done, task.doneDate),
    task.blockLink,
  ].join("")
}

/** Os emojis do Tasks (para limpar a exibição de uma tarefa em listas). */
export const TASK_EMOJIS = ["🔺", "⏫", "🔼", "🔽", "⏬", "🛫", "➕", "⏳", "⌛", "📅", "📆", "🗓", "✅", "❌", "🔁", "🏁", "⛔", "🆔"]
