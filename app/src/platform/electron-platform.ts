import type { RunasCodexBridge } from "./bridge"
import type { Platform } from "./platform"

/** Plataforma do app desktop: tudo passa pela ponte `window.runasCodex` do preload. */
export function createElectronPlatform(bridge: RunasCodexBridge): Platform {
  return {
    kind: "electron",
    vault: () => bridge.vault.current(),
    chooseVault: () => bridge.vault.choose(),
    listVault: (prefix) => bridge.vault.list(prefix),
    readTexts: (paths) => bridge.vault.read(paths),
    writeText: (path, content, expectedMtime) => bridge.vault.write(path, content, expectedMtime),
    async notify(title, body) {
      new Notification(title, { body })
    },
    async hostRoom() {
      throw new Error("Hospedar sala chega com o VTT no desktop (etapa 4).")
    },
    async stopRoom() {},
  }
}
