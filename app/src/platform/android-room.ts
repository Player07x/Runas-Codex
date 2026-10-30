import { registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import { sha256 } from "@noble/hashes/sha256"
import { bytesToHex } from "@noble/hashes/utils"
import type { Platform } from "./platform"
import type { AudioState } from "../vtt/shared/audio"
import { IPC, type DocumentChange, type LinkTestResult, type PlayerState, type VttApi } from "../vtt/shared/ipc"
import type { PlayerWireMessage } from "../vtt/shared/player"
import { PortableWorldStore } from "../vtt/shared/portable-world-store"
import { RoomAuthority } from "../vtt/shared/room-authority"
import { VisionService } from "../vtt/shared/vision-service"
import { AudioService } from "../vtt/shared/audio-service"
import { RegionService } from "../vtt/shared/region-service"
import { clearLog, deleteDocument, putDocument } from "../vtt/shared/world-documents"
import type { PlayerSeatConnection, PlayerTransport, PlayerTransportOptions } from "../vtt/shared/transport"
import { isAssetPath } from "../vtt/shared/scene"
import { MASTER_CHANNELS, MASTER_EVENTS, type MasterState } from "../vtt/shared/master"
import { dispatchMaster } from "../vtt/shared/master-dispatch"
import { ASSET_KINDS } from "../vtt/shared/world"

interface NativeRequest {
  id: string
  kind: "join" | "authenticate" | "snapshot" | "message" | "master" | "master-world" | "master-asset"
  payload: { code?: string; token?: string; seat?: PlayerSeatConnection | null; message?: unknown; channel?: string; args?: unknown[]; kind?: string; name?: string; base64?: string }
  roomId: string
}
interface RoomPlugin {
  start(options: { port: number; key: string; worldPath: string; roomId: string; masterChannels: readonly string[]; masterEvents: readonly string[] }): Promise<{ port: number; address: string }>
  stop(): Promise<void>
  answer(options: { id: string; result: object }): Promise<void>
  publish(options: { message?: PlayerWireMessage; perSeat?: Record<string, PlayerWireMessage>; assets: readonly string[] }): Promise<void>
  masterState(): Promise<MasterState>
  masterRotate(): Promise<MasterState>
  masterDisconnect(): Promise<MasterState>
  masterEmit(options: { channel: string; payload: unknown }): Promise<void>
  addListener(event: "master-state", listener: (state: MasterState) => void): Promise<PluginListenerHandle>
  openUrl(options: { url: string }): Promise<void>
  addListener(event: "request", listener: (request: NativeRequest) => void): Promise<PluginListenerHandle>
  addListener(event: "counts", listener: (counts: { players: number; spectators: number }) => void): Promise<PluginListenerHandle>
  addListener(event: "stopped", listener: () => void): Promise<PluginListenerHandle>
  /** Link público pela Cloudflare (R4, ADR 0032): o `cloudflared` vem no APK. */
  tunnelStart(): Promise<{ url: string; location: string | null; protocol: string | null }>
  tunnelStop(): Promise<void>
  tunnelTest(): Promise<LinkTestResult>
  tunnelAvailable(): Promise<{ available: boolean }>
  addListener(event: "tunnel-lost", listener: () => void): Promise<PluginListenerHandle>
}
const native = registerPlugin<RoomPlugin>("RunasRoom")

class AndroidTransport implements PlayerTransport {
  spectatorCount = 0
  addressPort = 30000
  address = "127.0.0.1"
  private seats = new Map<string, PlayerSeatConnection>()
  private ready: Promise<unknown>
  private roomId = ""
  constructor(
    private options: PlayerTransportOptions,
    private flush: () => Promise<void>,
    onStop: () => void,
    private master: (request: NativeRequest) => Promise<object>,
    onMasterState: (state: MasterState) => void,
  ) {
    this.ready = Promise.all([
      native.addListener("request", (request) => {
        void this.request(request)
      }),
      native.addListener("counts", (value) => {
        this.spectatorCount = value.spectators
        options.onSpectators(value.spectators)
        options.onPlayers?.(value.players)
      }),
      native.addListener("stopped", onStop),
      native.addListener("master-state", onMasterState),
    ])
  }
  private async request(request: NativeRequest): Promise<void> {
    try {
      if (request.roomId !== this.roomId) throw new Error("Sala encerrada.")
      const { payload } = request
      let result: object = {}
      if (request.kind === "join") result = this.options.joinSeat?.(payload.code ?? "") ?? {}
      if (request.kind === "authenticate") result = { seat: this.options.authenticateSeat?.(payload.token ?? "") ?? null }
      if (request.kind === "snapshot") result = { message: this.options.snapshot(payload.seat ?? null) }
      if (request.kind === "message") {
        const message = this.options.onClientMessage?.(payload.message, payload.seat ?? null) ?? null
        await this.flush()
        result = { message }
      }
      if (request.kind.startsWith("master")) result = await this.master(request)
      if (payload.seat) this.seats.set(payload.seat.slotId, payload.seat)
      await native.answer({ id: request.id, result })
    } catch {
      await native.answer({ id: request.id, result: { error: "Não foi possível concluir o pedido." } })
    }
  }
  async start(port: number, key: string): Promise<void> {
    await this.ready
    this.roomId = crypto.randomUUID()
    const result = await native.start({ port, key, worldPath: this.options.worldPath() ?? "", roomId: this.roomId, masterChannels: MASTER_CHANNELS, masterEvents: MASTER_EVENTS })
    this.addressPort = result.port
    this.address = result.address
  }
  async stop(): Promise<void> {
    this.roomId = ""
    this.seats.clear()
    await native.stop()
  }
  publish(message: PlayerWireMessage): void {
    void native.publish({ message, assets: this.options.allowedAssets?.() ?? [] }).catch(() => undefined)
  }
  publishTo(message: (seat: PlayerSeatConnection | null) => PlayerWireMessage): void {
    const perSeat: Record<string, PlayerWireMessage> = { "": message(null) }
    for (const seat of this.seats.values()) perSeat[seat.slotId] = message(seat)
    void native.publish({ perSeat, assets: this.options.allowedAssets?.() ?? [] }).catch(() => undefined)
  }
  /** Os assentos existem antes de um jogador conectar: respostas privadas nunca usam o estado de outro. */
  rememberSeats(state: PlayerState): void {
    for (const seat of state.seats) this.seats.set(seat.slotId, { slotId: seat.slotId, label: seat.label })
  }
}

export function createAndroidVttApi(platform: Platform): VttApi {
  const store = new PortableWorldStore({
    list: () => platform.listTransferFiles!(true),
    read: (path) => platform.readBinary(path),
    write: (path, bytes, expected) => platform.writeManagedTransfer!(path, bytes, expected),
  })
  const documentListeners = new Set<(change: DocumentChange) => void>(),
    playerListeners = new Set<(state: PlayerState) => void>(),
    audioListeners = new Set<(state: AudioState) => void>()
  const masterListeners = new Set<(state: MasterState) => void>()
  const emitMaster = (channel: string, payload: unknown) => {
    if (authority?.isEnabled) void native.masterEmit({ channel, payload }).catch(fail)
  }
  const vision = new VisionService(() => store.openWorld?.database ?? null)
  let transport: AndroidTransport
  let stopping = false
  let authority: RoomAuthority
  const flush = async () => {
    await store.openWorld?.database.flush()
  }
  const fail = (reason: unknown) => {
    void platform.notify("A sala foi interrompida", reason instanceof Error ? reason.message : String(reason))
    void stop().catch(() => undefined)
  }
  authority = new RoomAuthority(
    store,
    (options) =>
      (transport = new AndroidTransport(
        options,
        () => save(),
        () => {
          if (authority?.isEnabled && !stopping) void stop().catch(() => undefined)
        },
        async (request) => {
          if (!authority.isEnabled || !store.openWorld) throw new Error("Sala encerrada.")
          const { payload } = request
          if (request.kind === "master-world") return { world: store.openWorld.summary }
          if (request.kind === "master-asset") {
            if (!(ASSET_KINDS as readonly string[]).includes(payload.kind ?? "") || typeof payload.base64 !== "string" || payload.base64.length > Math.ceil(50 * 1024 * 1024 / 3) * 4) throw new Error("Arquivo inválido.")
            const binary = atob(payload.base64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            return { result: await api.assets.import(payload.kind as typeof ASSET_KINDS[number], payload.name ?? "", bytes) }
          }
          return { result: await dispatchMaster(api, payload.channel ?? "", payload.args ?? []) ?? null }
        },
        (state) => masterListeners.forEach(listener => listener(state)),
      )),
    (state) => {
      transport?.rememberSeats(state)
      playerListeners.forEach((listener) => listener(state))
      emitMaster(IPC.playerStateChanged, state)
    },
    vision,
    () => transport.address,
  )
  const audio = new AudioService(
    () => store.openWorld?.database ?? null,
    () => authority.audibleSceneId,
    (state) => {
      authority.setAudio(state)
      audioListeners.forEach((listener) => listener(state))
      emitMaster(IPC.audioStateChanged, state)
    },
  )
  const publish = (change: DocumentChange) => {
    vision.onDocumentChange(change)
    audio.onDocumentChange(change)
    authority.onDocumentChange(change)
    documentListeners.forEach((listener) => listener(change))
    emitMaster(IPC.documentsChanged, change)
    regions.onDocumentChange(change)
  }
  const regions = new RegionService(
    () => store.openWorld?.database ?? null,
    (changes) => changes.forEach(publish),
  )
  authority.setCommit(publish)
  const save = async () => {
    try {
      await flush()
    } catch (error) {
      fail(error)
      throw error
    }
  }
  async function stop() {
    if (stopping) return
    stopping = true
    try {
      await authority.stop()
      await flush()
    } finally {
      stopping = false
    }
  }
  async function close() {
    await stop()
    audio.closeWorld()
    vision.clear()
    regions.clear()
    await authority.closeWorld()
    await store.close()
  }
  // O processo do túnel morreu sozinho: o painel avisa que o link público caiu.
  void native.addListener("tunnel-lost", () => { if (authority.isEnabled) authority.markTunnelLost() })
  /** Pedido do mestre: abre o túnel e monta o link dos jogadores com a chave da sala, como no desktop. */
  const publicLink = async (): Promise<string> => {
    const key = authority.currentKey
    if (!authority.isEnabled || !key) throw new Error("Abra a sala primeiro.")
    const tunnel = await native.tunnelStart()
    if (!authority.isEnabled || authority.currentKey !== key) {
      await native.tunnelStop().catch(() => undefined)
      throw new Error("A sala foi fechada enquanto o túnel abria.")
    }
    const url = new URL(tunnel.url)
    url.pathname = "/"
    url.search = `?k=${encodeURIComponent(key)}`
    authority.setPublicUrl(url.toString(), { location: tunnel.location, protocol: tunnel.protocol })
    return url.toString()
  }
  // O React pode abrir a mesma mesa duas vezes na montagem; mudanças de sala são sequenciais.
  let lifecycle: Promise<unknown> = Promise.resolve()
  function ordered<T>(action: () => Promise<T>): Promise<T> {
    const next = lifecycle.then(action, action)
    lifecycle = next.catch(() => undefined)
    return next
  }
  const api: VttApi = {
    collaboration: {
      state: async () => authority.collaboration.snapshot(),
      command: async (command) => authority.collaborationCommand(command),
    },
    listWorlds: () => store.list(),
    createWorld: (input) => store.create(input),
    openWorld: (id) =>
      ordered(async () => {
        if (store.openWorld?.summary.id !== id) await close()
        return store.open(id)
      }),
    closeWorld: () => ordered(close),
    documents: {
      list: async (type, parentId) => store.database().list(type, parentId),
      put: async (input) => {
        const { document, change } = putDocument(store.database(), input)
        publish(change)
        await save()
        return document
      },
      remove: async (id) => {
        const change = deleteDocument(store.database(), id)
        if (change) publish(change)
        await save()
      },
      clearLog: async () => {
        const change = clearLog(store.database())
        if (change) publish(change)
        await save()
        return change?.ids.length ?? 0
      },
      onChange: (listener) => {
        documentListeners.add(listener)
        return () => documentListeners.delete(listener)
      },
    },
    table: {
      report: async (report) => {
        authority.setMasterView(report)
        audio.sceneChanged()
        await save()
      },
    },
    player: {
      state: async () => authority.state(),
      onState: (listener) => {
        playerListeners.add(listener)
        return () => playerListeners.delete(listener)
      },
      displays: async () => [],
      start: (port, seats) =>
        ordered(async () => {
          try {
            const state = await authority.start(port, seats)
            transport!.rememberSeats(state)
            authority.refresh()
            await save()
            return state
          } catch (error) {
            await stop()
            throw error
          }
        }),
      stop: () => ordered(stop),
      rotateSeatCode: async (id) => {
        const state = authority.rotateSeatCode(id)
        authority.refresh()
        return state
      },
      clearSeat: async (id) => {
        const state = authority.clearSeat(id)
        authority.refresh()
        return state
      },
      openWindow: async () => {
        const url = authority.localWindowUrl()
        if (url) await native.openUrl({ url })
      },
      join: async (url) => {
        const parsed = new URL(url)
        if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error("Link da sala inválido.")
        await native.openUrl({ url: parsed.href })
      },
      setScene: async (id) => {
        authority.setScene(id)
        audio.sceneChanged()
        await save()
      },
      ruler: async (ruler) => authority.setRuler(ruler),
      pullCamera: async () => authority.pullCamera(),
      setBars: async (bars) => authority.setBars(bars),
      setAudio: async (enabled) => authority.setAudioEnabled(enabled),
      setMoves: async (enabled) => authority.setMovesEnabled(enabled),
      publicLink,
      testPublicLink: () => native.tunnelTest(),
      // O binário já vem no APK; só confere se este aparelho tem a versão para o seu processador.
      downloadCloudflared: async () => {
        if (!(await native.tunnelAvailable()).available) throw new Error("O link público não está disponível neste aparelho (o processador não é ARM de 64 bits).")
      },
    },
    audio: {
      state: async () => audio.get(),
      onState: (listener) => {
        audioListeners.add(listener)
        return () => audioListeners.delete(listener)
      },
      playPlaylist: async (id) => audio.playPlaylist(id),
      stopPlaylist: async (id) => audio.stopPlaylist(id),
      playTrack: async (id) => audio.playTrack(id),
      stopTrack: async (id) => audio.stopTrack(id),
      stopAll: async () => audio.stopAll(),
      ended: async (key) => audio.ended(key),
    },
    vision: {
      resetExploration: async (id) => {
        vision.resetExploration(id)
        authority.refresh()
        await save()
      },
    },
    master: {
      state: () => native.masterState(),
      rotate: () => native.masterRotate(),
      disconnect: () => native.masterDisconnect(),
      onState: (listener) => { masterListeners.add(listener); return () => { masterListeners.delete(listener) } },
    },
    assets: {
      url: (path) => (store.openWorld && isAssetPath(path) ? platform.fileUrl(`${store.openWorld.summary.path}/assets/${path}`) : null),
      import: async (kind, name, bytes) => {
        if (!(ASSET_KINDS as readonly string[]).includes(kind)) throw new Error("Tipo de asset inválido.")
        const extension = name.split(".").pop()?.toLowerCase() ?? ""
        const allowed =
          kind === "audio" ? ["mp3", "ogg", "wav", "m4a", "flac", "webm", "opus"] : ["png", "jpg", "jpeg", "webp", "gif", "avif"]
        if (!allowed.includes(extension)) throw new Error("Formato de arquivo não suportado.")
        if (!bytes.length || bytes.length > 50 * 1024 * 1024) throw new Error("Escolha um arquivo de até 50 MB.")
        const path = `${kind}/${bytesToHex(sha256(bytes))}.${extension === "jpeg" ? "jpg" : extension}`
        if (!isAssetPath(path)) throw new Error("Asset inválido.")
        const database = store.database()
        const full = `${database.path}/assets/${path}`
        const files = await platform.listTransferFiles!(true)
        if (store.openWorld?.database !== database) throw new Error("A mesa foi fechada durante a importação.")
        if (!files.some((entry) => entry.path === full))
          await platform.writeManagedTransfer!(full, bytes, null)
        return path
      },
    },
  }
  return api
}
