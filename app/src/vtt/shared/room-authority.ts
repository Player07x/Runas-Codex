import { CollaborationRoom } from "./collaboration"
import type { DocumentChange, PlayerBarVisibility, PlayerDrop, PlayerSeatState, PlayerState, PlayerTunnelInfo, TableReport } from "./ipc"
import type { LogData, SceneData, TokenData, TileData, DrawingData, NoteData, WallData } from "./scene"
import type { RegionData } from "./region"
import type { WorldDocument } from "./world"
import { FOLLOW_TOKENS_SCENE, normalizeRuler, projectScene, type PlayerProjection, type PlayerProjectionPatch, type PlayerRuler } from "./player"
import { childrenForSeat, childrenHaveOwnerBars, projectionForSeat } from "./bars"
import type { PlayerTransport, PlayerTransportOptions, JoinedPlayerSeat, PlayerSeatConnection } from "./transport"
import type { PlayerWireMessage } from "./player"
import type { DocumentDatabase } from "./database"
export interface RoomStore {
  openWorld: { summary: { path: string }; database: DocumentDatabase } | null
}
import type { VisionService } from "./vision-service"
import type { AudioState } from "./audio"
import type { DocumentChange as Change } from "./ipc"
import { putDocument } from "./world-documents"
import { normalizeDoorRequest, normalizeFlipRequest, normalizeMoveRequest, validatePlayerDoor, validatePlayerFlip, validatePlayerMove, type DoorRequest, type FlipRequest } from "./player-moves"
import { PlayerSession, normalizeSeatCount, randomSecret } from "./player-session"

const DEFAULT_PORT = 30000


/** Para quem não deve receber nada num envio por assento: o `pong` só renova a conexão. */
const NOTHING: PlayerWireMessage = { type: "pong" }
const EMPTY_PROJECTION: PlayerProjection = { scene: null, children: [], assets: [], vision: null, regions: [] }

/** O que cada assento via antes de uma mudança (para mandar só a diferença). */
interface RoomViews { main: PlayerProjection; scenes: Map<string, PlayerProjection>; seats: Map<string, string> }

function validPort(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error("A porta precisa estar entre 1 e 65535.")
  return value
}

export interface MasterCamera {
  center: { x: number; y: number } | null
  zoom: number | null
}

/** Coordena o servidor de transmissão e mantém a projeção longe da rede. */
export class RoomAuthority {
  readonly collaboration = new CollaborationRoom()
  protected readonly server: PlayerTransport
  private enabled = false
  private port = DEFAULT_PORT
  private key: string | null = null
  private session: PlayerSession | null = null
  private playerCount = 0
  /** Quantos tokens cada assento controla (U78: o painel avisa quando passa de um). */
  private tokenCounts = new Map<string, number>()
  private publicUrl: string | null = null
  private tunnel: PlayerTunnelInfo | null = null
  private tunnelLost = false
  /** U89: a última queda (túnel, endereço ou servidor) até a sala ser desligada. */
  private drop: PlayerDrop | null = null
  /** O endereço da rede local quando a sala abriu (ou na última conferência). */
  private lastAddress = ""
  private sceneId: string | null = null
  /** Cada jogador vê a cena do próprio token (FOLLOW_TOKENS_SCENE). */
  private followTokens = false
  /** No modo acima: a cena de cada assento e a projeção das cenas que não são a do mestre. */
  private seatScenes = new Map<string, string>()
  private sceneProjections = new Map<string, PlayerProjection>()
  private table: TableReport = { sceneId: null, selection: [], center: null, zoom: null }
  private ruler: PlayerRuler | null = null
  private audioEnabled = true
  /** Espectadores podem mover tokens "Jogador" (ADR 0017). */
  private movesEnabled = true
  /** Grava e transmite uma mudança feita por um espectador, como qualquer outra. */
  private commit: ((change: Change) => void) | null = null
  private audio: AudioState = { now: 0, sounds: [] }
  private bars: PlayerBarVisibility = "friendly"
  private lastProjection: PlayerProjection = { scene: null, children: [], assets: [], vision: null, regions: [] }
  private onStateChange: (state: PlayerState) => void

