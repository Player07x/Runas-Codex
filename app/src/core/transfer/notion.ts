import { strToU8 } from "fflate"
import { foldName } from "../text"
import { readTransferArchive, transferPath, validateTransferPaths, type TransferArchive, type TransferFile, type TransferLimits } from "./archive"
import { decodeTransferText } from "./plan"

/**
 * Importar do Notion (exportação “Markdown & CSV”). O ZIP do Notion já é Markdown, mas com três costumes que o Obsidian
 * não entende: um id de 32 letras no fim de cada nome (`Ideias 1a2b….md`), links de Markdown com o caminho codificado
 * (`[Ideias](Ideias%201a2b….md)`) e cada banco de dados como um CSV ao lado da pasta das páginas. Aqui os nomes perdem
 * o id, os links viram `[[caminho|texto]]`, as colunas do CSV viram propriedades no frontmatter de cada página (linhas
 * sem página viram notas novas) e o CSV vira uma nota com a lista das páginas. Tudo entra numa pasta própria do cofre;
 * o resto do caminho (prévia, conflitos, pacote de segurança) é o da importação de ZIP.
 */

export const NOTION_FOLDER = "Notion"
const ID = /\s+[0-9a-f]{32}$/i
const IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]

export interface NotionResult { files: TransferFile[]; pages: number; databases: number; ignored: string[] }

const splitExt = (name: string): [string, string] => { const dot = name.lastIndexOf("."); return dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""] }
const dirOf = (path: string) => path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""
const baseOf = (path: string) => path.slice(path.lastIndexOf("/") + 1)

/** Nome sem o id do Notion: `Ideias 1a2b….md` → `Ideias.md`; pastas também (`Ideias 1a2b…` → `Ideias`). */
export function stripNotionId(part: string, isFile: boolean): string {
  if (!isFile) return part.replace(ID, "").trim() || part
  const [stem, ext] = splitExt(part)
  return (stem.replace(ID, "").trim() || stem) + ext
}

/** É uma exportação do Notion quando há Markdown e a maior parte dos arquivos (ou de suas pastas) traz o id. */
export function isNotionExport(files: readonly TransferFile[]): boolean {
  const relevant = files.filter((file) => /\.(md|csv)$/i.test(file.path))
  if (!relevant.length) return false
  const marked = relevant.filter((file) => file.path.split("/").some((part, i, all) => ID.test(i === all.length - 1 ? splitExt(part)[0].replace(/_all$/, "") : part)))
  return marked.length * 2 >= relevant.length
}

/** CSV do Notion (RFC 4180, com BOM): aspas, vírgulas e quebras de linha dentro de células. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = "", quoted = false
  const source = text.replace(/^﻿/, "")
  for (let i = 0; i < source.length; i++) {
    const c = source[i]!
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(cell); cell = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++
      row.push(cell); rows.push(row); row = []; cell = ""
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((value) => value.trim()))
}

type Value = string | string[]

/** `October 17, 2026` (o formato padrão do Notion) → `2026-10-17`; o resto fica como está. */
function notionDate(value: string): string {
  const match = /^([A-Za-z]+) (\d{1,2}), (\d{4})$/.exec(value.trim())
  const month = match ? MONTHS.indexOf(match[1]!.toLowerCase()) : -1
  return match && month >= 0 ? `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2]!.padStart(2, "0")}` : value
}

const yamlKey = (key: string) => /^[\p{L}_][\p{L}\p{N} _-]*$/u.test(key) ? key : JSON.stringify(key)

/** Frontmatter com todos os valores entre aspas (datas inclusive, como o cofre pede); listas em bloco, como o Obsidian grava. */
export function frontmatter(props: [string, Value][]): string {
  if (!props.length) return ""
  const lines = props.map(([key, value]) => Array.isArray(value) ? `${yamlKey(key)}:\n${value.map((item) => `  - ${JSON.stringify(item)}`).join("\n")}` : `${yamlKey(key)}: ${JSON.stringify(value)}`)
  return `---\n${lines.join("\n")}\n---\n`
}

