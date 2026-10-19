import { strToU8 } from "fflate"
import { parseNote } from "../parse"
import { basename, extname, foldName } from "../text"
import { VaultIndex } from "../vault-index"
import { parseWorldManifest, worldFolderName } from "../../vtt/shared/world"
import { managedWorldPath, transferPath, validateTransferPaths, type TransferArchive, type TransferFile } from "./archive"

export interface TransferEntry { path: string; size: number; mtime: number }
export type ImportStrategy = "merge" | "replace" | "duplicate"
export interface TransferWrite extends TransferFile { expected: TransferEntry | null }
export interface ImportPlan { writes: TransferWrite[]; skipped: string[]; conflicts: string[]; replacements: TransferEntry[] }

export function decodeTransferText(bytes: Uint8Array): string {
  try { return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes) }
  catch { throw new Error("Há um arquivo de texto que não está em UTF-8. Converta-o antes de importar.") }
}
const isText = (path: string) => /\.(md|canvas|base|json|css|txt|ics|csv|html|rtf)$/i.test(path)
const worldRoot = (path: string) => managedWorldPath(path) ? path.split("/").slice(0, 3).join("/") : null
function cleanTitle(title: string): string {
  return title.replace(/[[\]#^|\\/:*?"<>\u0000-\u001f]/g, "-").replace(/^[.\s]+|[.\s]+$/g, "").slice(0, 60).replace(/[.\s]+$/, "") || "Cofre"
}
function freeFolder(base: string, existing: Iterable<string>): string {
  const taken = [...existing].map(foldName)
  for (let i = 0; ; i++) {
    const path = base + (i ? ` ${i + 1}` : ""), key = foldName(path)
    if (!taken.some(name => name === key || name.startsWith(key + "/") || key.startsWith(name + "/"))) return path
  }
}

/** Notas ligadas são opcionais; anexos de links resolvidos sempre acompanham a seleção. */
export function selectTransferPaths(index: VaultIndex, entries: TransferEntry[], selected: string[], linkedNotes: boolean, includeWorlds: boolean, worldRoots: ReadonlyMap<string, string> = new Map()): string[] {
  const wanted = new Set<string>()
  const pending: string[] = []
  const attachments = entries.filter(entry => !/\.md$/i.test(entry.path) && !managedWorldPath(entry.path))
  const include = (path: string) => { if (!wanted.has(path)) pending.push(path) }
  for (const entry of entries) if (selected.some(path => !path || entry.path === path || entry.path.startsWith(path + "/"))) include(entry.path)
  if (includeWorlds) for (const entry of entries) if (managedWorldPath(entry.path)) include(entry.path)
  while (pending.length) {
    const path = pending.pop()!
    if (wanted.has(path)) continue
    wanted.add(path)
    const note = index.note(path)
    if (!note) continue
    if (linkedNotes && path.startsWith("Campanhas/")) {
      // Eventos podem apontar à sessão sem a sessão ter ainda um link de volta.
      for (const backlink of index.backlinks(path)) if (backlink.from.startsWith("Agenda/")) include(backlink.from)
      const id = note.meta.frontmatter?.data?.mesa
      const root = typeof id === "string" ? worldRoots.get(id) : null
      if (root) for (const entry of entries) if (entry.path.startsWith(root + "/")) include(entry.path)
    }
    for (const link of note.meta.links) {
      const dest = index.resolve(link, path).dest
      if (dest && (linkedNotes || !index.note(dest))) include(dest)
    }
    // Caminhos de imagens em propriedades e blocos desenhados também precisam viajar com a nota.
    for (const entry of attachments) {
      const name = basename(entry.path)
      if (note.text.includes(entry.path) || note.text.includes(name) && index.resolve({ kind: "wiki", embed: true, target: name, raw: "", start: 0, end: 0, inFrontmatter: false }, path).dest === entry.path) include(entry.path)
    }
  }
  return [...wanted].sort((a, b) => a.localeCompare(b, "pt-BR"))
}

function canonicalDestination(path: string, byName: Map<string, TransferEntry>, folders: Map<string, string>): string {
  const present = byName.get(foldName(path))
  if (present) return present.path
  const parts = path.split("/")
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(0, i).join("/")
    if (byName.has(foldName(parent))) throw new Error(`Um arquivo existente ocupa a pasta necessária: ${parent}`)
    const actual = folders.get(foldName(parent))
    if (actual) parts.splice(0, i, ...actual.split("/"))
  }
  if (folders.has(foldName(path))) throw new Error(`Uma pasta existente ocupa o lugar do arquivo: ${path}`)
  return parts.join("/")
}

function validateWorlds(files: TransferFile[]): void {
  const roots = new Set(files.flatMap(file => worldRoot(file.path) ? [worldRoot(file.path)!] : []))
  for (const root of roots) {
    const manifest = files.find(file => file.path === root + "/mesa.json")
    if (!manifest) throw new Error(`A seleção da mesa está incompleta: falta ${root}/mesa.json.`)
    parseWorldManifest(JSON.parse(decodeTransferText(manifest.bytes).replace(/^\ufeff/, "")))
  }
}

function duplicateFiles(archive: TransferArchive, existing: TransferEntry[], newId: () => string): TransferFile[] {
  const taken = existing.map(entry => entry.path), groups = new Map<string, string>(), paths = new Map<string, string>(), ids = new Map<string, string>()
  for (const file of archive.files) {
    const parts = file.path.split("/"), root = worldRoot(file.path)
    let group: string, target: string
    if (root) {
      group = root
      if (!groups.has(group)) {
        const manifest = archive.files.find(item => item.path === root + "/mesa.json")!
        const world = parseWorldManifest(JSON.parse(decodeTransferText(manifest.bytes).replace(/^\ufeff/, "")))
        const id = newId()
        ids.set(world.id, id)
        groups.set(group, freeFolder(".runas/mesas/" + worldFolderName(world.title + " (cópia)", id), taken))
      }
      target = groups.get(group)!
    } else if (["Wikis", "Campanhas", "Livros"].includes(parts[0]!) && parts.length > 2) {
      group = parts.slice(0, 2).join("/")
      target = groups.get(group) ?? freeFolder(group + " (importado)", taken)
    } else {
      group = parts.length > 1 && ["Notas", "Agenda", "Mesas", "Anexos", "Templates", "Modelos"].includes(parts[0]!) ? parts[0]! : ""
      target = groups.get(group) ?? freeFolder((group ? group + "/" : "") + "Importado - " + cleanTitle(archive.title), taken)
    }
    if (!groups.has(group)) groups.set(group, target)
    const path = target + "/" + file.path.slice(group ? group.length + 1 : 0)
    paths.set(file.path, transferPath(path)); taken.push(path)
  }
  const sourceIndex = new VaultIndex(archive.files.map(file => ({ path: file.path, size: file.bytes.length, mtime: 1 })), Object.fromEntries(archive.files.filter(file => extname(file.path) === ".md").map(file => [file.path, decodeTransferText(file.bytes)])))
  function markdown(text: string, from: string): string {
    for (const link of parseNote(text).links.slice().reverse()) {
      const dest = sourceIndex.resolve(link, from).dest, next = dest && paths.get(dest)
      if (!next) continue
      const target = (link.kind === "wiki" ? next.replace(/\.md$/i, "") : next) + (link.subpath ?? "")
      const replacement = link.kind === "wiki" ? `${link.embed ? "!" : ""}[[${target}${link.alias ? `|${link.alias}` : ""}]]` : `${link.embed ? "!" : ""}[${link.alias ?? ""}](<${target}>)`
      text = text.slice(0, link.start) + replacement + text.slice(link.end)
    }
    for (const [before, after] of ids) text = text.split(before).join(after)
    return text
  }
  return archive.files.map(file => {
    let bytes = file.bytes
    if (isText(file.path)) {
      let body = decodeTransferText(bytes)
      if (extname(file.path) === ".md") body = markdown(body, file.path)
      else if ([".json", ".canvas", ".base"].includes(extname(file.path))) {
        // JSON de quadros e mesas guarda caminhos/IDs como valores; não altera nomes de campos ou código.
        const bom = body.startsWith("\ufeff") ? "\ufeff" : ""
        const rewrite = (value: unknown): unknown => {
          if (typeof value === "string") return paths.get(value) ?? ids.get(value) ?? value
          if (Array.isArray(value)) return value.map(rewrite)
          if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item)]))
          return value
        }
        try { body = bom + JSON.stringify(rewrite(JSON.parse(body.replace(/^\ufeff/, ""))), null, 2) + "\n" }
        catch { if (extname(file.path) !== ".base") throw new Error(`JSON inválido no pacote: ${file.path}`) }
      }
      bytes = strToU8(body)
    }
    return { path: paths.get(file.path)!, bytes }
  })
}