  constructor(
    private readonly store: RoomStore,
    makeTransport: (options: PlayerTransportOptions) => PlayerTransport,
    onStateChange: (state: PlayerState) => void,
    private readonly vision: VisionService | null = null,
    private readonly localAddress: () => string = () => "127.0.0.1",
  ) {
    this.onStateChange = onStateChange
    this.server = makeTransport({
      worldPath: () => this.store.openWorld?.summary.path ?? null,
      projection: () => this.lastProjection,
      // As imagens do artigo apresentado (anexo 6, 24/11) saem enquanto ele estiver aberto, como os assets da cena.
      allowedAssets: () => [...this.lastProjection.assets, ...[...this.sceneProjections.values()].flatMap((projection) => projection.assets), ...(this.audioEnabled ? this.audio.sounds.map((sound) => sound.audio) : []), ...this.collaboration.handoutAssets()],
      snapshot: (seat) => this.snapshotMessage(seat),
      onSpectators: (spectators) => {
        this.emit(spectators)
      },
      onPlayers: (players) => {
        this.playerCount = players
        this.emit()
      },
      joinSeat: (code) => this.joinSeat(code),
      authenticateSeat: (token) => this.authenticateSeat(token),
      leaveSeat: (token) => this.leaveSeat(token),
      onClientMessage: (message, seat) => this.handleClientMessage(message, seat),
      onServerLost: () => this.markServerLost(),
    })
  }

  state(): PlayerState {
    const localUrl = this.enabled && this.key ? `http://${this.localAddress()}:${this.port}/?k=${this.key}` : null
    return {
      enabled: this.enabled,
      port: this.port,
      key: this.key,
      localUrl,
      publicUrl: this.publicUrl,
      tunnel: this.tunnel,
      tunnelLost: this.tunnelLost,
      drop: this.drop,
      sceneId: this.followTokens ? FOLLOW_TOKENS_SCENE : this.sceneId,
      audio: this.audioEnabled,
      moves: this.movesEnabled,
      bars: this.bars,
      spectators: this.server.spectatorCount,
      players: this.playerCount,
      sessionId: this.session?.id ?? null,
      seats: this.seatStates(),
    }
  }

  /** URL usada pela BrowserWindow local; a página é a mesma dos espectadores. */
  localWindowUrl(): string | null {
    return this.enabled && this.key ? `http://127.0.0.1:${this.port}/?k=${this.key}` : null
  }

  async start(port = DEFAULT_PORT, seatCount = 1): Promise<PlayerState> {
    if (this.enabled) await this.stop()
    if (!this.store.openWorld) throw new Error("Abra uma mesa antes de abrir a sala.")
    this.port = validPort(port)
    const created = PlayerSession.create(normalizeSeatCount(seatCount))
    const key = randomSecret(16)
    await this.server.start(this.port, key)
    this.port = this.server.addressPort
    this.key = key
    this.session = created.session
    this.playerCount = 0
    this.enabled = true
    this.publicUrl = null
    this.tunnel = null
    this.tunnelLost = false
    this.drop = null
    this.lastAddress = this.localAddress()
    this.attachAssignedTokens()
    this.refreshProjection()
    this.emit(0)
    return { ...this.state(), seats: this.seatStates(created.codes) }
  }

  async stop(): Promise<void> {
    this.collaboration.command({ type: "prompt", prompt: null })
    this.collaboration.command({ type: "handout", handout: null })
    this.collaboration.command({ type: "ack-safety" })
    await this.server.stop()
    this.enabled = false
    this.key = null
    this.publicUrl = null
    this.tunnel = null
    this.tunnelLost = false
    this.drop = null
    this.ruler = null
    this.session = null
    this.playerCount = 0
    this.emit(0)
  }

  /** Troca o código de um assento sem reiniciar a transmissão. */
  rotateSeatCode(slotId: string): PlayerState {
    if (!this.session) throw new Error("Ligue a transmissão antes de administrar os assentos.")
    const code = this.session.rotateCode(slotId)
    return { ...this.state(), seats: this.seatStates({ [slotId]: code }) }
  }

