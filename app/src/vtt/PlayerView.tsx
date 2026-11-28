import { PlayerActivity } from "./PlayerActivity"
import type { PublicCollaboration } from "./shared/collaboration"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { FlipHorizontal2, Hand, KeyRound, LoaderCircle, LocateFixed, LogOut, Ruler, Volume2, VolumeX, ZoomIn, ZoomOut } from "lucide-react"
import type { SceneChildren } from "./document-store"
import { configurePlayerAssets, resolveAssetUrl } from "./api"
import { AudioEngine } from "./audio-engine"
import { DEFAULT_AUDIO_MIX, type AudioState } from "./shared/audio"
import { FLOAT_COLORS, SceneView, type SceneTool } from "./canvas/SceneView"
import { useSceneKeyboard } from "./canvas/keyboard"
import { actionForKey, defaultKeyBindings, keyLabel, PAN_ACTIONS, type PanAction } from "./shared/settings"
import type { PlayerProjection, PlayerRuler, PlayerWireMessage } from "./shared/player"
import type { SceneData } from "./shared/scene"
import type { WorldDocument } from "./shared/world"
import { PING_INTERVAL_MS, connectionIsDead, reconnectDelay } from "./shared/reconnect"
import { DEFAULT_CAMERA_RULES, ENTER_SPAN, movedTokens, normalizeCameraRules, pickFocusToken, tokenPixels, zoomForSpan, type CameraRules, type CameraToken } from "./shared/player-camera"

const BINDINGS = defaultKeyBindings()
const VOLUME_KEY = "runas-codex:sala-volume"
/** 1.9: o jogador escolheu seguir o próprio token (preferência deste aparelho). */
const FOLLOW_KEY = "runas-codex:sala-seguir"

/** 1.9.1: com a câmera no token, intervalo entre passos ao segurar uma tecla (abaixo do limite de 8 pedidos/s da sala). */
const STEP_MS = 180

const isPanAction = (action: string | null): action is PanAction => action !== null && action in PAN_ACTIONS

function readFollow(): boolean {
  try { return localStorage.getItem(FOLLOW_KEY) === "1" } catch { return false }
}

interface PlayerSeatIdentity { slotId: string; label: string }

function readVolume(): number {
  try { const value = Number(localStorage.getItem(VOLUME_KEY)); return Number.isFinite(value) && localStorage.getItem(VOLUME_KEY) !== null ? Math.min(1, Math.max(0, value)) : 0.8 } catch { return 0.8 }
}

function documentOf(value: { id: string; type: WorldDocument["type"]; parentId: string | null; sort: number; data: unknown }): WorldDocument {
  // Timestamps are intentionally synthetic: they are not part of the wire
  // projection and the player renderer never persists these documents.
  return { ...value, createdAt: 0, updatedAt: 0 }
}

function childrenOf(projection: PlayerProjection): { scene: WorldDocument<SceneData> | null; children: SceneChildren | null } {
  if (!projection.scene) return { scene: null, children: null }
  const scene = documentOf({ id: projection.scene.id, type: "scene", parentId: null, sort: 0, data: projection.scene.data }) as WorldDocument<SceneData>
  const children: SceneChildren = { tokens: [], tiles: [], drawings: [], notes: [], walls: [], lights: [], sounds: [], regions: [] }
  for (const child of projection.children) {
    // Porta: só o meio dela chega; vira uma “parede” de ponto, que desenha só o ícone.
    if (child.type === "door") {
      const { x, y, open, locked } = child.data
      children.walls.push(documentOf({ ...child, type: "wall", data: { x1: x, y1: y, x2: x, y2: y, kind: "door", open, doorLocked: locked } }) as SceneChildren["walls"][number])
      continue
    }
    const document = documentOf(child)
    if (child.type === "token") children.tokens.push(document as unknown as SceneChildren["tokens"][number])
    else if (child.type === "tile") children.tiles.push(document as unknown as SceneChildren["tiles"][number])
    else if (child.type === "drawing") children.drawings.push(document as unknown as SceneChildren["drawings"][number])
    else children.notes.push(document as unknown as SceneChildren["notes"][number])
  }
  return { scene, children }
}

/**
 * Página dos jogadores. A câmera é de cada espectador: ela só muda quando o
 * mestre usa "Puxar a câmera". A régua do espectador fica só na tela dele.
 */
