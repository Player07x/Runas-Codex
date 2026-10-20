import { DEFAULT_CORE_STATUSES, DEFAULT_CUSTOM_STATUSES, StatusRegistry, statusTypeFrom, type Status } from "./status"

/**
 * Configurações do plugin Tasks que mudam o comportamento (as de aparência do Obsidian ficam de fora). Os nomes e os
 * padrões são os do `data.json` do Tasks 8.6.0 (`src/Config/Settings.ts`), para a importação ser direta.
 */
export interface TasksSettings {
  /** Só linhas com este texto contam como tarefa (vazio = toda caixa de seleção). */
  globalFilter: string
  /** Esconde o filtro global na exibição. */
  removeGlobalFilter: boolean
  /** Instruções somadas a toda consulta (antes das dela). */
  globalQuery: string
  presets: Record<string, string>
  taskFormat: "tasksPluginEmoji" | "dataview"
  setCreatedDate: boolean
  setDoneDate: boolean
  setCancelledDate: boolean
  /** Campo que o "adiar" muda primeiro. */
  postponeDateField: "due-scheduled-start" | "scheduled-due-start" | "start-scheduled-due" | "due" | "scheduled" | "start"
  useFilenameAsScheduledDate: boolean
  filenameAsScheduledDateFormat: string
  filenameAsDateFolders: string[]
  /** A próxima ocorrência vai para a linha de baixo (o padrão é a de cima). */
  recurrenceOnNextLine: boolean
  removeScheduledDateOnRecurrence: boolean
  taskCountLocation: "top" | "bottom"
  /** Sugestões ao digitar numa tarefa (autoSuggestInEditor), com o mínimo de letras e o máximo de itens. */
  autoSuggestInEditor: boolean
  autoSuggestMinMatch: number
  autoSuggestMaxItems: number
  coreStatuses: Status[]
  customStatuses: Status[]
}

export const DEFAULT_PRESETS: Record<string, string> = {
  this_file: "path includes {{query.file.path}}",
  this_folder: "folder includes {{query.file.folder}}",
  this_folder_only: "filter by function task.file.folder === query.file.folder",
  this_root: "root includes {{query.file.root}}",
  hide_date_fields: "# Hide any values for all date fields\nhide due date\nhide scheduled date\nhide start date\nhide created date\nhide done date\nhide cancelled date",
  hide_non_date_fields: "# Hide all the non-date fields, but not tags\nhide id\nhide depends on\nhide recurrence rule\nhide on completion\nhide priority",
  hide_query_elements: "# Hide toolbar, postpone, edit, backlinks and task count\nhide toolbar\nhide postpone button\nhide edit button\nhide backlinks\nhide task count",
  hide_everything: "# Hide everything except description and any tags\npreset hide_date_fields\npreset hide_non_date_fields\npreset hide_query_elements",
}

export const DEFAULT_TASKS_SETTINGS: TasksSettings = {
  globalFilter: "",
  removeGlobalFilter: false,
  globalQuery: "",
  presets: DEFAULT_PRESETS,
  taskFormat: "tasksPluginEmoji",
  setCreatedDate: false,
  setDoneDate: true,
  setCancelledDate: true,
  postponeDateField: "due-scheduled-start",
  useFilenameAsScheduledDate: false,
  filenameAsScheduledDateFormat: "",
  filenameAsDateFolders: [],
  recurrenceOnNextLine: false,
  removeScheduledDateOnRecurrence: false,
  taskCountLocation: "bottom",
  autoSuggestInEditor: true,
  autoSuggestMinMatch: 0,
  autoSuggestMaxItems: 20,
  coreStatuses: DEFAULT_CORE_STATUSES,
  customStatuses: DEFAULT_CUSTOM_STATUSES,
}

export function statusRegistry(settings: TasksSettings): StatusRegistry {
  return new StatusRegistry([...settings.coreStatuses, ...settings.customStatuses])
}

const POSTPONE = ["due-scheduled-start", "scheduled-due-start", "start-scheduled-due", "due", "scheduled", "start"] as const

