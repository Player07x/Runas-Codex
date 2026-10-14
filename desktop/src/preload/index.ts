import { contextBridge, ipcRenderer } from "electron"
import { IPC, type RunasCodexBridge, type VaultChange } from "../shared/ipc"
import { IPC as VTT, type DocumentChange, type PlayerState } from "../../../app/src/vtt/shared/ipc"
import type { AudioState } from "../../../app/src/vtt/shared/audio"

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
    openFile: (path) => invoke(IPC.vaultOpenFile, path),
    installSnippet: (css) => invoke(IPC.vaultInstallSnippet, css),
  },
  agenda: {
    schedule: (reminders) => invoke(IPC.agendaSchedule, reminders),
    onOpen: (listener) => {
      const handler = (_event: unknown, path: string) => listener(path)
      ipcRenderer.on(IPC.agendaOpen, handler)
      return () => {
        ipcRenderer.removeListener(IPC.agendaOpen, handler)
      }
    },
  },
  saveFile: (name, content) => invoke(IPC.saveFile, name, content),
  vtt: {
    listWorlds: () => invoke(VTT.listWorlds),
    createWorld: (input) => invoke(VTT.createWorld, input),
    openWorld: (id) => invoke(VTT.openWorld, id),
    closeWorld: () => invoke(VTT.closeWorld),
    documents: {
      list: (type, parentId) => invoke(VTT.documentsList, type, parentId),
      put: (input) => invoke(VTT.documentsPut, input),
      remove: (id) => invoke(VTT.documentsDelete, id),
      clearLog: () => invoke(VTT.documentsClearLog),
      onChange: (listener) => {
        const handler = (_event: unknown, change: DocumentChange) => listener(change)
        ipcRenderer.on(VTT.documentsChanged, handler)
        return () => {
          ipcRenderer.removeListener(VTT.documentsChanged, handler)
        }
      },
    },
    table: {
      report: (state) => invoke(VTT.tableReport, state),
    },
    player: {
      state: () => invoke(VTT.playerState),
      onState: (listener) => {
        const handler = (_event: unknown, state: PlayerState) => listener(state)
        ipcRenderer.on(VTT.playerStateChanged, handler)
        return () => {
          ipcRenderer.removeListener(VTT.playerStateChanged, handler)
        }
      },
      displays: () => invoke(VTT.playerDisplays),
      start: (port, seatCount) => invoke(VTT.playerStart, port, seatCount),
      stop: () => invoke(VTT.playerStop),
      rotateSeatCode: (slotId) => invoke(VTT.playerRotateSeatCode, slotId),
      clearSeat: (slotId) => invoke(VTT.playerClearSeat, slotId),
      openWindow: () => invoke(VTT.playerOpenWindow),
      join: (url) => invoke(VTT.playerJoin, url),
      setScene: (sceneId) => invoke(VTT.playerSetScene, sceneId),
      ruler: (ruler) => invoke(VTT.playerRuler, ruler),
      pullCamera: () => invoke(VTT.playerPullCamera),
      setBars: (bars) => invoke(VTT.playerSetBars, bars),
      setAudio: (enabled) => invoke(VTT.playerSetAudio, enabled),
      setMoves: (enabled) => invoke(VTT.playerSetMoves, enabled),
      publicLink: () => invoke(VTT.playerPublicLink),
      testPublicLink: () => invoke(VTT.playerTestPublicLink),
      downloadCloudflared: () => invoke(VTT.playerDownloadCloudflared),
    },
    audio: {
      state: () => invoke(VTT.audioState),
      onState: (listener) => {
        const handler = (_event: unknown, state: AudioState) => listener(state)
        ipcRenderer.on(VTT.audioStateChanged, handler)
        return () => {
          ipcRenderer.removeListener(VTT.audioStateChanged, handler)
        }
      },
      playPlaylist: (id) => invoke(VTT.audioPlayPlaylist, id),
      stopPlaylist: (id) => invoke(VTT.audioStopPlaylist, id),
      playTrack: (id) => invoke(VTT.audioPlayTrack, id),
      stopTrack: (id) => invoke(VTT.audioStopTrack, id),
      stopAll: () => invoke(VTT.audioStopAll),
      ended: (key) => invoke(VTT.audioEnded, key),
    },
    vision: {
      resetExploration: (sceneId) => invoke(VTT.visionResetExploration, sceneId),
    },
    assets: {
      import: (kind, fileName, bytes) => invoke(VTT.assetsImport, kind, fileName, bytes),
    },
  },
}

contextBridge.exposeInMainWorld("runasCodex", bridge)