  /** Desconecta o assento; o código continua válido e o token atribuído volta a ser ligado. */
  clearSeat(slotId: string): PlayerState {
    if (!this.session) throw new Error("Ligue a transmissão antes de administrar os assentos.")
    const seat = this.session.getSeat(slotId)
    if (!seat) throw new Error("Assento de jogador não encontrado.")
    this.session.clearSeat(slotId)
    this.attachAssignedTokens()
    const state = this.state()
    this.emit()
    return state
  }

  /** U89: mais um assento com a sala aberta; o código novo vai só nesta resposta, como ao ligar. */
  addSeat(): PlayerState {
    if (!this.session) throw new Error("Ligue a transmissão antes de administrar os assentos.")
    const { seat, code } = this.session.addSeat()
    // Um token que já era deste assento (a sala teve mais jogadores antes) volta a ser dele.
    this.attachAssignedTokens()
    const state = { ...this.state(), seats: this.seatStates({ [seat.slotId]: code }) }
    this.emit()
    return state
  }

  /** U89 (decisão 8): tira o último assento e desconecta só quem estava nele. */
  removeSeat(): PlayerState {
    if (!this.session) throw new Error("Ligue a transmissão antes de administrar os assentos.")
    const seat = this.session.removeLastSeat()
    this.tokenCounts.delete(seat.slotId)
    this.server.disconnectSeat?.(seat.slotId)
    const state = this.state()
    this.emit()
    return state
  }

  /**
   * U89: o endereço do computador na rede mudou (outro Wi-Fi, outro IP). O servidor escuta em todas as interfaces,
   * então a sala continua no ar; o link da rede local é que muda, e o mestre precisa mandar o novo.
   */
  checkAddress(): boolean {
    if (!this.enabled) return false
    const address = this.localAddress()
    if (address === this.lastAddress) return false
    this.lastAddress = address
    this.drop = { kind: "address", status: "restored", at: Date.now() }
    this.emit()
    return true
  }

  /** U89: o servidor da sala parou sem o mestre pedir; os jogadores caíram e só “Reconectar” traz a sala de volta. */
  markServerLost(): void {
    if (!this.enabled) return
    this.drop = { kind: "server", status: "failed", at: Date.now() }
    this.emit(0)
  }

  /**
   * U89: reabre a sala na mesma porta, com a mesma chave e os mesmos assentos: o link da rede local volta igual (se o
   * IP não mudou) e os jogadores entram de novo sem perder o assento.
   */
  async reconnect(): Promise<PlayerState> {
    if (!this.enabled || !this.key || !this.session) throw new Error("Ligue a transmissão primeiro.")
    const key = this.key
    await this.server.stop()
    await this.server.start(this.port, key)
    this.port = this.server.addressPort
    this.key = key
    this.lastAddress = this.localAddress()
    if (this.drop?.kind === "server" || this.drop?.kind === "address") this.drop = { kind: this.drop.kind, status: "restored", at: Date.now() }
    this.refreshProjection()
    this.emit(0)
    return this.state()
  }

  private joinSeat(code: string): JoinedPlayerSeat | null {
    const session = this.session
    if (!session) return null
    const seat = session.authenticateCode(code)
    if (!seat) return null
    const token = session.issueAccessToken(seat.slotId)
    this.emit()
    return { seat: { slotId: seat.slotId, label: seat.label }, token }
  }

  private authenticateSeat(token: string): PlayerSeatConnection | null {
    const seat = this.session?.authenticateAccessToken(token)
    return seat ? { slotId: seat.slotId, label: seat.label } : null
  }

  /** U78: “Sair da mesa” no aparelho do jogador. O código continua valendo: o jogador (ou outro) pode entrar de novo. */
  private leaveSeat(token: string): PlayerSeatConnection | null {
    const seat = this.session?.authenticateAccessToken(token)
    if (!seat) return null
    this.session!.revoke(seat.slotId)
    this.emit()
    return { slotId: seat.slotId, label: seat.label }
  }

