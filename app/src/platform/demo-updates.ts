import type { UpdateInfo } from "../core/updates"
import type { Platform } from "./platform"

/**
 * Só no exemplo do navegador aberto com `?atualizacao-exemplo`: finge uma versão nova para conferir o aviso de
 * atualização (U90) sem rede. Nada é baixado; o progresso é contado aos poucos.
 */
export function demoUpdates(search = typeof location === "undefined" ? "" : location.search): Pick<Platform, "appVersion" | "checkUpdate" | "installUpdate"> {
  if (!new URLSearchParams(search).has("atualizacao-exemplo")) return {}
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const total = 98 * 1024 * 1024
  const info: UpdateInfo = {
    current: "1.4.0",
    latest: { tag: "v1.5.0", version: "1.5.0", prerelease: false, notes: "Exemplo: nada é baixado no navegador.", url: "", publishedAt: "2026-11-20T12:00:00Z", assets: [] },
    newer: true,
    asset: { name: "Runas-Codex-Setup-1.5.0.exe", size: total, url: "" },
    checksums: { name: "SHA256SUMS.txt", size: 1, url: "" },
  }
  return {
    appVersion: async () => info.current,
    checkUpdate: async () => (await wait(400), info),
    installUpdate: async (onProgress) => {
      for (let step = 1; step <= 40; step++) {
        await wait(250)
        onProgress(Math.round((total * step) / 40), total)
      }
      return "instalador-aberto"
    },
  }
}
