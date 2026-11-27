import type { CollaborationCommand, RoomCollaboration } from "./collaboration"
import type { HostHandler } from "./host-services"
import type { AssetPath } from "./scene"
import type { PlayerRuler } from "./player"
import type { CameraRules } from "./player-camera"
import type { AudioState } from "./audio"
import type { AssetKind, DocumentType, NewWorldInput, WorldDocument, WorldSummary } from "./world"
import type { MasterState } from "./master"

/** Canais entre a interface da mesa e o processo principal (prefixo `vtt:`, ao lado dos `vault:` do cofre). */
export const IPC = {
  listWorlds: "vtt:worlds-list",
  collaborationState: "vtt:collaboration-state",
  collaborationCommand: "vtt:collaboration-command",
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
  playerJoin: "vtt:player-join",
  playerSetScene: "vtt:player-set-scene",
  playerRuler: "vtt:player-ruler",
  playerPullCamera: "vtt:player-pull-camera",
  playerSetBars: "vtt:player-set-bars",
  playerPublicLink: "vtt:player-public-link",
  playerTestPublicLink: "vtt:player-test-public-link",
  playerDownloadCloudflared: "vtt:player-download-cloudflared",
  playerSetAudio: "vtt:player-set-audio",
  playerSetMoves: "vtt:player-set-moves",
  playerAddSeat: "vtt:player-add-seat",
  playerRemoveSeat: "vtt:player-remove-seat",
  playerReconnect: "vtt:player-reconnect",
  visionResetExploration: "vtt:vision-reset-exploration",
  audioState: "vtt:audio-state",
  audioStateChanged: "vtt:audio-state-changed",
  audioPlayPlaylist: "vtt:audio-play-playlist",
  audioStopPlaylist: "vtt:audio-stop-playlist",
  audioPlayTrack: "vtt:audio-play-track",
  audioStopTrack: "vtt:audio-stop-track",
  audioStopAll: "vtt:audio-stop-all",
  audioEnded: "vtt:audio-ended",
  renameWorld: "vtt:worlds-rename",
  deleteWorld: "vtt:worlds-delete",
  worldsCover: "vtt:worlds-cover",
  playerSetCamera: "vtt:player-set-camera",
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
  /** Tokens com “Controlado por” neste assento (U78); mais de um gera aviso no painel. */
  tokens?: number
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

/**
 * Queda da sala (U89): o túnel do link público, o endereço do computador na rede ou o próprio servidor.
 * `reconnecting`: o app está reabrindo sozinho; `restored`: voltou, com o link que o painel mostra (o público muda a
 * cada túnel); `failed`: precisa do mestre (“Reconectar”).
 */
export interface PlayerDrop {
  kind: "tunnel" | "address" | "server"
  status: "reconnecting" | "restored" | "failed"
  at: number
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
  /** A última queda da sala, até a sala ser desligada; `null` sem queda. */
  drop: PlayerDrop | null
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
  /** 1.9: regras da câmera dos jogadores. */
  camera: CameraRules
}

/** API da mesa para a interface (no desktop, `window.runasCodex.vtt`; no navegador, uma prévia em memória). */
export interface VttApi {
  collaboration?: { state():Promise<RoomCollaboration>; command(command:CollaborationCommand):Promise<RoomCollaboration> }
  listWorlds(): Promise<WorldSummary[]>
  createWorld(input: NewWorldInput): Promise<WorldSummary>
  openWorld(id: string): Promise<WorldSummary>
  closeWorld(): Promise<void>
  /** Troca o nome da mesa (o manifesto; a pasta fica). */
  renameWorld(id: string, title: string): Promise<WorldSummary>
  /** Manda a pasta da mesa para a lixeira do cofre; recusa com a sala dessa mesa ligada. */
  deleteWorld(id: string): Promise<void>
  /** Troca ou remove a capa da mesa; ausente no mestre remoto. */
  setWorldCover?(id: string, cover: string | undefined): Promise<WorldSummary>
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
    /** U89: mais um assento com a sala aberta (no fim da lista, com código novo). */
    addSeat(): Promise<PlayerState>
    /** U89: tira o último assento e desconecta só o jogador dele. */
    removeSeat(): Promise<PlayerState>
    /** U89: reabre a sala na mesma porta, com a mesma chave e os mesmos códigos (e o link público, se havia). */
    reconnect(): Promise<PlayerState>
    openWindow(): Promise<void>
    /** Entrar Sala: abre a página da sala de outra pessoa (o link que o mestre mandou). */
    join(url: string): Promise<void>
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
    /** 1.9: câmera dos jogadores presa ao token e afastamento máximo. */
    setCamera(rules: CameraRules): Promise<void>
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
    /** Endereço local de um asset; o adaptador Android resolve disco e SAF. */
    url?(path: AssetPath): string | null
    /** Copia um arquivo para a mesa aberta e devolve o caminho do asset. */
    import(kind: AssetKind, fileName: string, bytes: Uint8Array): Promise<AssetPath>
  }
  /**
   * U47: o app da sala atende os pedidos do cofre do mestre remoto (biblioteca, salvar sessão). Só no aparelho que
   * hospeda a sala; devolve a função que para de atender.
   */
  serveHost?(handler: HostHandler): () => void
  /** U47: o mestre remoto pede um serviço do cofre ao aparelho da sala. Só na mesa do mestre remoto. */
  callHost?(channel: string, args: unknown[]): Promise<unknown>
  /** Mestre remoto (ADR 0016): só existe na mesa do computador da sala. */
  master?: {
    state(): Promise<MasterState>
    onState(listener: (state: MasterState) => void): () => void
    /** Chave nova: o aparelho conectado cai na hora e o link antigo para de valer. */
    rotate(): Promise<MasterState>
    disconnect(): Promise<MasterState>
  }
}
