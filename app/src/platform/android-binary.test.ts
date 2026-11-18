import { describe, expect, it, vi } from "vitest"
import { createAndroidBinary, OPEN_TRANSFERS, type AndroidBinaryPlugin } from "./android-binary"
import { BINARY_CHUNK, toBase64 } from "../core/binary-chunks"

function plugin() {
  return { binaryReadStart: vi.fn(), binaryReadChunk: vi.fn(), binaryReadFinish: vi.fn(), binaryWriteStart: vi.fn().mockResolvedValue({ id: 9 }), binaryWriteChunk: vi.fn(), binaryWriteFinish: vi.fn().mockResolvedValue({ path: "Anexos/a.bin", size: 1, mtime: 2 }), binaryAbort: vi.fn().mockResolvedValue(undefined) } satisfies AndroidBinaryPlugin
}
describe("binários pela ponte Android em pedaços", () => {
  it("grava na ordem, preserva versão/criação e não manda mensagem acima de 2 MB", async () => {
    const native = plugin(), api = createAndroidBinary(native)
    const bytes = Uint8Array.from({ length: BINARY_CHUNK * 2 + 3 }, (_, i) => i % 251)
    await api.write("Anexos/a.bin", bytes, null)
    expect(native.binaryWriteStart).toHaveBeenCalledWith({ path: "Anexos/a.bin", size: bytes.length, expected: null, managed: false })
    const chunks = native.binaryWriteChunk.mock.calls.map(([options]) => Buffer.from(options.base64, "base64"))
    expect(chunks.map(b => b.length)).toEqual([BINARY_CHUNK, BINARY_CHUNK, 3])
    expect(Buffer.concat(chunks).equals(Buffer.from(bytes))).toBe(true)
    await api.write(".runas/mesas/a/mesa.json", new Uint8Array(), { path: "x", size: 1, mtime: 2 }, true)
    expect(native.binaryWriteStart).toHaveBeenLastCalledWith({ path: ".runas/mesas/a/mesa.json", size: 0, managed: true, expected: { size: 1, mtime: 2 } })
  })
  it("reúne a leitura sem perder bytes e só a entrega após conferir a versão final", async () => {
    const native = plugin(), bytes = Uint8Array.from({ length: BINARY_CHUNK + 17 }, (_, i) => i % 239)
    native.binaryReadStart.mockResolvedValue({ id: 4, size: bytes.length })
    native.binaryReadChunk.mockResolvedValueOnce({ base64: toBase64(bytes.subarray(0, BINARY_CHUNK)) }).mockResolvedValueOnce({ base64: toBase64(bytes.subarray(BINARY_CHUNK)) })
    expect(Buffer.from(await createAndroidBinary(native).read("a.bin")).equals(Buffer.from(bytes))).toBe(true)
    expect(native.binaryReadFinish).toHaveBeenCalledWith({ id: 4 })
  })
  it.each(["chunk", "finish"])("aborta o estágio quando falha %s, preservando o motivo", async failure => {
    const native = plugin(), error = new Error("sem espaço")
    native[failure === "chunk" ? "binaryWriteChunk" : "binaryWriteFinish"].mockRejectedValue(error)
    await expect(createAndroidBinary(native).write("a.bin", new Uint8Array([1]))).rejects.toBe(error)
    expect(native.binaryAbort).toHaveBeenCalledWith({ id: 9 })
  })
  it("recusa tamanho inválido, leitura truncada e conflito na versão final, fechando o leitor", async () => {
    for (const size of [-1, NaN, 512 * 1024 * 1024 + 1, 1.5]) {
      const native = plugin(); native.binaryReadStart.mockResolvedValue({ id: 1, size })
      await expect(createAndroidBinary(native).read("a")).rejects.toThrow()
      expect(native.binaryReadChunk).not.toHaveBeenCalled(); expect(native.binaryAbort).toHaveBeenCalledWith({ id: 1 })
    }
    const native = plugin(); native.binaryReadStart.mockResolvedValue({ id: 1, size: 2 }); native.binaryReadChunk.mockResolvedValue({ base64: "" })
    await expect(createAndroidBinary(native).read("a")).rejects.toThrow("incompleta")
    native.binaryReadChunk.mockResolvedValue({ base64: "AQI=" }); native.binaryReadFinish.mockRejectedValue(new Error("mudou"))
    await expect(createAndroidBinary(native).read("a")).rejects.toThrow("mudou")
  })
  it("põe na fila as leituras além de duas abertas e lê todas, como uma mesa com várias cenas", async () => {
    const native = plugin()
    let open = 0, most = 0, next = 0
    const sizes = new Map<number, number>()
    native.binaryReadStart.mockImplementation(async ({ path }: { path: string }) => {
      if (open >= OPEN_TRANSFERS) throw new Error("Aguarde os arquivos que já estão em transferência.")
      open++; most = Math.max(most, open)
      const id = ++next; sizes.set(id, Number(path.slice(1)))
      return { id, size: sizes.get(id)! }
    })
    native.binaryReadChunk.mockImplementation(async ({ id }: { id: number }) => {
      await new Promise(resolve => setTimeout(resolve, 1))
      return { base64: toBase64(new Uint8Array(sizes.get(id)!).fill(id)) }
    })
    native.binaryReadFinish.mockImplementation(async () => { open-- })
    const binary = createAndroidBinary(native)
    const read = await Promise.all([1, 2, 3, 4, 5].map(n => binary.read(`c${n}`)))
    expect(read.map(bytes => bytes.length)).toEqual([1, 2, 3, 4, 5])
    expect(most).toBe(OPEN_TRANSFERS)
    expect(open).toBe(0)
  })
  it("libera a vaga quando uma transferência falha, sem travar a fila", async () => {
    const native = plugin()
    native.binaryReadStart.mockRejectedValueOnce(new Error("sumiu")).mockRejectedValueOnce(new Error("sumiu")).mockResolvedValue({ id: 3, size: 1 })
    native.binaryReadChunk.mockResolvedValue({ base64: toBase64(new Uint8Array([7])) })
    const binary = createAndroidBinary(native)
    const results = await Promise.allSettled([binary.read("a"), binary.read("b"), binary.read("c")])
    expect(results.map(r => r.status)).toEqual(["rejected", "rejected", "fulfilled"])
  })
  it("grava em pedaços o que chega aos poucos, sem juntar o arquivo (U109)", async () => {
    const native = plugin(), api = createAndroidBinary(native)
    const parts = [new Uint8Array(BINARY_CHUNK + 5).fill(1), new Uint8Array(10).fill(2)]
    await api.writeStream("Anexos/a.bin", BINARY_CHUNK + 15, null, async write => { for (const part of parts) await write(part) })
    expect(native.binaryWriteStart).toHaveBeenCalledWith({ path: "Anexos/a.bin", size: BINARY_CHUNK + 15, expected: null, managed: false })
    expect(native.binaryWriteChunk.mock.calls.map(([options]) => Buffer.from(options.base64, "base64").length)).toEqual([BINARY_CHUNK, 5, 10])
    expect(native.binaryWriteFinish).toHaveBeenCalledWith({ id: 9 })
  })
  it("descarta a gravação em pedaços quando o arquivo chega incompleto ou falha no meio (U109)", async () => {
    const native = plugin(), api = createAndroidBinary(native)
    await expect(api.writeStream("a.bin", 10, undefined, async write => { await write(new Uint8Array(4)) })).rejects.toThrow("incompleto")
    await expect(api.writeStream("a.bin", 10, undefined, async () => { throw new Error("CRC") })).rejects.toThrow("CRC")
    expect(native.binaryAbort).toHaveBeenCalledTimes(2)
    expect(native.binaryWriteFinish).not.toHaveBeenCalled()
  })
})
