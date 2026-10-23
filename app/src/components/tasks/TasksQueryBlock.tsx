import { useMemo, useState, type DragEvent } from "react"
import { Copy, Search } from "lucide-react"
import { isValidDate } from "../../core/tasks/dates"
import { explainQuery, groupHeading, parseQuery, runQuery, type ParsedQuery, type TaskGroup } from "../../core/tasks/query"
import type { Priority } from "../../core/tasks/serializer"
import { parseContext, type Task } from "../../core/tasks/task"
import { useNoteSet } from "../../lib/note-set"
import { useNotesLock } from "../../lib/notes-lock"
import { vaultTasks, useTasksVault } from "../../lib/tasks"
import { copyText } from "../../lib/vault-notes"
import { registerCodeBlock, type CodeBlockProps } from "../../markdown/extensions"
import { useMarkdownOptions } from "../Markdown"
import { TaskRow } from "./TaskRow"
import { useTaskActions, type TaskActions } from "./useTaskActions"
import "./tasks.css"

/** Agrupamentos da visão em colunas que aceitam soltar uma tarefa (Views do Tasks 8.4+). */
const EDITABLE_COLUMNS: Record<string, "priority" | "cancelledDate" | "createdDate" | "doneDate" | "dueDate" | "scheduledDate" | "startDate"> = {
  priority: "priority",
  cancelled: "cancelledDate",
  created: "createdDate",
  done: "doneDate",
  due: "dueDate",
  scheduled: "scheduledDate",
  start: "startDate",
}

/** Valor que soltar na coluna grava; `undefined` = a coluna não aceita (ex.: "data inválida"). */
function columnValue(property: string, name: string): string | null | undefined {
  if (property === "priority") return /^%%(\d)%%/.exec(name)?.[1]
  if (/^No .* date$/.test(name)) return null
  const date = /^(\d{4}-\d{2}-\d{2}) /.exec(name)?.[1]
  return date && isValidDate(date) ? date : undefined
}

function TasksQuery({ code }: CodeBlockProps) {
  const { vault, toast } = useTasksVault()
  const set = useNoteSet()
  const { showSecrets } = useMarkdownOptions()
  const { locked } = useNotesLock()
  const actions = useTaskActions()
  const { settings } = actions
  const [filter, setFilter] = useState("")
  const from = set.from
  const note = from ? vault?.index?.note(from) : undefined
  const properties = note?.meta.frontmatter?.data as Record<string, unknown> | undefined
  // A lista muda só com o índice; nova a cada desenho, refaria a consulta toda vez.
  const links = useMemo(() => (from ? (vault?.index?.outgoing(from) ?? []) : []), [vault?.index, vault?.version, from])
  const outlinks = useMemo(() => links.flatMap((link) => link.dest ? [link.dest] : []), [links])
  const outlinksInBody = useMemo(() => links.flatMap((link) => !link.link.inFrontmatter && link.dest ? [link.dest] : []), [links])
  const outlinksInProperties = useMemo(() => links.flatMap((link) => link.link.inFrontmatter && link.dest ? [link.dest] : []), [links])

  const query = useMemo(
    () => parseQuery(code, {
      settings,
      ...(from ? { file: { path: from, ...(properties ? { properties } : {}), outlinks, outlinksInBody, outlinksInProperties } } : {}),
    }),
    [code, settings, from, properties, outlinks, outlinksInBody, outlinksInProperties],
  )
  const tasks = useMemo(() => (vault?.index ? vaultTasks(vault?.index, settings, { notesLocked: locked }) : []), [vault?.index, vault?.version, settings, locked])
  const result = useMemo(() => runQuery(query, tasks, settings), [query, tasks, settings])
  const today = parseContext(settings).today

  if (!showSecrets) return <p className="tasks-query muted small">Consulta de tarefas (só na versão do mestre).</p>
  if (!vault?.index) return <p className="tasks-query muted small">Abra um cofre para ver as tarefas.</p>

  const needle = filter.trim().toLocaleLowerCase()
  const groups: TaskGroup[] = needle ? result.groups.map((g) => ({ ...g, tasks: g.tasks.filter((t) => t.description.toLocaleLowerCase().includes(needle)) })).filter((g) => g.tasks.length) : result.groups
  const shownCount = needle ? new Set(groups.flatMap((g) => g.tasks)).size : result.count
  const countText = shownCount === result.countBeforeLimit || needle ? `${shownCount} tarefa${shownCount === 1 ? "" : "s"}` : `${shownCount} de ${result.countBeforeLimit} tarefas`
  const showCount = !query.hidden.has("task count")

  const copy = () => {
    const lines: string[] = []
    if (result.error) lines.push(result.error)
    if (query.explain) lines.push(explainQuery(query), "")
    for (const g of groups) {
      g.names.forEach((n, i) => lines.push(`${"#".repeat(Math.min(6, 4 + i))} ${groupHeading(n)}`, ""))
      for (const t of g.tasks) lines.push(t.originalMarkdown.replace(/^[\s>]*/, ""))
      lines.push("")
    }
    void copyText(lines.join("\n").trim() + "\n").then((ok) => toast(ok ? "Resultados copiados em Markdown." : "O sistema não deixou copiar."))
  }

  return (
    <div className="tasks-query" data-view={query.view.mode}>
      {!query.hidden.has("toolbar") && !result.error && (
        <div className="tasks-toolbar row">
          <label className="tasks-filter row grow">
            <Search size={14} aria-hidden />
            <input className="input sm" value={filter} placeholder="Filtrar pela descrição" onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar resultados pela descrição" />
          </label>
          <button className="icon-btn" onClick={copy} title="Copiar resultados em Markdown" aria-label="Copiar resultados em Markdown">
            <Copy size={15} />
          </button>
        </div>
      )}
      {query.explain && <pre className="tasks-explain small">{explainQuery(query)}</pre>}
      {result.error ? (
        <pre className="tasks-error small">Consulta de tarefas: {result.error}</pre>
      ) : (
        <>
          {showCount && settings.taskCountLocation === "top" && <p className="tasks-count tiny faint">{countText}</p>}
          {query.view.mode === "columns" ? <Columns groups={groups} query={query} actions={actions} today={today} /> : <GroupList groups={groups} query={query} actions={actions} today={today} />}
          {showCount && settings.taskCountLocation === "bottom" && <p className="tasks-count tiny faint">{countText}</p>}
        </>
      )}
    </div>
  )
}

