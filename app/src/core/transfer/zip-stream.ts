import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate"

/**
 * ZIP em pedaços (U50, ADR 0037): o pacote é escrito e lido um arquivo por vez, sem montar o ZIP inteiro na memória.
 * O cabeçalho local já leva tamanho e CRC (cada arquivo é lido inteiro antes de entrar), sem descritor de dados, para
 * o leitor da 1.3 (`unzipBounded` em `archive.ts`) abrir os pacotes que cabem nos limites dele. Sem ZIP64: até 4 GB e
 * 65.534 arquivos.
 */
export interface ZipSink { write(bytes: Uint8Array): Promise<void> }
/** Acesso aleatório ao arquivo do pacote (um `File`/`Blob` no navegador, um arquivo no Node). */
export interface ZipSource { size: number; read(offset: number, length: number): Promise<Uint8Array> }
export interface ZipEntryInfo { name: string; method: number; crc: number; compressed: number; size: number; offset: number }
export interface ZipReadLimits { file: number; expanded: number; files: number }

export const ZIP_MAX_BYTES = 0xffffffff - 1
export const ZIP_MAX_ENTRIES = 65534
/** Já comprimidos: recomprimir só gasta tempo. */
const STORED = /\.(png|jpe?g|gif|webp|avif|heic|mp3|ogg|oga|opus|m4a|aac|flac|mp4|m4v|webm|mkv|mov|zip|runas|pdf|docx|xlsx|pptx|epub|kra|gz|7z|rar|woff2?)$/i

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let n = index
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1
  return n >>> 0
})
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255]! ^ crc >>> 8
  return (crc ^ 0xffffffff) >>> 0
}

function dosTime(date: Date): { time: number; date: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107)
  return { time: date.getHours() << 11 | date.getMinutes() << 5 | date.getSeconds() >> 1, date: year - 1980 << 9 | date.getMonth() + 1 << 5 | date.getDate() }
}

export class ZipWriter {
  private readonly entries: (ZipEntryInfo & { nameBytes: Uint8Array })[] = []
  private readonly names = new Set<string>()
  private offset = 0
  private closed = false
  private readonly stamp = dosTime(new Date())

  constructor(private readonly sink: ZipSink) {}

  /** Quantos bytes já foram escritos no destino. */
  get written(): number { return this.offset }

  async add(name: string, data: Uint8Array): Promise<void> {
    if (this.closed) throw new Error("O pacote já foi fechado.")
    if (this.names.has(name)) throw new Error(`O pacote repete “${name}”.`)
    if (this.entries.length >= ZIP_MAX_ENTRIES) throw new Error("O pacote passou de 65.534 arquivos.")
    const nameBytes = strToU8(name)
    const deflated = STORED.test(name) || data.length < 64 ? null : deflateSync(data, { level: 6 })
    const body = deflated && deflated.length < data.length ? deflated : data
    const entry = { name, nameBytes, method: body === data ? 0 : 8, crc: crc32(data), compressed: body.length, size: data.length, offset: this.offset }
    if (this.offset + 30 + nameBytes.length + body.length > ZIP_MAX_BYTES) throw new Error("O pacote passou de 4 GB, o máximo do formato ZIP.")
    const header = new Uint8Array(30 + nameBytes.length), view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true)
    view.setUint16(4, 20, true)
    view.setUint16(6, 0x0800, true) // nomes em UTF-8
    view.setUint16(8, entry.method, true)
    view.setUint16(10, this.stamp.time, true)
    view.setUint16(12, this.stamp.date, true)
    view.setUint32(14, entry.crc, true)
    view.setUint32(18, entry.compressed, true)
    view.setUint32(22, entry.size, true)
    view.setUint16(26, nameBytes.length, true)
    header.set(nameBytes, 30)
    await this.sink.write(header)
    await this.sink.write(body)
    this.offset += header.length + body.length
    this.names.add(name)
    this.entries.push(entry)
  }

  /** Escreve o diretório central; depois disso o pacote está completo. */
  async finish(): Promise<number> {
    if (this.closed) throw new Error("O pacote já foi fechado.")
    this.closed = true
    const size = this.entries.reduce((total, entry) => total + 46 + entry.nameBytes.length, 0)
    if (this.offset + size + 22 > ZIP_MAX_BYTES) throw new Error("O pacote passou de 4 GB, o máximo do formato ZIP.")
    const central = new Uint8Array(size + 22), view = new DataView(central.buffer)
    let at = 0
    for (const entry of this.entries) {
      view.setUint32(at, 0x02014b50, true)
      view.setUint16(at + 4, 20, true)
      view.setUint16(at + 6, 20, true)
      view.setUint16(at + 8, 0x0800, true)
      view.setUint16(at + 10, entry.method, true)
      view.setUint16(at + 12, this.stamp.time, true)
      view.setUint16(at + 14, this.stamp.date, true)
      view.setUint32(at + 16, entry.crc, true)
      view.setUint32(at + 20, entry.compressed, true)
      view.setUint32(at + 24, entry.size, true)
      view.setUint16(at + 28, entry.nameBytes.length, true)
      view.setUint32(at + 42, entry.offset, true)
      central.set(entry.nameBytes, at + 46)
      at += 46 + entry.nameBytes.length
    }
    view.setUint32(at, 0x06054b50, true)
    view.setUint16(at + 8, this.entries.length, true)
    view.setUint16(at + 10, this.entries.length, true)
    view.setUint32(at + 12, size, true)
    view.setUint32(at + 16, this.offset, true)
    await this.sink.write(central)
    this.offset += central.length
    return this.offset
  }
}

