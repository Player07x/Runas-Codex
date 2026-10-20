import { CollaborationRoom } from "./collaboration"
import type { DocumentChange, PlayerBarVisibility, PlayerSeatState, PlayerState, PlayerTunnelInfo, TableReport } from "./ipc"
import type { LogData, SceneData, TokenData, TileData, DrawingData, NoteData } from "./scene"
import type { RegionData } from "./region"
import type { WorldDocument } from "./world"
import { normalizeRuler, projectScene, type PlayerProjection, type PlayerRuler } from "./player"
import type { PlayerTransport, PlayerTransportOptions, JoinedPlayerSeat, PlayerSeatConnection } from "./transport"
import type { PlayerWireMessage } from "./player"
import type { DocumentDatabase } from "./database"
export interface RoomStore { openWorld: { summary: { path: string }; database: DocumentDatabase } | null }
import type { VisionService } from "./vision-service"
import type { AudioState } from "./audio"
import type { DocumentChange as Change } from "./ipc"
import { putDocument } from "./world-documents"
import { normalizeMoveRequest, validatePlayerMove } from "./player-moves"
import { PlayerSession, normalizeSeatCount, randomSecret } from "./player-session"

const DEFAULT_PORT = 30000


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
  private publicUrl: string | null = null
  private tunnel: PlayerTunnelInfo | null = null
  private tunnelLost = false
  private sceneId: string | null = null
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

  constructor(private readonly store: RoomStore, makeTransport: (options: PlayerTransportOptions) => PlayerTransport, onStateChange: (state: PlayerState) => void, private readonly vision: VisionService | null = null, private readonly localAddress: () => string = () => "127.0.0.1") {
    this.onStateChange = onStateChange
    this.server = makeTransport({
      worldPath: () => this.store.openWorld?.summary.path ?? null,
      projection: () => this.lastProjection,
      allowedAssets: () => [...this.lastProjection.assets, ...(this.audioEnabled ? this.audio.sounds.map((sound) => sound.audio) : [])],
      snapshot: seat => this.snapshotMessage(seat),
      onSpectators: (spectators) => { this.emit(spectators) },
      onPlayers: (players) => { this.playerCount = players; this.emit() },
      joinSeat: (code) => this.joinSeat(code),
      authenticateSeat: (token) => this.authenticateSeat(token),
      onClientMessage: (message, seat) => this.handleClientMessage(message, seat),
    })
  }

  state(): PlayerState {
    const localUrl = this.enabled && this.key ? `http://${this.localAddress()}:${this.port}/?k=${this.key}` : null
    return { enabled: this.enabled, port: this.port, key: this.key, localUrl, publicUrl: this.publicUrl, tunnel: this.tunnel, tunnelLost: this.tunnelLost, sceneId: this.sceneId, audio: this.audioEnabled, moves: this.movesEnabled, bars: this.bars, spectators: this.server.spectatorCount, players: this.playerCount, sessionId: this.session?.id ?? null, seats: this.seatStates() }
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
    this.attachAssignedTokens()
    this.refreshProjection()
    this.emit(0)
    return { ...this.state(), seats: this.seatStates(created.codes) }
  }

  async stop(): Promise<void> {
    this.collaboration.command({type:"prompt",prompt:null})
    this.collaboration.command({type:"handout",handout:null})
    this.collaboration.command({type:"ack-safety"})
    await this.server.stop()
    this.enabled = false
    this.key = null
    this.publicUrl = null
    this.tunnel = null
    this.tunnelLost = false
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

  /** Liga cada assento ao token que o mestre atribuiu a ele (campo "Controlado por" do token). */
  private attachAssignedTokens(): void {
    const session = this.session
    const database = this.store.openWorld?.database
    if (!session || !database) return
    const assigned = new Map<string, string>()
    for (const token of database.list("token")) {
      const slotId = (token.data as TokenData).playerSlotId
      if (slotId && session.getSeat(slotId) && !assigned.has(slotId)) assigned.set(slotId, token.id)
    }
    for (const seat of session.list()) {
      const tokenId = assigned.get(seat.slotId) ?? null
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
    this.emit()
  }

  /** O processo do túnel morreu sozinho: o link público deixou de existir e o painel precisa dizer isso. */
  markTunnelLost(): void {
    this.publicUrl = null
    this.tunnel = null
    this.tunnelLost = true
    this.emit()
  }

  get currentPublicUrl(): string | null { return this.publicUrl }

  get currentPort(): number { return this.port }
  get currentKey(): string | null { return this.key }
  get isEnabled(): boolean { return this.enabled }

  setScene(sceneId: string | null): void {
    this.sceneId = typeof sceneId === "string" && sceneId ? sceneId : null
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
    if (this.enabled && center) this.server.publish({ type: "camera", center, zoom: this.table.zoom ?? null })
  }

  /**
   * Régua da ferramenta Régua do mestre. Só chega aos jogadores se for medida
   * na cena transmitida; a régua automática de arrastar tokens não passa por
   * aqui, para não revelar movimentos.
   */
  setRuler(value: unknown): void {
    const ruler = normalizeRuler(value)
    const visible = ruler && ruler.sceneId === this.lastProjection.scene?.id ? ruler : null
    if (!visible && !this.ruler) return
    this.ruler = visible
    if (this.enabled) this.server.publish({ type: "ruler", ruler: visible })
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
    if (change.kind === "put" && change.document.type === "log-entry") { this.publishFloat(change.document.data as LogData); return }
    // Token atribuído, reatribuído ou apagado: os assentos acompanham.
    if ((change.kind === "put" && change.document.type === "token") || change.kind === "delete") {
      this.attachAssignedTokens()
      this.emit()
    }
    if (change.kind === "put" || change.kind === "delete") this.publishSnapshot()
  }

  /** Repete o texto flutuante do Registro só para tokens que os jogadores veem. */
  private publishFloat(entry: LogData): void {
    if (!entry.tokenId || !entry.floatingText) return
    const visible = this.lastProjection.children.some((child) => child.type === "token" && child.id === entry.tokenId)
    if (visible) this.server.publish({ type: "float", tokenId: entry.tokenId, text: entry.floatingText, kind: entry.kind })
  }

  private refreshProjection(): void {
    const database = this.store.openWorld?.database
    if (!database) { this.lastProjection = { scene: null, children: [], assets: [], vision: null, regions: [] }; return }
    const targetId = this.sceneId ?? this.table.sceneId
    const scene = targetId ? database.get(targetId) : null
    if (!scene || scene.type !== "scene") { this.lastProjection = { scene: null, children: [], assets: [], vision: null, regions: [] }; return }
    const sceneData = scene.data as SceneData
    this.lastProjection = projectScene({
      scene: scene as WorldDocument<SceneData>,
      children: {
        tokens: database.list("token", scene.id) as WorldDocument<TokenData>[],
        tiles: database.list("tile", scene.id) as WorldDocument<TileData>[],
        drawings: database.list("drawing", scene.id) as WorldDocument<DrawingData>[],
        notes: database.list("note", scene.id) as WorldDocument<NoteData>[],
        regions: database.list("region", scene.id) as WorldDocument<RegionData>[],
      },
      bars: this.bars,
      vision: this.vision?.get(scene.id) ?? null,
    })
    // Touching the value above documents the intentional opaque cast: the
    // database is generic, while projectScene is the only place that reads
    // and strips fields before they reach the transport.
    void sceneData
  }

  /** Cena cujos sons do mapa são ouvidos: a fixada na transmissão ou a aberta pelo mestre. */
  get audibleSceneId(): string | null { return this.sceneId ?? this.table.sceneId }

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
    if(value && typeof value === "object" && ["reply","safety"].includes(String((value as {type?:unknown}).type))) {
      const requestType=(value as {type:string}).type === "safety"?"safety" as const:"reply" as const
      try { if(!this.enabled)throw new Error("Sala encerrada.");this.collaboration.reply(value,seat??null,randomSecret(12));this.server.publishTo(client=>({type:"collaboration",collaboration:this.collaboration.publicSnapshot(client?.slotId)}));return {type:"collaboration-result",requestType,ok:true} }
      catch(e){return {type:"collaboration-result",requestType,ok:false,reason:e instanceof Error?e.message:String(e)}}
    }
    const request = normalizeMoveRequest(value)
    if (!request) return null
    const reject = (reason: string): PlayerWireMessage => ({ type: "move-result", tokenId: request.tokenId, ok: false, reason })
    if (!this.enabled || !this.movesEnabled) return reject("O mestre não está permitindo mover tokens agora.")
    const database = this.store.openWorld?.database
    if (!database || !this.commit) return reject("Nenhuma mesa aberta.")
    const result = validatePlayerMove(database, this.lastProjection.scene?.id ?? null, request)
    if (!result.ok) return reject(result.reason)
    // A network client can move only the token attached to its own seat. The
    // optional parameter keeps the pure unit-test entry point useful; the
    // PlayerServer always supplies null for spectators and an identity for
    // authenticated players.
    if (seat !== undefined && (!seat || result.token.data.playerSlotId !== seat.slotId)) return reject("Esse token pertence a outro jogador.")
    this.commit(putDocument(database, { id: result.token.id, type: "token", parentId: result.token.parentId, data: result.token.data }).change)
    return { type: "move-result", tokenId: request.tokenId, ok: true }
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
    if (this.ruler && this.ruler.sceneId !== this.lastProjection.scene?.id) this.ruler = null
    this.server.publishTo(seat=>this.snapshotMessage(seat))
  }

  private snapshotMessage(seat?:PlayerSeatConnection|null): PlayerWireMessage {
    return { type: "snapshot", collaboration:this.collaboration.publicSnapshot(seat?.slotId), projection: this.lastProjection, ruler: this.ruler, audio: this.audioEnabled ? { ...this.audio, now: Date.now() } : null, moves: this.movesEnabled }
  }

  collaborationCommand(value:unknown) {
    if(!this.enabled && !(value && typeof value === "object" && (value as {type?:unknown}).type === "consume-diary"))throw new Error("Abra uma sala do VTT para iniciar esta atividade.")
    const result=this.collaboration.command(value)
    this.server.publishTo(seat=>({type:"collaboration",collaboration:this.collaboration.publicSnapshot(seat?.slotId)}))
    return result
  }

  private emit(spectators = this.server.spectatorCount): void {
    this.onStateChange({ ...this.state(), spectators, players: this.playerCount })
  }

  private seatStates(codes: Record<string, string> = {}): PlayerSeatState[] {
    return this.session?.snapshot().seats.map((seat) => ({ ...seat, ...(codes[seat.slotId] ? { code: codes[seat.slotId] } : {}) })) ?? []
  }
}
