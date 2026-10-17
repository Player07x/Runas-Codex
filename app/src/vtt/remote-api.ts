import { IPC, type DocumentChange, type PlayerState, type VttApi } from "./shared/ipc"
import type { AudioState } from "./shared/audio"
import type { MasterHello } from "./shared/master"
import type { AssetPath } from "./shared/scene"
import type { WorldSummary } from "./shared/world"

/**
 * Mesa do mestre remoto (ADR 0016): a página `/master?m=<chave>` servida pela sala do computador. Cada ação vira uma
 * chamada ao canal de mesmo nome do IPC, e as mudanças chegam pelo canal de eventos — o computador continua sendo a
 * autoridade, e as regras (validação, visão, regiões, áudio) são as mesmas da mesa local.
 */
export interface MasterConnection {
  origin: string
  key: string
}

/** A página aberta é a do mestre remoto? */
export function masterConnection(): MasterConnection | null {
  if (typeof window === "undefined" || !/^\/master\/?$/.test(window.location.pathname)) return null
  const key = new URLSearchParams(window.location.search).get("m")
  return key ? { origin: window.location.origin, key } : null
}

/** Endereço de um asset da mesa aberta no computador. */
export function remoteAssetUrl(connection: MasterConnection, path: AssetPath): string {
  const [kind, ...file] = path.split("/")
  return `${connection.origin}/master/asset/${kind}/${file.map(encodeURIComponent).join("/")}?m=${encodeURIComponent(connection.key)}`
}

const ONLY_ON_COMPUTER = "Isto só pelo computador da sala."

export interface RemoteVttApi extends VttApi {
  /** Abre o canal de eventos e devolve a mesa aberta no computador. */
  connect(): Promise<WorldSummary>
  /** A conexão caiu (sala fechada, chave trocada, outro aparelho): o motivo para mostrar. */
  onLost(listener: (reason: string) => void): () => void
}

