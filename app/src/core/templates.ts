import { appConfig, type AppConfig } from "./attachments"
import { parseFrontmatter } from "./parse"
import { setProperty, type PropertyValue } from "./properties"
import { parseBookmarks, type Bookmark } from "./bookmarks"
import { declaredTypes } from "./property-types"

/**
 * Modelos de nota com as variáveis do plugin Templates do Obsidian (`{{title}}`, `{{date}}`, `{{time}}`,
 * `{{date:YYYY-MM-DD}}`) e os nomes em português (`{{título}}`, `{{data}}`, `{{hora}}`, `{{data:DD/MM/YYYY}}`).
 * As configurações vêm de `.obsidian/templates.json` e `.obsidian/daily-notes.json`, como no Obsidian.
 */

export interface TemplatesConfig {
  /** Pasta dos modelos (relativa ao cofre, sem `/` no fim); vazio = nenhuma configurada. */
  folder: string
  dateFormat: string
  timeFormat: string
}

export interface DailyNotesConfig {
  folder: string
  format: string
  /** Caminho do modelo, sem `.md` (como o Obsidian grava). */
  template: string
}

export interface ObsidianConfig {
  templates: TemplatesConfig
  daily: DailyNotesConfig
  /** Pasta de anexos e formato de link (`.obsidian/app.json`). */
  app: AppConfig
  /** Tipo de cada propriedade (`.obsidian/types.json`: `date`, `datetime`, `number`…). */
  types: Record<string, string>
  /** Marcadores do Obsidian (`.obsidian/bookmarks.json`), só para leitura. */
  bookmarks: Bookmark[]
}

export const CONFIG_FILES = [".obsidian/templates.json", ".obsidian/daily-notes.json", ".obsidian/app.json", ".obsidian/types.json", ".obsidian/bookmarks.json"] as const

const clean = (value: unknown) => (typeof value === "string" ? value.trim().replace(/^\/+|\/+$/g, "") : "")

function json(text: string | undefined): Record<string, unknown> {
  if (!text) return {}
  try {
    const value = JSON.parse(text) as unknown
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** Lê as configurações do Obsidian (arquivos ausentes ou inválidos = padrões do Obsidian). */
export function obsidianConfig(files: Record<string, string>): ObsidianConfig {
  const templates = json(files[".obsidian/templates.json"])
  const daily = json(files[".obsidian/daily-notes.json"])
  return {
    templates: {
      folder: clean(templates.folder),
      dateFormat: typeof templates.dateFormat === "string" && templates.dateFormat.trim() ? templates.dateFormat : "YYYY-MM-DD",
      timeFormat: typeof templates.timeFormat === "string" && templates.timeFormat.trim() ? templates.timeFormat : "HH:mm",
    },
    daily: {
      folder: clean(daily.folder),
      format: typeof daily.format === "string" && daily.format.trim() ? daily.format : "YYYY-MM-DD",
      template: clean(daily.template).replace(/\.md$/i, ""),
    },
    app: appConfig(json(files[".obsidian/app.json"])),
    types: declaredTypes(files[".obsidian/types.json"]),
    bookmarks: parseBookmarks(files[".obsidian/bookmarks.json"]),
  }
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"]
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
const pad = (n: number, size = 2) => String(n).padStart(size, "0")

/** Formata uma data com os códigos do Moment.js (os que o Obsidian usa), nomes em português. `[texto]` sai literal. */
export function formatDate(date: Date, format: string): string {
  const tokens: Record<string, () => string> = {
    YYYY: () => String(date.getFullYear()),
    YY: () => pad(date.getFullYear() % 100),
    MMMM: () => MONTHS[date.getMonth()]!,
    MMM: () => MONTHS[date.getMonth()]!.slice(0, 3),
    MM: () => pad(date.getMonth() + 1),
    M: () => String(date.getMonth() + 1),
    DDDD: () => pad(dayOfYear(date), 3),
    DD: () => pad(date.getDate()),
    Do: () => `${date.getDate()}º`,
    D: () => String(date.getDate()),
    dddd: () => WEEKDAYS[date.getDay()]!,
    ddd: () => WEEKDAYS[date.getDay()]!.slice(0, 3),
    dd: () => WEEKDAYS[date.getDay()]!.slice(0, 2),
    d: () => String(date.getDay()),
    HH: () => pad(date.getHours()),
    H: () => String(date.getHours()),
    hh: () => pad(date.getHours() % 12 || 12),
    h: () => String(date.getHours() % 12 || 12),
    mm: () => pad(date.getMinutes()),
    m: () => String(date.getMinutes()),
    ss: () => pad(date.getSeconds()),
    s: () => String(date.getSeconds()),
    A: () => (date.getHours() < 12 ? "AM" : "PM"),
    a: () => (date.getHours() < 12 ? "am" : "pm"),
    ww: () => pad(isoWeek(date)),
    w: () => String(isoWeek(date)),
    Q: () => String(Math.floor(date.getMonth() / 3) + 1),
  }
  return format.replace(/\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DDDD|DD|Do|D|dddd|ddd|dd|d|HH|H|hh|h|mm|m|ss|s|A|a|ww|w|Q/g, (match, literal: string | undefined) => (literal !== undefined ? literal : tokens[match]!()))
}

function dayOfYear(date: Date): number {
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86_400_000)
}

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86_400_000 + 1) / 7)
}

/** Troca as variáveis de um modelo. Variáveis desconhecidas ficam como estão. */
export function fillTemplate(template: string, values: { title: string; date: Date; config: TemplatesConfig }): string {
  return template.replace(/\{\{\s*([\p{L}]+)\s*(?::\s*([^}]*?))?\s*\}\}/gu, (match, rawName: string, format: string | undefined) => {
    const name = rawName.toLocaleLowerCase("pt-BR")
    if (name === "title" || name === "título" || name === "titulo") return values.title
    if (name === "date" || name === "data") return formatDate(values.date, format || values.config.dateFormat)
    if (name === "time" || name === "hora") return formatDate(values.date, format || values.config.timeFormat)
    return match
  })
}

function isPropertyValue(value: unknown): value is PropertyValue {
  return value === null || ["string", "number", "boolean"].includes(typeof value) || (Array.isArray(value) && value.every((v) => typeof v === "string"))
}

/**
 * Insere um modelo (já preenchido) numa nota, no lugar do cursor. Como o Obsidian: as propriedades do modelo entram
 * no frontmatter da nota (as que ela já tem ficam como estão) e o resto vai para o cursor.
 */
export function insertTemplate(note: string, cursor: number, template: string): { text: string; cursor: number } {
  const templateFront = parseFrontmatter(template)
  const body = templateFront ? template.slice(templateFront.end) : template
  // Nunca no meio do frontmatter da nota.
  const at = Math.max(parseFrontmatter(note)?.end ?? 0, Math.min(cursor, note.length))
  let text = note.slice(0, at) + body + note.slice(at)
  let end = at + body.length
  if (!templateFront?.data || !Object.keys(templateFront.data).length) return { text, cursor: end }
  const noteFront = parseFrontmatter(text)
  if (!noteFront) {
    // A nota não tem frontmatter: o do modelo entra no topo.
    const head = template.slice(0, templateFront.end)
    return { text: head + text, cursor: end + head.length }
  }
  const before = text.length
  for (const [key, value] of Object.entries(templateFront.data)) {
    if (noteFront.data && key in noteFront.data) continue
    if (!isPropertyValue(value)) continue
    text = setProperty(text, key, value)
  }
  end += text.length - before
  return { text, cursor: end }
}
