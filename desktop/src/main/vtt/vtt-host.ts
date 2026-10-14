import { BrowserWindow, protocol, screen, type IpcMainInvokeEvent } from "electron"
import { ASSET_SCHEME, IPC, type DocumentChange, type DocumentInput, type PlayerState, type TableReport } from "../../../../app/src/vtt/shared/ipc"
import { ASSET_KINDS, type AssetKind, type DocumentType, type NewWorldInput } from "../../../../app/src/vtt/shared/world"
import { AudioService } from "./audio-service"
import { RegionService } from "./region-service"
import { VisionService } from "./vision-service"
import { assetResponse, importAsset } from "./world-assets"
import { clearLog, deleteDocument, listDocuments, putDocument } from "./world-documents"
import { WorldStore } from "./world-store"

/** Precisa rodar antes de `app.ready`: o esquema dos assets se comporta como https (o PixiJS exige para texturas). */
export function registerAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([{ scheme: ASSET_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }])
}

type Handle = (channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown) => void

const audioId = (value: unknown) => {
  if (typeof value !== "string" || !/^[A-Za-z0-9_:.-]{1,80}$/.test(value)) throw new Error("Identificador de áudio inválido.")
  return value
}

/**
 * A mesa (VTT) no processo principal: mesas do cofre, documentos, assets e os serviços de visão, áudio e regiões
 * (código do RunasVTT). Mesas só abrem num cofre com a gravação liberada: elas vivem em `<cofre>/.runas/mesas/`.
 */
export class VttHost {
  readonly store: WorldStore
  private readonly vision: VisionService
  private readonly audio: AudioService
  private readonly regions: RegionService
  private readonly listeners: ((change: DocumentChange) => void)[] = []
  private sceneId: string | null = null

  constructor(
    vaultRoot: () => string | null,
    private readonly vaultWritable: () => boolean,
  ) {
    this.store = new WorldStore(vaultRoot)
    const database = () => this.store.openWorld?.database ?? null
    this.vision = new VisionService(database)
    this.audio = new AudioService(database, () => this.sceneId, (state) => this.send(IPC.audioStateChanged, state))
    this.regions = new RegionService(database, (changes) => {
      for (const change of changes) this.broadcast(change)
    })
    // A visão (e a névoa explorada) é atualizada antes de a projeção ser reenviada; regiões por último, porque
    // teleporte e texto geram mudanças novas.
    this.listeners.push((change) => this.vision.onDocumentChange(change))
    this.listeners.push((change) => this.audio.onDocumentChange(change))
    this.listeners.push((change) => this.regions.onDocumentChange(change))
  }

  private send(channel: string, payload: unknown): void {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
  }

  private broadcast(change: DocumentChange): void {
    this.send(IPC.documentsChanged, change)
    for (const listener of this.listeners) listener(change)
  }

  private openWorld() {
    const world = this.store.openWorld
    if (!world) throw new Error("Nenhuma mesa aberta.")
    return world
  }

  private requireWritable(): void {
    if (!this.vaultWritable()) throw new Error("A mesa grava dentro do cofre (.runas/mesas): libere a gravação em Configurações › Cofre.")
  }

  private closeServices(): void {
    this.vision.clear()
    this.audio.closeWorld()
    this.regions.clear()
  }

  /** O cofre mudou (ou o app vai fechar): fecha a mesa aberta, gravando o que falta. */
  closeWorld(): void {
    this.closeServices()
    this.store.close()
  }

  /** Serve `vtt-asset://world/<tipo>/<arquivo>` a partir da mesa aberta; nada fora de `assets/` é acessível. */
  registerProtocol(): void {
    protocol.handle(ASSET_SCHEME, (request) => {
      const url = new URL(request.url)
      const world = this.store.openWorld
      if (!world || url.hostname !== "world") return new Response(null, { status: 404 })
      return assetResponse(world.summary.path, decodeURIComponent(url.pathname.slice(1)), request.headers.get("range"))
    })
  }

