import type { RunasCodexBridge } from "./bridge"
import type { Platform } from "./platform"

/** Plataforma do app desktop: tudo passa pela ponte `window.runasCodex` do preload. */
export function createElectronPlatform(bridge: RunasCodexBridge): Platform {
  const { vault } = bridge
  return {
    kind: "electron",
    vault: () => vault.current(),
    chooseVault: () => vault.choose(),
    createVault: () => vault.create(),
    setWritable: (writable) => vault.setWritable(writable),
    listVault: (prefix) => vault.list(prefix),
    readTexts: (paths) => vault.read(paths),
    writeText: (path, content, expected) => vault.write(path, content, expected),
    createFolder: (path) => vault.createFolder(path),
    rename: (from, to) => vault.rename(from, to),
    trash: (path) => vault.trash(path),
    watch: (listener) => vault.onChange(listener),
    backup: () => vault.backup(),
    listBackups: () => vault.listBackups(),
    revealBackups: () => vault.revealBackups(),
    async notify(title, body) {
      new Notification(title, { body })
    },
    async hostRoom() {
      throw new Error("Hospedar sala chega com o VTT no desktop (etapa 4).")
    },
    async stopRoom() {},
  }
}