export function createRemoteVttApi(connection: MasterConnection): RemoteVttApi {
  const query = `m=${encodeURIComponent(connection.key)}`
  const documentListeners = new Set<(change: DocumentChange) => void>()
  const playerListeners = new Set<(state: PlayerState) => void>()
  const audioListeners = new Set<(state: AudioState) => void>()
  const lostListeners = new Set<(reason: string) => void>()
  let session = ""
  let world: WorldSummary | null = null
  let connecting: Promise<WorldSummary> | null = null

  const lost = (reason: string) => lostListeners.forEach((listener) => listener(reason))

  async function answer<T>(response: Response): Promise<T> {
    const body = (await response.json().catch(() => ({}))) as { result?: T; error?: string }
    if (!response.ok) throw new Error(body.error ?? `O computador da sala respondeu ${response.status}.`)
    return body.result as T
  }

  async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
    if (!session) await api.connect()
    const response = await fetch(`${connection.origin}/master/rpc?${query}`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-runas-session": session },
      body: JSON.stringify({ channel, args }),
    })
    return answer<T>(response)
  }

  const refuse = async (): Promise<never> => {
    throw new Error(ONLY_ON_COMPUTER)
  }

  const api: RemoteVttApi = {
    connect() {
      connecting ??= new Promise<WorldSummary>((resolve, reject) => {
        const events = new EventSource(`${connection.origin}/master/events?${query}`)
        let opened = false
        events.addEventListener("hello", (event) => {
          const hello = JSON.parse((event as MessageEvent<string>).data) as MasterHello
          session = hello.session
          world = hello.world
          opened = true
          resolve(hello.world)
        })
        events.addEventListener(IPC.documentsChanged, (event) => {
          const change = JSON.parse((event as MessageEvent<string>).data) as DocumentChange
          documentListeners.forEach((listener) => listener(change))
        })
        events.addEventListener(IPC.playerStateChanged, (event) => {
          const state = JSON.parse((event as MessageEvent<string>).data) as PlayerState
          playerListeners.forEach((listener) => listener(state))
        })
        events.addEventListener(IPC.audioStateChanged, (event) => {
          const state = JSON.parse((event as MessageEvent<string>).data) as AudioState
          audioListeners.forEach((listener) => listener(state))
        })
        events.addEventListener("closed", () => {
          events.close()
          session = ""
          lost("O computador da sala encerrou esta conexão (a chave do mestre mudou, a sala foi desligada ou outra pessoa desconectou este aparelho).")
        })
        // O EventSource tentaria de novo sozinho; uma reconexão precisa da mesma chave e de ninguém no lugar.
        events.onerror = () => {
          events.close()
          session = ""
          if (opened) lost("A conexão com o computador da sala caiu.")
          else reject(new Error("Não foi possível entrar como mestre: a sala está desligada, a chave mudou ou outro aparelho já controla a mesa."))
        }
      }).finally(() => {
        connecting = null
      })
      return connecting
    },
    onLost(listener) {
      lostListeners.add(listener)
      return () => {
        lostListeners.delete(listener)
      }
    },
    collaboration: {state:()=>invoke(IPC.collaborationState),command:command=>invoke(IPC.collaborationCommand,command)},
    listWorlds: async () => (world ? [world] : [await api.connect()]),
    createWorld: refuse,
    openWorld: async (id) => {
      const opened = world ?? (await api.connect())
      if (opened.id !== id) throw new Error("O computador da sala está com outra mesa aberta.")
      return opened
    },
    // A mesa continua aberta no computador.
    closeWorld: async () => undefined,
    documents: {
      list: (type, parentId) => invoke(IPC.documentsList, type, parentId),
      put: (input) => invoke(IPC.documentsPut, input),
      remove: (id) => invoke(IPC.documentsDelete, id),
      clearLog: () => invoke(IPC.documentsClearLog),
      onChange: (listener) => {
        documentListeners.add(listener)
        return () => {
          documentListeners.delete(listener)
        }
      },
    },
    table: { report: (state) => invoke(IPC.tableReport, state) },
    player: {
      state: () => invoke(IPC.playerState),
      onState: (listener) => {
        playerListeners.add(listener)
        return () => {
          playerListeners.delete(listener)
        }
      },
      displays: async () => [],
      start: refuse,
      stop: refuse,
      rotateSeatCode: (slotId) => invoke(IPC.playerRotateSeatCode, slotId),
      clearSeat: (slotId) => invoke(IPC.playerClearSeat, slotId),
      openWindow: refuse,
      join: refuse,
      setScene: (sceneId) => invoke(IPC.playerSetScene, sceneId),
      ruler: (ruler) => invoke(IPC.playerRuler, ruler),
      pullCamera: () => invoke(IPC.playerPullCamera),
      setBars: (bars) => invoke(IPC.playerSetBars, bars),
      setAudio: (enabled) => invoke(IPC.playerSetAudio, enabled),
      setMoves: (enabled) => invoke(IPC.playerSetMoves, enabled),
      publicLink: refuse,
      testPublicLink: refuse,
      downloadCloudflared: refuse,
    },
    audio: {
      state: () => invoke(IPC.audioState),
      onState: (listener) => {
        audioListeners.add(listener)
        return () => {
          audioListeners.delete(listener)
        }
      },
      playPlaylist: (id) => invoke(IPC.audioPlayPlaylist, id),
      stopPlaylist: (id) => invoke(IPC.audioStopPlaylist, id),
      playTrack: (id) => invoke(IPC.audioPlayTrack, id),
      stopTrack: (id) => invoke(IPC.audioStopTrack, id),
      stopAll: () => invoke(IPC.audioStopAll),
      // Quem toca é o computador da sala; o fim das faixas é avisado por ele.
      ended: async () => undefined,
    },
    vision: { resetExploration: (sceneId) => invoke(IPC.visionResetExploration, sceneId) },
    assets: {
      import: async (kind, fileName, bytes) => {
        if (!session) await api.connect()
        const response = await fetch(`${connection.origin}/master/asset?${query}&kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(fileName)}`, {
          method: "POST",
          headers: { "content-type": "application/octet-stream", "x-runas-session": session },
          body: bytes as BodyInit,
        })
        return answer<AssetPath>(response)
      },
    },
  }
  return api
}
