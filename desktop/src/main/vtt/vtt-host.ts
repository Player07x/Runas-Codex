import { join } from "node:path"
import { app, BrowserWindow, protocol, screen, type IpcMainInvokeEvent } from "electron"
import { ASSET_SCHEME, IPC, type DocumentChange, type DocumentInput, type LinkTestResult, type PlayerBarVisibility, type TableReport } from "../../../../app/src/vtt/shared/ipc"
import { MASTER_CHANNELS, MASTER_IPC } from "../../../../app/src/vtt/shared/master"
import { ASSET_KINDS, type AssetKind, type DocumentType, type NewWorldInput } from "../../../../app/src/vtt/shared/world"
import { AudioService } from "./audio-service"
import { ensureCloudflared, publicPlayerUrl, startCloudflared } from "./cloudflared"
import { PlayerTransmission } from "./player-transmission"
import { RegionService } from "./region-service"
import { VisionService } from "./vision-service"
import { MasterRemote } from "./master-remote"
import { assetResponse, importAsset } from "./world-assets"
import { clearLog, deleteDocument, listDocuments, putDocument } from "./world-documents"
import { WorldStore } from "./world-store"

/** Registrado antes de `app.ready`: o esquema dos assets se comporta como https (o PixiJS exige para texturas). */
export function assetSchemePrivilege() {
  return { scheme: ASSET_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
}

type Listener = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
type Handle = (channel: string, listener: Listener) => void

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
  private readonly transmission: PlayerTransmission
  private readonly listeners: ((change: DocumentChange) => void)[] = []
  private tunnel: ReturnType<typeof startCloudflared> | null = null
  private playerWindow: BrowserWindow | null = null
  /** Os mesmos tratadores do IPC, para o mestre remoto chamar (só os canais de `MASTER_CHANNELS`). */
  private readonly handlers = new Map<string, Listener>()
  readonly master: MasterRemote

  constructor(
    vaultRoot: () => string | null,
    private readonly vaultWritable: () => boolean,
  ) {
    this.store = new WorldStore(vaultRoot)
    const database = () => this.store.openWorld?.database ?? null
    this.vision = new VisionService(database)
    // A página dos jogadores é o `player.html` do mesmo build da interface.
    this.transmission = new PlayerTransmission(this.store, join(__dirname, "../renderer"), (state) => this.send(IPC.playerStateChanged, state), this.vision)
    // Movimentos dos jogadores passam pelo mesmo caminho das mudanças da mesa (visão, regiões, áudio).
    this.transmission.setCommit((change) => this.broadcast(change))
    this.audio = new AudioService(database, () => this.transmission.audibleSceneId, (state) => {
      this.send(IPC.audioStateChanged, state)
      this.transmission.setAudio(state)
    })
    this.regions = new RegionService(database, (changes) => {
      for (const change of changes) this.broadcast(change)
    })
    // A visão (e a névoa explorada) é atualizada antes de a projeção ser reenviada; regiões por último, porque
    // teleporte e texto geram mudanças novas.
    this.listeners.push((change) => this.vision.onDocumentChange(change))
    this.listeners.push((change) => this.audio.onDocumentChange(change))
    this.listeners.push((change) => this.regions.onDocumentChange(change))
    this.listeners.push((change) => this.transmission.onDocumentChange(change))
    // Mestre remoto (ADR 0016): a mesa do mestre servida pela sala, para o celular.
    this.master = new MasterRemote({
      staticRoot: join(__dirname, "../renderer"),
      world: () => this.store.openWorld,
      invoke: async (channel, args) => {
        const listener = this.handlers.get(channel)
        if (!listener || !MASTER_CHANNELS.includes(channel)) throw new Error("Isto só pelo computador da sala.")
        return listener({} as IpcMainInvokeEvent, ...args)
      },
      onState: (state) => this.send(MASTER_IPC.stateChanged, state),
    })
    this.transmission.setRoute((request, response, url) => this.master.handle(request, response, url))
  }

  private send(channel: string, payload: unknown): void {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
    this.master?.emit(channel, payload)
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

  private stopTunnel(): void {
    this.tunnel?.process.kill()
    this.tunnel = null
    this.transmission.setPublicUrl(null)
  }

  private closePlayerWindow(): void {
    if (this.playerWindow && !this.playerWindow.isDestroyed()) this.playerWindow.close()
    this.playerWindow = null
  }

  private async closeServices(): Promise<void> {
    this.master?.stop()
    this.stopTunnel()
    this.closePlayerWindow()
    this.vision.clear()
    this.audio.closeWorld()
    this.regions.clear()
    await this.transmission.closeWorld()
  }

  /** O cofre mudou (ou o app vai fechar): fecha a sala e a mesa aberta, gravando o que falta. */
  closeWorld(): void {
    void this.closeServices()
    this.store.close()
  }

  /**
   * Janela de jogador: a sala desta máquina (tela para a TV) ou a de outra pessoa (Entrar Sala). Sem preload e sem
   * a ponte do app — é a mesma página que o navegador dos jogadores abre.
   */
  private openPlayerWindow(url: string, title: string): void {
    const target = new URL(url)
    if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("Use um link http:// ou https://.")
    if (this.playerWindow && !this.playerWindow.isDestroyed()) {
      this.playerWindow.setTitle(title)
      this.playerWindow.show()
      this.playerWindow.focus()
      void this.playerWindow.loadURL(target.href)
      return
    }
    const window = new BrowserWindow({
      width: 1280,
      height: 760,
      minWidth: 360,
      minHeight: 360,
      title,
      show: false,
      autoHideMenuBar: true,
      backgroundColor: "#0c0f15",
      webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false },
    })
    window.once("ready-to-show", () => window.show())
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
    window.webContents.on("will-navigate", (event, destination) => {
      if (new URL(destination).origin !== target.origin) event.preventDefault()
    })
    window.on("closed", () => {
      if (this.playerWindow === window) this.playerWindow = null
    })
    this.playerWindow = window
    void window.loadURL(target.href)
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
    // Guarda cada tratador também para o mestre remoto.
    const ipc = handle
    handle = (channel, listener) => {
      this.handlers.set(channel, listener)
      ipc(channel, listener)
    }
    handle(IPC.listWorlds, () => this.store.list())
    handle(IPC.createWorld, (_event, input) => {
      this.requireWritable()
      return this.store.create(input as NewWorldInput)
    })
    handle(IPC.openWorld, async (_event, id) => {
      this.requireWritable()
      await this.closeServices()
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
      this.transmission.setMasterView(report as TableReport)
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
      this.transmission.refresh()
    })

    // Sala dos jogadores (código do RunasVTT, sem fichas nem sites da suíte).
    const t = this.transmission
    const slot = (value: unknown) => {
      if (typeof value !== "string") throw new Error("Assento inválido.")
      return value
    }
    handle(IPC.playerState, () => t.state())
    handle(IPC.playerDisplays, () => screen.getAllDisplays().map((display) => ({ id: String(display.id), label: `Tela ${display.id}`, bounds: display.bounds, workArea: display.workArea })))
    handle(IPC.playerStart, async (_event, port, seatCount) => {
      const state = await t.start(port === undefined ? 30000 : Number(port), seatCount === undefined ? 1 : Number(seatCount))
      this.master.start()
      return state
    })
    handle(IPC.playerStop, async () => {
      this.master.stop()
      this.stopTunnel()
      await t.stop()
      this.closePlayerWindow()
    })
    handle(IPC.playerRotateSeatCode, (_event, slotId) => t.rotateSeatCode(slot(slotId)))
    handle(IPC.playerClearSeat, (_event, slotId) => t.clearSeat(slot(slotId)))
    handle(IPC.playerOpenWindow, () => {
      const url = t.isEnabled ? t.localWindowUrl() : null
      if (!url) throw new Error("Abra a sala primeiro.")
      this.openPlayerWindow(url, "Runas-Codex — Sala (tela dos jogadores)")
    })
    handle(IPC.playerJoin, (_event, url) => {
      if (typeof url !== "string" || !url.trim()) throw new Error("Cole o link da sala.")
      this.openPlayerWindow(url.trim(), "Runas-Codex — Sala")
    })
    handle(IPC.playerSetScene, (_event, sceneId) => {
      t.setScene(typeof sceneId === "string" ? sceneId : null)
      this.audio.sceneChanged()
    })
    handle(IPC.playerSetAudio, (_event, enabled) => t.setAudioEnabled(Boolean(enabled)))
    handle(IPC.playerSetMoves, (_event, enabled) => t.setMovesEnabled(Boolean(enabled)))
    handle(IPC.playerRuler, (_event, ruler) => t.setRuler(ruler))
    handle(IPC.playerPullCamera, () => t.pullCamera())
    handle(IPC.playerSetBars, (_event, bars) => {
      if (bars !== "friendly" && bars !== "all" && bars !== "none") throw new Error("Opção de barras inválida.")
      t.setBars(bars as PlayerBarVisibility)
    })
    // Link público (túnel rápido da Cloudflare), só quando o mestre pede: é a única ida à internet do app.
    handle(IPC.playerPublicLink, async () => {
      if (!t.isEnabled) throw new Error("Abra a sala primeiro.")
      this.stopTunnel()
      const binary = await ensureCloudflared(app.getPath("userData"))
      const tunnel: ReturnType<typeof startCloudflared> = startCloudflared(binary, t.currentPort, {
        onExit: () => {
          if (this.tunnel !== tunnel) return
          this.tunnel = null
          t.markTunnelLost()
        },
      })
      this.tunnel = tunnel
      try {
        const key = t.currentKey
        if (!key) throw new Error("A sala foi fechada.")
        const url = publicPlayerUrl(await tunnel.url, key)
        if (this.tunnel !== tunnel || t.currentKey !== key) throw new Error("O túnel público foi substituído.")
        t.setPublicUrl(url, tunnel.details())
        return url
      } catch (error) {
        if (this.tunnel === tunnel) this.tunnel = null
        tunnel.process.kill()
        throw error
      }
    })
    // Do computador do mestre até o servidor, passando pela Cloudflare: confirma DNS, borda e túnel.
    handle(IPC.playerTestPublicLink, async (): Promise<LinkTestResult> => {
      const publicUrl = t.currentPublicUrl
      if (!publicUrl) throw new Error("Gere o link público primeiro.")
      const started = Date.now()
      try {
        const response = await fetch(new URL("/healthz", publicUrl), { cache: "no-store", signal: AbortSignal.timeout(10_000) })
        const ms = Date.now() - started
        return response.ok && (await response.text()) === "ok" ? { ok: true, ms, status: response.status } : { ok: false, ms, status: response.status, error: `O túnel respondeu ${response.status}.` }
      } catch (error) {
        return { ok: false, ms: Date.now() - started, error: error instanceof Error ? error.message : String(error) }
      }
    })
    handle(IPC.playerDownloadCloudflared, async () => {
      await ensureCloudflared(app.getPath("userData"))
    })
    handle(MASTER_IPC.state, () => this.master.state())
    handle(MASTER_IPC.rotate, () => this.master.rotate())
    handle(MASTER_IPC.disconnect, () => this.master.disconnect())
  }
}
