import { describe, expect, it, vi } from "vitest"
import { createAndroidUpdates, type AndroidUpdatesPlugin } from "./android-updates"
function fixture() {
  const remove = vi.fn(async () => {})
  const plugin: AndroidUpdatesPlugin = {
    check: vi.fn(async () => ({ current: "0.1.0-beta.13", releases: [{ tag_name: "v0.1.0-beta.14", prerelease: true, assets: [{ name: "Runas-Codex-0.1.0-beta.14-android.apk", browser_download_url: "https://github.com/Player07x/Runas-Codex/releases/download/v0.1.0-beta.14/apk", size: 10 }, { name: "SHA256SUMS.txt", browser_download_url: "https://github.com/Player07x/Runas-Codex/releases/download/v0.1.0-beta.14/SHA256SUMS.txt" }] }] })),
    install: vi.fn(async () => ({ result: "pacote-aberto" as const })),
    addListener: vi.fn(async (_event, callback) => { callback({ received: 10, total: 10 }); return { remove } }),
  }
  return { plugin, remove, updates: createAndroidUpdates(plugin) }
}
it("exige consulta e passa somente a tag ao nativo, com andamento e limpeza", async () => {
  const { plugin, remove, updates } = fixture(), progress = vi.fn()
  await expect(updates.installUpdate(progress)).rejects.toThrow("Verifique")
  await updates.checkUpdate()
  expect(await updates.installUpdate(progress)).toBe("pacote-aberto")
  expect(plugin.install).toHaveBeenCalledWith({ tag: "v0.1.0-beta.14" })
  expect(progress).toHaveBeenCalledWith(10, 10)
  expect(remove).toHaveBeenCalledOnce()
})
describe("falhas de atualização Android", () => {
  it("não reutiliza a consulta antiga depois de uma falha de rede", async () => {
    const { plugin, updates } = fixture()
    await updates.checkUpdate()
    vi.mocked(plugin.check).mockRejectedValueOnce(new Error("sem rede"))
    await expect(updates.checkUpdate()).rejects.toThrow("sem rede")
    await expect(updates.installUpdate(vi.fn())).rejects.toThrow("Verifique")
  })
  it("retira o observador quando o usuário recusa a autorização", async () => {
    const { plugin, remove, updates } = fixture()
    await updates.checkUpdate()
    vi.mocked(plugin.install).mockRejectedValueOnce(new Error("não autorizada"))
    await expect(updates.installUpdate(vi.fn())).rejects.toThrow("não autorizada")
    expect(remove).toHaveBeenCalledOnce()
  })
})