  /**
   * Liga cada assento aos tokens que o mestre atribuiu a ele (campo "Controlado por"). Mover e ver as barras já valem
   * para todos os tokens do assento (pelo `playerSlotId`); aqui o assento fica ligado ao primeiro e conta os outros,
   * para o painel do mestre avisar quando um jogador controla mais de um token (U78).
   */
  private attachAssignedTokens(): void {
    const session = this.session
    const database = this.store.openWorld?.database
    if (!session || !database) return
    const assigned = new Map<string, string[]>()
    for (const token of database.list("token")) {
      const slotId = (token.data as TokenData).playerSlotId
      if (slotId && session.getSeat(slotId)) assigned.set(slotId, [...(assigned.get(slotId) ?? []), token.id])
    }
    this.tokenCounts = new Map([...assigned].map(([slotId, tokens]) => [slotId, tokens.length]))
    for (const seat of session.list()) {
      const tokenId = assigned.get(seat.slotId)?.[0] ?? null
      if (seat.tokenId !== tokenId) session.markAttached(seat.slotId, tokenId)
    }
  }

  async closeWorld(): Promise<void> {
    this.collaboration.reset()
    if (this.enabled) await this.stop()
    this.sceneId = null
    this.table = { sceneId: null, selection: [], center: null, zoom: null }
    this.lastProjection = { scene: null, children: [], assets: [], vision: null, regions: [] }
  }

  setPublicUrl(url: string | null, tunnel: PlayerTunnelInfo | null = null): void {
    this.publicUrl = url
    this.tunnel = url ? tunnel : null
    this.tunnelLost = false
    // Decisão 6: o túnel reaberto depois de uma queda tem outro endereço; a faixa da mesa mostra o link novo.
    if (url && this.drop?.kind === "tunnel") this.drop = { kind: "tunnel", status: "restored", at: Date.now() }
    this.emit()
  }

  /**
   * O processo do túnel morreu sozinho: o link público deixou de existir e o painel precisa dizer isso. Com
   * `reopening`, o app já está abrindo outro túnel (decisão 6 do U89).
   */
  markTunnelLost(reopening = false): void {
    this.publicUrl = null
    this.tunnel = null
    this.tunnelLost = true
    this.drop = { kind: "tunnel", status: reopening ? "reconnecting" : "failed", at: Date.now() }
    this.emit()
  }

  /** As tentativas de reabrir o túnel acabaram: fica com o mestre (“Reconectar” ou “Gerar novo link público”). */
  markTunnelFailed(): void {
    if (!this.enabled || this.publicUrl) return
    this.tunnelLost = true
    this.drop = { kind: "tunnel", status: "failed", at: Date.now() }
    this.emit()
  }

  get currentPublicUrl(): string | null {
    return this.publicUrl
  }

  get currentPort(): number {
    return this.port
  }
  get currentKey(): string | null {
    return this.key
  }
  get isEnabled(): boolean {
    return this.enabled
  }

  setScene(sceneId: string | null): void {
    this.followTokens = sceneId === FOLLOW_TOKENS_SCENE
    this.sceneId = typeof sceneId === "string" && sceneId && !this.followTokens ? sceneId : null
    if (this.enabled) this.publishSnapshot()
    this.emit()
  }

  setBars(bars: PlayerBarVisibility): void {
    this.bars = bars
    if (this.enabled) this.publishSnapshot()
    this.emit()
  }

  /** Única forma de mover a câmera dos jogadores: um pedido explícito do mestre. */
  pullCamera(): void {
    const center = this.table.center
    if (!this.enabled || !center) return
    const message: PlayerWireMessage = { type: "camera", center, zoom: this.table.zoom ?? null }
    // Cada um na cena do próprio token: só quem está na cena do mestre é puxado.
    if (this.followTokens) this.server.publishTo((seat) => this.projectionFor(seat).scene?.id === this.table.sceneId ? message : NOTHING)
    else this.server.publish(message)
  }

