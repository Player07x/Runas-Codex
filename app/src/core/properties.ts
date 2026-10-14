import { parse as parseYaml } from "yaml"
import { parseFrontmatter } from "./parse"
import { detectFormat } from "./text"

/**
 * Edição de propriedades (frontmatter) linha a linha: só as linhas da chave alterada mudam, o resto do arquivo fica
 * igual byte a byte. A lib `yaml` só confere o antes e o depois; YAML inválido nunca é regravado (docs/02, riscos).
 */

export type PropertyValue = string | number | boolean | null | string[]

// Valores que o YAML leria como outro tipo, ou que o Obsidian trataria como data real (`4031-03-15` de um mundo
// fictício vira data do calendário se ficar sem aspas — docs/02, seção 4).
const PLAIN_UNSAFE = /^[\s\-?:,[\]{}#&*!|>'"%@`]|^(true|false|yes|no|on|off|null|~|[-+]?(\d[\d_]*(\.\d*)?|\.\d+)([eE][-+]?\d+)?|0x[\da-fA-F]+)$|^\d{1,6}-\d{1,2}-\d{1,2}|: |\s#|\s$|\n/i

function scalar(value: string | number | boolean | null): string {
  if (value === null) return ""
  if (typeof value !== "string") return String(value)
  return value === "" || PLAIN_UNSAFE.test(value) ? JSON.stringify(value) : value
}

function keyText(key: string): string {
  return /^[\p{L}\p{N}_][\p{L}\p{N}_ -]*$/u.test(key) && !/ $/.test(key) ? key : JSON.stringify(key)
}

/** Índices [início, fim) das linhas que pertencem à chave de topo `key` dentro das linhas do YAML. */
function keyRange(lines: string[], key: string): [number, number] | null {
  const start = lines.findIndex((line) => {
    const m = /^(?:"((?:[^"\\]|\\.)*)"|'([^']*)'|([^\s#"'][^:]*?))\s*:(?:\s|$)/.exec(line)
    if (!m) return false
    const name = m[1] !== undefined ? (JSON.parse(`"${m[1]}"`) as string) : (m[2] ?? m[3])
    return name === key
  })
  if (start < 0) return null
  let end = start + 1
  // Continuação: linhas indentadas, itens de lista na coluna 0 e linhas em branco seguidas de continuação.
  while (end < lines.length && (/^[ \t]/.test(lines[end]!) || /^-(\s|$)/.test(lines[end]!) || (!lines[end]!.trim() && end + 1 < lines.length && /^[ \t-]/.test(lines[end + 1]!)))) end++
  return [start, end]
}

function serialize(key: string, value: PropertyValue, flow: boolean, indent: string): string[] {
  if (!Array.isArray(value)) return [`${keyText(key)}:${value === null ? "" : " " + scalar(value)}`]
  if (flow) return [`${keyText(key)}: [${value.map(scalar).join(", ")}]`]
  if (!value.length) return [`${keyText(key)}: []`]
  return [`${keyText(key)}:`, ...value.map((item) => `${indent}- ${scalar(item)}`)]
}

function sameExcept(before: Record<string, unknown>, after: Record<string, unknown>, key: string): boolean {
  const strip = (data: Record<string, unknown>) => JSON.stringify(Object.entries(data).filter(([k]) => k !== key))
  return strip(before) === strip(after)
}

/** Grava `key` com `value` (cria o frontmatter se não houver). `undefined` remove a chave. */
export function setProperty(text: string, key: string, value: PropertyValue | undefined): string {
  const { eol } = detectFormat(text)
  const frontmatter = parseFrontmatter(text)
  if (frontmatter?.error || (frontmatter && !frontmatter.data)) throw new Error(`O frontmatter desta nota tem erro e não será alterado: ${frontmatter.error ?? "formato inválido"}`)

  if (!frontmatter) {
    if (value === undefined) return text
    const bom = text.startsWith("﻿") ? "﻿" : ""
    const block = ["---", ...serialize(key, value, false, "  "), "---"].join(eol) + eol
    return bom + block + text.slice(bom.length)
  }

  const yamlText = text.slice(frontmatter.yamlStart, frontmatter.yamlEnd)
  // Cada linha guarda a própria quebra (há arquivos com LF e CRLF misturados); a última usa a que vem antes do `---`.
  const closing = /^\r?\n/.exec(text.slice(frontmatter.yamlEnd))?.[0] ?? eol
  const rows = yamlText ? (yamlText + closing).split(/(?<=\n)/).map((piece) => ({ content: piece.replace(/\r?\n$/, ""), end: /\r?\n$/.exec(piece)?.[0] ?? eol })) : []
  const lines = rows.map((row) => row.content)
  const range = keyRange(lines, key)
  let replacement: string[] = []
  if (value !== undefined) {
    const existing = range ? lines.slice(range[0], range[1]) : []
    const flow = existing.length === 1 && /:\s*\[/.test(existing[0]!)
    const indent = existing.slice(1).find((l) => /^\s*-/.test(l))?.match(/^(\s*)-/)?.[1] ?? "  "
    replacement = serialize(key, value, flow, indent)
  }
  const newEnd = (range ? rows[range[0]]?.end : rows.at(-1)?.end) ?? eol
  const newRows = replacement.map((content) => ({ content, end: newEnd }))
  const nextRows = range ? [...rows.slice(0, range[0]), ...newRows, ...rows.slice(range[1])] : [...rows, ...newRows]
  const nextYaml = nextRows.map((row) => row.content + row.end).join("").replace(/\r?\n$/, "")

  const before = frontmatter.data!
  const parsed = (nextYaml.trim() ? parseYaml(nextYaml) : {}) as Record<string, unknown> | null
  const after = parsed ?? {}
  if (!sameExcept(before, after, key) || (value !== undefined && JSON.stringify(after[key]) !== JSON.stringify(value)) || (value === undefined && key in after)) {
    throw new Error(`Não deu para alterar “${key}” sem mexer no resto do frontmatter.`)
  }
  // Frontmatter vazio (`---` seguido de `---`) ganha a primeira linha; os outros casos trocam só o miolo.
  if (!yamlText) return text.slice(0, frontmatter.yamlStart) + nextYaml + eol + text.slice(frontmatter.yamlStart)
  return text.slice(0, frontmatter.yamlStart) + nextYaml + text.slice(frontmatter.yamlEnd)
}