function safeTitle(title: string): string {
  return title.replace(/[[\]#^|\\/:*?"<>\u0000-\u001f]/g, "-").replace(/^[.\s]+|[.\s]+$/g, "").slice(0, 120).trim() || "Sem título"
}

function normalize(path: string): string | null {
  const out: string[] = []
  for (const part of path.split("/")) {
    if (!part || part === ".") continue
    if (part === "..") { if (!out.length) return null; out.pop() } else out.push(part)
  }
  return out.join("/")
}

export function convertNotionExport(input: readonly TransferFile[], root = NOTION_FOLDER): NotionResult | null {
  if (!isNotionExport(input)) return null
  const ignored: string[] = []
  // Um banco pode vir em dois CSVs: o da visão (`Tarefas abc.csv`) e o completo (`Tarefas abc_all.csv`); vale o completo.
  const csvKey = (path: string) => path.replace(/(_all)?\.csv$/i, "")
  const fullCsv = new Set(input.filter((f) => /_all\.csv$/i.test(f.path)).map((f) => csvKey(f.path)))
  const files = input.filter((file) => {
    if (/\.csv$/i.test(file.path) && !/_all\.csv$/i.test(file.path) && fullCsv.has(csvKey(file.path))) { ignored.push(file.path); return false }
    return true
  })

  // Caminhos novos, sem ids; nomes que passariam a coincidir ganham “ 2”, “ 3”…
  const taken = new Set<string>()
  const claim = (path: string): string => {
    const [stem, ext] = splitExt(path)
    let next = path
    for (let i = 2; taken.has(foldName(next)); i++) next = `${stem} ${i}${ext}`
    taken.add(foldName(next))
    return next
  }
  const mapDir = (dir: string) => [root, ...dir.split("/").filter(Boolean).map((part) => stripNotionId(part, false))].join("/")
  const moved = new Map<string, string>()
  for (const file of files) {
    const csv = /\.csv$/i.test(file.path)
    const name = csv ? stripNotionId(baseOf(csvKey(file.path)), false) + ".md" : stripNotionId(baseOf(file.path), true)
    moved.set(file.path, claim(`${mapDir(dirOf(file.path))}/${name}`))
  }
  // O link para o CSV da visão leva à mesma nota do banco completo.
  for (const path of ignored) moved.set(path, moved.get(path.replace(/\.csv$/i, "_all.csv"))!)
  const byTitle = new Map<string, string>()
  for (const [from, to] of moved) if (/\.md$/i.test(from) && !byTitle.has(foldName(splitExt(baseOf(to))[0]))) byTitle.set(foldName(splitExt(baseOf(to))[0]), to)

  // Bancos de dados: colunas viram propriedades da página de cada linha.
  const props = new Map<string, { keys: Set<string>; values: [string, Value][] }>()
  const created: TransferFile[] = []
  const linkTo = (path: string, text: string) => {
    const target = path.replace(/\.md$/i, "")
    return text && foldName(text) !== foldName(splitExt(baseOf(path))[0]) && !/[[\]|]/.test(text) ? `[[${target}|${text}]]` : `[[${target}]]`
  }
  const cellValue = (raw: string): Value | null => {
    const value = raw.trim()
    if (!value) return null
    // Relação: `Nome (Nome%20abc.md), Outro (https://www.notion.so/…)` → links para as páginas importadas.
    const items = value.split(/,\s*(?=[^,]+\((?:https?:\/\/www\.notion\.so\/|[^)]*\.md\)))/)
    const related = items.map((item) => /^(.+?) \((?:https?:\/\/www\.notion\.so\/[^)]*|[^)]*\.md)\)$/.exec(item.trim())?.[1])
    if (related.every(Boolean)) return related.map((title) => { const path = byTitle.get(foldName(title!)); return path ? linkTo(path, title!) : title! })
    return notionDate(value)
  }
  let databases = 0
  for (const file of files.filter((f) => /\.csv$/i.test(f.path))) {
    databases++
    const rows = parseCsv(decodeTransferText(file.bytes))
    const header = (rows.shift() ?? []).map((h) => h.trim())
    const rowsFolder = csvKey(file.path)
    const pages = files.filter((f) => /\.md$/i.test(f.path) && dirOf(f.path) === rowsFolder)
    const listed: string[] = []
    for (const row of rows) {
      const title = (row[0] ?? "").trim()
      const values: [string, Value][] = []
      header.forEach((key, i) => { if (i === 0 || !key) return; const value = cellValue(row[i] ?? ""); if (value !== null) values.push([key, value]) })
      const page = pages.find((p) => foldName(stripNotionId(baseOf(p.path), true).replace(/\.md$/i, "")) === foldName(safeTitle(title)) && !props.has(p.path))
      if (page) {
        props.set(page.path, { keys: new Set(header.slice(1)), values })
        listed.push(linkTo(moved.get(page.path)!, title))
      } else {
        const path = claim(`${mapDir(rowsFolder)}/${safeTitle(title)}.md`)
        created.push({ path, bytes: strToU8(`${frontmatter(values)}# ${title || "Sem título"}\n`) })
        listed.push(linkTo(path, title))
      }
    }
    const name = splitExt(baseOf(moved.get(file.path)!))[0]
    const body = listed.length ? listed.map((link) => `- ${link}`).join("\n") : "Banco de dados vazio no Notion."
    created.push({ path: moved.get(file.path)!, bytes: strToU8(`${frontmatter([["fonte", "Notion (banco de dados)"]])}# ${name}\n\n${body}\n`) })
  }

  const out: TransferFile[] = []
  let pages = 0
  for (const file of files) {
    if (/\.csv$/i.test(file.path)) continue
    const path = moved.get(file.path)!
    if (!/\.md$/i.test(file.path)) { out.push({ path, bytes: file.bytes }); continue }
    pages++
    let text = rewriteLinks(decodeTransferText(file.bytes), dirOf(file.path), moved)
    const row = props.get(file.path)
    if (row) {
      // O Notion repete as propriedades como linhas `Chave: valor` logo depois do título; elas saem do texto.
      const lines = text.split("\n")
      let i = /^#\s/.test(lines[0] ?? "") ? 1 : 0
      while (i < lines.length && !lines[i]!.trim()) i++
      const start = i
      while (i < lines.length && row.keys.has(/^([^:]+):/.exec(lines[i]!)?.[1]?.trim() ?? "")) i++
      if (i > start) { while (i < lines.length && !lines[i]!.trim()) i++; lines.splice(start, i - start) }
      text = frontmatter(row.values) + lines.join("\n")
    }
    out.push({ path, bytes: strToU8(text) })
  }
  const result = [...out, ...created].map((file) => ({ path: transferPath(file.path), bytes: file.bytes }))
  validateTransferPaths(result)
  return { files: result, pages: pages + created.length - databases, databases, ignored }
}

