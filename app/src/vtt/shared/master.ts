import { IPC } from "./ipc"
import type { WorldSummary } from "./world"

/**
 * Mestre remoto (ADR 0016): a sala aberta no computador serve também a mesa do mestre, em `/master?m=<chave>`, para o
 * celular ou o tablet do mestre controlar a mesa pelo navegador. O computador continua sendo a autoridade: cada ação do
 * celular chama o mesmo canal que a mesa local chama por IPC, e as mudanças voltam por eventos.
 */

/** Canais que o celular do mestre pode chamar. Abrir e fechar mesa, ligar e desligar a sala ficam no computador. */
export const MASTER_CHANNELS: readonly string[] = [
  IPC.documentsList,
  IPC.documentsPut,
  IPC.documentsDelete,
  IPC.documentsClearLog,
  IPC.tableReport,
  IPC.audioState,
  IPC.audioPlayPlaylist,
  IPC.audioStopPlaylist,
  IPC.audioPlayTrack,
  IPC.audioStopTrack,
  IPC.audioStopAll,
  IPC.visionResetExploration,
  IPC.playerState,
  IPC.playerSetScene,
  IPC.playerRuler,
  IPC.playerPullCamera,
  IPC.playerSetBars,
  IPC.playerSetAudio,
  IPC.playerSetMoves,
  IPC.playerRotateSeatCode,
  IPC.playerClearSeat,
]

/** Eventos que o computador repassa ao celular do mestre. */
export const MASTER_EVENTS: readonly string[] = [IPC.documentsChanged, IPC.playerStateChanged, IPC.audioStateChanged]

/** Canais do computador para administrar o mestre remoto (só a mesa local). */
export const MASTER_IPC = {
  state: "vtt:master-state",
  stateChanged: "vtt:master-state-changed",
  rotate: "vtt:master-rotate",
  disconnect: "vtt:master-disconnect",
} as const

export interface MasterState {
  /** Chave do mestre desta sessão; `null` com a sala desligada. */
  key: string | null
  /** Um celular está conectado como mestre agora. */
  connected: boolean
}

/** Primeira mensagem do canal de eventos: a sessão (que vai em toda chamada) e a mesa aberta no computador. */
export interface MasterHello {
  session: string
  world: WorldSummary
}

/** Endereço da mesa do mestre a partir do link da sala (`http://192.168.0.12:30000/?k=…`). */
export function masterLink(roomUrl: string, key: string): string {
  const url = new URL(roomUrl)
  return `${url.origin}/master?m=${encodeURIComponent(key)}`
}

/** É um link de mestre (para avisar no Entrar Sala)? */
export function isMasterLink(value: string): boolean {
  try {
    const url = new URL(value)
    return /^\/master\/?$/.test(url.pathname) && url.searchParams.has("m")
  } catch {
    return false
  }
}
