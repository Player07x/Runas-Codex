import { parseTypedDate } from "./date-text"
import { addDays } from "./dates"
import type { TasksSettings } from "./settings"
import { TASK_LINE } from "./task"

/**
 * Sugestões ao digitar numa linha de tarefa, como o autocompletar do Tasks (`src/Suggestor/`): a palavra antes do
 * cursor puxa campos (📅 prazo, ⏫ prioridade, 🔁 repete…); logo depois de um campo de data, datas; depois de 🔁,
 * regras; depois de ⛔, ids de outras tarefas.
 */
export interface TaskSuggestion {
  label: string
  /** O texto que entra no lugar de `from`…cursor. */
  apply: string
  detail?: string
}

export interface TaskSuggestions {
  /** Coluna (na linha) onde começa o trecho trocado. */
  from: number
  options: TaskSuggestion[]
}

interface Symbols {
  due: string
  start: string
  scheduled: string
  created: string
  recurrence: string
  onCompletion: string
  id: string
  dependsOn: string
  priority: [string, string][]
  /** Como o campo é escrito (o Dataview pede colchetes). */
  field(symbol: string, value?: string): string
}

const EMOJI: Symbols = {
  due: "📅",
  start: "🛫",
  scheduled: "⏳",
  created: "➕",
  recurrence: "🔁",
  onCompletion: "🏁",
  id: "🆔",
  dependsOn: "⛔",
  priority: [
    ["🔺", "prioridade altíssima"],
    ["⏫", "prioridade alta"],
    ["🔼", "prioridade média"],
    ["🔽", "prioridade baixa"],
    ["⏬", "prioridade baixíssima"],
  ],
  field: (symbol, value) => (value === undefined ? `${symbol} ` : `${symbol} ${value} `),
}

const DATAVIEW: Symbols = {
  due: "due::",
  start: "start::",
  scheduled: "scheduled::",
  created: "created::",
  recurrence: "repeat::",
  onCompletion: "onCompletion::",
  id: "id::",
  dependsOn: "dependsOn::",
  priority: [
    ["priority:: highest", "prioridade altíssima"],
    ["priority:: high", "prioridade alta"],
    ["priority:: medium", "prioridade média"],
    ["priority:: low", "prioridade baixa"],
    ["priority:: lowest", "prioridade baixíssima"],
  ],
  field: (symbol, value) => (value === undefined ? `[${symbol} ` : `[${symbol} ${value}] `),
}

const DATE_WORDS = ["today", "tomorrow", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "next week", "next month", "next year", "amanhã", "sexta"]
const RECURRENCES = ["every", "every day", "every week", "every month", "every month on the", "every year", "every week on Sunday", "every week on Monday", "every week on Tuesday", "every week on Wednesday", "every week on Thursday", "every week on Friday", "every week on Saturday", "every weekday", "every day when done", "every week when done"]