export function PlayerView() {
  const [activity,setActivity]=useState<PublicCollaboration>({prompt:null,handout:null,safetySignals:0})
  const [activityStatus,setActivityStatus]=useState("")
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<SceneView | null>(null)
  const projection = useRef<PlayerProjection>({ scene: null, children: [], assets: [], vision: null, regions: [] })
  const ruler = useRef<PlayerRuler | null>(null)
  const pendingCamera = useRef<{ center: { x: number; y: number }; zoom: number | null } | null>(null)
  const pendingFloats = useRef<{ tokenId: string; text: string; color: number }[]>([])
  const [connected, setConnected] = useState(false)
  // Verdadeiro entre a queda do WebSocket e a volta: o mapa continua na tela.
  const [reconnecting, setReconnecting] = useState(false)
  const [ready, setReady] = useState(false)
  const [revision, setRevision] = useState(0)
  // A câmera se recalcula sozinha (tela redimensionada, token escolhido), sem redesenhar a cena e a névoa.
  const [cameraTick, setCameraTick] = useState(0)
  const [tool, setTool] = useState<SceneTool>("select")
  const audio = useRef<AudioState | null>(null)
  const engine = useRef<AudioEngine | null>(null)
  // Navegadores só tocam som depois de um clique; a janela local do VTT (Electron) já pode.
  const [soundOn, setSoundOn] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [volume, setVolume] = useState(readVolume)
  const [playingCount, setPlayingCount] = useState(0)
  const socket = useRef<WebSocket | null>(null)
  const [moves, setMoves] = useState(false)
  const [notice, setNotice] = useState("")
  const transmissionKey = new URLSearchParams(location.search).get("k")
  const [seat, setSeat] = useState<PlayerSeatIdentity | null>(null)
  // O SceneView guarda os callbacks do primeiro render: a porta lê o assento por aqui.
  const seatRef = useRef<PlayerSeatIdentity | null>(null)
  seatRef.current = seat
  const [lobbyOpen, setLobbyOpen] = useState(Boolean(transmissionKey))
  const [lobbyCode, setLobbyCode] = useState("")
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState("")
  const pendingRejects = useRef<{ tokenId: string; reason: string }[]>([])
  const selected = useRef<string[]>([])
  // Câmera dos jogadores (1.9): regras do mestre, o seguir do jogador e o que a câmera já fez nesta cena.
  const [cameraRules, setCameraRules] = useState<CameraRules>(DEFAULT_CAMERA_RULES)
  const [follow, setFollow] = useState(readFollow)
  const camera = useRef<{ sceneId: string | null; focused: boolean; lastSelected: string | null; lastMoved: string | null; positions: Map<string, { x: number; y: number }> }>({ sceneId: null, focused: false, lastSelected: null, lastMoved: null, positions: new Map() })
  const [focusToken, setFocusToken] = useState<CameraToken | null>(null)
  // 1.9.1: com a câmera no token (trava do mestre ou Seguir), WASD e setas andam com ele, uma célula por passo.
  const focusId = useRef<string | null>(null)
  const walk = useRef<{ tokenId: string; target: { x: number; y: number } } | null>(null)
  const walkKeys = useRef(new Set<PanAction>())
  const walkTimer = useRef<number | null>(null)
  const lastStep = useRef(0)

  useEffect(() => {
    const key = transmissionKey
    if (!key) return
    configurePlayerAssets(`${location.origin}/assets/`, key)
    let disposed = false
    void fetch(`/seat?k=${encodeURIComponent(key)}`, { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (disposed) return
      if (!response.ok) return
      const body = await response.json() as { seat?: PlayerSeatIdentity }
      if (body.seat) { setSeat(body.seat); setLobbyOpen(false) }
    }).catch(() => undefined)
    const wsUrl = `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/socket?k=${encodeURIComponent(key)}`
    let ws: WebSocket | null = null
    let attempt = 0
    let retry: number | null = null
    let lastMessageAt = Date.now()

    function handle(event: MessageEvent): void {
      lastMessageAt = Date.now()
      let message: PlayerWireMessage
      try { message = JSON.parse(String(event.data)) as PlayerWireMessage } catch { return }
      if (message.type === "snapshot") { setActivity(message.collaboration??{prompt:null,handout:null,safetySignals:0}); projection.current = message.projection; ruler.current = message.ruler; audio.current = message.audio; setMoves(message.moves); setCameraRules(normalizeCameraRules(message.camera)) }
      else if (message.type === "projection-patch") {
        const current = projection.current
        const byId = new Map(current.children.map((child) => [child.id, child]))
        for (const id of message.removed) byId.delete(id)
        for (const child of message.upsert) byId.set(child.id, child)
        projection.current = {
          ...current,
          ...(Object.prototype.hasOwnProperty.call(message, "scene") ? { scene: message.scene ?? null } : {}),
          children: [...byId.values()].sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id)),
          ...(message.assets ? { assets: message.assets } : {}),
          ...(Object.prototype.hasOwnProperty.call(message, "vision") ? { vision: message.vision ?? null } : {}),
          ...(message.regions ? { regions: message.regions } : {}),
        }
      }
      else if(message.type === "collaboration"){setActivity(message.collaboration);setActivityStatus("")}
      else if(message.type === "collaboration-result"){if(message.requestType==="safety")setNotice(message.ok?"Carta X enviada sem identificação.":message.reason??"Não foi possível enviar.");else setActivityStatus(message.ok?"Resposta recebida.":message.reason??"Não foi possível enviar.")}
      else if (message.type === "moves") setMoves(message.moves)
      else if (message.type === "camera-rules") setCameraRules(normalizeCameraRules(message.rules))
      else if (message.type === "door-result") { if (!message.ok) setNotice(message.reason ?? "A porta não abriu.") }
      else if (message.type === "move-result") { if (!message.ok) pendingRejects.current.push({ tokenId: message.tokenId, reason: message.reason ?? "Movimento recusado." }) }
      else if (message.type === "audio") audio.current = message.audio
      else if (message.type === "ruler") ruler.current = message.ruler
      else if (message.type === "camera") pendingCamera.current = { center: message.center, zoom: message.zoom }
      else if (message.type === "float") pendingFloats.current.push({ tokenId: message.tokenId, text: message.text, color: FLOAT_COLORS[message.kind] ?? FLOAT_COLORS.info })
      else return
      setRevision((value) => value + 1)
    }

    function scheduleRetry(): void {
      if (disposed || retry !== null) return
      retry = window.setTimeout(() => { retry = null; open() }, reconnectDelay(attempt))
      attempt += 1
    }

    function open(): void {
      if (disposed || (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING))) return
      const next = new WebSocket(wsUrl)
      ws = next
      socket.current = next
      next.onopen = () => { if (disposed || ws !== next) return; attempt = 0; lastMessageAt = Date.now(); setConnected(true); setReconnecting(false) }
      // O `onerror` do WebSocket não traz motivo e sempre é seguido de `onclose`.
      next.onclose = () => { if (ws === next) drop() }
      next.onmessage = handle
    }

    /** Abandona a conexão atual (caiu ou está semimorta) e programa a volta. */
    function drop(): void {
      const current = ws
      ws = null
      socket.current = null
      if (current) { current.onopen = null; current.onclose = null; current.onmessage = null; try { current.close() } catch { /* já fechado */ } }
      if (disposed) return
      setConnected(false)
      setReconnecting(true)
      scheduleRetry()
    }

    /** Voltou a rede ou a aba: não espera o temporizador e confere se a conexão ainda vive. */
    function wake(): void {
      if (disposed || document.visibilityState === "hidden") return
      if (ws?.readyState === WebSocket.OPEN) { if (connectionIsDead(lastMessageAt, Date.now())) drop(); else ws.send('{"type":"ping"}'); return }
      if (retry !== null) { window.clearTimeout(retry); retry = null }
      attempt = 0
      open()
    }

    const heartbeat = window.setInterval(() => {
      if (ws?.readyState !== WebSocket.OPEN) return
      if (connectionIsDead(lastMessageAt, Date.now())) { drop(); return }
      ws.send('{"type":"ping"}')
    }, PING_INTERVAL_MS)
    document.addEventListener("visibilitychange", wake)
    window.addEventListener("online", wake)
    open()
    return () => {
      disposed = true
      window.clearInterval(heartbeat)
      if (retry !== null) window.clearTimeout(retry)
      document.removeEventListener("visibilitychange", wake)
      window.removeEventListener("online", wake)
      socket.current = null
      const current = ws
      ws = null
      if (current) { current.onopen = null; current.onclose = null; current.onmessage = null; current.close() }
    }
  }, [transmissionKey])

  async function joinSeat(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!transmissionKey || !lobbyCode.trim()) return
    setJoining(true)
    setJoinError("")
    try {
      const response = await fetch(`/seat/join?k=${encodeURIComponent(transmissionKey)}`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: lobbyCode.trim() }) })
      const body = await response.json().catch(() => ({})) as { seat?: PlayerSeatIdentity; error?: string }
      if (!response.ok || !body.seat) { setJoinError(body.error ?? "Não foi possível entrar com esse código."); return }
      // O cookie só é aplicado ao próximo upgrade; recarregar reconecta a Vista
      // já identificada e preserva a transmissão em outra aba se necessário.
      location.reload()
    } catch {
      setJoinError("Não foi possível alcançar o servidor da mesa.")
    } finally { setJoining(false) }
  }

  /** U78: libera o assento deste aparelho e volta ao lobby, para entrar com outro código ou ficar só assistindo. */
  async function leaveSeat(): Promise<void> {
    if (!seat || !window.confirm(`Sair da mesa como ${seat.label}? Para voltar, peça o código ao mestre ou use o mesmo de novo.`)) return
    try {
      const query = transmissionKey ? `?k=${encodeURIComponent(transmissionKey)}` : ""
      const response = await fetch(`/seat/leave${query}`, { method: "POST", credentials: "same-origin", cache: "no-store" })
      if (!response.ok) throw new Error(String(response.status))
      // Recarregar volta como espectador, sem o cookie, com o lobby aberto (como ao entrar).
      location.reload()
    } catch {
      setNotice("Não deu para sair agora: a mesa não respondeu. Tente de novo em instantes.")
    }
  }

  useEffect(() => {
    const element = host.current
    if (!element) return
    let disposed = false
    void SceneView.create(element, {
      onSelectionChange: (ids) => {
        selected.current = ids
        // Só conta o último token do próprio jogador: é nele que a câmera fica.
        const own = ids.filter((id) => camera.current.positions.has(id)).at(-1)
        if (own && own !== camera.current.lastSelected) { camera.current.lastSelected = own; setCameraTick((value) => value + 1) }
      },
      // Arrastar o mapa com o seguir ligado (sem trava do mestre) desliga o seguir.
      // A tela mudou de tamanho: o limite de afastamento depende dela.
      onScreenResize: () => setCameraTick((value) => value + 1),
      onFollowBreak: () => { setFollow(false); setNotice("Seguir meu token desligado. Toque no alvo para voltar.") },
      onPut: () => undefined,
      onRemove: () => undefined,
      onOpenNote: () => undefined,
      // O VTT confere o pedido (Jogador, paredes, mapa) e devolve a cena atualizada, ou a recusa.
      onMove: (tokenId, position) => { const open = socket.current; if (open?.readyState === WebSocket.OPEN) open.send(JSON.stringify({ type: "move", tokenId, x: position.x, y: position.y })) },
      // Porta destrancada: o VTT abre ou fecha e devolve a cena; trancada, só avisa (o VTT recusaria de todo jeito).
      onDoor: (doorId, locked) => {
        if (locked) { setNotice("A porta está trancada: só o mestre abre."); return }
        if (!seatRef.current) { setNotice("Entre na mesa com o código do mestre para abrir portas."); return }
        const open = socket.current
        if (open?.readyState === WebSocket.OPEN) open.send(JSON.stringify({ type: "door", doorId }))
      },
    }, { editable: false }).then((created) => {
      if (disposed) { created.destroy(); return }
      view.current = created
      setReady(true)
    })
    return () => { disposed = true; view.current?.destroy(); view.current = null }
  }, [])

  useEffect(() => {
    const current = view.current
    if (!ready || !current) return
    const { scene, children } = childrenOf(projection.current)
    current.setScene(scene, children)
    const pending = walk.current
    if (pending) {
      const saved = current.tokenPosition(pending.tokenId)
      if (!saved) walk.current = null
      else if (saved.x === pending.target.x && saved.y === pending.target.y) { if (walkKeys.current.size === 0) walk.current = null }
      // Passo ainda sem resposta: a cena nova não puxa o token (nem a câmera) de volta.
      else current.placeToken(pending.tokenId, pending.target)
    }
    placeCamera(current, scene, children)
    current.setVision(projection.current.vision)
    current.setPlayerRegions(projection.current.regions ?? [])
    current.setRemoteRuler(ruler.current)
    // Com a câmera presa ao token, “Puxar a câmera” não desfaz a trava (o VTT já nem manda; isto cobre a corrida).
    if (pendingCamera.current) { if (!(cameraRules.lockToToken && camera.current.focused)) current.setCamera(pendingCamera.current.center, pendingCamera.current.zoom); pendingCamera.current = null }
    for (const float of pendingFloats.current.splice(0)) current.floatText(float.tokenId, float.text, float.color)
    for (const reject of pendingRejects.current.splice(0)) {
      // Recusado (parede, porta, borda): para de andar até a tecla ser apertada de novo.
      if (walk.current?.tokenId === reject.tokenId) { walk.current = null; stopWalking(); placeCamera(current, scene, children) }
      current.revertToken(reject.tokenId)
      setNotice(reject.reason)
    }
    engine.current?.apply(audio.current)
    setPlayingCount(audio.current?.sounds.length ?? 0)
  }, [ready, revision])

  // Regras do mestre, Seguir, assento, tela ou token escolhido: só a câmera muda (a cena e a névoa ficam como estão).
  useEffect(() => {
    const current = view.current
    if (!ready || !current) return
    const { scene, children } = childrenOf(projection.current)
    placeCamera(current, scene, children)
  }, [ready, cameraRules, follow, seat, cameraTick])

  useEffect(() => { try { localStorage.setItem(FOLLOW_KEY, follow ? "1" : "0") } catch { /* preferência opcional */ } }, [follow])

  /**
   * Câmera dos jogadores (1.9). Ao entrar numa cena com token próprio, centraliza nele e enquadra ENTER_SPAN vezes o
   * tamanho dele. Seguindo (escolha do jogador ou trava do mestre), a câmera acompanha o token; com a trava, o mapa não
   * se arrasta e o afastamento para em `maxZoomOut` vezes o token. Nada é escondido: todo token revelado continua
   * desenhado, perto ou longe.
   */
  function placeCamera(current: SceneView, scene: WorldDocument<SceneData> | null, children: SceneChildren | null) {
    const state = camera.current
    const sceneId = scene?.id ?? null
    if (sceneId !== state.sceneId) { state.sceneId = sceneId; state.focused = false; state.positions = new Map() }
    const own: CameraToken[] = scene && children && seat ? children.tokens
      .filter((token) => token.data.disposition === "player" && token.data.playerSlotId === seat.slotId)
      .map((token) => ({ id: token.id, x: token.data.x, y: token.data.y, size: token.data.size })) : []
    const moved = movedTokens(state.positions, own)
    if (moved.length) state.lastMoved = moved[moved.length - 1]!
    state.positions = new Map(own.map((token) => [token.id, { x: token.x, y: token.y }]))
    const focus = pickFocusToken(own, state.lastSelected, state.lastMoved)
    focusId.current = focus?.id ?? null
    setFocusToken((previous) => previous?.id === focus?.id && previous?.x === focus?.x && previous?.y === focus?.y && previous?.size === focus?.size ? previous : focus)
    if (!scene || !focus) { current.setCameraFollow(null); return }
    const size = tokenPixels(focus.size, scene.data.grid)
    const screen = current.viewSize()
    const locked = cameraRules.lockToToken
    const floor = locked ? zoomForSpan(screen, size, cameraRules.maxZoomOut) : null
    if (!state.focused) {
      state.focused = true
      current.setCameraFollow(null, floor)
      current.setCamera({ x: focus.x, y: focus.y }, zoomForSpan(screen, size, ENTER_SPAN))
    }
    const point = walk.current?.tokenId === focus.id ? walk.current.target : { x: focus.x, y: focus.y }
    current.setCameraFollow(locked || follow ? { point, locked } : null, floor)
  }

  /** Um passo na direção das teclas seguradas; toques rápidos não passam do limite da sala. */
  function walkStep(): void {
    const current = view.current
    const id = focusId.current
    let x = 0
    let y = 0
    for (const action of walkKeys.current) { x += PAN_ACTIONS[action][0]; y += PAN_ACTIONS[action][1] }
    if (!current || !id || (x === 0 && y === 0)) return
    const now = performance.now()
    if (now - lastStep.current < STEP_MS - 20) return
    const from = walk.current?.tokenId === id ? walk.current.target : null
    const next = current.stepToken(id, Math.sign(x), Math.sign(y), from)
    if (!next) return
    lastStep.current = now
    walk.current = { tokenId: id, target: next }
  }

  function stopWalking(): void {
    walkKeys.current.clear()
    if (walkTimer.current !== null) { window.clearInterval(walkTimer.current); walkTimer.current = null }
  }
  useEffect(() => {
    window.addEventListener("blur", stopWalking)
    return () => { window.removeEventListener("blur", stopWalking); stopWalking() }
  }, [])

  // Um só volume na página (o mestre já equilibra música, ambiente e efeitos).
  useEffect(() => {
    const created = new AudioEngine(resolveAssetUrl, { ...DEFAULT_AUDIO_MIX, master: readVolume(), music: 1, ambient: 1, effects: 1 }, false)
    created.onBlocked = () => setBlocked(true)
    engine.current = created
    return () => { created.destroy(); engine.current = null }
  }, [])
  useEffect(() => {
    engine.current?.setMix({ master: soundOn ? volume : 0, music: 1, ambient: 1, effects: 1 })
    try { localStorage.setItem(VOLUME_KEY, String(volume)) } catch { /* preferência opcional */ }
  }, [volume, soundOn])

  function enableSound() {
    setSoundOn(true)
    setBlocked(false)
    engine.current?.unlock()
    engine.current?.apply(audio.current)
  }

  useEffect(() => { view.current?.setTool(tool) }, [tool, ready])
  // Só tokens "Jogador", e só enquanto o mestre permitir.
  useEffect(() => {
    view.current?.setMovable((document) => {
      const data = document.data as { disposition?: string; playerSlotId?: string }
      return moves && Boolean(seat) && document.type === "token" && data.disposition === "player" && data.playerSlotId === seat?.slotId
    })
  }, [moves, ready, seat])
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(""), 3500)
    return () => window.clearTimeout(timer)
  }, [notice])

  // Tokens deste jogador na cena: o “virar” (F ou o botão) vale para o selecionado, ou para todos os dele.
  const ownTokens = seat ? projection.current.children.filter((child) => {
    const data = child.data as { disposition?: string; playerSlotId?: string; locked?: boolean }
    return child.type === "token" && data.disposition === "player" && data.playerSlotId === seat.slotId && !data.locked
  }).map((child) => child.id) : []
  const canFlip = moves && ownTokens.length > 0
  const flipOwn = () => {
    const open = socket.current
    if (!canFlip || open?.readyState !== WebSocket.OPEN) return
    const chosen = selected.current.filter((id) => ownTokens.includes(id))
    for (const tokenId of chosen.length ? chosen : ownTokens) open.send(JSON.stringify({ type: "flip", tokenId }))
  }
  const keyboard = useSceneKeyboard(view, BINDINGS, (action) => {
    if (action === "flipToken") flipOwn()
    else if (action === "toolRuler") setTool("ruler")
    else if (action === "toolSelect" || action === "cancel") setTool("select")
  }, false)
  useEffect(() => {
    // Câmera no token (trava do mestre ou Seguir): as teclas de direção andam com ele em vez de mover a câmera.
    const walking = (event: KeyboardEvent) => {
      if (!(cameraRules.lockToToken || follow) || !focusToken || event.ctrlKey || event.metaKey || event.altKey) return null
      if ((event.target as HTMLElement | null)?.closest?.("input, select, textarea")) return null
      const action = actionForKey(BINDINGS, event.code)
      return isPanAction(action) ? action : null
    }
    const down = (event: KeyboardEvent) => {
      const action = walking(event)
      if (!action) { keyboard.onKeyDown(event); return }
      event.preventDefault()
      if (event.repeat || walkKeys.current.has(action)) return
      walkKeys.current.add(action)
      if (!moves || !seat) { setNotice("O mestre não liberou mover os tokens agora."); return }
      if (walkTimer.current === null) { walkStep(); walkTimer.current = window.setInterval(walkStep, STEP_MS) }
    }
    const up = (event: KeyboardEvent) => {
      const action = walking(event)
      if (!action) { keyboard.onKeyUp(event); return }
      walkKeys.current.delete(action)
      if (walkKeys.current.size === 0) stopWalking()
    }
    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up) }
  })

  const shortcut = (action: "toolSelect" | "toolRuler") => BINDINGS[action].map(keyLabel).join(" / ")

  return <main className="player-page" aria-label="Sala dos jogadores">
    <PlayerActivity key={`${activity.prompt?.id??""}:${activity.handout?.id??""}`} activity={activity} canReply={Boolean(seat&&connected)} status={activityStatus} onReply={reply=>{if(socket.current?.readyState===WebSocket.OPEN){socket.current.send(JSON.stringify(reply));if(reply.type!=="safety")setActivityStatus("Enviando…")}else setActivityStatus("Aguarde a reconexão para enviar.")}}/>
    <div ref={host} className="player-host" />
    {(connected || reconnecting) && <nav className="player-tools" aria-label="Ferramentas do espectador">
      <button className={tool === "select" ? "active" : ""} title={`Mover o mapa (${shortcut("toolSelect")})`} aria-label="Mover o mapa" onClick={() => setTool("select")}><Hand size={17} /></button>
      <button className={tool === "ruler" ? "active" : ""} title={`Régua, só na sua tela (${shortcut("toolRuler")})`} aria-label="Régua" onClick={() => setTool("ruler")}><Ruler size={17} /></button>
      <span className="player-tools-divider" aria-hidden="true" />
      <button title="Aproximar (ou afaste dois dedos na tela)" aria-label="Aproximar" onClick={() => view.current?.zoomBy(1.25)}><ZoomIn size={17} /></button>
      <button title="Afastar (ou aproxime dois dedos na tela)" aria-label="Afastar" onClick={() => view.current?.zoomBy(0.8)}><ZoomOut size={17} /></button>
      {focusToken && <button className={cameraRules.lockToToken || follow ? "active" : ""} aria-pressed={cameraRules.lockToToken || follow} aria-disabled={cameraRules.lockToToken}
        title={cameraRules.lockToToken ? "O mestre prendeu a câmera ao seu token: WASD ou setas andam com ele" : follow ? "Seguindo o seu token (WASD ou setas andam com ele): toque para soltar" : "Seguir meu token"} aria-label="Seguir meu token"
        onClick={() => { if (cameraRules.lockToToken) setNotice(`O mestre prendeu a câmera ao seu token (afastamento até ${cameraRules.maxZoomOut} vezes o tamanho dele).`); else setFollow((value) => !value) }}><LocateFixed size={17} /></button>}
      {canFlip && <><span className="player-tools-divider" aria-hidden="true" /><button title={`Virar meu token (${BINDINGS.flipToken.map(keyLabel).join(" / ")})`} aria-label="Virar meu token" onClick={flipOwn}><FlipHorizontal2 size={17} /></button></>}
      {seat && <><span className="player-tools-divider" aria-hidden="true" /><button title={`Sair da mesa (${seat.label})`} aria-label="Sair da mesa" data-player-leave onClick={() => void leaveSeat()}><LogOut size={17} /></button></>}
    </nav>}
    {connected && <div className="player-audio">
      {soundOn
        ? <><button className="icon-button" title="Silenciar" aria-label="Silenciar" onClick={() => setSoundOn(false)}><Volume2 size={16} /></button><input type="range" min={0} max={1} step={0.05} value={volume} aria-label="Volume" onChange={(event) => setVolume(Number(event.target.value))} /></>
        : <button className={`sound-button ${playingCount > 0 || blocked ? "attention" : ""}`} onClick={enableSound}><VolumeX size={16} /> Ativar som{playingCount > 0 ? ` (${playingCount} tocando)` : ""}</button>}
    </div>}
    {notice && <div className="player-notice" role="status">{notice}</div>}
    {!connected && <div className="player-status" role="status">{reconnecting ? "Reconectando…" : "Aguardando a transmissão…"}</div>}
    {lobbyOpen && <div className="player-lobby"><div className="player-lobby-card"><KeyRound size={26} className="player-lobby-icon" /><h1>Entrar como jogador</h1><p>Insira o código que o mestre entregou para controlar o seu token na mesa.</p><form onSubmit={(event) => void joinSeat(event)}><label><span>Código do jogador</span><input autoFocus value={lobbyCode} onChange={(event) => setLobbyCode(event.target.value.toUpperCase())} placeholder="ABCD-EFGH" autoComplete="one-time-code" maxLength={32} /></label><button className="primary" type="submit" disabled={joining || !lobbyCode.trim()}>{joining ? <><LoaderCircle size={15} className="spin" /> Entrando…</> : <><KeyRound size={15} /> Entrar na mesa</>}</button></form>{joinError && <div className="player-lobby-error" role="alert">{joinError}</div>}<button className="ghost" onClick={() => setLobbyOpen(false)}>Continuar como espectador</button></div></div>}
    {seat && <div className="player-seat-badge"><span>Você está como <strong>{seat.label}</strong></span></div>}
  </main>
}
