import { afterEach, describe, expect, it, vi } from "vitest"
import { newDocumentId } from "./document-id"

afterEach(() => vi.unstubAllGlobals())
describe("identificadores da mesa pelo navegador", () => {
  it("cria documentos com o Web Crypto disponível em HTTP na rede local, sem randomUUID", () => {
    const original = crypto
    vi.stubGlobal("crypto", { getRandomValues: original.getRandomValues.bind(original) })
    expect(crypto.randomUUID).toBeUndefined()
    expect(newDocumentId()).toMatch(/^[a-f0-9]{32}$/)
  })
})