/** `[texto](Pasta%20abc/Página%20abc.md)` → `[[Notion/Pasta/Página|texto]]`; imagens → `![[…]]`. Links externos ficam. */
export function rewriteLinks(text: string, fromDir: string, moved: ReadonlyMap<string, string>): string {
  return text.split("\n").map((line) => {
    const pipe = line.trimStart().startsWith("|") ? "\\|" : "|"
    return line.replace(/(!?)\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, (whole, bang: string, label: string, href: string) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) return whole
      let decoded: string
      try { decoded = decodeURIComponent(href.split("#")[0]!) } catch { return whole }
      const source = normalize(fromDir ? `${fromDir}/${decoded}` : decoded)
      const target = source !== null ? moved.get(source.normalize("NFC")) ?? moved.get(source) : undefined
      if (!target) return whole
      if (bang || IMAGE.test(target)) return `${bang}[[${target}]]`
      const link = target.replace(/\.md$/i, "")
      const alias = label && foldName(label) !== foldName(splitExt(baseOf(target))[0]) && !/[[\]|]/.test(label) ? `${pipe}${label}` : ""
      return `[[${link}${alias}]]`
    })
  }).join("\n")
}

/** Exportações grandes vêm como um ZIP com ZIPs dentro (`Export-…-Part-1.zip`): abre cada um. */
export async function unwrapNestedZips(archive: TransferArchive, limits: TransferLimits): Promise<TransferArchive> {
  if (!archive.files.length || !archive.files.every((file) => /\.zip$/i.test(file.path))) return archive
  const files: TransferFile[] = [], ignored = [...archive.ignored]
  for (const inner of archive.files) {
    const part = await readTransferArchive(inner.bytes, archive.title, limits)
    files.push(...part.files); ignored.push(...part.ignored)
  }
  if (files.length > limits.files) throw new Error("O pacote excede a quantidade permitida de arquivos.")
  validateTransferPaths(files)
  return { ...archive, files, ignored }
}