  /**
   * Régua da ferramenta Régua do mestre. Só chega aos jogadores se for medida
   * na cena transmitida; a régua automática de arrastar tokens não passa por
   * aqui, para não revelar movimentos.
   */
  setRuler(value: unknown): void {
    const ruler = normalizeRuler(value)
    const visible = ruler && this.transmittedScenes().has(ruler.sceneId) ? ruler : null
    if (!visible && !this.ruler) return
    this.ruler = visible
    if (!this.enabled) return
    // Com jogadores em cenas diferentes, cada um só recebe a régua da cena que vê.
    if (this.sceneProjections.size) this.server.publishTo((seat) => ({ type: "ruler", ruler: this.rulerFor(seat) }))
    else this.server.publish({ type: "ruler", ruler: visible })
  }

  setMasterView(report: TableReport): void {
    const sceneChanged = this.table.sceneId !== report.sceneId
    this.table = {
      sceneId: typeof report.sceneId === "string" ? report.sceneId : null,
      selection: [],
      center: report.center && Number.isFinite(report.center.x) && Number.isFinite(report.center.y) ? report.center : null,
      zoom: typeof report.zoom === "number" && Number.isFinite(report.zoom) ? Math.max(0.08, Math.min(5, report.zoom)) : null,
    }
    if (!this.enabled) return
    // Mover a câmera do mestre não mexe na dos jogadores; só trocar de cena
    // muda o que é transmitido (quando nenhuma cena foi fixada).
    if (sceneChanged && this.sceneId === null) this.publishSnapshot()
  }

  onDocumentChange(change: DocumentChange): void {
    if (!this.enabled) return
    // Rebuild from the database instead of forwarding `change`: projection is
    // the security boundary, including for bridge writes and deletes.
    if (change.kind === "put" && change.document.type === "log-entry") {
      this.publishFloat(change.document.data as LogData)
      return
    }
    // Token atribuído, reatribuído ou apagado: os assentos acompanham.
    if ((change.kind === "put" && change.document.type === "token") || change.kind === "delete") {
      this.attachAssignedTokens()
      this.emit()
    }
    if (change.kind === "put" || change.kind === "delete") {
      const before: RoomViews = { main: this.lastProjection, scenes: this.sceneProjections, seats: this.seatScenes }
      this.refreshProjection()
      this.publishProjectionPatch(before)
    }
  }

  /** A projeção que o assento vê: a da cena do token dele (modo “cada jogador na sua cena”) ou a transmitida. */
  private projectionFor(seat?: PlayerSeatConnection | null, views: RoomViews = { main: this.lastProjection, scenes: this.sceneProjections, seats: this.seatScenes }): PlayerProjection {
    const sceneId = seat ? views.seats.get(seat.slotId) : undefined
    return (sceneId && views.scenes.get(sceneId)) || views.main
  }

  /** Cenas que algum jogador vê agora. */
  private transmittedScenes(): Set<string> {
    return new Set([this.lastProjection.scene?.id, ...this.sceneProjections.keys()].filter((id): id is string => Boolean(id)))
  }

  private rulerFor(seat?: PlayerSeatConnection | null): PlayerRuler | null {
    return this.ruler && this.projectionFor(seat).scene?.id === this.ruler.sceneId ? this.ruler : null
  }

  /** Repete o texto flutuante do Registro só para tokens que os jogadores veem. */
  private publishFloat(entry: LogData): void {
    if (!entry.tokenId || !entry.floatingText) return
    const message: PlayerWireMessage = { type: "float", tokenId: entry.tokenId, text: entry.floatingText, kind: entry.kind }
    const sees = (projection: PlayerProjection) => projection.children.some((child) => child.type === "token" && child.id === entry.tokenId)
    if (!this.sceneProjections.size) { if (sees(this.lastProjection)) this.server.publish(message); return }
    if (sees(this.lastProjection) || [...this.sceneProjections.values()].some(sees)) this.server.publishTo((seat) => sees(this.projectionFor(seat)) ? message : NOTHING)
  }

  private refreshProjection(): void {
    // Mapas novos: quem guardou a versão anterior (onDocumentChange) compara com ela.
    this.sceneProjections = new Map()
    this.seatScenes = new Map()
    const database = this.store.openWorld?.database
    if (!database) {
      this.lastProjection = EMPTY_PROJECTION
      return
    }
    this.lastProjection = this.projectSceneOf(database, this.sceneId ?? this.table.sceneId)
    if (!this.followTokens) return
    for (const [slotId, sceneId] of seatTokenScenes(database)) {
      this.seatScenes.set(slotId, sceneId)
      if (sceneId !== this.lastProjection.scene?.id && !this.sceneProjections.has(sceneId)) this.sceneProjections.set(sceneId, this.projectSceneOf(database, sceneId))
    }
  }

