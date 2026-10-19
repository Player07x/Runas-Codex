import { VAULT_FILE_SCHEME, type RunasCodexBridge } from "./bridge"
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
    fileUrl: (path) => `${VAULT_FILE_SCHEME}://cofre/${path.split("/").map(encodeURIComponent).join("/")}`,
    openFile: (path) => vault.openFile(path),
    installSnippet: (css) => vault.installSnippet(css),
    async notify(title, body) {
      new Notification(title, { body })
    },
    async scheduleReminders(reminders) {
      await bridge.agenda.schedule(reminders.map((r) => ({ id: r.id, at: r.at.getTime(), title: r.title, body: r.body, path: r.path })))
    },
    onReminderOpen: (listener) => bridge.agenda.onOpen(listener),
    saveFile: (name, content) => bridge.saveFile(name, content),
    async hostRoom() {
      throw new Error("Hospedar sala chega com o VTT no desktop (etapa 4).")
    },
    async stopRoom() {},
    printDocument: () => window.print(),
    readBinary: (path) => vault.readBinary(path),
    writeBinary: (path, bytes, expected) => vault.writeBinary(path, bytes, expected),
    saveBytes: (name, bytes) => bridge.saveBytes(name, bytes),
    exportPdf: (name) => bridge.exportPdf(name),
    appVersion: () => bridge.updates.version(),
    checkUpdate: () => bridge.updates.check(),
    async installUpdate(onProgress) {
      const stop = bridge.updates.onProgress(({ received, total }) => onProgress(received, total))
      try {
        return await bridge.updates.install()
      } finally {
        stop()
      }
    },
    onQuickCapture: (listener) => bridge.onQuickCapture(listener),
    openWindow: (route) => bridge.openWindow(route),
    listTrash: () => vault.listTrash(),
    restoreTrash: (path, target) => vault.restoreTrash(path, target),
    setTrayEnabled: enabled=>bridge.setTrayEnabled?bridge.setTrayEnabled(enabled):Promise.resolve(false),
    listTransferFiles: includeWorlds => vault.listTransferFiles ? vault.listTransferFiles(includeWorlds) : vault.list(),
    async writeManagedTransfer(path, bytes, expected) {
      if (!vault.writeManagedTransfer) throw new Error("Atualize o app para importar os dados internos da mesa.")
      return vault.writeManagedTransfer(path, bytes, expected)
    },
  }
}
