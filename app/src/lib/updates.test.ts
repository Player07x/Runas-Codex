import { describe, expect, it, vi } from "vitest"
import { AUTO_DELAY_MS, AUTO_KEY, MEMORY_KEY, createUpdateStore, type UpdatePlatform } from "./updates"
import type { UpdateInfo } from "../core/updates"

const release = { tag: "v1.5.0", version: "1.5.0", prerelease: false, notes: "", url: "", publishedAt: "", assets: [] }
const found: UpdateInfo = {
  current: "1.4.0",
  latest: release,
  newer: true,
  asset: { name: "Runas-Codex-Setup-1.5.0.exe", size: 10, url: "https://github.com/x" },
  checksums: { name: "SHA256SUMS.txt", size: 1, url: "https://github.com/y" },
}

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => void data.set(key, value) }
}

function fakePlatform(info: UpdateInfo = found) {
  return {
    appVersion: vi.fn(async () => "1.4.0"),
    checkUpdate: vi.fn(async () => info),
    installUpdate: vi.fn(async (onProgress: (received: number, total: number) => void) => {
      onProgress(5, 10)
      onProgress(10, 10)
      return "reiniciar" as const
    }),
  } satisfies UpdatePlatform
}

const today = () => new Date(2026, 10, 17, 9)
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("estado das atualizações", () => {
  it("consulta sozinho ao abrir, uma vez por dia, depois de esperar o app abrir", async () => {
    const storage = memoryStorage()
    const timers: [() => void, number][] = []
    const store = createUpdateStore({ storage, now: today, schedule: (run, ms) => void timers.push([run, ms]), online: () => true })
    const platform = fakePlatform()
    store.start(platform)
    store.start(platform)
    await flushPromises()
    expect(timers.map(([, ms]) => ms)).toEqual([AUTO_DELAY_MS])
    timers[0]![0]()
    await flushPromises()
    expect(platform.checkUpdate).toHaveBeenCalledTimes(1)
    expect(store.get().available).toBe("1.5.0")
    expect(JSON.parse(storage.data.get(MEMORY_KEY)!)).toEqual({ checkedOn: "2026-11-17", latest: "1.5.0" })

    // No mesmo dia, outra abertura não consulta, mas o aviso continua (lembrado deste aparelho).
    const again = createUpdateStore({ storage, now: today, schedule: (run, ms) => void timers.push([run, ms]), online: () => true })
    const second = fakePlatform()
    again.start(second)
    await flushPromises()
    expect(timers).toHaveLength(1)
    expect(second.checkUpdate).not.toHaveBeenCalled()
    expect(again.get().available).toBe("1.5.0")
  })

  it("não consulta sozinho com a opção desligada, sem internet ou sem atualização pelo app", async () => {
    const schedule = vi.fn()
    const off = createUpdateStore({ storage: memoryStorage({ [AUTO_KEY]: "0" }), now: today, schedule, online: () => true })
    off.start(fakePlatform())
    const offline = createUpdateStore({ storage: memoryStorage(), now: today, schedule, online: () => false })
    offline.start(fakePlatform())
    const browser = createUpdateStore({ storage: memoryStorage(), now: today, schedule, online: () => true })
    browser.start({ appVersion: async () => "1.4.0" })
    await flushPromises()
    expect(schedule).not.toHaveBeenCalled()
    expect(off.get().auto).toBe(false)
  })

  it("a consulta automática que falha não mostra erro e tenta de novo na próxima abertura", async () => {
    const storage = memoryStorage()
    const store = createUpdateStore({ storage, now: today, schedule: (run) => run(), online: () => true })
    const platform = { ...fakePlatform(), checkUpdate: vi.fn(async (): Promise<UpdateInfo> => { throw new Error("sem rede") }) }
    store.start(platform)
    await flushPromises()
    expect(platform.checkUpdate).toHaveBeenCalledTimes(1)
    expect(store.get().error).toBe("")
    expect(storage.data.has(MEMORY_KEY)).toBe(false)
    await store.check(platform)
    expect(store.get().error).toBe("sem rede")
  })

  it("“Atualizar para” consulta de novo se preciso, grava as notas antes e mostra o progresso", async () => {
    const order: string[] = []
    const storage = memoryStorage({ [MEMORY_KEY]: JSON.stringify({ checkedOn: "2026-11-17", latest: "1.5.0" }) })
    const store = createUpdateStore({ storage, now: today, flush: async () => void order.push("gravar"), schedule: () => {}, online: () => true })
    const platform = fakePlatform()
    platform.installUpdate.mockImplementation(async (onProgress) => {
      order.push("instalar")
      onProgress(5, 10)
      expect(store.get().phase).toBe("baixando")
      expect(store.get().progress).toEqual({ received: 5, total: 10 })
      return "reiniciar"
    })
    await store.loadVersion(platform)
    expect(store.get().available).toBe("1.5.0")
    await expect(store.install(platform)).resolves.toBe("reiniciar")
    expect(platform.checkUpdate).toHaveBeenCalledTimes(1)
    expect(order).toEqual(["gravar", "instalar"])
    expect(store.get().phase).toBe("parado")
  })

  it("não instala sem instalador conferível e não começa duas instalações", async () => {
    const store = createUpdateStore({ storage: memoryStorage(), now: today, schedule: () => {}, online: () => true })
    const withoutSums = fakePlatform({ ...found, checksums: null })
    await expect(store.install(withoutSums)).rejects.toThrow("instalador conferível")
    expect(withoutSums.installUpdate).not.toHaveBeenCalled()

    const platform = fakePlatform()
    let finish: (value: "reiniciar") => void = () => {}
    platform.installUpdate.mockImplementation(() => new Promise((resolve) => { finish = resolve }))
    const first = store.install(platform)
    await flushPromises()
    await expect(store.install(platform)).resolves.toBeNull()
    finish("reiniciar")
    await expect(first).resolves.toBe("reiniciar")
    expect(platform.installUpdate).toHaveBeenCalledTimes(1)
  })

  it("um erro do download volta a liberar o botão e fica visível", async () => {
    const store = createUpdateStore({ storage: memoryStorage(), now: today, schedule: () => {}, online: () => true })
    const platform = fakePlatform()
    platform.installUpdate.mockRejectedValue(new Error("A soma SHA-256 não bate."))
    await expect(store.install(platform)).rejects.toThrow("SHA-256")
    expect(store.get()).toMatchObject({ phase: "parado", error: "A soma SHA-256 não bate." })
  })

  it("guarda a escolha de consultar sozinho neste aparelho", () => {
    const storage = memoryStorage()
    const store = createUpdateStore({ storage })
    expect(store.get().auto).toBe(true)
    store.setAuto(false)
    expect(storage.data.get(AUTO_KEY)).toBe("0")
    expect(store.get().auto).toBe(false)
  })
})