  private projectSceneOf(database: DocumentDatabase, targetId: string | null): PlayerProjection {
    const scene = targetId ? database.get(targetId) : null
    if (!scene || scene.type !== "scene") return EMPTY_PROJECTION
    const sceneData = scene.data as SceneData
    const projection = projectScene({
      scene: scene as WorldDocument<SceneData>,
      children: {
        tokens: database.list("token", scene.id) as WorldDocument<TokenData>[],
        tiles: database.list("tile", scene.id) as WorldDocument<TileData>[],
        drawings: database.list("drawing", scene.id) as WorldDocument<DrawingData>[],
        notes: database.list("note", scene.id) as WorldDocument<NoteData>[],
        regions: database.list("region", scene.id) as WorldDocument<RegionData>[],
        walls: database.list("wall", scene.id) as WorldDocument<WallData>[],
      },
      bars: this.bars,
      vision: this.vision?.get(scene.id) ?? null,
    })
    // Touching the value above documents the intentional opaque cast: the
    // database is generic, while projectScene is the only place that reads
    // and strips fields before they reach the transport.
    void sceneData
    return projection
  }

  /** Cena cujos sons do mapa são ouvidos: a fixada na transmissão ou a aberta pelo mestre. */
  get audibleSceneId(): string | null {
    return this.sceneId ?? this.table.sceneId
  }

  setAudio(state: AudioState): void {
    this.audio = state
    if (this.enabled && this.audioEnabled) this.server.publish({ type: "audio", audio: state })
  }

  setCommit(commit: (change: Change) => void): void {
    this.commit = commit
  }

  setMovesEnabled(enabled: boolean): void {
    this.movesEnabled = enabled
    if (this.enabled) this.server.publish({ type: "moves", moves: enabled })
    this.emit()
  }

  /** Único pedido que um espectador pode fazer: mover um token "Jogador". */
  handleClientMessage(value: unknown, seat?: PlayerSeatConnection | null): PlayerWireMessage | null {
    if (value && typeof value === "object" && ["reply", "safety"].includes(String((value as { type?: unknown }).type))) {
      const requestType = (value as { type: string }).type === "safety" ? ("safety" as const) : ("reply" as const)
      try {
        if (!this.enabled) throw new Error("Sala encerrada.")
        this.collaboration.reply(value, seat ?? null, randomSecret(12))
        this.server.publishTo((client) => ({ type: "collaboration", collaboration: this.collaboration.publicSnapshot(client?.slotId) }))
        return { type: "collaboration-result", requestType, ok: true }
      } catch (e) {
        return { type: "collaboration-result", requestType, ok: false, reason: e instanceof Error ? e.message : String(e) }
      }
    }
    const flip = normalizeFlipRequest(value)
    if (flip) return this.handleFlip(flip, seat)
    const door = normalizeDoorRequest(value)
    if (door) return this.handleDoor(door, seat)
    const request = normalizeMoveRequest(value)
    if (!request) return null
    const reject = (reason: string): PlayerWireMessage => ({ type: "move-result", tokenId: request.tokenId, ok: false, reason })
    if (!this.enabled || !this.movesEnabled) return reject("O mestre não está permitindo mover tokens agora.")
    const database = this.store.openWorld?.database
    if (!database || !this.commit) return reject("Nenhuma mesa aberta.")
    const result = validatePlayerMove(database, this.projectionFor(seat).scene?.id ?? null, request)
    if (!result.ok) return reject(result.reason)
    // A network client can move only the token attached to its own seat. The
    // optional parameter keeps the pure unit-test entry point useful; the
    // PlayerServer always supplies null for spectators and an identity for
    // authenticated players.
    if (seat !== undefined && (!seat || result.token.data.playerSlotId !== seat.slotId))
      return reject("Esse token pertence a outro jogador.")
    this.commit(
      putDocument(database, { id: result.token.id, type: "token", parentId: result.token.parentId, data: result.token.data }).change,
    )
    return { type: "move-result", tokenId: request.tokenId, ok: true }
  }

