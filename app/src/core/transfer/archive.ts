import { strFromU8, strToU8, Unzip, UnzipInflate, zipSync, type Zippable } from "fflate"
import { nameProblem } from "../names"
import { foldName } from "../text"
import type { TransferItemKind } from "./items"
import { crc32, readZipDirectory, readZipEntry, ZipWriter, type ZipSink, type ZipSource } from "./zip-stream"

/**
 * Limites do desktop (ADR 0037, antes ADR 0020). Na exportação o pacote é escrito em pedaços: o teto é o do ZIP sem
 * ZIP64. Na importação, o conteúdo descompactado ainda fica na memória até a gravação (1 GB); a leitura sob demanda
 * fica para um PR próprio (ADR 0037, ponto 2).
 */
export const TRANSFER_LIMITS = { archive: 0xffffffff - 1, expanded: 1024 * 1024 * 1024, file: 512 * 1024 * 1024, files: 10000 } as const
/**
 * Android (PR A2): a exportação sai em pedaços, então o pacote vai até o máximo do ZIP; cada arquivo ainda passa
 * inteiro em base64 pela ponte (64 MB).
 */
export const ANDROID_TRANSFER_LIMITS = { archive: 0xffffffff - 1, expanded: 96 * 1024 * 1024, file: 64 * 1024 * 1024, files: 10000 } as const
/**
 * Importar um pacote sob demanda (C2): só os textos ficam na memória e cada binário é lido na hora de gravar, então
 * o tamanho total só tem o teto do ZIP sem ZIP64. Por arquivo, o Android segue com o mesmo teto da exportação (passa
 * inteiro pela ponte): o que um celular exporta, outro importa.
 */
export const IMPORT_LIMITS = { archive: 0xffffffff - 1, expanded: 0xffffffff - 1, file: 512 * 1024 * 1024, files: 10000 } as const
export const ANDROID_IMPORT_LIMITS = { ...IMPORT_LIMITS, file: ANDROID_TRANSFER_LIMITS.file } as const
/** O que a 1.3 abre (ADR 0020): pacotes maiores só abrem na 1.4 ou mais nova. */
export const LEGACY_ARCHIVE_LIMIT = 128 * 1024 * 1024
export const PACKAGE_MANIFEST = ".runas-pacote.json"
/**
 * Um arquivo do pacote. Os binários de um pacote lido sob demanda (C2, ADR 0037) chegam sem os bytes: `bytes` vazio,
 * `size` com o tamanho e `load()` lê do pacote na hora de gravar. Use `transferSize` e `transferBytes`.
 */
export interface TransferFile { path: string; bytes: Uint8Array; size?: number; load?: () => Promise<Uint8Array> }
export const transferSize = (file: TransferFile): number => (file.load ? file.size ?? 0 : file.bytes.length)
export const transferBytes = (file: TransferFile): Promise<Uint8Array> => (file.load ? file.load() : Promise.resolve(file.bytes))
/** O que fica na memória mesmo sob demanda: a prévia lê, reescreve links e confere mesas nesses arquivos. */
export const keptInMemory = (path: string) => /\.(md|canvas|base|json|css|txt|ics|csv|html|rtf)$/i.test(path)
/** Campo opcional `itens` do manifesto (U53, ADR 0037): o que cada item exportado levou. A 1.3 ignora. */
export interface PackageItemSpec { tipo: TransferItemKind; nome: string; raizes: string[]; caminhos: string[] }
export interface TransferArchive { title: string; kind: "runas" | "markdown"; files: TransferFile[]; ignored: string[]; items?: PackageItemSpec[] }
const ITEM_KINDS = new Set(["wiki", "livro", "mesa", "biblioteca", "campanha", "agenda", "pasta", "outros"])
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string")
/** Itens malformados não impedem a importação: a prévia volta a deduzir os itens pelas pastas. */
function manifestItems(value: unknown): PackageItemSpec[] | undefined {
  if (!Array.isArray(value)) return undefined
  const items = value.filter((item): item is PackageItemSpec => record(item) && typeof item.tipo === "string" && ITEM_KINDS.has(item.tipo) && typeof item.nome === "string" && strings(item.raizes) && strings(item.caminhos))
  return items.length === value.length ? items.map(item => ({ tipo: item.tipo, nome: item.nome.slice(0, 160), raizes: item.raizes, caminhos: item.caminhos })) : undefined
}
export interface TransferLimits { archive: number; expanded: number; file: number; files: number }

