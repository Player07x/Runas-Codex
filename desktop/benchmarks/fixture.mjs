import { cp, mkdir, open, readdir, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { deflateSync } from "node:zlib"

function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0) }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(name, bytes) {
  const type = Buffer.from(name), length = Buffer.alloc(4), crc = Buffer.alloc(4)
  length.writeUInt32BE(bytes.length); crc.writeUInt32BE(crc32(Buffer.concat([type, bytes])))
  return Buffer.concat([length, type, bytes, crc])
}
/** PNG real de ruído determinístico: a medição inclui leitura e decodificação de imagens, sem arquivos do usuário. */
function coverPng() {
  const width = 1024, height = 768, raw = Buffer.alloc(height * (width * 3 + 1)), header = Buffer.alloc(13)
  let seed = 123456789
  for (let y = 0; y < height; y++) for (let x = 1; x <= width * 3; x++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
    raw[y * (width * 3 + 1) + x] = seed & 255
  }
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))])
}
async function totalBytes(folder) {
  let total = 0
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, item.name)
    total += item.isDirectory() ? await totalBytes(path) : (await stat(path)).size
  }
  return total
}
export async function createPerformanceFixture(folder, example) {
  await cp(example, folder, { recursive: true })
  const notes = join(folder, "Notas/Grande"), wiki = join(folder, "Wikis/Desempenho"), assets = join(folder, "Anexos/Desempenho")
  await Promise.all([mkdir(notes, { recursive: true }), mkdir(join(wiki, "Personagens"), { recursive: true }), mkdir(assets, { recursive: true })])
  await writeFile(join(wiki, "Desempenho.md"), "---\ntipo: wiki\n---\n# Desempenho\n\nSomente dados gerados para medição.\n")
  const cover = coverPng()
  for (let i = 0; i < 420; i++) {
    const id = String(i).padStart(3, "0")
    await writeFile(join(assets, `Capa-${id}.png`), cover)
    await writeFile(join(wiki, `Personagens/Pessoa-${id}.md`), `---\ntipo: personagem\nretrato: "[[Anexos/Desempenho/Capa-${id}.png]]"\nstatus: ${i % 2 ? "Viva" : "Desconhecida"}\n---\n# Pessoa ${id}\n\nArtigo sintético ${id}. [[Pessoa-${String((i + 1) % 420).padStart(3, "0")}]]\n`)
  }
  for (let i = 0; i < 10000; i++) {
    const id = String(i).padStart(5, "0"), next = String((i + 1) % 10000).padStart(5, "0")
    await writeFile(join(notes, `N${id}.md`), `---\ntags: [benchmark, cidade/${i % 20}]\n---\n# Nota ${id}\n\nA cidade de Valdris registra o evento ${i}. [[N${next}]]\n`)
  }
  const world = join(folder, ".runas/mesas/benchmark-mesa")
  await mkdir(join(world, "cenas"), { recursive: true })
  await writeFile(join(world, "mesa.json"), JSON.stringify({ formatVersion: 1, id: "benchmark-mesa", title: "Mesa sintética", description: "Roteiro de desempenho", createdAt: 1, updatedAt: 1 }))
  const doc = (id, type, parentId, data, sort = 0) => ({ id, type, parentId, data, sort, createdAt: 1, updatedAt: 1 })
  const scene = doc("benchmark-cena", "scene", null, { name: "Cena de medição", width: 2400, height: 1600, grid: { type: "square", size: 100, color: "#888888", opacity: .3 } })
  const tokens = Array.from({ length: 40 }, (_, i) => doc(`benchmark-token-${i}`, "token", scene.id, { name: `Peça ${i}`, x: 100 + i % 10 * 150, y: 100 + Math.floor(i / 10) * 150, size: 1, disposition: "friendly" }, i))
  await writeFile(join(world, "cenas/benchmark-cena.json"), JSON.stringify([scene, ...tokens]))
  const marker = { format: "runas-performance-v1", noteCount: 10000, categoryArticles: 420, coverBytes: cover.length, targetBytes: 1300000000 }
  await writeFile(join(folder, ".runas-performance.json"), JSON.stringify(marker))
  // Arquivo de volume preenchido de verdade; não usa sparse file nem duplica os arquivos pessoais do cofre real.
  let remaining = marker.targetBytes - await totalBytes(folder)
  const filler = await open(join(assets, "volume-sintetico.bin"), "w"), block = Buffer.alloc(8 * 1048576, 0x5a)
  try { while (remaining > 0) { const bytes = block.subarray(0, Math.min(remaining, block.length)); await filler.write(bytes); remaining -= bytes.length } }
  finally { await filler.close() }
  return { ...marker, bytes: await totalBytes(folder) }
}
