import { beforeEach, describe, expect, it, vi } from "vitest"
import type { VaultChange } from "./platform"

const native = vi.hoisted(() => ({
  current: vi.fn(), list: vi.fn(), writeBinary: vi.fn(), trash: vi.fn(), addListener: vi.fn(),
}))
vi.mock("@capacitor/core", () => ({
  registerPlugin: () => native,
  Capacitor: { convertFileSrc: (uri: string) => uri.replace("content://", "https://localhost/_capacitor_content_/").replace(/^\/storage/, "https://localhost/_capacitor_file_/storage") },
}))
vi.mock("./reminders", () => ({ onAndroidReminderOpen: vi.fn(), scheduleOnAndroid: vi.fn() }))
import { createCapacitorPlatform } from "./capacitor-platform"

describe("anexos do cofre Android", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    native.current.mockResolvedValue({ vault: { name: "Cofre", path: "content://local/tree/1", mode: "saf", readOnly: false } })
    native.list.mockResolvedValue({ entries: [{ path: "Anexos/a.png", mtime: 1, size: 3, uri: "content://local/document/2" }] })
    native.trash.mockResolvedValue(undefined)
  })

  it("carrega a URI devolvida pelo provedor na origem local do Capacitor", async () => {
    const platform = createCapacitorPlatform()
    await platform.vault()
    expect(platform.fileUrl("Anexos/a.png")).toBeNull()
    await platform.listVault()
    expect(platform.fileUrl("Anexos/a.png")).toBe("https://localhost/_capacitor_content_/local/document/2")
    expect(platform.fileUrl("../fora.png")).toBeNull()
  })

  it("atualiza a URI quando a gravação troca o documento e conserva a versão esperada", async () => {
    const platform = createCapacitorPlatform()
    await platform.vault(); await platform.listVault()
    native.writeBinary.mockResolvedValue({ path: "Anexos/a.png", mtime: 2, size: 3, uri: "content://local/document/3" })
    await platform.writeBinary("Anexos/a.png", new Uint8Array([1, 2, 3]), { path: "Anexos/a.png", mtime: 1, size: 3 })
    expect(native.writeBinary).toHaveBeenCalledWith({ path: "Anexos/a.png", base64: "AQID", expected: { mtime: 1, size: 3 } })
    expect(platform.fileUrl("Anexos/a.png")).toBe("https://localhost/_capacitor_content_/local/document/3")
    await platform.trash("Anexos")
    expect(platform.fileUrl("Anexos/a.png")).toBeNull()
  })

  it("acompanha as URIs na releitura ao voltar ao app e limpa ao trocar de cofre", async () => {
    let changes: ((data: { changes: VaultChange[] }) => void) | undefined
    native.addListener.mockImplementation((_event: string, listener: typeof changes) => {
      changes = listener
      return Promise.resolve({ remove: vi.fn() })
    })
    const platform = createCapacitorPlatform()
    await platform.vault(); await platform.listVault()
    const listener = vi.fn()
    platform.watch(listener)
    const entry = { path: "Anexos/a.png", mtime: 2, size: 4, uri: "content://local/document/4" }
    changes?.({ changes: [{ type: "changed", entry }] })
    expect(platform.fileUrl("Anexos/a.png")).toContain("/document/4")
    changes?.({ changes: [{ type: "deleted", path: "Anexos/a.png" }] })
    expect(platform.fileUrl("Anexos/a.png")).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)
    native.current.mockResolvedValue({ vault: { name: "Outro", path: "content://local/tree/5", mode: "saf", readOnly: true } })
    await platform.vault()
    expect(platform.fileUrl("Anexos/a.png")).toBeNull()
  })

  it("mantém o endereço direto no disco para cofres com acesso a todos os arquivos", async () => {
    native.current.mockResolvedValue({ vault: { name: "Cofre", path: "/storage/emulated/0/Cofre", mode: "direct", readOnly: false } })
    const platform = createCapacitorPlatform()
    await platform.vault()
    expect(platform.fileUrl("a.png")).toBe("https://localhost/_capacitor_file_/storage/emulated/0/Cofre/a.png")
  })
})