  /** Virar o próprio token: mesmas permissões do mover (sala aberta, mover liberado, token do próprio assento). */
  private handleFlip(request: FlipRequest, seat?: PlayerSeatConnection | null): PlayerWireMessage {
    const reject = (reason: string): PlayerWireMessage => ({ type: "move-result", tokenId: request.tokenId, ok: false, reason })
    if (!this.enabled || !this.movesEnabled) return reject("O mestre não está permitindo mexer nos tokens agora.")
    const database = this.store.openWorld?.database
    if (!database || !this.commit) return reject("Nenhuma mesa aberta.")
    const result = validatePlayerFlip(database, this.projectionFor(seat).scene?.id ?? null, request)
    if (!result.ok) return reject(result.reason)
    if (seat !== undefined && (!seat || result.token.data.playerSlotId !== seat.slotId)) return reject("Esse token pertence a outro jogador.")
    this.commit(putDocument(database, { id: result.token.id, type: "token", parentId: result.token.parentId, data: result.token.data }).change)
    return { type: "move-result", tokenId: request.tokenId, ok: true }
  }

  /**
   * Porta clicada pelo jogador (anexo 2, 25/11): só quem entrou com um assento, numa porta que ele vê e que o mestre
   * deixou destrancada. Abre ou fecha, e a visão de todos é recalculada como numa mudança do mestre.
   */
  private handleDoor(request: DoorRequest, seat?: PlayerSeatConnection | null): PlayerWireMessage {
    const reject = (reason: string): PlayerWireMessage => ({ type: "door-result", doorId: request.doorId, ok: false, reason })
    if (!this.enabled) return reject("Sala encerrada.")
    if (seat === null) return reject("Entre na mesa com o código do mestre para abrir portas.")
    const database = this.store.openWorld?.database
    if (!database || !this.commit) return reject("Nenhuma mesa aberta.")
    const projection = this.projectionFor(seat)
    const visible = new Set(projection.children.filter((child) => child.type === "door").map((child) => child.id))
    const result = validatePlayerDoor(database, projection.scene?.id ?? null, visible, request)
    if (!result.ok) return reject(result.reason)
    this.commit(putDocument(database, { id: result.door.id, type: "wall", parentId: result.door.parentId, data: result.door.data }).change)
    return { type: "door-result", doorId: request.doorId, ok: true }
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled
    if (this.enabled) this.server.publish({ type: "audio", audio: enabled ? this.audio : null })
    this.emit()
  }

  /** Reenvia a cena (ex.: depois de redefinir a névoa explorada). */
  refresh(): void {
    if (this.enabled) this.publishSnapshot()
  }

  private publishSnapshot(): void {
    this.refreshProjection()
    if (this.ruler && !this.transmittedScenes().has(this.ruler.sceneId)) this.ruler = null
    this.server.publishTo((seat) => this.snapshotMessage(seat))
  }

  /**
   * Manda a cada um só o que mudou na cena que ele vê. Quem passou para outra cena (o token foi para outra cena, no modo
   * “cada jogador na sua cena”) recebe a cena nova inteira.
   */
  private publishProjectionPatch(before: RoomViews): void {
    if (!this.followTokens && !before.scenes.size) {
      const patch = this.projectionPatch(before.main, this.lastProjection)
      if (!patch) return
      // Barras “só do dono” (U12) vão só ao assento dono do token; sem elas, um envio só para todos.
      if (childrenHaveOwnerBars(patch.upsert)) this.server.publishTo((seat) => ({ ...patch, upsert: childrenForSeat(patch.upsert, seat?.slotId) }))
      else this.server.publish(patch)
      return
    }
    const patches = new Map<string, PlayerProjectionPatch | null>()
    const plan = (seat: PlayerSeatConnection | null): PlayerWireMessage | null => {
      const old = this.projectionFor(seat, before)
      const now = this.projectionFor(seat)
      if (old.scene?.id !== now.scene?.id) return this.snapshotMessage(seat)
      const key = now.scene?.id ?? ""
      if (!patches.has(key)) patches.set(key, this.projectionPatch(old, now))
      const patch = patches.get(key)!
      return patch && { ...patch, upsert: childrenForSeat(patch.upsert, seat?.slotId) }
    }
    const seats = [null, ...[...new Set([...before.seats.keys(), ...this.seatScenes.keys()])].map((slotId) => ({ slotId, label: "" }))]
    if (seats.every((seat) => plan(seat) === null)) return
    this.server.publishTo((seat) => plan(seat) ?? NOTHING)
  }

