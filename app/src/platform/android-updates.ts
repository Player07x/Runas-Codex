import { registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import { parseReleases, pickUpdate, type UpdateInfo, type UpdateInstallResult } from "../core/updates"

export interface AndroidUpdatesPlugin {
  check(): Promise<{ current: string; releases: unknown }>
  install(options: { tag: string }): Promise<{ result: UpdateInstallResult }>
  addListener(event: "progress", listener: (data: { received: number; total: number }) => void): Promise<PluginListenerHandle>
}
const native = registerPlugin<AndroidUpdatesPlugin>("RunasUpdates")

/** Endereços e APKs ficam sob controle do plugin. A interface só confirma a tag encontrada na consulta. */
export function createAndroidUpdates(plugin: AndroidUpdatesPlugin = native) {
  let found: UpdateInfo | null = null
  return {
    async checkUpdate(): Promise<UpdateInfo> {
      found = null
      const result = await plugin.check()
      found = pickUpdate(result.current, parseReleases(result.releases), "android")
      return found
    },
    async installUpdate(onProgress: (received: number, total: number) => void): Promise<UpdateInstallResult> {
      if (!found?.newer || !found.asset || !found.latest || !found.checksums) throw new Error("Verifique novamente: não há APK novo com soma SHA-256 disponível.")
      const handle = await plugin.addListener("progress", ({ received, total }) => onProgress(received, total))
      try { return (await plugin.install({ tag: found.latest.tag })).result }
      finally { await handle.remove() }
    },
  }
}
