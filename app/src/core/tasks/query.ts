import { parseDateRangeText, parseDateText, type DateRange } from "./date-text"
import { isValidDate, weekdayName } from "./dates"
import { PRIORITY_NAMES, type Priority } from "./serializer"
import type { TasksSettings } from "./settings"
import { STATUS_TYPES, typeGroupText, type StatusType } from "./status"
import { happensDate, isBlocked, isBlocking, isDone, urgency, type Task } from "./task"

/**
 * Consultas ```` ```tasks ```` com a linguagem do Tasks 8.6.0 (`src/Query/`): uma instrução por linha (com `\` para
 * continuar), filtros combinados com AND/OR/NOT/XOR, `sort by`, `group by`, `limit`, `hide`/`show`, `short mode`,
 * `explain`, `preset`, consulta global e os marcadores `{{query.file…}}`. Instruções com JavaScript (`… by function`)
 * dão o mesmo erro do Tasks com o JavaScript desligado, que é o padrão dele desde a 8.0.
 */

export interface QueryFile {
  /** Caminho da nota que tem a consulta. */
  path: string
  properties?: Record<string, unknown>
  /** Destinos das ligações da nota, usados pelos marcadores do Tasks 8.6.0. */
  outlinks?: string[]
  outlinksInBody?: string[]
  outlinksInProperties?: string[]
}

export interface SearchInfo {
  allTasks: readonly Task[]
  today: string
  now: Date
}

type FilterFn = (task: Task, info: SearchInfo) => boolean
type Comparator = (a: Task, b: Task, info: SearchInfo) => number
type GroupFn = (task: Task, info: SearchInfo) => string[]

export interface QueryFilter {
  instruction: string
  explanation: string
  fn: FilterFn
}

export interface QuerySorter {
  instruction: string
  compare: Comparator
}

export interface QueryGrouper {
  instruction: string
  property: string
  group: GroupFn
  reverse: boolean
}

/** Elementos que `hide`/`show` ligam e desligam (os nomes do Tasks). */
export const TASK_ELEMENTS = ["id", "depends on", "priority", "recurrence rule", "on completion", "created date", "start date", "scheduled date", "due date", "cancelled date", "done date", "tags"] as const
export const QUERY_ELEMENTS = ["toolbar", "tree", "edit button", "postpone button", "backlink", "nested backlink", "urgency", "task count", "group count"] as const
export type TaskElement = (typeof TASK_ELEMENTS)[number]
export type QueryElement = (typeof QUERY_ELEMENTS)[number]

export interface ParsedQuery {
  source: string
  filters: QueryFilter[]
  sorters: QuerySorter[]
  groupers: QueryGrouper[]
  limit?: number
  groupLimit?: number
  /** Elementos escondidos (tarefa e consulta). */
  hidden: Set<TaskElement | QueryElement>
  shortMode: boolean
  explain: boolean
  ignoreGlobalQuery: boolean
  view: { mode: "list" | "columns"; grouper: QueryGrouper | null }
  error?: string
}

// ---------- Linhas e marcadores ----------

/** Junta as linhas terminadas em `\` (`\\` no fim é uma barra literal). */
export function continueLines(source: string): string[] {
  const out: string[] = []
  let current = ""
  let continuing = false
  for (const input of (source + "\n").split("\n")) {
    let line: string = continuing ? input.replace(/^[ \t]*/, "") : input
    const two: boolean = line.endsWith("\\\\")
    if (two) line = line.slice(0, -1)
    else if (input.endsWith("\\")) line = line.replace(/[ \t]*\\$/, "")
    current = continuing ? `${current} ${line}` : line
    continuing = !two && input.endsWith("\\")
    if (!continuing) {
      if (current.trim()) out.push(current)
      current = ""
    }
  }
  return out
}