/** Só a área de mesas gerenciada pelo programa tem permissão de transporte entre pastas ocultas. */
export function managedWorldPath(path: string): string | null {
  const prefix = ".runas/mesas/"
  if (!path.startsWith(prefix)) return null
  const relative = path.slice(prefix.length), parts = relative.split("/")
  if (parts.length < 2 || parts.some(part => nameProblem(part) !== null)) return null
  const rest = parts.slice(1).join("/")
  if (rest === "mesa.json" || rest === "outros.json" || /^cenas\/[^/]+\.json$/.test(rest) || /^assets\/(maps|tokens|tiles|audio)\/[^/]+$/.test(rest)) return relative
  return null
}

/** Recusa escapes antes de normalizar; o mesmo pacote precisa ter caminhos válidos nos três sistemas. */
export function transferPath(raw: string): string {
  if (!raw || raw.startsWith("/") || raw.startsWith("\\") || /^[a-z]:/i.test(raw) || raw.includes("\\") || raw.includes("\0")) throw new Error(`Caminho inválido no pacote: ${raw}`)
  const path = raw.normalize("NFC"), parts = path.split("/")
  if (parts.some(part => !part || part === "." || part === "..")) throw new Error(`Caminho fora do cofre no pacote: ${raw}`)
  if (managedWorldPath(path)) return path
  for (const part of parts) {
    const problem = nameProblem(part)
    if (problem) throw new Error(`${raw}: ${problem}`)
  }
  return path
}

export function validateTransferPaths(files: TransferFile[]): void {
  const names = new Set<string>(), folders = new Map<string, string>()
  for (const file of files) {
    const path = transferPath(file.path), key = foldName(path)
    if (names.has(key)) throw new Error(`O pacote repete o caminho “${path}”, inclusive por maiúsculas ou acentos equivalentes.`)
    names.add(key)
    const parts = path.split("/")
    for (let i = 1; i < parts.length; i++) {
      const folder = parts.slice(0, i).join("/"), previous = folders.get(foldName(folder))
      if (previous && previous !== folder) throw new Error(`Pastas com nomes conflitantes no pacote: “${previous}” e “${folder}”.`)
      folders.set(foldName(folder), folder)
    }
  }
  for (const file of files) {
    const parts = file.path.split("/")
    for (let i = 1; i < parts.length; i++) if (names.has(foldName(parts.slice(0, i).join("/")))) throw new Error(`Um arquivo ocupa o lugar de uma pasta no pacote: ${file.path}`)
  }
}

/** Valida os tamanhos e a integridade do ZIP antes/depois da descompressão em blocos, inclusive ZIPs sem manifesto. */
function unzipBounded(bytes: Uint8Array, limits: TransferLimits): Map<string, Uint8Array> {
  if (bytes.length > limits.archive) throw new Error(`O arquivo passa de ${Math.floor(limits.archive / 1048576)} MB compactados.`)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new Error("ZIP inválido ou dividido em vários volumes.")
  const count = view.getUint16(end + 10, true), centralSize = view.getUint32(end + 12, true), offset = view.getUint32(end + 16, true)
  if (count === 65535 || count > limits.files * 3 + 1 || view.getUint16(end + 8, true) !== count || offset + centralSize !== end) throw new Error("ZIP grande demais, ZIP64 ou diretório inválido.")
  const expected = new Map<string, { size: number; crc: number }>()
  let cursor = offset, expanded = 0
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Diretório do ZIP incompleto.")
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true)
    const size = view.getUint32(cursor + 24, true), nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true)
    const next = cursor + 46 + nameLength + extraLength + commentLength
    if (next > end || flags & 1 || ![0, 8].includes(method) || size > limits.file || (expanded += size) > limits.expanded) throw new Error("ZIP criptografado, formato não suportado ou tamanho descompactado excessivo.")
    const name = strFromU8(bytes.subarray(cursor + 46, cursor + 46 + nameLength), !(flags & 2048))
    if (expected.has(name)) throw new Error(`O ZIP repete “${name}”.`)
    expected.set(name, { size, crc: view.getUint32(cursor + 16, true) })
    cursor = next
  }
  if (cursor !== end) throw new Error("Diretório do ZIP inválido.")
  const files = new Map<string, Uint8Array>()
  const seen = new Set<string>()
  let actualTotal = 0, failure: Error | null = null
  const unzip = new Unzip(file => {
    const spec = expected.get(file.name)
    if (!spec || seen.has(file.name)) throw new Error("O conteúdo do ZIP diverge do diretório.")
    seen.add(file.name)
    let size = 0
    const chunks: Uint8Array[] = []
    file.ondata = (error, chunk, final) => {
      if (error) { failure = error; return }
      size += chunk.length; actualTotal += chunk.length
      if (size > spec.size || size > limits.file || actualTotal > limits.expanded) { file.terminate(); failure = new Error("O ZIP excedeu o tamanho permitido durante a leitura."); return }
      chunks.push(chunk.slice())
      if (final) {
        const data = new Uint8Array(size)
        let offset = 0
        for (const part of chunks) { data.set(part, offset); offset += part.length }
        if (size !== spec.size || crc32(data) !== spec.crc) { failure = new Error(`O arquivo “${file.name}” está incompleto ou corrompido no ZIP.`); return }
        files.set(file.name, data)
      }
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  for (let i = 0; i < bytes.length; i += 8192) {
    unzip.push(bytes.subarray(i, i + 8192), i + 8192 >= bytes.length)
    if (failure) throw failure
  }
  if (files.size !== expected.size) throw new Error("ZIP incompleto.")
  return files
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes.slice().buffer)
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("")
}

const EMPTY = new Uint8Array(0)
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value) }