/** A prévia fixa a versão dos arquivos existentes. O executor precisa usar exatamente essa versão para gravar. */
export function buildImportPlan(archive: TransferArchive, existing: TransferEntry[], strategy: ImportStrategy, newId: () => string = () => crypto.randomUUID()): ImportPlan {
  validateTransferPaths(archive.files)
  validateWorlds(archive.files)
  const files = strategy === "duplicate" ? duplicateFiles(archive, existing, newId) : archive.files
  const byName = new Map(existing.map(entry => [foldName(entry.path), entry]))
  const folders = new Map<string, string>()
  for (const entry of existing) {
    const parts = entry.path.split("/")
    for (let i = 1; i < parts.length; i++) { const folder = parts.slice(0, i).join("/"); folders.set(foldName(folder), folder) }
  }
  const occupiedWorlds = new Set(existing.flatMap(entry => worldRoot(entry.path) ? [foldName(worldRoot(entry.path)!)] : []))
  const writes: TransferWrite[] = [], skipped: string[] = [], conflicts: string[] = [], replacements: TransferEntry[] = []
  for (const file of files) {
    const path = canonicalDestination(file.path, byName, folders), current = byName.get(foldName(path)), root = worldRoot(path)
    const conflict = Boolean(current || root && occupiedWorlds.has(foldName(root)))
    if (conflict) conflicts.push(file.path)
    if (conflict && strategy === "merge") { skipped.push(file.path); continue }
    if (/\.(md|canvas|base)$/i.test(path)) decodeTransferText(file.bytes)
    if (current) replacements.push({ ...current })
    writes.push({ path, bytes: file.bytes, expected: current ? { ...current } : null })
  }
  // O manifesto só aparece depois dos dados da mesa. Uma falha não publica uma mesa nova incompleta.
  writes.sort((a, b) => Number(a.path.endsWith("/mesa.json")) - Number(b.path.endsWith("/mesa.json")))
  return { writes, skipped, conflicts, replacements }
}

export function sameTransferVersion(current: TransferEntry | undefined, expected: TransferEntry | null): boolean {
  return expected === null ? !current : Boolean(current && current.size === expected.size && Math.abs(current.mtime - expected.mtime) < 2)
}
