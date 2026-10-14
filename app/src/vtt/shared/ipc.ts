import type { AssetPath } from "./scene"
import type { PlayerRuler } from "./player"
import type { AudioState } from "./audio"
import type { AssetKind, DocumentType, NewWorldInput, WorldDocument, WorldSummary } from "./world"

/** Canais entre a interface da mesa e o processo principal (prefixo `vtt:`, ao lado dos `vault:` do cofre). */
export const IPC = {
  listWorlds: "vtt:worlds-list",
  createWorld: "vtt:worlds-create",
  openWorld: "vtt:worlds-open",
  closeWorld: "vtt:worlds-close",
  documentsList: "vtt:documents-list",
  documentsPut: "vtt:documents-put",
  documentsDelete: "vtt:documents-delete",
  documentsClearLog: "vtt:documents-clear-log",
  documentsChanged: "vtt:documents-changed",
  assetsImport: "vtt:assets-import",
  tableReport: "vtt:table-report",
  playerState: "vtt:player-state",
  playerStateChanged: "vtt:player-state-changed",
  playerDisplays: "vtt:player-displays",
  playerStart: "vtt:player-start",
  playerStop: "vtt:player-stop",
  playerRotateSeatCode: "vtt:player-rotate-seat-code",
  playerClearSeat: "vtt:player-clear-seat",
  playerOpenWindow: "vtt:player-open-window",
  playerSetScene: "vtt:player-set-scene",
  playerRuler: "vtt:player-ruler",
  playerPullCamera: "vtt:player-pull-camera",
  playerSetBars: "vtt:player-set-bars",
  playerPublicLink: "vtt:player-public-link",
  playerTestPublicLink: "vtt:player-test-public-link",
  playerDownloadCloudflared: "vtt:player-download-cloudflared",
  playerSetAudio: "vtt:player-set-audio",
  playerSetMoves: "vtt:player-set-moves",
  visionResetExploration: "vtt:vision-reset-exploration",
  audioState: "vtt:audio-state",
  audioStateChanged: "vtt:audio-state-changed",
  audioPlayPlaylist: "vtt:audio-play-playlist",
  audioStopPlaylist: "vtt:audio-stop-playlist",
  audioPlayTrack: "vtt:audio-play-track",
  audioStopTrack: "vtt:audio-stop-track",
  audioStopAll: "vtt:audio-stop-all",
  audioEnded: "vtt:audio-ended",
} as const

/** O que a mesa informa ao processo principal (cena aberta, seleção e câmera, para a vista dos jogadores). */
export interface TableReport {
  sceneId: string | null
  selection: string[]
  center: { x: number; y: number } | null
  /** Escala da câmera da mesa, usada quando o mestre puxa a câmera dos jogadores. */
  zoom?: number | null
}

/** Esquema que serve os assets da mesa aberta à interface: `vtt-asset://world/<tipo>/<arquivo>`. */
export const ASSET_SCHEME = "vtt-asset"

export function assetUrl(path: AssetPath): string {
  return `${ASSET_SCHEME}://world/${path}`
}

export interface DocumentInput {
  id: string
  type: DocumentType
  parentId: string | null
  sort?: number
  data: unknown
}

export type DocumentChange =
  | { kind: "put"; document: WorldDocument }
  | { kind: "delete"; ids: string[] }

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface PlayerDisplay {
  id: string
  label: string
  bounds: Rect
  workArea: Rect
}

export type PlayerBarVisibility = "friendly" | "all" | "none"

export type PlayerSeatStatus = "available" | "connected" | "attached"

/** Assento efêmero da sessão; o código só aparece na criação/regeneração. */
export interface PlayerSeatState {
  slotId: string
  label: string
  code?: string
  status: PlayerSeatStatus
  tokenId: string | null
  revision: number
  lastSeenAt: number | null
}

/** Onde o túnel público se conectou à Cloudflare. */
export interface PlayerTunnelInfo {
  location: string | null
  protocol: string | null
}

/** Resultado do autoteste do link público, feito do computador do mestre. */
export interface LinkTestResult {
  ok: boolean
  /** Tempo de ida e volta até o servidor, passando pelo túnel. */
  ms: number
  status?: number
  error?: string
}

export interface PlayerState {
  enabled: boolean
  port: number
  key: string | null
  localUrl: string | null
  publicUrl: string | null
  /** Detalhes do túnel do link público; `null` sem link público. */
  tunnel: PlayerTunnelInfo | null
  /** O túnel caiu depois de criado: o link público anterior não funciona mais. */
  tunnelLost: boolean
  sceneId: string | null
  /** Tocar também o áudio na vista dos jogadores. */
  audio: boolean
  /** Os espectadores podem mover tokens "Jogador". */
  moves: boolean
  bars: PlayerBarVisibility
  spectators: number
  /** Jogadores autenticados conectados por cookie de assento. */
  players: number
  sessionId: string | null
  seats: PlayerSeatState[]
}

/** API da mesa para a interface (no desktop, `window.runasCodex.vtt`; no navegador, uma prévia em memória). */
export interface VttApi {
  listWorlds(): Promise<WorldSummary[]>
  createWorld(input: NewWorldInput): Promise<WorldSummary>
  openWorld(id: string): Promise<WorldSummary>
  closeWorld(): Promise<void>
  documents: {
    list(type: DocumentType, parentId?: string | null): Promise<WorldDocument[]>
    put(input: DocumentInput): Promise<WorldDocument>
    remove(id: string): Promise<void>
    /** Apaga o Registro inteiro; devolve quantas entradas saíram. */
    clearLog(): Promise<number>
    onChange(listener: (change: DocumentChange) => void): () => void
  }
  table: {
    report(state: TableReport): Promise<void>
  }
  player: {
    state(): Promise<PlayerState>
    onState(listener: (state: PlayerState) => void): () => void
    displays(): Promise<PlayerDisplay[]>
    start(port?: number, seatCount?: number): Promise<PlayerState>
    stop(): Promise<void>
    rotateSeatCode(slotId: string): Promise<PlayerState>
    clearSeat(slotId: string): Promise<PlayerState>
    openWindow(): Promise<void>
    setScene(sceneId: string | null): Promise<void>
    /** Régua da ferramenta Régua do mestre, repassada aos espectadores; `null` apaga. */
    ruler(ruler: PlayerRuler | null): Promise<void>
    pullCamera(): Promise<void>
    setBars(bars: PlayerBarVisibility): Promise<void>
    setAudio(enabled: boolean): Promise<void>
    setMoves(enabled: boolean): Promise<void>
    publicLink(): Promise<string>
    testPublicLink(): Promise<LinkTestResult>
    downloadCloudflared(): Promise<void>
  }
  audio: {
    state(): Promise<AudioState>
    onState(listener: (state: AudioState) => void): () => void
    playPlaylist(playlistId: string): Promise<void>
    stopPlaylist(playlistId: string): Promise<void>
    playTrack(trackId: string): Promise<void>
    stopTrack(trackId: string): Promise<void>
    stopAll(): Promise<void>
    /** A mesa avisa que uma faixa sem loop terminou. */
    ended(key: string): Promise<void>
  }
  vision: {
    /** Apaga as áreas exploradas da cena (a névoa volta a cobrir tudo). */
    resetExploration(sceneId: string): Promise<void>
  }
  assets: {
    /** Copia um arquivo para a mesa aberta e devolve o caminho do asset. */
    import(kind: AssetKind, fileName: string, bytes: Uint8Array): Promise<AssetPath>
  }
}