export async function readTransferArchive(bytes: Uint8Array, title = "Cofre importado", limits: TransferLimits = TRANSFER_LIMITS): Promise<TransferArchive> {
  const zip = new Map([...unzipBounded(bytes, limits)].map(([name, data]) => [name, { size: data.length, read: async () => data }]))
  return archiveFromZip(zip, title, limits, () => true)
}

/** Uma entrada do ZIP: o tamanho e como ler (da memória ou do pacote, por partes). */
interface ZipItem { size: number; read(): Promise<Uint8Array> }

/**
 * U50 (ADR 0037): lê o pacote por partes (`File.slice` na tela), um arquivo por vez, sem o teto de tamanho
 * compactado. Com `lazy` (C2), só os textos ficam na memória; os binários são conferidos (SHA-256 do manifesto) e
 * soltos, e voltam a ser lidos do pacote, com o CRC conferido de novo, na hora de gravar.
 */
export async function readTransferArchiveFrom(source: ZipSource, title = "Cofre importado", limits: TransferLimits = TRANSFER_LIMITS, onProgress?: (done: number, total: number) => void, lazy = false): Promise<TransferArchive> {
  const entries = await readZipDirectory(source, limits), zip = new Map<string, ZipItem>()
  for (const entry of entries) zip.set(entry.name, { size: entry.size, read: () => readZipEntry(source, entry) })
  // Sem `lazy`, tudo é lido agora (como antes); com ele, a leitura acontece em `archiveFromZip`, um por vez.
  if (!lazy) for (const [index, entry] of entries.entries()) {
    onProgress?.(index, entries.length)
    const data = await readZipEntry(source, entry)
    zip.set(entry.name, { size: data.length, read: async () => data })
  }
  return archiveFromZip(zip, title, limits, lazy ? path => keptInMemory(path) : () => true, lazy ? onProgress : undefined)
}

async function archiveFromZip(zip: Map<string, ZipItem>, title: string, limits: TransferLimits, keep: (path: string) => boolean, onProgress?: (done: number, total: number) => void): Promise<TransferArchive> {
  const manifestBytes = await zip.get(PACKAGE_MANIFEST)?.read()
  const total = zip.size
  let done = 0
  const files: TransferFile[] = [], ignored: string[] = []
  let items: PackageItemSpec[] | undefined
  if (manifestBytes) {
    const manifest: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes))
    if (!record(manifest) || manifest.format !== "runas-codex" || manifest.version !== 1 || !Array.isArray(manifest.files) || typeof manifest.title !== "string") throw new Error("Pacote Runas inválido ou de uma versão de formato não suportada.")
    title = manifest.title.slice(0, 160)
    items = manifestItems(manifest.itens)
    const used = new Set([PACKAGE_MANIFEST])
    for (const entry of manifest.files) {
      if (!record(entry) || typeof entry.path !== "string" || typeof entry.size !== "number" || typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("Entrada inválida no manifesto do pacote.")
      const path = transferPath(entry.path), name = "cofre/" + path, item = zip.get(name)
      onProgress?.(done++, total)
      const data = item && !used.has(name) ? await item.read() : null
      if (!item || !data || data.length !== entry.size || await sha256(data) !== entry.sha256) throw new Error(`A integridade de “${path}” não confere com o manifesto.`)
      used.add(name); files.push(keep(path) ? { path, bytes: data } : { path, bytes: EMPTY, size: data.length, load: item.read })
    }
    if ([...zip.keys()].some(name => !name.endsWith("/") && !used.has(name))) throw new Error("O pacote contém arquivos fora do manifesto.")
  } else {
    const names = [...zip.keys()].filter(name => !name.endsWith("/"))
    const first = names[0]?.split("/")[0]
    const knownRoots = new Set(["Notas", "Agenda", "Wikis", "Campanhas", "Livros", "Mesas", "Anexos", "Templates", "Modelos", ".runas", ".obsidian", ".git", "__MACOSX"])
    const wrapper = first && !nameProblem(first) && !knownRoots.has(first) && names.every(name => name.startsWith(first + "/")) ? first + "/" : ""
    for (const [raw, item] of zip) {
      let path = raw.endsWith("/") ? raw.slice(0, -1) : raw
      // Mesmo o que será ignorado não pode conter escapes; arquivos de configuração não são importados.
      if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some(part => part === ".." || part === ".") || /^[a-z]:/i.test(path)) throw new Error(`Caminho fora do cofre no ZIP: ${raw}`)
      if (raw.endsWith("/")) continue
      if (wrapper) path = path.slice(wrapper.length)
      if ((path.split("/").some(part => part.startsWith(".")) && !managedWorldPath(path)) || path.startsWith("__MACOSX/") || path === "Thumbs.db") { ignored.push(raw); continue }
      // Sem manifesto não há SHA para conferir agora: o binário é lido (e o CRC conferido) só na hora de gravar.
      if (keep(path)) { onProgress?.(done++, total); files.push({ path: transferPath(path), bytes: await item.read() }) }
      else files.push({ path: transferPath(path), bytes: EMPTY, size: item.size, load: item.read })
    }
  }
  if (!files.length) throw new Error("O arquivo não contém notas ou anexos importáveis.")
  if (files.length > limits.files) throw new Error("O pacote excede a quantidade permitida de arquivos.")
  validateTransferPaths(files)
  return { title, kind: manifestBytes ? "runas" : "markdown", files, ignored, ...(items ? { items } : {}) }
}

