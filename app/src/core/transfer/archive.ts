import { strFromU8, strToU8, Unzip, UnzipInflate, zipSync, type Zippable } from "fflate"
import { nameProblem } from "../names"
import { foldName } from "../text"

export const TRANSFER_LIMITS = { archive: 128 * 1024 * 1024, expanded: 256 * 1024 * 1024, file: 50 * 1024 * 1024, files: 10000 } as const
export const PACKAGE_MANIFEST = ".runas-pacote.json"
export interface TransferFile { path: string; bytes: Uint8Array }
export interface TransferArchive { title: string; kind: "runas" | "markdown"; files: TransferFile[]; ignored: string[] }
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

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let n = index
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1
  return n >>> 0
})
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255]! ^ crc >>> 8
  return (crc ^ 0xffffffff) >>> 0
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

function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value) }

export async function readTransferArchive(bytes: Uint8Array, title = "Cofre importado", limits: TransferLimits = TRANSFER_LIMITS): Promise<TransferArchive> {
  const zip = unzipBounded(bytes, limits), manifestBytes = zip.get(PACKAGE_MANIFEST)
  const files: TransferFile[] = [], ignored: string[] = []
  if (manifestBytes) {
    const manifest: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes))
    if (!record(manifest) || manifest.format !== "runas-codex" || manifest.version !== 1 || !Array.isArray(manifest.files) || typeof manifest.title !== "string") throw new Error("Pacote Runas inválido ou de uma versão de formato não suportada.")
    title = manifest.title.slice(0, 160)
    const used = new Set([PACKAGE_MANIFEST])
    for (const entry of manifest.files) {
      if (!record(entry) || typeof entry.path !== "string" || typeof entry.size !== "number" || typeof entry.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("Entrada inválida no manifesto do pacote.")
      const path = transferPath(entry.path), name = "cofre/" + path, data = zip.get(name)
      if (used.has(name) || !data || data.length !== entry.size || await sha256(data) !== entry.sha256) throw new Error(`A integridade de “${path}” não confere com o manifesto.`)
      used.add(name); files.push({ path, bytes: data })
    }
    if ([...zip.keys()].some(name => !name.endsWith("/") && !used.has(name))) throw new Error("O pacote contém arquivos fora do manifesto.")
  } else {
    const names = [...zip.keys()].filter(name => !name.endsWith("/"))
    const first = names[0]?.split("/")[0]
    const knownRoots = new Set(["Notas", "Agenda", "Wikis", "Campanhas", "Livros", "Mesas", "Anexos", "Templates", "Modelos", ".runas", ".obsidian", ".git", "__MACOSX"])
    const wrapper = first && !nameProblem(first) && !knownRoots.has(first) && names.every(name => name.startsWith(first + "/")) ? first + "/" : ""
    for (const [raw, data] of zip) {
      let path = raw.endsWith("/") ? raw.slice(0, -1) : raw
      // Mesmo o que será ignorado não pode conter escapes; arquivos de configuração não são importados.
      if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some(part => part === ".." || part === ".") || /^[a-z]:/i.test(path)) throw new Error(`Caminho fora do cofre no ZIP: ${raw}`)
      if (raw.endsWith("/")) continue
      if (wrapper) path = path.slice(wrapper.length)
      if ((path.split("/").some(part => part.startsWith(".")) && !managedWorldPath(path)) || path.startsWith("__MACOSX/") || path === "Thumbs.db") { ignored.push(raw); continue }
      files.push({ path: transferPath(path), bytes: data })
    }
  }
  if (!files.length) throw new Error("O arquivo não contém notas ou anexos importáveis.")
  if (files.length > limits.files) throw new Error("O pacote excede a quantidade permitida de arquivos.")
  validateTransferPaths(files)
  return { title, kind: manifestBytes ? "runas" : "markdown", files, ignored }
}

export async function createTransferArchive(title: string, files: TransferFile[], kind: "runas" | "markdown" = "runas", limits: TransferLimits = TRANSFER_LIMITS): Promise<Uint8Array> {
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
  if (kind === "runas") zip[PACKAGE_MANIFEST] = strToU8(JSON.stringify({ format: "runas-codex", version: 1, title, files: entries }, null, 2))
  const bytes = zipSync(zip, { level: 6 })
  if (bytes.length > limits.archive) throw new Error("O pacote compactado excede o limite permitido.")
  return bytes
}