function TaskList({ tasks, query, actions, today }: { tasks: Task[]; query: ParsedQuery; actions: TaskActions; today: string }) {
  const options = { hidden: query.hidden, shortMode: query.shortMode, today }
  if (query.hidden.has("tree")) return <ul className="task-list">{tasks.map((t) => <TaskRow key={`${t.path}:${t.line}`} task={t} actions={actions} options={options} />)}</ul>
  // Árvore: a subtarefa aparece debaixo da tarefa-mãe quando as duas estão no resultado.
  const inResult = new Set(tasks.map((t) => `${t.path}:${t.line}`))
  const children = new Map<string, Task[]>()
  const roots: Task[] = []
  for (const t of tasks) {
    const parent = t.parentLine !== null ? `${t.path}:${t.parentLine}` : null
    if (parent && inResult.has(parent)) children.set(parent, [...(children.get(parent) ?? []), t])
    else roots.push(t)
  }
  const render = (t: Task) => {
    const kids = children.get(`${t.path}:${t.line}`)
    return (
      <TaskRow key={`${t.path}:${t.line}`} task={t} actions={actions} options={{ ...options, hidden: t.parentLine !== null && query.hidden.has("nested backlink") ? new Set([...query.hidden, "backlink"]) : query.hidden }}>
        {kids && <ul className="task-list nested">{kids.map(render)}</ul>}
      </TaskRow>
    )
  }
  return <ul className="task-list">{roots.map(render)}</ul>
}

function GroupList({ groups, query, actions, today }: { groups: TaskGroup[]; query: ParsedQuery; actions: TaskActions; today: string }) {
  if (!query.groupers.length) return <TaskList tasks={groups[0]?.tasks ?? []} query={query} actions={actions} today={today} />
  let previous: string[] = []
  return (
    <div className="task-groups">
      {groups.map((g) => {
        // Só mostra os títulos que mudaram desde o grupo anterior (como o Tasks).
        const first = g.names.findIndex((n, i) => n !== previous[i])
        previous = g.names
        return (
          <section key={JSON.stringify(g.names)} className="task-group">
            {g.names.slice(Math.max(0, first)).map((n, i) => {
              const level = Math.max(0, first) + i
              const Heading = (["h4", "h5", "h6"] as const)[Math.min(level, 2)]!
              const isLeaf = level === g.names.length - 1
              return (
                <Heading key={level} className="task-group-title">
                  {groupHeading(n) || "(vazio)"}
                  {isLeaf && !query.hidden.has("group count") && <span className="faint"> ({g.tasks.length})</span>}
                </Heading>
              )
            })}
            <TaskList tasks={g.tasks} query={query} actions={actions} today={today} />
          </section>
        )
      })}
    </div>
  )
}

function Columns({ groups, query, actions, today }: { groups: TaskGroup[]; query: ParsedQuery; actions: TaskActions; today: string }) {
  const [over, setOver] = useState<string | null>(null)
  const property = query.view.grouper?.property ?? ""
  const editable = EDITABLE_COLUMNS[property]
  const columns = new Map<string, TaskGroup[]>()
  for (const g of groups) columns.set(g.names[0] ?? "", [...(columns.get(g.names[0] ?? "") ?? []), { names: g.names.slice(1), tasks: g.tasks }])
  const all = groups.flatMap((g) => g.tasks)
  const drop = (event: DragEvent, name: string) => {
    event.preventDefault()
    setOver(null)
    const key = event.dataTransfer.getData("text/x-runas-task")
    const task = all.find((t) => `${t.path}:${t.line}` === key)
    const value = columnValue(property, name)
    if (!task || !editable || value === undefined || actions.readOnly) return
    if (editable === "priority") void actions.update(task, { priority: value as Priority })
    else void actions.setDate(task, editable, value)
  }
  return (
    <div className="task-columns">
      {[...columns.entries()].map(([name, sub]) => {
        const accepts = Boolean(editable) && !actions.readOnly && columnValue(property, name) !== undefined
        return (
          <section
            key={name}
            className={`task-column card flat ${over === name ? "drop-over" : ""}`}
            onDragOver={(e) => accepts && (e.preventDefault(), setOver(name))}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => drop(e, name)}
          >
            <h4 className="task-group-title">
              {groupHeading(name)}
              {!query.hidden.has("group count") && <span className="faint"> ({sub.reduce((n, g) => n + g.tasks.length, 0)})</span>}
            </h4>
            {sub.map((g) => (
              <div key={JSON.stringify(g.names)}>
                {g.names.map((n, i) => (
                  <h5 key={i} className="task-group-title">
                    {groupHeading(n)}
                  </h5>
                ))}
                <ul className="task-list">
                  {g.tasks.map((t) => (
                    <TaskRow key={`${t.path}:${t.line}`} task={t} actions={actions} options={{ hidden: query.hidden, shortMode: query.shortMode, today }} draggable={Boolean(editable) && !actions.readOnly} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}

registerCodeBlock(["tasks"], TasksQuery)