  private projectionPatch(before: PlayerProjection, after: PlayerProjection): PlayerProjectionPatch | null {
    const beforeChildren = new Map(before.children.map((child) => [child.id, child]))
    const afterChildren = new Map(after.children.map((child) => [child.id, child]))
    const upsert = [...afterChildren.values()].filter((child) => JSON.stringify(child) !== JSON.stringify(beforeChildren.get(child.id)))
    const removed = [...beforeChildren.keys()].filter((id) => !afterChildren.has(id))
    const patch: PlayerProjectionPatch = { type: "projection-patch", upsert, removed }
    const sceneChanged = JSON.stringify(before.scene) !== JSON.stringify(after.scene)
    const assetsChanged = JSON.stringify(before.assets) !== JSON.stringify(after.assets)
    const visionChanged = JSON.stringify(before.vision) !== JSON.stringify(after.vision)
    const regionsChanged = JSON.stringify(before.regions) !== JSON.stringify(after.regions)
    if (sceneChanged) patch.scene = after.scene
    if (assetsChanged) patch.assets = after.assets
    if (visionChanged) patch.vision = after.vision
    if (regionsChanged) patch.regions = after.regions
    if (!sceneChanged && !assetsChanged && !visionChanged && !regionsChanged && !patch.upsert.length && !patch.removed.length) return null
    return patch
  }

  private snapshotMessage(seat?: PlayerSeatConnection | null): PlayerWireMessage {
    return {
      type: "snapshot",
      collaboration: this.collaboration.publicSnapshot(seat?.slotId),
      projection: projectionForSeat(this.projectionFor(seat), seat?.slotId),
      ruler: this.rulerFor(seat),
      audio: this.audioEnabled ? { ...this.audio, now: Date.now() } : null,
      moves: this.movesEnabled,
    }
  }

  collaborationCommand(value: unknown) {
    if (!this.enabled && !(value && typeof value === "object" && (value as { type?: unknown }).type === "consume-diary"))
      throw new Error("Abra uma sala do VTT para iniciar esta atividade.")
    const result = this.collaboration.command(value)
    this.server.publishTo((seat) => ({ type: "collaboration", collaboration: this.collaboration.publicSnapshot(seat?.slotId) }))
    return result
  }

  private emit(spectators = this.server.spectatorCount): void {
    this.onStateChange({ ...this.state(), spectators, players: this.playerCount })
  }

  private seatStates(codes: Record<string, string> = {}): PlayerSeatState[] {
    return this.session?.snapshot().seats.map((seat) => ({ ...seat, ...(codes[seat.slotId] ? { code: codes[seat.slotId] } : {}), tokens: this.tokenCounts.get(seat.slotId) ?? 0 })) ?? []
  }
}

/**
 * Cena de cada assento: a do token dele (marcado com o assento e não oculto). Com tokens em mais de uma cena, vale o
 * que mudou por último (o que acabou de passar por um teleporte, por exemplo).
 */
export function seatTokenScenes(database: DocumentDatabase): Map<string, string> {
  const latest = new Map<string, { sceneId: string; at: number }>()
  for (const document of database.list("token") as WorldDocument<TokenData>[]) {
    const slotId = document.data.playerSlotId
    if (!slotId || document.data.hidden || !document.parentId) continue
    const current = latest.get(slotId)
    if (!current || document.updatedAt > current.at) latest.set(slotId, { sceneId: document.parentId, at: document.updatedAt })
  }
  return new Map([...latest].map(([slotId, { sceneId }]) => [slotId, sceneId]))
}