function fileInfo(path: string) {
  const filename = path.slice(path.lastIndexOf("/") + 1)
  const folder = path.slice(0, path.length - filename.length) || "/"
  const slash = path.replace(/^\//, "").indexOf("/")
  return {
    path,
    pathWithoutExtension: path.replace(/\.md$/, ""),
    filename,
    filenameWithoutExtension: filename.replace(/\.md$/, ""),
    folder,
    root: slash === -1 ? "/" : path.replace(/^\//, "").slice(0, slash + 1),
  }
}

const JS_DISABLED =
  "O JavaScript está desligado nas consultas do Tasks (o padrão desde o Tasks 8.0), e o Runas-Codex não executa JavaScript de notas.\n    Esta consulta usa JavaScript, por exemplo em \"filter by function\", \"sort by function\" ou \"group by function\"."

/** Troca os marcadores documentados (`{{query.file.path}}`…); outro marcador com código é recusado como no Tasks. */
export function expandPlaceholders(line: string, file: QueryFile | undefined): string {
  if (!line.includes("{{") || !line.includes("}}")) return line
  if (!file) throw new Error(`A consulta tem um marcador "{{…}}", mas não se sabe em que nota ela está.\nA consulta é:\n${line}`)
  const info = fileInfo(file.path)
  return line.replace(/\{\{(.*?)\}\}/g, (match, inner: string) => {
    const key = inner.trim()
    const simple = /^query\.file\.(path|pathWithoutExtension|root|folder|filename|filenameWithoutExtension)$/.exec(key)
    if (simple) return info[simple[1] as keyof typeof info]
    const links = /^query\.file\.(outlinks|outlinksInBody|outlinksInProperties)$/.exec(key)
    if (links) return (file[links[1] as "outlinks" | "outlinksInBody" | "outlinksInProperties"] ?? []).join(", ")
    const prop = /^query\.file\.(property|hasProperty)\(\s*(['"])(.*)\2\s*\)$/.exec(key)
    if (prop) {
      const value = prop[1] === "hasProperty" ? file.properties?.[prop[3]!] !== undefined : (file.properties?.[prop[3]!] ?? null)
      if (value === null) throw new Error(`Marcador inválido: resultado 'null'.\n    Confira se a propriedade existe na nota:\n        {{${inner}}}`)
      return typeof value === "object" ? JSON.stringify(value) : String(value)
    }
    if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(key)) return match
    throw new Error(JS_DISABLED)
  })
}

/**
 * Expande os marcadores de links da nota em uma expressão booleana que o núcleo consegue avaliar sem JavaScript.
 * O Tasks expõe esses marcadores como listas de Link; no Runas-Codex, consultas de função continuam bloqueadas pela
 * CSP, então `path includes {{query.file.outlinks}}` vira uma combinação OR/AND equivalente.
 */
function expandOutlinkInstruction(line: string, file: QueryFile | undefined): string | null {
  const match = /^(path|folder|root|filename) (includes|does not include) \{\{query\.file\.(outlinks|outlinksInBody|outlinksInProperties)\}\}$/i.exec(line.trim())
  if (!match || !file) return null
  const values = file[match[3]!.toLowerCase() as "outlinks" | "outlinksInBody" | "outlinksInProperties"] ?? []
  const field = match[1]!
  const operator = match[2]!.toLowerCase()
  const empty = "\u0000"
  if (!values.length) return `${field} ${operator} ${empty}`
  const joiner = operator === "includes" ? " OR " : " AND "
  const pieces = values.map((value) => `${field} ${operator} ${value}`)
  return pieces.length === 1 ? pieces[0]! : pieces.map((piece) => `"${piece.replaceAll('"', '\\"')}"`).join(joiner)
}

// ---------- Campos ----------

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** `/padrão/flags`, recusando quantificadores aninhados (como o Tasks 8.3+). */
function regexMatcher(value: string): RegExp {
  const m = /^\/(.+)\/([^/]*)$/.exec(value)
  if (!m) throw new Error(`Instrução inválida: expressão regular precisa ser /padrão/ ou /padrão/flags.`)
  if (/\((?:[^()\\]|\\.)*[+*}]\)\s*[+*{]/.test(m[1]!)) throw new Error("Expressão regular recusada: quantificadores aninhados (como (a+)+) podem travar a busca.")
  return new RegExp(m[1]!, m[2])
}

interface Matcher {
  test(value: string): boolean
}

function makeMatcher(operator: string, value: string): Matcher {
  if (operator.includes("regex")) {
    const re = regexMatcher(value)
    return { test: (s) => s.match(re) !== null }
  }
  const needle = value.toLocaleLowerCase()
  return { test: (s) => s.toLocaleLowerCase().includes(needle) }
}

const taskFile = (task: Task) => fileInfo(task.path)

/** Descrição sem o filtro global (o Tasks tira como subtexto). */
function descriptionValue(task: Task, settings: TasksSettings): string {
  return settings.globalFilter ? task.description.replace(settings.globalFilter, "").trim() : task.description
}

function cleanDescription(description: string, settings: TasksSettings): string {
  let d = settings.globalFilter ? description.replace(settings.globalFilter, "").trim() : description
  const link = /^\[\[?([^\]]*)]]?/.exec(d)
  if (link) d = link[1]!.slice(link[1]!.indexOf("|") + 1) + d.replace(/^\[\[?([^\]]*)]]?/, "")
  for (const re of [/^\*\*([^*]+)\*\*/, /^\*([^*]+)\*/, /^==([^=]+)==/, /^__([^_]+)__/, /^_([^_]+)_/]) {
    const m = re.exec(d)
    if (m) d = m[1]! + d.replace(re, "")
  }
  return d
}

const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

function compareDates(a: string | null, b: string | null): number {
  if (a !== null && b === null) return -1
  if (a === null && b !== null) return 1
  if (a === null || b === null) return 0
  const va = isValidDate(a)
  const vb = isValidDate(b)
  if (va && !vb) return 1
  if (!va && vb) return -1
  return a < b ? -1 : a > b ? 1 : 0
}

const escapeMarkdown = (s: string) => s.replace(/\\/g, "\\\\").replace(/_/g, "\\_")

interface Field {
  name: string
  /** Nome usado em `sort by`/`group by` (quando não é o `name`). */
  sortName?: string
  groupName?: string
  filter?(line: string, ctx: ParseCtx): QueryFilter | Error | null
  compare?: Comparator
  group?: GroupFn
}

interface ParseCtx {
  settings: TasksSettings
  now: Date
  today: string
}

const filterOf = (instruction: string, fn: FilterFn, explanation = instruction): QueryFilter => ({ instruction, fn, explanation })

/** Instruções fixas (`done`, `is recurring`…), comparadas sem diferenciar maiúsculas. */
function fixed(map: Record<string, FilterFn>) {
  return (line: string): QueryFilter | null => {
    const key = Object.keys(map).find((k) => k.toLocaleLowerCase() === line.toLocaleLowerCase())
    return key ? filterOf(line, map[key]!) : null
  }
}

function textFilter(fieldPattern: string, value: (task: Task) => string | string[], multi = false) {
  const operators = "includes|does not include|regex matches|regex does not match" + (multi ? "|include|do not include" : "")
  const re = new RegExp(`^(?:${fieldPattern}) (${operators}) (.*)`, "i")
  return (line: string): QueryFilter | Error | null => {
    const m = re.exec(line)
    if (!m) return null
    try {
      const operator = m[1]!.toLowerCase()
      const matcher = makeMatcher(operator, m[2]!)
      const negate = /not/.test(operator)
      return filterOf(line, (task) => {
        const v = value(task)
        const hit = Array.isArray(v) ? v.some((s) => matcher.test(s)) : matcher.test(v)
        return negate ? !hit : hit
      })
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error))
    }
  }
}