export function suggestForTaskLine(line: string, cursor: number, settings: TasksSettings, now: Date, ids: { id: string; description: string }[] = []): TaskSuggestions | null {
  if (!settings.autoSuggestInEditor) return null
  const m = TASK_LINE.exec(line)
  if (!m) return null
  const max = settings.autoSuggestMaxItems || 20
  const bodyStart = line.length - m[4]!.length
  if (cursor < bodyStart) return null
  const before = line.slice(0, cursor)
  const s = settings.taskFormat === "dataview" ? DATAVIEW : EMOJI
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  // Logo depois de um campo de data: datas (o texto digitado vira data pelo mesmo leitor da janela).
  const dateSymbols = [s.due, s.start, s.scheduled, s.created, ...(settings.taskFormat === "dataview" ? [] : ["📆", "🗓", "⌛"])]
  const dateField = new RegExp(`(?:${dateSymbols.map(esc).join("|")})\\uFE0F? ?([^\\]📅🛫⏳➕🔁🏁🆔⛔]*)$`).exec(before)
  if (dateField) {
    const typed = dateField[1]!
    const from = cursor - typed.length
    const close = settings.taskFormat === "dataview" ? "] " : " "
    const options: TaskSuggestion[] = []
    const parsed = typed.trim() ? parseTypedDate(typed, now) : null
    if (parsed) options.push({ label: parsed, apply: parsed + close, detail: typed.trim() })
    for (const word of DATE_WORDS) {
      if (typed.trim() && !word.toLowerCase().startsWith(typed.trim().toLowerCase())) continue
      const date = parseTypedDate(word, now)
      if (date && !options.some((o) => o.label === date)) options.push({ label: date, apply: date + close, detail: word })
    }
    return options.length ? { from, options: options.slice(0, Math.min(8, max)) } : null
  }
  const rec = new RegExp(`${esc(s.recurrence)} ?([a-zA-Z0-9, ]*)$`).exec(before)
  if (rec) {
    const typed = rec[1]!
    const options = RECURRENCES.filter((r) => r.startsWith(typed.toLowerCase()) && r !== typed).map((r) => ({ label: r, apply: r + (r.endsWith("the") || r === "every" ? " " : settings.taskFormat === "dataview" ? "] " : " ") }))
    return options.length ? { from: cursor - typed.length, options: options.slice(0, Math.min(10, max)) } : null
  }
  const dep = new RegExp(`${esc(s.dependsOn)} ?((?:[a-zA-Z0-9-_]+, *)*)([a-zA-Z0-9-_]*)$`).exec(before)
  if (dep) {
    const typed = dep[2]!
    const options = ids.filter((t) => t.id.startsWith(typed) || t.description.toLowerCase().includes(typed.toLowerCase())).slice(0, Math.min(10, max)).map((t) => ({ label: t.id, apply: t.id, detail: t.description }))
    return options.length ? { from: cursor - typed.length, options } : null
  }
  const comp = new RegExp(`${esc(s.onCompletion)} ?([a-z]*)$`).exec(before)
  if (comp) {
    const typed = comp[1]!
    const options = ["delete", "keep"].filter((o) => o.startsWith(typed)).map((o) => ({ label: o, apply: o + (settings.taskFormat === "dataview" ? "] " : " ") }))
    return options.length ? { from: cursor - typed.length, options } : null
  }

  // Uma palavra (ao menos 1 letra): campos que começam com ela, em inglês (como o Tasks) ou em português.
  // Mínimo de letras do Tasks; com 0 (o padrão), duas: menos janelas no meio da descrição em português.
  const min = settings.autoSuggestMinMatch > 0 ? settings.autoSuggestMinMatch : 2
  const word = new RegExp(`(?:^|\\s)([a-zA-Zçãéíóúâê]{${min},})$`).exec(before.slice(bodyStart))
  if (!word) return null
  const typed = word[1]!.toLowerCase()
  const fields: { keys: string[]; label: string; apply: string }[] = [
    { keys: ["due", "prazo"], label: `${s.due} prazo`, apply: s.field(s.due) },
    { keys: ["start", "início", "inicio", "começa"], label: `${s.start} início`, apply: s.field(s.start) },
    { keys: ["scheduled", "agendada", "agendar"], label: `${s.scheduled} agendada`, apply: s.field(s.scheduled) },
    { keys: ["created", "criada"], label: `${s.created} criada hoje`, apply: s.field(s.created, today) },
    { keys: ["recurring", "repeat", "every", "repete", "recorrente"], label: `${s.recurrence} repete`, apply: s.field(s.recurrence) },
    { keys: ["when", "on completion", "ao concluir", "delete", "apagar"], label: `${s.onCompletion} ao concluir`, apply: s.field(s.onCompletion) },
    { keys: ["id"], label: `${s.id} id`, apply: s.field(s.id, Math.random().toString(36).slice(2, 8)) },
    { keys: ["depends", "blocked", "depende"], label: `${s.dependsOn} depende de`, apply: s.field(s.dependsOn) },
    ...s.priority.map(([symbol, label]) => ({ keys: [label.split(" ").at(-1)!, label, "priority", "prioridade", ...(label.includes("altíssima") ? ["highest"] : label.includes("alta") ? ["high"] : label.includes("média") ? ["medium"] : label.includes("baixíssima") ? ["lowest"] : ["low"])], label: `${symbol.startsWith("priority") ? "" : symbol + " "}${label}`, apply: settings.taskFormat === "dataview" ? `[${symbol}] ` : `${symbol} ` })),
    { keys: ["today", "hoje"], label: `${s.due} hoje (${today})`, apply: s.field(s.due, today) },
    { keys: ["tomorrow", "amanhã", "amanha"], label: `${s.due} amanhã (${addDays(today, 1)})`, apply: s.field(s.due, addDays(today, 1)) },
  ]
  const options = fields.filter((f) => f.keys.some((k) => k.toLowerCase().startsWith(typed))).map((f) => ({ label: f.label, apply: f.apply }))
  return options.length ? { from: cursor - word[1]!.length, options: options.slice(0, Math.min(12, max)) } : null
}
