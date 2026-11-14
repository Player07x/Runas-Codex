import { describe, expect, it } from "vitest"
import { strToU8, zipSync } from "fflate"
import { createTransferArchive, readTransferArchiveFrom, sha256, transferBytes, transferSize, type TransferFile } from "./archive"
import { bytesSource, type ZipSource } from "./zip-stream"
import { buildImportPlan } from "./plan"
import { buildItemsImportPlan, findIdentical, packageItems } from "./import-items"

const png = new Uint8Array(4096).map((_, i) => (i * 7) % 251)
const files: TransferFile[] = [
  { path: "Wikis/Cronos/Cronos.md", bytes: strToU8("# Cronos\n\n![[Mapa.png]]\n") },
  { path: "Anexos/Imagens/Mapa.png", bytes: png },
]
/** Conta quantos bytes saem do pacote: prova que o binário não fica guardado. */
function counting(source: ZipSource) {
  const counter = { read: 0, source: { size: source.size, read: async (offset: number, length: number) => { counter.read += length; return source.read(offset, length) } } }
  return counter
}

describe("importar sob demanda (C2)", () => {
  it("guarda só os textos; a imagem é conferida, solta e lida de novo ao gravar", async () => {
    const counter = counting(bytesSource(await createTransferArchive("Cofre", files)))
    const archive = await readTransferArchiveFrom(counter.source, "Cofre", undefined, undefined, true)
    const note = archive.files.find(file => file.path.endsWith(".md"))!, image = archive.files.find(file => file.path.endsWith(".png"))!
    expect(note.bytes.length).toBeGreaterThan(0)
    expect(note.load).toBeUndefined()
    expect(image.bytes.length).toBe(0)
    expect(transferSize(image)).toBe(png.length)
    const before = counter.read
    expect(await transferBytes(image)).toEqual(png)
    expect(counter.read).toBeGreaterThan(before)
  })

  it("o plano leva a imagem sem lê-la, até no nome da cópia", async () => {
    const archive = await readTransferArchiveFrom(bytesSource(await createTransferArchive("Cofre", files)), "Cofre", undefined, undefined, true)
    const plan = buildImportPlan(archive, [], "merge")
    const write = plan.writes.find(item => item.path.endsWith(".png"))!
    expect(write.bytes.length).toBe(0)
    expect(await transferBytes(write)).toEqual(png)
    const items = packageItems(archive)
    const copy = buildItemsImportPlan(archive, [{ path: "Wikis/Cronos/Cronos.md", size: 1, mtime: 1 }], items, new Map([["wiki:Cronos", { strategy: "duplicate" as const, name: "Cronos 2" }], ["pasta:Anexos", { strategy: "merge" as const }]]), new Set())
    expect(copy.writes.map(item => item.path).sort()).toEqual(["Anexos/Imagens/Mapa.png", "Wikis/Cronos 2/Cronos 2.md"])
  })

  it("compara com o cofre lendo a imagem do pacote só para isso", async () => {
    const archive = await readTransferArchiveFrom(bytesSource(await createTransferArchive("Cofre", files)), "Cofre", undefined, undefined, true)
    const same = await findIdentical(archive, [{ path: "Anexos/Imagens/Mapa.png", size: png.length, mtime: 1 }], async () => png)
    expect([...same]).toEqual(["Anexos/Imagens/Mapa.png"])
  })

  it("recusa ao abrir um pacote .runas com a imagem trocada (o SHA do manifesto não confere)", async () => {
    const other = png.slice(); other[10] ^= 0xff
    const manifest = { format: "runas-codex", version: 1, title: "Cofre", files: [{ path: "Anexos/Imagens/Mapa.png", size: png.length, sha256: await sha256(png) }] }
    const bytes = zipSync({ "cofre/Anexos/Imagens/Mapa.png": other, ".runas-pacote.json": strToU8(JSON.stringify(manifest)) })
    await expect(readTransferArchiveFrom(bytesSource(bytes), "Cofre", undefined, undefined, true)).rejects.toThrow("A integridade de “Anexos/Imagens/Mapa.png” não confere")
  })

  it("num ZIP sem manifesto, a imagem estragada só é notada ao gravar, e a gravação para", async () => {
    const zip = zipSync({ "Notas/A.md": strToU8("# A\n"), "Notas/B.png": [png, { level: 0 }] })
    const at = zip.findIndex((_, i) => png.every((byte, j) => zip[i + j] === byte))
    const broken = zip.slice(); broken[at + 10] ^= 0xff
    const archive = await readTransferArchiveFrom(bytesSource(broken), "Obsidian", undefined, undefined, true)
    const image = archive.files.find(file => file.path.endsWith(".png"))!
    await expect(transferBytes(image)).rejects.toThrow(/corrompido/)
  })
})