  register(handle: Handle): void {
    handle(IPC.listWorlds, () => this.store.list())
    handle(IPC.createWorld, (_event, input) => {
      this.requireWritable()
      return this.store.create(input as NewWorldInput)
    })
    handle(IPC.openWorld, async (_event, id) => {
      this.requireWritable()
      this.closeServices()
      return (await this.store.open(String(id))).summary
    })
    handle(IPC.closeWorld, () => this.closeWorld())

    handle(IPC.documentsList, (_event, type, parentId) => listDocuments(this.openWorld().database, type as DocumentType, parentId as string | null | undefined))
    handle(IPC.documentsPut, (_event, input) => {
      const { document, change } = putDocument(this.openWorld().database, input as DocumentInput)
      this.broadcast(change)
      return document
    })
    handle(IPC.documentsDelete, (_event, id) => {
      const change = deleteDocument(this.openWorld().database, String(id))
      if (change) this.broadcast(change)
    })
    handle(IPC.documentsClearLog, () => {
      const change = clearLog(this.openWorld().database)
      if (change) this.broadcast(change)
      return change ? change.ids.length : 0
    })
    handle(IPC.assetsImport, (_event, kind, fileName, bytes) => {
      if (!(ASSET_KINDS as readonly string[]).includes(kind as string)) throw new Error("Tipo de asset inválido.")
      if (!(bytes instanceof Uint8Array)) throw new Error("Arquivo inválido.")
      return importAsset(this.openWorld().summary.path, kind as AssetKind, String(fileName), bytes)
    })
    handle(IPC.tableReport, (_event, report) => {
      this.sceneId = (report as TableReport | null)?.sceneId ?? null
      this.audio.sceneChanged()
    })

    handle(IPC.audioState, () => this.audio.get())
    handle(IPC.audioPlayPlaylist, (_event, value) => this.audio.playPlaylist(audioId(value)))
    handle(IPC.audioStopPlaylist, (_event, value) => this.audio.stopPlaylist(audioId(value)))
    handle(IPC.audioPlayTrack, (_event, value) => this.audio.playTrack(audioId(value)))
    handle(IPC.audioStopTrack, (_event, value) => this.audio.stopTrack(audioId(value)))
    handle(IPC.audioStopAll, () => this.audio.stopAll())
    handle(IPC.audioEnded, (_event, value) => this.audio.ended(audioId(value)))
    handle(IPC.visionResetExploration, (_event, sceneId) => {
      if (typeof sceneId !== "string") throw new Error("Cena inválida.")
      this.vision.resetExploration(sceneId)
    })

    // Sala dos jogadores: chega no próximo bloco da etapa 4 (servidor, túnel e assentos).
    const offline: PlayerState = { enabled: false, port: 30000, key: null, localUrl: null, publicUrl: null, tunnel: null, tunnelLost: false, sceneId: null, audio: true, moves: true, bars: "friendly", spectators: 0, players: 0, sessionId: null, seats: [] }
    const soon = () => {
      throw new Error("A sala para os jogadores chega no próximo bloco da etapa 4.")
    }
    handle(IPC.playerState, () => offline)
    handle(IPC.playerDisplays, () => screen.getAllDisplays().map((display) => ({ id: String(display.id), label: `Tela ${display.id}`, bounds: display.bounds, workArea: display.workArea })))
    for (const channel of [IPC.playerStart, IPC.playerRotateSeatCode, IPC.playerClearSeat, IPC.playerOpenWindow, IPC.playerPublicLink, IPC.playerTestPublicLink, IPC.playerDownloadCloudflared]) handle(channel, soon)
    for (const channel of [IPC.playerStop, IPC.playerSetScene, IPC.playerRuler, IPC.playerPullCamera, IPC.playerSetBars, IPC.playerSetAudio, IPC.playerSetMoves]) handle(channel, () => undefined)
  }
}
