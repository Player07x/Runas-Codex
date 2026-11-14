import { describe, expect, it } from "vitest"
import { strToU8 } from "fflate"
import { createTransferArchive, readTransferArchive, readTransferArchiveFrom, TRANSFER_LIMITS, writeTransferArchive, type TransferLimits } from "./archive"
import { bytesSource, readZipDirectory, ZipWriter, type ZipSource } from "./zip-stream"

/** Destino que junta os pedaços e conta quantos chegaram. */
function memorySink() {
  const chunks: Uint8Array[] = []
  return {
    chunks,
    sink: { write: async (bytes: Uint8Array) => { chunks.push(bytes.slice()) } },
    bytes() {
      const out = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0))
      let at = 0
      for (const chunk of chunks) { out.set(chunk, at); at += chunk.length }
      return out
    },
  }
}

// Bytes que não comprimem (como um PNG de verdade).
const noise = (size: number) => Uint8Array.from({ length: size }, (_, i) => (i * 2654435761) >>> 24)
const vault: Record<string, Uint8Array> = {
  "Wikis/Cronos/Cronos.md": strToU8("# Cronos\r\n\r\n![[Mapa.png]]\n" + "Texto repetido. ".repeat(400)),
  "Anexos/Imagens/Mapa.png": noise(70_000),
  "Notas/Ação.md": strToU8("﻿Acentuação e BOM\n"),
}
const paths = Object.keys(vault)

async function written(kind: "runas" | "markdown") {
  const out = memorySink()
  const size = await writeTransferArchive({ title: "Cofre", paths, read: async path => vault[path]!, kind, limits: TRANSFER_LIMITS, sink: out.sink })
  return { out, size, bytes: out.bytes() }
}

describe("pacote em pedaços (U50)", () => {
  it("o pacote .runas escrito em pedaços abre no leitor da 1.3, com os bytes iguais", async () => {
    const { out, size, bytes } = await written("runas")
    expect(size).toBe(bytes.length)
    expect(out.chunks.length).toBeGreaterThan(paths.length)
    const archive = await readTransferArchive(bytes)
    expect(archive.kind).toBe("runas")
    expect(archive.title).toBe("Cofre")
    for (const path of paths) expect(archive.files.find(file => file.path === path)?.bytes).toEqual(vault[path])
  })

  it("o ZIP Markdown sai com os caminhos do cofre e sem manifesto", async () => {
    const archive = await readTransferArchive((await written("markdown")).bytes)
    expect(archive.kind).toBe("markdown")
    expect(archive.files.map(file => file.path).sort()).toEqual([...paths].sort())
  })

  it("comprime o texto e guarda a imagem sem recomprimir", async () => {
    const entries = await readZipDirectory(bytesSource((await written("runas")).bytes), TRANSFER_LIMITS)
    const md = entries.find(entry => entry.name === "cofre/Wikis/Cronos/Cronos.md")!, png = entries.find(entry => entry.name === "cofre/Anexos/Imagens/Mapa.png")!
    expect(md.method).toBe(8)
    expect(md.compressed).toBeLessThan(md.size)
    expect(png.method).toBe(0)
    expect(png.compressed).toBe(png.size)
  })

  it("lê por partes, sem pedir o pacote inteiro de uma vez", async () => {
    const { bytes } = await written("runas")
    let largest = 0
    const source: ZipSource = { size: bytes.length, read: async (offset, length) => { largest = Math.max(largest, length); return bytes.subarray(offset, offset + length) } }
    const archive = await readTransferArchiveFrom(source, "x", TRANSFER_LIMITS)
    expect(archive.files).toHaveLength(paths.length)
    expect(largest).toBeLessThan(bytes.length)
    expect(largest).toBeLessThanOrEqual(70_000)
  })

  it("lê por partes os pacotes antigos, feitos pela 1.3", async () => {
    const old = await createTransferArchive("Antigo", paths.map(path => ({ path, bytes: vault[path]! })))
    const archive = await readTransferArchiveFrom(bytesSource(old))
    expect(archive.title).toBe("Antigo")
    expect(archive.files.find(file => file.path === "Notas/Ação.md")?.bytes).toEqual(vault["Notas/Ação.md"])
  })

  it("recusa arquivo corrompido no meio do pacote", async () => {
    const bytes = (await written("markdown")).bytes.slice()
    const entry = (await readZipDirectory(bytesSource(bytes), TRANSFER_LIMITS)).find(item => item.name.endsWith(".png"))!
    bytes[entry.offset + 30 + entry.name.length + 100]! ^= 0xff
    await expect(readTransferArchiveFrom(bytesSource(bytes))).rejects.toThrow("corrompido")
  })

  it("para quando um arquivo ou o pacote passa do limite", async () => {
    const write = (limits: TransferLimits) => writeTransferArchive({ title: "x", paths, read: async path => vault[path]!, kind: "runas", limits, sink: memorySink().sink })
    await expect(write({ ...TRANSFER_LIMITS, file: 1000 })).rejects.toThrow("limite por arquivo")
    await expect(write({ ...TRANSFER_LIMITS, archive: 5000 })).rejects.toThrow("limite permitido")
    await expect(write({ ...TRANSFER_LIMITS, files: 2 })).rejects.toThrow("limite de quantidade")
  })

  it("avisa o andamento arquivo por arquivo", async () => {
    const seen: string[] = []
    await writeTransferArchive({ title: "x", paths, read: async path => vault[path]!, kind: "markdown", limits: TRANSFER_LIMITS, sink: memorySink().sink, onProgress: (done, total, path) => seen.push(`${done}/${total} ${path}`) })
    expect(seen).toEqual(paths.map((path, i) => `${i}/${paths.length} ${path}`))
  })

  it("não aceita o mesmo nome duas vezes nem escrever depois de fechar", async () => {
    const writer = new ZipWriter(memorySink().sink)
    await writer.add("a.md", strToU8("a"))
    await expect(writer.add("a.md", strToU8("b"))).rejects.toThrow("repete")
    await writer.finish()
    await expect(writer.add("b.md", strToU8("b"))).rejects.toThrow("fechado")
  })
})
