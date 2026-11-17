import { describe, expect, it, vi } from "vitest"
import { createAndroidBinary, type AndroidBinaryPlugin } from "./android-binary"
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
})
