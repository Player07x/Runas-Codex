import type { CollaborationCommand } from "./collaboration"
import { IPC, type DocumentInput, type TableReport, type VttApi } from "./ipc"
import { MASTER_CHANNELS } from "./master"
import type { PlayerRuler } from "./player"
import { isDocumentType } from "./world"

/** A ponte Android usa os mesmos métodos da mesa local, sem outra implementação das regras. */
export async function dispatchMaster(api: VttApi, channel: string, args: unknown[]): Promise<unknown> {
  if (!MASTER_CHANNELS.includes(channel)) throw new Error("Este comando exige o aparelho que hospeda a sala.")
  const text = (index = 0) => {
    const value = args[index]
    if (typeof value !== "string" || value.length > 256) throw new Error("Identificador inválido.")
    return value
  }
  const boolean = () => {
    if (typeof args[0] !== "boolean") throw new Error("Opção inválida.")
    return args[0]
  }
  switch (channel) {
    case IPC.documentsList: {
      const type = args[0]
      if (!isDocumentType(type)) throw new Error("Tipo de documento inválido.")
      return api.documents.list(type, args[1] === undefined || args[1] === null ? args[1] : text(1))
    }
    case IPC.documentsPut: {
      const input = args[0]
      if (!input || typeof input !== "object" || !("type" in input) || !isDocumentType(input.type)) throw new Error("Documento inválido.")
      return api.documents.put(input as DocumentInput)
    }
    case IPC.documentsDelete: return api.documents.remove(text())
    case IPC.documentsClearLog: return api.documents.clearLog()
    case IPC.tableReport: {
      const report = args[0] as TableReport | null
      if (!report || typeof report !== "object" || !Array.isArray(report.selection) || !report.selection.every(id => typeof id === "string") ||
        (report.sceneId !== null && typeof report.sceneId !== "string") ||
        (report.center !== null && (!report.center || !Number.isFinite(report.center.x) || !Number.isFinite(report.center.y))) ||
        (report.zoom != null && (!Number.isFinite(report.zoom) || report.zoom <= 0))) throw new Error("Vista da mesa inválida.")
      return api.table.report(report)
    }
    case IPC.audioState: return api.audio.state()
    case IPC.audioPlayPlaylist: return api.audio.playPlaylist(text())
    case IPC.audioStopPlaylist: return api.audio.stopPlaylist(text())
    case IPC.audioPlayTrack: return api.audio.playTrack(text())
    case IPC.audioStopTrack: return api.audio.stopTrack(text())
    case IPC.audioStopAll: return api.audio.stopAll()
    case IPC.visionResetExploration: return api.vision.resetExploration(text())
    case IPC.playerState: return api.player.state()
    case IPC.playerSetScene: return api.player.setScene(args[0] === null ? null : text())
    case IPC.playerRuler: return api.player.ruler(args[0] as PlayerRuler | null)
    case IPC.playerPullCamera: return api.player.pullCamera()
    case IPC.playerSetBars: {
      const bars = args[0]
      if (bars !== "friendly" && bars !== "all" && bars !== "none") throw new Error("Opção de barras inválida.")
      return api.player.setBars(bars)
    }
    case IPC.playerSetAudio: return api.player.setAudio(boolean())
    case IPC.playerSetMoves: return api.player.setMoves(boolean())
    case IPC.playerRotateSeatCode: return api.player.rotateSeatCode(text())
    case IPC.playerClearSeat: return api.player.clearSeat(text())
    case IPC.collaborationState: return api.collaboration?.state()
    case IPC.collaborationCommand: return api.collaboration?.command(args[0] as CollaborationCommand)
    default: throw new Error("Comando do mestre indisponível.")
  }
}
