import { contextBridge, ipcRenderer } from "electron"
import { IPC, type RunasCodexBridge, type VaultChange } from "../shared/ipc"

/** O Electron embrulha erros como "Error invoking remote method 'canal': Error: motivo"; a interface recebe só o motivo. */
function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(message.replace(/^Error invoking remote method '[^']+': (?:[A-Za-z]*Error: )?/, ""))
  })
}

const bridge: RunasCodexBridge = {
  platform: "electron",
  vault: {
    current: () => invoke(IPC.vaultCurrent),
    choose: () => invoke(IPC.vaultChoose),
    create: () => invoke(IPC.vaultCreate),
    setWritable: (writable) => invoke(IPC.vaultSetWritable, writable),
    list: (prefix) => invoke(IPC.vaultList, prefix),
    read: (paths) => invoke(IPC.vaultRead, paths),
    write: (path, content, expected) => invoke(IPC.vaultWrite, path, content, expected === undefined ? undefined : expected && { mtime: expected.mtime, size: expected.size }),
    createFolder: (path) => invoke(IPC.vaultCreateFolder, path),
    rename: (from, to) => invoke(IPC.vaultRename, from, to),
    trash: (path) => invoke(IPC.vaultTrash, path),
    onChange: (listener) => {
      const handler = (_event: unknown, changes: VaultChange[]) => listener(changes)
      ipcRenderer.on(IPC.vaultChanged, handler)
      return () => {
        ipcRenderer.removeListener(IPC.vaultChanged, handler)
      }
    },
    backup: () => invoke(IPC.vaultBackup),
    listBackups: () => invoke(IPC.vaultListBackups),
    revealBackups: () => invoke(IPC.vaultRevealBackups),
  },
}

contextBridge.exposeInMainWorld("runasCodex", bridge)
