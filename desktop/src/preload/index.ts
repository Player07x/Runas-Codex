import { contextBridge, ipcRenderer } from "electron"
import { IPC, type RunasCodexBridge } from "../shared/ipc"

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
    list: (prefix) => invoke(IPC.vaultList, prefix),
    read: (paths) => invoke(IPC.vaultRead, paths),
    write: (path, content, expectedMtime) => invoke(IPC.vaultWrite, path, content, expectedMtime),
  },
}

contextBridge.exposeInMainWorld("runasCodex", bridge)