const DATE_KEYWORD = "((?:on|in) or before|before|(?:on|in) or after|after|on|in)"

function describeRange(r: DateRange): string {
  const one = (d: string) => `${d} (${weekdayName(d)})`
  return r.start === r.end ? one(r.start) : `entre ${one(r.start)} e ${one(r.end)}, inclusive`
}

function dateField(name: string, instructionName: string, get: (task: Task) => (string | null)[], missing: boolean, primary: (task: Task) => string | null = (t) => get(t)[0] ?? null): Field {
  const label = name
  const special = fixed({ [`has ${name} date`]: (t) => get(t).some((d) => d !== null), [`no ${name} date`]: (t) => get(t).every((d) => d === null), ...(name === "happens" ? {} : { [`${name} date is invalid`]: (t) => get(t).some((d) => d !== null && !isValidDate(d)) }) })
  const re = new RegExp(`^${instructionName} (${DATE_KEYWORD}? ?(.*))`, "i")
  return {
    name,
    filter(line, ctx) {
      const f = special(line)
      if (f) return f
      if (/<%|\{\{date/.test(line)) return new Error("A instrução tem texto de modelo (Templater/Templates) que não foi expandido.")
      const m = re.exec(line)
      if (!m) return null
      const keyword = m[2]?.toLowerCase()
      let r = parseDateRangeText(m[3]!, ctx.now)
      if (!r) {
        const one = parseDateText(m[1]!, ctx.now)
        if (one) r = { start: one, end: one }
      }
      if (!r) return new Error(`não entendi a data em "${label}"`)
      const range = r
      const test = (d: string | null): boolean => {
        if (d === null) return missing
        if (!isValidDate(d)) return false
        switch (keyword) {
          case "before":
            return d < range.start
          case "after":
            return d > range.end
          case "on or before":
          case "in or before":
            return d <= range.end
          case "on or after":
          case "in or after":
            return d >= range.start
          default:
            return d >= range.start && d <= range.end
        }
      }
      const shown = keyword === "before" || keyword === "on or after" || keyword === "in or after" ? range.start : range.end
      const explanation = !keyword || keyword === "on" || keyword === "in" ? `data ${label} ${describeRange(range)}` : `data ${label} ${keyword} ${shown} (${weekdayName(shown)})`
      return filterOf(line, (task) => get(task).some(test), explanation + (missing ? ` OU sem data ${label}` : ""))
    },
    compare: (a, b) => compareDates(primary(a), primary(b)),
    group(task) {
      const d = primary(task)
      if (d === null) return [`No ${name} date`]
      if (!isValidDate(d)) return [`%%0%% Invalid ${name} date`]
      return [`${d} ${weekdayName(d)}`]
    },
  }
}

function fields(settings: TasksSettings): Field[] {
  const statusName = textFilter("status\\.name", (t) => t.status.name)
  const desc = textFilter("description", (t) => descriptionValue(t, settings))
  const tagsText = textFilter("tag|tags", (t) => t.tags, true)
  const idText = textFilter("id", (t) => t.id)
  return [
    { name: "status.name", filter: (l) => statusName(l), compare: (a, b) => compareText(a.status.name, b.status.name), group: (t) => [t.status.name] },
    {
      name: "status.type",
      filter(line) {
        if (!/^status\.type/i.test(line)) return null
        const m = /^status\.type (is|is not) ([^ ]+)$/i.exec(line)
        const type = m?.[2]!.toUpperCase() as StatusType | undefined
        if (!m || !type || !(STATUS_TYPES as readonly string[]).includes(type) || type === "EMPTY")
          return new Error(`Instrução de status.type inválida: '${line}'.\n    Opções: 'is' e 'is not'.\n    Valores: ${STATUS_TYPES.filter((t) => t !== "EMPTY").join(" ")}\n    Exemplo: status.type is not NON_TASK`)
        const not = m[1]!.toLowerCase() === "is not"
        return filterOf(line, (t) => (t.status.type === type) !== not)
      },
      compare: (a, b) => compareText(typeGroupText(a.status.type), typeGroupText(b.status.type)),
      group: (t) => [typeGroupText(t.status.type)],
    },
    {
      name: "status",
      filter: fixed({ done: (t) => isDone(t), "not done": (t) => !isDone(t) }),
      compare: (a, b) => (isDone(a) === isDone(b) ? 0 : isDone(a) ? 1 : -1),
      group: (t) => [isDone(t) ? "Done" : "Todo"],
    },
    {
      name: "recurring",
      filter: fixed({ "is recurring": (t) => t.recurrence !== null, "is not recurring": (t) => t.recurrence === null }),
      compare: (a, b) => (a.recurrence !== null && b.recurrence === null ? -1 : a.recurrence === null && b.recurrence !== null ? 1 : 0),
      group: (t) => [t.recurrence ? "Recurring" : "Not Recurring"],
    },
    {
      name: "priority",
      filter(line) {
        if (!/^priority/i.test(line)) return null
        const m = /^priority(\s+is)?(\s+(above|below|not))?(\s+(lowest|low|none|medium|high|highest))$/i.exec(line)
        if (!m) return new Error("não entendi o filtro de prioridade")
        const wanted = ({ lowest: "5", low: "4", none: "3", medium: "2", high: "1", highest: "0" } as Record<string, Priority>)[m[5]!.toLowerCase()]!
        const op = m[3]?.toLowerCase()
        return filterOf(line, (t) => (op === "above" ? t.priority < wanted : op === "below" ? t.priority > wanted : op === "not" ? t.priority !== wanted : t.priority === wanted))
      },
      compare: (a, b) => compareText(a.priority, b.priority),
      group: (t) => [`%%${t.priority}%%${PRIORITY_NAMES[t.priority]} priority`],
    },
    dateField("happens", "happens", (t) => [t.startDate, t.scheduledDate, t.dueDate], false, happensDate),
    dateField("cancelled", "cancelled", (t) => [t.cancelledDate], false),
    dateField("created", "created", (t) => [t.createdDate], false),
    dateField("start", "starts", (t) => [t.startDate], true),
    dateField("scheduled", "scheduled", (t) => [t.scheduledDate], false),
    dateField("due", "due", (t) => [t.dueDate], false),
    dateField("done", "done", (t) => [t.doneDate], false),
    { name: "path", filter: textFilter("path", (t) => t.path), compare: (a, b) => compareText(a.path, b.path), group: (t) => [escapeMarkdown(t.path.replace(".md", ""))] },
    { name: "folder", filter: textFilter("folder", (t) => taskFile(t).folder), group: (t) => [escapeMarkdown(taskFile(t).folder)] },
    { name: "root", filter: textFilter("root", (t) => taskFile(t).root), group: (t) => [escapeMarkdown(taskFile(t).root)] },
    {
      name: "backlink",
      group(t) {
        const name = taskFile(t).filenameWithoutExtension
        return [t.heading ? `[[${name}#${t.heading}|${name} > ${t.heading}]]` : `[[${name}]]`]
      },
    },
    { name: "description", filter: (l) => desc(l), compare: (a, b) => compareText(cleanDescription(a.description, settings), cleanDescription(b.description, settings)) },
    {
      name: "tag",
      groupName: "tags",
      filter: (line) => fixed({ "has tag": (t) => t.tags.length > 0, "has tags": (t) => t.tags.length > 0, "no tag": (t) => !t.tags.length, "no tags": (t) => !t.tags.length })(line) ?? tagsText(line),
      compare: tagComparator(1),
      group: (t) => (t.tags.length ? t.tags : ["(No tags)"]),
    },
    { name: "heading", filter: textFilter("heading", (t) => t.heading ?? ""), compare: (a, b) => compareText(a.heading ?? "", b.heading ?? ""), group: (t) => [t.heading || "(No heading)"] },
    {
      name: "exclude",
      filter: fixed({
        "exclude sub-items": (t) => {
          if (t.indentation === "") return true
          const quote = t.indentation.lastIndexOf(">")
          return quote !== -1 && /^ ?$/.test(t.indentation.slice(quote + 1))
        },
      }),
    },
    { name: "filename", filter: textFilter("filename", (t) => taskFile(t).filename), compare: (a, b) => compareText(taskFile(a).filename, taskFile(b).filename), group: (t) => [`[[${taskFile(t).filenameWithoutExtension}]]`] },
    {
      name: "urgency",
      compare: (a, b, info) => urgency(b, info.today) - urgency(a, info.today),
      group: (t, info) => [urgency(t, info.today).toFixed(2)],
    },
    { name: "recurrence", filter: textFilter("recurrence", (t) => t.recurrence?.text ?? ""), group: (t) => [t.recurrence?.text ?? "None"] },
    {
      name: "function",
      filter: (line) => (/^filter by function/i.test(line) ? new Error(JS_DISABLED) : null),
    },
    {
      name: "id",
      filter: (line) => fixed({ "has id": (t) => t.id.length > 0, "no id": (t) => t.id.length === 0 })(line) ?? idText(line),
      compare: (a, b) => compareText(a.id, b.id),
      group: (t) => [t.id],
    },
    { name: "blocked by", filter: (line) => fixed({ "has depends on": (t) => t.dependsOn.length > 0, "no depends on": (t) => t.dependsOn.length === 0 })(line) },
    {
      name: "blocking",
      filter: fixed({ "is blocking": (t, i) => isBlocking(t, i.allTasks), "is not blocking": (t, i) => !isBlocking(t, i.allTasks), "is blocked": (t, i) => isBlocked(t, i.allTasks), "is not blocked": (t, i) => !isBlocked(t, i.allTasks) }),
    },
    { name: "random", compare: (a, b, info) => randomKey(a, info) - randomKey(b, info) },
  ]
}

function tagComparator(instance: number): Comparator {
  return (a, b) => {
    if (!a.tags.length && !b.tags.length) return 0
    if (!a.tags.length) return 1
    if (!b.tags.length) return -1
    if (a.tags.length < instance && b.tags.length >= instance) return 1
    if (b.tags.length < instance && a.tags.length >= instance) return -1
    if (a.tags.length < instance && b.tags.length < instance) return 0
    return compareText(a.tags[instance - 1]!, b.tags[instance - 1]!)
  }
}

/** Ordem "aleatória" estável no mesmo dia (o hash do Tasks sobre data + descrição). */
function randomKey(task: Task, info: SearchInfo): number {
  const s = `${info.today} ${task.description}`
  let h = 9
  for (let i = 0; i < s.length; ) h = Math.imul(h ^ s.charCodeAt(i++), 9 ** 9)
  return h ^ (h >>> 9)
}

// ---------- Filtros booleanos ----------

const PAIRS: [string, string][] = [["(", ")"], ["[", "]"], ["{", "}"], ['"', '"']]

type Token = { kind: "filter"; text: string } | { kind: "op"; op: "AND" | "OR" | "XOR" | "NOT" } | { kind: "open" } | { kind: "close" }

/** Divide a linha booleana em filtros entre delimitadores e operadores (o mesmo par de delimitadores na linha toda). */
function tokenizeBoolean(line: string): Token[] {
  const trimmed = line.trim()
  const rest = /^[A-Z ]*\s*(.*)/.exec(trimmed)![1]!
  const pair = PAIRS.find(([o, c]) => rest.startsWith(o) && rest.endsWith(c))
  if (!pair) throw new Error("Todos os filtros de uma instrução booleana precisam estar entre um destes pares: (...) ou [...] ou {...} ou \"...\".")
  const [open, close] = pair
  const tokens: Token[] = []
  let i = 0
  const s = trimmed
  const symmetric = open === close
  while (i < s.length) {
    const ch = s[i]!
    if (ch === " " || ch === "\t") {
      i++
      continue
    }
    const word = /^(AND|OR|XOR|NOT)\b/.exec(s.slice(i))
    if (word) {
      tokens.push({ kind: "op", op: word[1] as "AND" | "OR" | "XOR" | "NOT" })
      i += word[1]!.length
      continue
    }
    if (ch === open && !symmetric) {
      // Abre um grupo ou um filtro: é filtro se o próximo não-espaço não for outro delimitador nem operador.
      const after = s.slice(i + 1).trimStart()
      if (after.startsWith(open) || /^(AND|OR|XOR|NOT)\s*[([{"]/.test(after)) {
        tokens.push({ kind: "open" })
        i++
        continue
      }
      // Filtro: até o fechamento que equilibra os delimitadores de dentro do filtro.
      let depth = 1
      let j = i + 1
      for (; j < s.length; j++) {
        if (s[j] === open) depth++
        else if (s[j] === close && --depth === 0) {
          // Fecha o filtro só se depois vier operador, fechamento ou o fim.
          const tail = s.slice(j + 1).trimStart()
          if (tail === "" || tail.startsWith(close) || /^(AND|OR|XOR|NOT)\b/.test(tail)) break
          depth = 1
        }
      }
      tokens.push({ kind: "filter", text: s.slice(i + 1, j).trim() })
      i = j + 1
      continue
    }
    if (ch === close && !symmetric) {
      tokens.push({ kind: "close" })
      i++
      continue
    }
    if (symmetric && ch === open) {
      const j = s.indexOf(close, i + 1)
      if (j === -1) throw new Error("delimitador sem fechamento")
      tokens.push({ kind: "filter", text: s.slice(i + 1, j).trim() })
      i = j + 1
      continue
    }
    throw new Error(`texto fora dos delimitadores: '${s.slice(i)}'`)
  }
  return tokens
}

type Node = { kind: "filter"; filter: QueryFilter } | { kind: "not"; arg: Node } | { kind: "bin"; op: "AND" | "OR" | "XOR"; left: Node; right: Node }

/** Precedência do Tasks: NOT, XOR, AND, OR. */
function parseBooleanTokens(tokens: Token[], resolve: (text: string) => QueryFilter): Node {
  let pos = 0
  const peek = () => tokens[pos]
  const expectOp = (op: string) => {
    const t = peek()
    return t?.kind === "op" && t.op === op ? (pos++, true) : false
  }
  const primary = (): Node => {
    const t = tokens[pos++]
    if (!t) throw new Error("expressão incompleta")
    if (t.kind === "op" && t.op === "NOT") return { kind: "not", arg: primary() }
    if (t.kind === "filter") return { kind: "filter", filter: resolve(t.text) }
    if (t.kind === "open") {
      const inner = or()
      if (tokens[pos++]?.kind !== "close") throw new Error("parêntese sem fechamento")
      return inner
    }
    throw new Error("operador fora do lugar")
  }
  const binary = (op: "XOR" | "AND" | "OR", next: () => Node) => (): Node => {
    let left = next()
    for (;;) {
      if (!expectOp(op)) return left
      // "AND NOT"/"OR NOT" viram o operador com o NOT no da direita.
      left = { kind: "bin", op, left, right: next() }
    }
  }
  const xor = binary("XOR", primary)
  const and = binary("AND", xor)
  const or = binary("OR", and)
  const node = or()
  if (pos !== tokens.length) throw new Error("expressão malformada")
  return node
}

function evalNode(node: Node, task: Task, info: SearchInfo): boolean {
  switch (node.kind) {
    case "filter":
      return node.filter.fn(task, info)
    case "not":
      return !evalNode(node.arg, task, info)
    case "bin": {
      const a = evalNode(node.left, task, info)
      const b = evalNode(node.right, task, info)
      return node.op === "AND" ? a && b : node.op === "OR" ? a || b : a !== b
    }
  }
}

function explainNode(node: Node, indent = ""): string {
  if (node.kind === "filter") return `${indent}${node.filter.explanation}`
  if (node.kind === "not") return `${indent}NOT:\n${explainNode(node.arg, indent + "  ")}`
  return `${indent}${node.op}:\n${explainNode(node.left, indent + "  ")}\n${explainNode(node.right, indent + "  ")}`
}

const BOOLEAN_LINE = /(.*(AND|OR|XOR|NOT)\s*[([{"].*|[([{"].+[)\]}"])/

// ---------- Consulta ----------

export function parseFilterLine(line: string, ctx: ParseCtx): QueryFilter | Error | null {
  for (const field of fields(ctx.settings)) {
    const result = field.filter?.(line, ctx)
    if (result) return result
  }
  if (BOOLEAN_LINE.test(line)) {
    try {
      const tokens = tokenizeBoolean(line)
      const node = parseBooleanTokens(tokens, (text) => {
        const f = parseFilterLine(text, ctx)
        if (!f) throw new Error(`não entendi a subexpressão '${text}'`)
        if (f instanceof Error) throw new Error(`não entendi a subexpressão '${text}': ${f.message}`)
        return f
      })
      return filterOf(line, (task, info) => evalNode(node, task, info), explainNode(node))
    } catch (error) {
      return new Error(`Não deu para ler esta instrução como uma combinação booleana:\n    ${line}\nO erro foi:\n    ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return null
}

function parseSortLine(line: string, ctx: ParseCtx): QuerySorter | Error | null {
  if (!/^sort by /i.test(line)) return null
  if (/^sort by function/i.test(line)) return new Error(JS_DISABLED)
  const tag = /^sort by tag( reverse)?[\s]*(\d+)?/i.exec(line)
  if (tag) {
    const compare = tagComparator(tag[2] ? Number(tag[2]) : 1)
    return { instruction: line, compare: tag[1] ? (a, b, i) => -compare(a, b, i) : compare }
  }
  for (const field of fields(ctx.settings)) {
    if (!field.compare || field.name === "tag") continue
    const m = new RegExp(`^sort by ${escape(field.sortName ?? field.name)}( reverse)?`, "i").exec(line)
    if (m) {
      const compare = field.compare
      return { instruction: line, compare: m[1] ? (a, b, i) => -compare(a, b, i) : compare }
    }
  }
  return null
}

function parseGroupLine(line: string, ctx: ParseCtx): QueryGrouper | Error | null {
  if (!/^group by /i.test(line)) return null
  if (/^group by function/i.test(line)) return new Error(JS_DISABLED)
  for (const field of fields(ctx.settings)) {
    if (!field.group) continue
    const name = field.groupName ?? field.name
    const m = new RegExp(`^group by ${escape(name)}( reverse)?$`, "i").exec(line)
    if (m) {
      // Urgência: o Tasks inverte (maior primeiro) por padrão.
      const reverse = field.name === "urgency" ? !m[1] : !!m[1]
      return { instruction: line, property: name, group: field.group, reverse }
    }
  }
  return null
}

function emptyQuery(source: string): ParsedQuery {
  return { source, filters: [], sorters: [], groupers: [], hidden: new Set(["tree", "urgency", "group count"]), shortMode: false, explain: false, ignoreGlobalQuery: false, view: { mode: "list", grouper: null } }
}

/** Instruções vindas das propriedades `TQ_…` da nota da consulta (Query File Defaults do Tasks). */
export function queryFileDefaults(properties: Record<string, unknown> | undefined): string {
  if (!properties) return ""
  const has = (name: string) => Object.prototype.hasOwnProperty.call(properties, name)
  const lines: string[] = []
  const show = (name: string, display: string) => {
    if (has(name)) lines.push(`${properties[name] ? "show" : "hide"} ${display}`)
  }
  show("TQ_show_toolbar", "toolbar")
  if (has("TQ_explain") && properties.TQ_explain) lines.push("explain")
  if (has("TQ_short_mode")) lines.push(properties.TQ_short_mode ? "short mode" : "full mode")
  for (const [key, display] of Object.entries({ tree: "tree", tags: "tags", id: "id", depends_on: "depends on", priority: "priority", recurrence_rule: "recurrence rule", on_completion: "on completion", created_date: "created date", start_date: "start date", scheduled_date: "scheduled date", due_date: "due date", cancelled_date: "cancelled date", done_date: "done date", urgency: "urgency", backlink: "backlink", edit_button: "edit button", postpone_button: "postpone button", task_count: "task count" })) show(`TQ_show_${key}`, display)
  const extra = properties.TQ_extra_instructions
  if (typeof extra === "string" && extra) lines.push(extra)
  return lines.join("\n")
}

export interface ParseOptions {
  settings: TasksSettings
  file?: QueryFile
  now?: Date
}

/** Lê o texto de um bloco ```tasks```: padrões da nota (`TQ_…`), o bloco e, antes, a consulta global (QueryRendererHelper do Tasks). */
export function parseQuery(source: string, options: ParseOptions): ParsedQuery {
  const now = options.now ?? new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const ctx: ParseCtx = { settings: options.settings, now, today: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` }
  const defaults = queryFileDefaults(options.file?.properties)
  const block = defaults ? `${defaults}\n${source}` : source
  const own = parseQuerySource(block, ctx, options.file)
  if (own.error || own.ignoreGlobalQuery || !options.settings.globalQuery.trim()) return { ...own, source }
  return { ...parseQuerySource(`${options.settings.globalQuery}\n${block}`, ctx, options.file), source }
}

function parseQuerySource(source: string, ctx: ParseCtx, file: QueryFile | undefined): ParsedQuery {
  const q = emptyQuery(source)
  const fail = (message: string, line: string) => ((q.error = `${message}\nLinha com problema: "${line}"`), q)
  const handle = (raw: string, depth: number): boolean => {
    let line: string
    try {
      line = /^#/.test(raw.trim()) ? raw.trim() : (expandOutlinkInstruction(raw, file) ?? expandPlaceholders(raw, file)).trim()
    } catch (error) {
      q.error = error instanceof Error ? error.message : String(error)
      return false
    }
    const preset = /^preset +(.*)/i.exec(line)
    if (preset) {
      const name = preset[1]!.trim()
      const value = ctx.settings.presets[name]
      if (!value) return !fail(`Não achei a predefinição "${name}" nas configurações do Tasks.${Object.keys(ctx.settings.presets).length ? `\nPredefinições disponíveis:\n${Object.keys(ctx.settings.presets).map((k) => `    ${k}`).join("\n")}` : ""}`, line)
      if (depth > 10) return !fail("Predefinições aninhadas demais (possível ciclo).", line)
      return continueLines(value).every((inner) => handle(inner, depth + 1))
    }
    if (/^short/i.test(line)) return (q.shortMode = true)
    if (/^full/i.test(line)) return (q.shortMode = false), true
    if (/^explain/i.test(line)) return (q.explain = true)
    if (/^ignore global query/i.test(line)) return (q.ignoreGlobalQuery = true)
    const limit = /^limit (groups )?(to )?(\d+)( tasks?)?/i.exec(line)
    if (limit) {
      if (limit[1]) q.groupLimit = Number.parseInt(limit[3]!, 10)
      else q.limit = Number.parseInt(limit[3]!, 10)
      return true
    }
    if (/^limit/i.test(line)) return !fail("não entendi o limite da consulta", line)
    const sorter = parseSortLine(line, ctx)
    if (sorter instanceof Error) return !fail(sorter.message, line)
    if (sorter) return q.sorters.push(sorter), true
    const grouper = parseGroupLine(line, ctx)
    if (grouper instanceof Error) return !fail(grouper.message, line)
    if (grouper) return q.groupers.push(grouper), true
    const view = /^view +(.*)/i.exec(line)
    if (view) {
      const [mode, ...rest] = view[1]!.trim().split(/\s+/)
      if (mode?.toLowerCase() === "list" && !rest.length) return (q.view = { mode: "list", grouper: null }), true
      if (mode?.toLowerCase() === "columns") {
        if (!rest.length) return !fail("a visão em colunas precisa de um agrupamento, por exemplo: view columns by priority", line)
        const g = parseGroupLine(`group ${rest.join(" ")}`, ctx)
        if (!g || g instanceof Error) return !fail(`não entendi o agrupamento das colunas "${rest.join(" ")}"`, line)
        return (q.view = { mode: "columns", grouper: g }), true
      }
      return !fail(`não entendi a visão "${view[1]}" (as visões são list e columns)`, line)
    }
    const hide = /^(hide|show) +(.*)/i.exec(line)
    if (hide) {
      const hidden = hide[1]!.toLowerCase() === "hide"
      const option = hide[2]!.toLowerCase()
      const map: [string, TaskElement | QueryElement][] = [
        ["backlink", "backlink"],
        ["edit button", "edit button"],
        ["nested backlink", "nested backlink"],
        ["postpone button", "postpone button"],
        ["task count", "task count"],
        ["group count", "group count"],
        ["toolbar", "toolbar"],
        ["tree", "tree"],
        ["urgency", "urgency"],
      ]
      const element = map.find(([key]) => option.startsWith(key))?.[1] ?? TASK_ELEMENTS.find((e) => option.startsWith(e)) ?? (option.startsWith("recurrence") ? "recurrence rule" : undefined)
      if (!element) return !fail("não entendi a opção de hide/show", line)
      if (hidden) q.hidden.add(element)
      else q.hidden.delete(element)
      return true
    }
    if (/^#/.test(line)) return true
    const filter = parseFilterLine(line, ctx)
    if (filter instanceof Error) return !fail(filter.message, line)
    if (filter) return q.filters.push(filter), true
    return !fail("não entendi a consulta", line)
  }
  for (const statement of continueLines(source)) if (!handle(statement, 0)) break
  return q
}

// ---------- Execução ----------

export interface TaskGroup {
  /** Nomes de cada nível (com os prefixos `%%n%%` de ordenação). */
  names: string[]
  tasks: Task[]
}

export interface QueryResult {
  groups: TaskGroup[]
  /** Tarefas mostradas (sem repetir as que aparecem em mais de um grupo). */
  count: number
  /** Tarefas achadas antes do `limit` ("3 de 10 tarefas"). */
  countBeforeLimit: number
  error?: string
}

const DEFAULT_SORT = (settings: TasksSettings): Comparator[] => {
  const f = fields(settings)
  const by = (name: string) => f.find((x) => x.name === name)!.compare!
  return [by("status.type"), by("urgency"), by("due"), by("priority"), by("path")]
}

export function runQuery(query: ParsedQuery, tasks: readonly Task[], settings: TasksSettings, now = new Date()): QueryResult {
  if (query.error) return { groups: [], count: 0, countBeforeLimit: 0, error: query.error }
  const pad = (n: number) => String(n).padStart(2, "0")
  const info: SearchInfo = { allTasks: tasks, now, today: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` }
  try {
    let found = tasks.filter(() => true)
    for (const filter of query.filters) found = found.filter((t) => filter.fn(t, info))
    const comparators = [...query.sorters.map((s) => s.compare), ...DEFAULT_SORT(settings)]
    found.sort((a, b) => {
      for (const c of comparators) {
        const r = c(a, b, info)
        if (r !== 0) return r
      }
      return 0
    })
    const total = found.length
    if (query.limit !== undefined) found = found.slice(0, query.limit)
    const groupers = query.view.mode === "columns" && query.view.grouper ? [query.view.grouper, ...query.groupers] : query.groupers
    const map = new Map<string, TaskGroup>()
    const walk = (task: Task, level: number, names: string[]) => {
      if (level === groupers.length) {
        const key = JSON.stringify(names)
        const g = map.get(key) ?? { names, tasks: [] }
        g.tasks.push(task)
        map.set(key, g)
        return
      }
      for (const name of groupers[level]!.group(task, info)) walk(task, level + 1, [...names, name])
    }
    for (const task of found) walk(task, 0, [])
    const groups = [...map.values()].sort((a, b) => {
      for (let i = 0; i < groupers.length; i++) {
        const r = compareText(a.names[i]!, b.names[i]!)
        if (r !== 0) return groupers[i]!.reverse ? -r : r
      }
      return 0
    })
    if (query.groupLimit !== undefined && groupers.length) {
      for (const g of groups) g.tasks = g.tasks.slice(0, query.groupLimit)
      return { groups, count: new Set(groups.flatMap((g) => g.tasks)).size, countBeforeLimit: total }
    }
    return { groups, count: found.length, countBeforeLimit: total }
  } catch (error) {
    return { groups: [], count: 0, countBeforeLimit: 0, error: `A busca falhou: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/** Título de grupo como o Obsidian mostra (sem os comentários `%%…%%` de ordenação). */
export function groupHeading(name: string): string {
  return name.replace(/%%.*?%%/g, "").trim()
}

/** Explicação da consulta (instrução `explain`). */
export function explainQuery(query: ParsedQuery): string {
  if (query.error) return query.error
  const parts: string[] = []
  parts.push(query.filters.length ? query.filters.map((f) => f.explanation).join("\n\n") : "Nenhum filtro: todas as tarefas.")
  if (query.sorters.length) parts.push("Ordem:\n" + query.sorters.map((s) => `    ${s.instruction}`).join("\n"))
  if (query.groupers.length) parts.push("Grupos:\n" + query.groupers.map((g) => `    ${g.instruction}`).join("\n"))
  if (query.limit !== undefined) parts.push(`No máximo ${query.limit} tarefa(s).`)
  if (query.groupLimit !== undefined) parts.push(`No máximo ${query.groupLimit} tarefa(s) por grupo.`)
  return parts.join("\n\n")
}
