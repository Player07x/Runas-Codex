import { platform } from "../platform"
import { CollaborationRoom } from "./shared/collaboration"
import { assetUrl, type DocumentChange, type PlayerDisplay, type PlayerState, type VttApi } from "./shared/ipc"
import { normalizeDocumentData, type AssetPath } from "./shared/scene"
import { createWorldManifest, type WorldDocument, type WorldSummary } from "./shared/world"
import { createRemoteVttApi, masterConnection, remoteAssetUrl, type RemoteVttApi } from "./remote-api"

/** Na visualização em navegador comum, imagens importadas viram URLs `blob:`. */
const previewAssets = new Map<AssetPath, string>()
let playerAssetEndpoint: { base: string; key: string } | null = null

/** Configura o resolvedor para a página pública dos jogadores, que não tem a ponte do app. */
export function configurePlayerAssets(base: string, key: string): void {
  playerAssetEndpoint = { base: base.endsWith("/") ? base : `${base}/`, key }
}

/**
 * Fora do app desktop (navegador, GitHub Pages) não existe a ponte. Esta prévia em memória deixa a mesa utilizável
 * para experimentar: nada é gravado, e a transmissão para os jogadores só é simulada.
 */
function createBrowserPreviewApi(): VttApi {
  const collaboration=new CollaborationRoom()
  const worlds: WorldSummary[] = []
  const documents = new Map<string, WorldDocument>()
  const documentListeners = new Set<(change: DocumentChange) => void>()
  const playerListeners = new Set<(value: PlayerState) => void>()
  const player: PlayerState = { enabled: false, port: 30000, key: null, localUrl: null, publicUrl: null, tunnel: null, tunnelLost: false, sceneId: null, audio: true, moves: true, bars: "friendly", spectators: 0, players: 0, sessionId: null, seats: [] }
  const emitPlayer = () => playerListeners.forEach((listener) => listener({ ...player }))
  return {
    collaboration: {state:async()=>collaboration.snapshot(),command:async command=>collaboration.command(command)},
    listWorlds: async () => [...worlds].sort((a, b) => b.updatedAt - a.updatedAt),
    createWorld: async (input) => {
      const manifest = createWorldManifest(input, crypto.randomUUID(), Date.now())
      const world = { ...manifest, path: `memória/${manifest.id}`, scenes: 0 }
      worlds.push(world)
      return world
    },
    openWorld: async (id) => {
      const world = worlds.find((candidate) => candidate.id === id)
      if (!world) throw new Error("Mesa não encontrada.")
      world.updatedAt = Date.now()
      return world
    },
    closeWorld: async () => collaboration.reset(),
    documents: {
      list: async (type, parentId) => [...documents.values()].filter((document) => document.type === type && (parentId === undefined || document.parentId === parentId)),
      put: async (input) => {
        const now = Date.now()
        const existing = documents.get(input.id)
        const document: WorldDocument = { id: input.id, type: input.type, parentId: input.parentId, sort: input.sort ?? existing?.sort ?? now, data: normalizeDocumentData(input.type, input.data), createdAt: existing?.createdAt ?? now, updatedAt: now }
        documents.set(document.id, document)
        documentListeners.forEach((listener) => listener({ kind: "put", document }))
        return document
      },
      remove: async (id) => {
        const ids = [id, ...[...documents.values()].filter((document) => document.parentId === id).map((document) => document.id)]
        ids.forEach((candidate) => documents.delete(candidate))
        documentListeners.forEach((listener) => listener({ kind: "delete", ids }))
      },
      clearLog: async () => {
        const ids = [...documents.values()].filter((document) => document.type === "log-entry").map((document) => document.id)
        if (ids.length === 0) return 0
        ids.forEach((candidate) => documents.delete(candidate))
        documentListeners.forEach((listener) => listener({ kind: "delete", ids }))
        return ids.length
      },
      onChange: (listener) => { documentListeners.add(listener); return () => { documentListeners.delete(listener) } },
    },
    table: { report: async () => undefined },
    player: {
      state: async () => ({ ...player }),
      onState: (listener) => { playerListeners.add(listener); return () => { playerListeners.delete(listener) } },
      displays: async (): Promise<PlayerDisplay[]> => [{ id: "preview", label: "Esta tela", bounds: { x: 0, y: 0, width: 1280, height: 720 }, workArea: { x: 0, y: 0, width: 1280, height: 720 } }],
      start: async (port, seatCount) => {
        player.enabled = true
        player.port = port ?? 30000
        player.key = "preview"
        player.localUrl = `http://localhost:${player.port}/?k=preview`
        const count = Math.max(1, Math.min(12, Math.floor(seatCount ?? 1)))
        player.sessionId = "preview-session"
        player.seats = Array.from({ length: count }, (_, index) => ({ slotId: `player-${index + 1}`, label: `Jogador ${index + 1}`, code: `PREVIEW-${index + 1}`, status: "available" as const, tokenId: null, revision: 0, lastSeenAt: null }))
        emitPlayer()
        return { ...player }
      },
      stop: async () => { player.enabled = false; player.key = null; player.localUrl = null; player.publicUrl = null; player.sessionId = null; player.players = 0; player.spectators = 0; player.seats = []; emitPlayer() },
      rotateSeatCode: async (slotId) => { const seat = player.seats.find((candidate) => candidate.slotId === slotId); if (!seat) throw new Error("Assento de jogador não encontrado."); seat.code = `PREVIEW-${slotId.toUpperCase()}-${Date.now()}`; emitPlayer(); return { ...player, seats: player.seats.map((candidate) => ({ ...candidate })) } },
      clearSeat: async (slotId) => { const seat = player.seats.find((candidate) => candidate.slotId === slotId); if (!seat) throw new Error("Assento de jogador não encontrado."); seat.status = "available"; seat.tokenId = null; seat.revision = 0; emitPlayer(); return { ...player, seats: player.seats.map((candidate) => ({ ...candidate })) } },
      openWindow: async () => undefined,
      join: async (url) => {
        const target = new URL(url)
        if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("Use um link http:// ou https://.")
        window.open(target.href, "_blank", "noopener")
      },
      setScene: async (sceneId) => { player.sceneId = sceneId; emitPlayer() },
      ruler: async () => undefined,
      pullCamera: async () => undefined,
      setBars: async (bars) => { player.bars = bars; emitPlayer() },
      setAudio: async (enabled) => { player.audio = enabled; emitPlayer() },
      setMoves: async (enabled) => { player.moves = enabled; emitPlayer() },
      publicLink: async () => { if (!player.enabled) throw new Error("Abra a sala primeiro."); return player.localUrl ?? "" },
      testPublicLink: async () => ({ ok: false, ms: 0, error: "Disponível só no app desktop." }),
      downloadCloudflared: async () => undefined,
    },
    audio: {
      state: async () => ({ now: Date.now(), sounds: [] }),
      onState: () => () => undefined,
      playPlaylist: async () => undefined,
      stopPlaylist: async () => undefined,
      playTrack: async () => undefined,
      stopTrack: async () => undefined,
      stopAll: async () => undefined,
      ended: async () => undefined,
    },
    vision: { resetExploration: async () => undefined },
    assets: {
      import: async (kind, fileName, bytes) => {
        const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as BufferSource))].map((byte) => byte.toString(16).padStart(2, "0")).join("")
        const extension = fileName.split(".").pop()?.toLowerCase() ?? "png"
        const path = `${kind}/${hash}.${extension}`
        previewAssets.set(path, URL.createObjectURL(new Blob([bytes as BlobPart])))
        return path
      },
    },
  }
}

/** Página `/master` servida pela sala de outro computador: o celular do mestre (ADR 0016). */
const remote = window.runasCodex?.vtt ? null : masterConnection()
export const remoteMaster: RemoteVttApi | null = remote ? createRemoteVttApi(remote) : null

/** No desktop, a ponte do preload; na mesa do mestre remoto, o computador da sala; no navegador, a prévia em memória. */
export const vtt: VttApi = window.runasCodex?.vtt ?? remoteMaster ?? platform.vtt ?? createBrowserPreviewApi()
export const isAndroidRoom = platform.kind === "capacitor" && !remoteMaster
export const isBrowserPreview = !window.runasCodex?.vtt && !remoteMaster && !platform.vtt

/** URL de um asset da mesa para `<img>` e texturas. */
export function resolveAssetUrl(path: AssetPath): string {
  if (playerAssetEndpoint) return `${playerAssetEndpoint.base}${path}?k=${encodeURIComponent(playerAssetEndpoint.key)}`
  if (remote) return remoteAssetUrl(remote, path)
  if(platform.vtt)return platform.vtt.assets.url?.(path) ?? ""
  return previewAssets.get(path) ?? assetUrl(path)
}