export async function createTransferArchive(title: string, files: TransferFile[], kind: "runas" | "markdown" = "runas", limits: TransferLimits = TRANSFER_LIMITS, items?: PackageItemSpec[]): Promise<Uint8Array> {
  if (!files.length || files.length > limits.files) throw new Error("Selecione arquivos para exportar, dentro do limite de quantidade.")
  validateTransferPaths(files)
  let total = 0
  const zip: Zippable = Object.create(null) as Zippable
  const entries: { path: string; size: number; sha256: string }[] = []
  for (const file of files) {
    if (file.bytes.length > limits.file || (total += file.bytes.length) > limits.expanded) throw new Error("A seleção excede o limite de tamanho do pacote.")
    zip[(kind === "runas" ? "cofre/" : "") + file.path] = file.bytes
    if (kind === "runas") entries.push({ path: file.path, size: file.bytes.length, sha256: await sha256(file.bytes) })
  }
  if (kind === "runas") zip[PACKAGE_MANIFEST] = strToU8(JSON.stringify({ format: "runas-codex", version: 1, title, files: entries, ...(items?.length ? { itens: items } : {}) }, null, 2))
  const bytes = zipSync(zip, { level: 6 })
  if (bytes.length > limits.archive) throw new Error("O pacote compactado excede o limite permitido.")
  return bytes
}

/**
 * U50 (ADR 0037): escreve o pacote em pedaços no destino, lendo um arquivo do cofre por vez. O manifesto do `.runas`
 * (mesmo formato, versão 1) vai no fim, com o SHA-256 de cada arquivo. Devolve o tamanho final do pacote.
 */
export async function writeTransferArchive(options: {
  title: string
  paths: string[]
  read: (path: string) => Promise<Uint8Array>
  kind: "runas" | "markdown"
  limits: TransferLimits
  sink: ZipSink
  /** Os itens escolhidos na exportação (U53); vão no manifesto do `.runas`. */
  items?: PackageItemSpec[]
  onProgress?: (done: number, total: number, path: string) => void
}): Promise<number> {
  const { title, paths, read, kind, limits, sink, items, onProgress } = options
  if (!paths.length || paths.length > limits.files) throw new Error("Selecione arquivos para exportar, dentro do limite de quantidade.")
  validateTransferPaths(paths.map(path => ({ path, bytes: new Uint8Array() })))
  const writer = new ZipWriter(sink), entries: { path: string; size: number; sha256: string }[] = []
  for (const [index, path] of paths.entries()) {
    onProgress?.(index, paths.length, path)
    const bytes = await read(path)
    if (bytes.length > limits.file) throw new Error(`“${path}” passa do limite por arquivo.`)
    await writer.add((kind === "runas" ? "cofre/" : "") + path, bytes)
    if (kind === "runas") entries.push({ path, size: bytes.length, sha256: await sha256(bytes) })
    if (writer.written > limits.archive) throw new Error("O pacote passou do limite permitido.")
  }
  if (kind === "runas") await writer.add(PACKAGE_MANIFEST, strToU8(JSON.stringify({ format: "runas-codex", version: 1, title, files: entries, ...(items?.length ? { itens: items } : {}) }, null, 2)))
  return writer.finish()
}