/** Lê o diretório central sem carregar o pacote; confere tamanhos, métodos e nomes repetidos antes de extrair. */
export async function readZipDirectory(source: ZipSource, limits: ZipReadLimits): Promise<ZipEntryInfo[]> {
  if (source.size < 22) throw new Error("ZIP inválido ou dividido em vários volumes.")
  if (source.size > ZIP_MAX_BYTES) throw new Error("ZIP grande demais (mais de 4 GB) ou ZIP64.")
  const tailStart = Math.max(0, source.size - 65557), tail = await source.read(tailStart, source.size - tailStart)
  const tailView = new DataView(tail.buffer, tail.byteOffset, tail.byteLength)
  let end = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) === 0x06054b50 && tailStart + i + 22 + tailView.getUint16(i + 20, true) === source.size) { end = i; break }
  }
  if (end < 0 || tailView.getUint16(end + 4, true) || tailView.getUint16(end + 6, true)) throw new Error("ZIP inválido ou dividido em vários volumes.")
  const count = tailView.getUint16(end + 10, true), centralSize = tailView.getUint32(end + 12, true), offset = tailView.getUint32(end + 16, true)
  if (count === 65535 || count > limits.files * 3 + 1 || tailView.getUint16(end + 8, true) !== count || offset + centralSize !== tailStart + end) throw new Error("ZIP grande demais, ZIP64 ou diretório inválido.")
  const central = await source.read(offset, centralSize), view = new DataView(central.buffer, central.byteOffset, central.byteLength)
  const entries: ZipEntryInfo[] = [], seen = new Set<string>()
  let cursor = 0, expanded = 0
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > central.length || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("Diretório do ZIP incompleto.")
    const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true)
    const compressed = view.getUint32(cursor + 20, true), size = view.getUint32(cursor + 24, true)
    const nameLength = view.getUint16(cursor + 28, true), extraLength = view.getUint16(cursor + 30, true), commentLength = view.getUint16(cursor + 32, true)
    const next = cursor + 46 + nameLength + extraLength + commentLength
    if (next > central.length || flags & 1 || ![0, 8].includes(method) || size > limits.file || (expanded += size) > limits.expanded || compressed === 0xffffffff || size === 0xffffffff) throw new Error("ZIP criptografado, formato não suportado ou tamanho descompactado excessivo.")
    const name = strFromU8(central.subarray(cursor + 46, cursor + 46 + nameLength), !(flags & 2048))
    if (seen.has(name)) throw new Error(`O ZIP repete “${name}”.`)
    seen.add(name)
    entries.push({ name, method, crc: view.getUint32(cursor + 16, true), compressed, size, offset: view.getUint32(cursor + 42, true) })
    cursor = next
  }
  if (cursor !== central.length) throw new Error("Diretório do ZIP inválido.")
  return entries
}

/** Extrai um arquivo: só ele e seus bytes compactados ficam na memória. Confere tamanho e CRC. */
export async function readZipEntry(source: ZipSource, entry: ZipEntryInfo): Promise<Uint8Array> {
  const header = await source.read(entry.offset, 30), view = new DataView(header.buffer, header.byteOffset, header.byteLength)
  if (header.length < 30 || view.getUint32(0, true) !== 0x04034b50) throw new Error(`O conteúdo do ZIP diverge do diretório em “${entry.name}”.`)
  const start = entry.offset + 30 + view.getUint16(26, true) + view.getUint16(28, true)
  if (start + entry.compressed > source.size) throw new Error(`O arquivo “${entry.name}” está incompleto no ZIP.`)
  const raw = await source.read(start, entry.compressed)
  if (raw.length !== entry.compressed) throw new Error(`O arquivo “${entry.name}” está incompleto no ZIP.`)
  let data: Uint8Array
  try { data = entry.method === 8 ? inflateSync(raw, { out: new Uint8Array(entry.size) }) : raw }
  catch { throw new Error(`O arquivo “${entry.name}” está corrompido no ZIP.`) }
  if (data.length !== entry.size || crc32(data) !== entry.crc) throw new Error(`O arquivo “${entry.name}” está incompleto ou corrompido no ZIP.`)
  return data
}

/** Fonte sobre bytes já na memória (testes e o leitor antigo). */
export function bytesSource(bytes: Uint8Array): ZipSource {
  return { size: bytes.length, read: async (offset, length) => bytes.subarray(offset, Math.min(bytes.length, offset + length)) }
}

/** Junta pedaços pequenos (cabeçalhos, notas curtas) antes de mandar ao destino: menos idas ao processo principal. */
export function bufferedSink(write: (bytes: Uint8Array) => Promise<void>, size = 8 * 1024 * 1024): ZipSink & { flush(): Promise<void> } {
  let parts: Uint8Array[] = [], pending = 0
  const flush = async () => {
    if (!pending) return
    const out = new Uint8Array(pending)
    let at = 0
    for (const part of parts) { out.set(part, at); at += part.length }
    parts = []; pending = 0
    await write(out)
  }
  return {
    async write(bytes) {
      if (bytes.length >= size) { await flush(); await write(bytes); return }
      parts.push(bytes); pending += bytes.length
      if (pending >= size) await flush()
    },
    flush,
  }
}

/** Fonte sobre um arquivo escolhido na tela: `slice` lê só o trecho pedido. */
export function blobSource(blob: Blob): ZipSource {
  return { size: blob.size, read: async (offset, length) => new Uint8Array(await blob.slice(offset, offset + length).arrayBuffer()) }
}