function statusList(value: unknown): Status[] | undefined {
  if (!Array.isArray(value)) return undefined
  const list = value.flatMap((item): Status[] => {
    if (!item || typeof item !== "object") return []
    const s = item as Record<string, unknown>
    if (typeof s.symbol !== "string") return []
    return [{ symbol: s.symbol, name: typeof s.name === "string" ? s.name : "", nextStatusSymbol: typeof s.nextStatusSymbol === "string" ? s.nextStatusSymbol : "x", availableAsCommand: s.availableAsCommand === true, type: statusTypeFrom(s.type) }]
  })
  return list
}

export interface ImportedTasksSettings {
  settings: TasksSettings
  /** Chaves do `data.json` que não mudam o comportamento no Runas-Codex (aparência do Obsidian etc.). */
  ignored: string[]
}

/** Lê o `data.json` do plugin Tasks; o que faltar fica com o padrão do Tasks. */
export function importTasksPluginData(json: string): ImportedTasksSettings {
  const data = JSON.parse(json) as Record<string, unknown>
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("O data.json do Tasks não é um objeto.")
  const out: TasksSettings = { ...DEFAULT_TASKS_SETTINGS }
  const used = new Set<string>()
  const str = (key: keyof TasksSettings & keyof typeof data) => {
    if (typeof data[key] === "string") (used.add(key), ((out as unknown as Record<string, unknown>)[key] = data[key]))
  }
  const bool = (key: string) => {
    if (typeof data[key] === "boolean") (used.add(key), ((out as unknown as Record<string, unknown>)[key] = data[key]))
  }
  str("globalFilter")
  str("globalQuery")
  str("filenameAsScheduledDateFormat")
  for (const key of ["autoSuggestMinMatch", "autoSuggestMaxItems"]) if (typeof data[key] === "number" && Number.isFinite(data[key])) (used.add(key), ((out as unknown as Record<string, unknown>)[key] = Math.max(0, Math.round(data[key] as number))))
  for (const key of ["autoSuggestInEditor", "removeGlobalFilter", "setCreatedDate", "setDoneDate", "setCancelledDate", "useFilenameAsScheduledDate", "recurrenceOnNextLine", "removeScheduledDateOnRecurrence"]) bool(key)
  if (data.taskFormat === "dataview" || data.taskFormat === "tasksPluginEmoji") (used.add("taskFormat"), (out.taskFormat = data.taskFormat))
  if (data.presets && typeof data.presets === "object" && !Array.isArray(data.presets)) {
    used.add("presets")
    out.presets = Object.fromEntries(Object.entries(data.presets as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"))
  }
  if (Array.isArray(data.filenameAsDateFolders)) (used.add("filenameAsDateFolders"), (out.filenameAsDateFolders = data.filenameAsDateFolders.filter((f): f is string => typeof f === "string")))
  const postpone = (data.postpone as { dateField?: unknown } | undefined)?.dateField
  if (typeof postpone === "string" && (POSTPONE as readonly string[]).includes(postpone)) (used.add("postpone"), (out.postponeDateField = postpone as TasksSettings["postponeDateField"]))
  const count = (data.searchResults as { taskCountLocation?: unknown } | undefined)?.taskCountLocation
  if (count === "top" || count === "bottom") (used.add("searchResults"), (out.taskCountLocation = count))
  const statuses = data.statusSettings as { coreStatuses?: unknown; customStatuses?: unknown } | undefined
  if (statuses && typeof statuses === "object") {
    used.add("statusSettings")
    out.coreStatuses = statusList(statuses.coreStatuses) ?? DEFAULT_CORE_STATUSES
    out.customStatuses = statusList(statuses.customStatuses) ?? DEFAULT_CUSTOM_STATUSES
  }
  return { settings: out, ignored: Object.keys(data).filter((k) => !used.has(k)) }
}

/** Configurações salvas pelo app (JSON do `localStorage`), completando com os padrões. */
export function parseStoredTasksSettings(json: string | null): TasksSettings {
  if (!json) return DEFAULT_TASKS_SETTINGS
  try {
    const data = JSON.parse(json) as Partial<TasksSettings>
    return { ...DEFAULT_TASKS_SETTINGS, ...data, presets: { ...(data.presets ?? DEFAULT_PRESETS) } }
  } catch {
    return DEFAULT_TASKS_SETTINGS
  }
}
