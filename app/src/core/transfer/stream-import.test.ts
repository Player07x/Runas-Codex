import { describe, expect, it } from "vitest"
import { strToU8 } from "fflate"
import { readTransferArchiveFrom, TRANSFER_LIMITS, writeTransferArchive } from "./archive"
import { Sha256 } from "./sha256"
import { findIdentical } from "./import-items"
import { blobChunks, bytesSource, readZipDirectory, readZipEntry, readZipEntryChunks } from "./zip-stream"

const noise = (size: number) => Uint8Array.from({ length: size }, (_, i) => (i * 2654435761) >>> 24)
const subtle = async (bytes: Uint8Array) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.slice().buffer))].map((b) => b.toString(16).padStart(2, "0")).join("")

const vault: Record<string, Uint8Array> = {
  "Notas/Longa.md": strToU8("Texto que comprime bem. ".repeat(5_000)),
  "Anexos/Imagens/Mapa.png": noise(300_000),
}

async function pack(kind: "runas" | "markdown") {
  const chunks: Uint8Array[] = []
  await writeTransferArchive({ title: "Cofre", paths: Object.keys(vault), read: async (path) => vault[path]!, kind, limits: TRANSFER_LIMITS, sink: { write: async (bytes) => { chunks.push(bytes.slice()) } } })
  return Uint8Array.from(chunks.flatMap((chunk) => [...chunk]))
}

async function collect(produce: (onChunk: (bytes: Uint8Array) => Promise<void>) => Promise<void>) {
  const pieces: Uint8Array[] = []
  await produce(async (bytes) => { pieces.push(bytes) })
  return { pieces, bytes: Uint8Array.from(pieces.flatMap((piece) => [...piece])) }
}

describe("SHA-256 em partes (U109)", () => {
  it("dá o mesmo hash do crypto.subtle em qualquer divisão dos pedaços", async () => {
    for (const size of [0, 1, 55, 56, 63, 64, 65, 119, 1_000, 70_001]) {
      const bytes = noise(size), expected = await subtle(bytes)
      expect(new Sha256().update(bytes).hex()).toBe(expected)
      const parts = new Sha256()
      for (let at = 0; at < size; at += 37) parts.update(bytes.subarray(at, at + 37))
      expect(parts.hex()).toBe(expected)
    }
  })
})

describe("ZIP lido em pedaços (U109)", () => {
  it("entrega os mesmos bytes do leitor inteiro, em pedaços do tamanho pedido, guardado ou comprimido", async () => {
    const source = bytesSource(await pack("markdown"))
    const entries = await readZipDirectory(source, TRANSFER_LIMITS)
    expect(new Set(entries.map((entry) => entry.method))).toEqual(new Set([0, 8]))
    for (const entry of entries) {
      const { pieces, bytes } = await collect((onChunk) => readZipEntryChunks(source, entry, onChunk, 10_000))
      expect(bytes).toEqual(await readZipEntry(source, entry))
      expect(pieces.slice(0, -1).every((piece) => piece.length === 10_000)).toBe(true)
      expect(pieces.at(-1)!.length).toBeLessThanOrEqual(10_000)
    }
  })

  it("recusa o arquivo corrompido no fim, com o CRC", async () => {
    const bytes = (await pack("markdown")).slice()
    const entry = (await readZipDirectory(bytesSource(bytes), TRANSFER_LIMITS)).find((item) => item.name.endsWith(".png"))!
    bytes[entry.offset + 30 + entry.name.length + 1_000]! ^= 0xff
    await expect(collect((onChunk) => readZipEntryChunks(bytesSource(bytes), entry, onChunk))).rejects.toThrow("corrompido")
  })

  it("o pacote .runas confere o manifesto em pedaços e guarda o binário só para ler ao gravar", async () => {
    const archive = await readTransferArchiveFrom(bytesSource(await pack("runas")), "Cofre", TRANSFER_LIMITS, undefined, true)
    const image = archive.files.find((file) => file.path === "Anexos/Imagens/Mapa.png")!
    expect(image.bytes.length).toBe(0)
    expect(image.size).toBe(300_000)
    expect((await collect(image.stream!)).bytes).toEqual(vault["Anexos/Imagens/Mapa.png"])
    // Os textos continuam na memória, como antes.
    expect(archive.files.find((file) => file.path === "Notas/Longa.md")?.bytes).toEqual(vault["Notas/Longa.md"])
  })

  it("o pacote .runas com imagem trocada não passa na conferência", async () => {
    const bytes = (await pack("runas")).slice()
    const entry = (await readZipDirectory(bytesSource(bytes), TRANSFER_LIMITS)).find((item) => item.name.endsWith(".png"))!
    bytes[entry.offset + 30 + entry.name.length + 5]! ^= 0xff
    await expect(readTransferArchiveFrom(bytesSource(bytes), "Cofre", TRANSFER_LIMITS, undefined, true)).rejects.toThrow(/corrompido|integridade/)
  })

  it("o arquivo escolhido na tela é lido por fatias", async () => {
    const bytes = noise(25_000)
    const { pieces, bytes: joined } = await collect((onChunk) => blobChunks(new Blob([bytes]), onChunk, 10_000))
    expect(pieces.map((piece) => piece.length)).toEqual([10_000, 10_000, 5_000])
    expect(joined).toEqual(bytes)
  })
})

describe("prévia e pacote de segurança em pedaços", () => {
  it("compara o binário do pacote com o do cofre sem chamar o leitor inteiro", async () => {
    const archive = await readTransferArchiveFrom(bytesSource(await pack("runas")), "Cofre", TRANSFER_LIMITS, undefined, true)
    const path = "Anexos/Imagens/Mapa.png"
    const bytes = vault[path]!
    const known = [{ path, size: bytes.length, mtime: 1 }]
    const refuseFullRead = async () => { throw new Error("Leitura inteira inesperada") }
    const match = await findIdentical(archive, known, refuseFullRead, undefined, (_path, write) => blobChunks(new Blob([bytes.slice().buffer]), write, 8_000))
    expect([...match]).toEqual([path])
    const changed = bytes.slice()
    changed[100] = changed[100]! ^ 0xff
    const mismatch = await findIdentical(archive, known, refuseFullRead, undefined, (_path, write) => blobChunks(new Blob([changed.buffer]), write, 10_000))
    expect([...mismatch]).toEqual([])
  })

  it("gera um backup .runas legível pelo leitor inteiro e recusa uma origem que muda durante a gravação", async () => {
    const path = "Anexos/Imagens/Mapa.png"
    const original = vault[path]!
    const backup = await collect(async (write) => {
      await writeTransferArchive({
        title: "Antes de importar", paths: [path], kind: "runas", limits: TRANSFER_LIMITS, sink: { write },
        readStream: (_path, put) => blobChunks(new Blob([original.slice().buffer]), put, 10_000),
      })
    })
    const archive = await readTransferArchiveFrom(bytesSource(backup.bytes), "Cofre", TRANSFER_LIMITS)
    expect(archive.files[0]?.bytes).toEqual(original)
    let reads = 0
    await expect(writeTransferArchive({
      title: "Antes de importar", paths: [path], kind: "runas", limits: TRANSFER_LIMITS, sink: { write: async () => undefined },
      async readStream(_path, write) { await write(Uint8Array.of(++reads)) },
    })).rejects.toThrow("mudou durante a gravação")
  })
})
