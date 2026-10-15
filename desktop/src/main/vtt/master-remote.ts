import { randomBytes, timingSafeEqual } from "node:crypto"
import { readFile } from "node:fs/promises"
import type { IncomingMessage, ServerResponse } from "node:http"
import { join } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as WebReadableStream } from "node:stream/web"
import { IPC } from "../../../../app/src/vtt/shared/ipc"
import { MASTER_CHANNELS, MASTER_EVENTS, type MasterHello, type MasterState } from "../../../../app/src/vtt/shared/master"
import { ASSET_KINDS, type WorldSummary } from "../../../../app/src/vtt/shared/world"
import { assetResponse } from "./world-assets"

/** Documentos de cena com muitas paredes ou desenhos podem passar de 1 MB. */
const MAX_RPC_BYTES = 8 * 1024 * 1024
const MAX_ASSET_BYTES = 100 * 1024 * 1024
const HEARTBEAT_MS = 15_000

export interface MasterRemoteOptions {
  /** Pasta do build da interface (onde está o `master.html`). */
  staticRoot: string
  world(): { summary: WorldSummary } | null
  /** Chama um canal da mesa como a interface local faria. */
  invoke(channel: string, args: unknown[]): Promise<unknown>
  onState(state: MasterState): void
}

function sameKey(given: string | null, key: string): boolean {
  if (!given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(key)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Pedido do próprio site (ou sem `Origin`, como o `<img>`); mesma regra da sala dos jogadores, inclusive pelo túnel. */
function validOrigin(request: IncomingMessage): boolean {
  const origin = typeof request.headers.origin === "string" ? request.headers.origin : ""
  if (!origin) return true
  try {
    const protocol = typeof request.headers["x-forwarded-proto"] === "string" ? request.headers["x-forwarded-proto"].split(",")[0]!.trim() : "http"
    const expected = new URL(`${protocol}://${request.headers.host ?? "localhost"}`)
    const actual = new URL(origin)
    return actual.protocol === expected.protocol && actual.host === expected.host
  } catch {
    return false
  }
}

function json(response: ServerResponse, status: number, body: unknown): void {
  const bytes = Buffer.from(JSON.stringify(body))
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": bytes.length, "cache-control": "no-store", "x-content-type-options": "nosniff" })
  response.end(bytes)
}

async function body(request: IncomingMessage, limit: number): Promise<Buffer | null> {
  if (Number(request.headers["content-length"] ?? 0) > limit) return null
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    size += (chunk as Buffer).length
    if (size > limit) return null
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
}

/**
 * Mestre remoto (ADR 0016): com a sala ligada, o celular do mestre abre `/master?m=<chave>` e controla a mesa aberta
 * neste computador. Uma chave por sessão da sala, que dá para trocar a qualquer momento (o celular antigo cai na hora),
 * e um celular por vez: as chamadas levam a sessão do canal de eventos aberto.
 */
export class MasterRemote {
  private key: string | null = null
  private session: { id: string; stream: ServerResponse; heartbeat: ReturnType<typeof setInterval> } | null = null

  constructor(private readonly options: MasterRemoteOptions) {}

  state(): MasterState {
    return { key: this.key, connected: this.session !== null }
  }

  /** Sala ligada: chave nova (o celular de uma sessão anterior não volta sozinho). */
  start(): void {
    this.closeSession()
    this.key = randomBytes(16).toString("hex")
    this.changed()
  }

  stop(): void {
    this.closeSession()
    this.key = null
    this.changed()
  }

  rotate(): MasterState {
    if (!this.key) throw new Error("Ligue a transmissão primeiro.")
    this.closeSession()
    this.key = randomBytes(16).toString("hex")
    this.changed()
    return this.state()
  }

  disconnect(): MasterState {
    this.closeSession()
    this.changed()
    return this.state()
  }

  /** Repassa ao celular as mudanças da mesa, da sala e do áudio (as mesmas que a interface local recebe). */
  emit(channel: string, payload: unknown): void {
    if (!this.session || !MASTER_EVENTS.includes(channel)) return
    this.session.stream.write(`event: ${channel}\ndata: ${JSON.stringify(payload)}\n\n`)
  }

  /** Atende `/master…` no servidor da sala; devolve `false` para os outros caminhos. */
  async handle(request: IncomingMessage, response: ServerResponse, url: URL): Promise<boolean> {
    if (url.pathname !== "/master" && !url.pathname.startsWith("/master/")) return false
    if (!this.key || !sameKey(url.searchParams.get("m"), this.key) || !validOrigin(request)) {
      response.writeHead(404, { "cache-control": "no-store" })
      response.end()
      return true
    }
    const path = url.pathname
    if (request.method === "GET" && path === "/master") await this.page(response)
    else if (request.method === "GET" && path === "/master/") {
      // A página usa caminhos relativos (`./assets/…`): sempre sem a barra no fim.
      response.writeHead(302, { location: `/master${url.search}`, "cache-control": "no-store" })
      response.end()
    } else if (request.method === "GET" && path === "/master/events") this.events(request, response)
    else if (request.method === "POST" && path === "/master/rpc") await this.rpc(request, response)
    else if (request.method === "POST" && path === "/master/asset") await this.importAsset(request, response, url)
    else if ((request.method === "GET" || request.method === "HEAD") && path.startsWith("/master/asset/")) await this.asset(request, response, path)
    else {
      response.writeHead(404, { "cache-control": "no-store" })
      response.end()
    }
    return true
  }

  private changed(): void {
    this.options.onState(this.state())
  }

  private closeSession(): void {
    const session = this.session
    if (!session) return
    this.session = null
    clearInterval(session.heartbeat)
    session.stream.end("event: closed\ndata: {}\n\n")
  }

  private async page(response: ServerResponse): Promise<void> {
    try {
      const html = await readFile(join(this.options.staticRoot, "master.html"))
      response.writeHead(200, { "content-type": "text/html; charset=utf-8", "content-length": html.length, "cache-control": "no-store", "x-content-type-options": "nosniff" })
      response.end(html)
    } catch {
      response.writeHead(404, { "cache-control": "no-store" })
      response.end()
    }
  }

  private events(request: IncomingMessage, response: ServerResponse): void {
    const world = this.options.world()
    if (!world) return json(response, 409, { error: "Nenhuma mesa aberta no computador da sala." })
    if (this.session) return json(response, 409, { error: "Outro aparelho já controla a mesa. No computador, use “Desconectar” ou “Trocar chave”." })
    const id = randomBytes(16).toString("hex")
    response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", connection: "keep-alive", "x-accel-buffering": "no" })
    const hello: MasterHello = { session: id, world: world.summary }
    response.write(`event: hello\ndata: ${JSON.stringify(hello)}\n\n`)
    // Comentário de tempos em tempos: mantém a conexão viva no túnel e em redes que cortam conexões paradas.
    const heartbeat = setInterval(() => response.write(": ping\n\n"), HEARTBEAT_MS)
    heartbeat.unref()
    this.session = { id, stream: response, heartbeat }
    const end = () => {
      if (this.session?.id !== id) return
      clearInterval(heartbeat)
      this.session = null
      this.changed()
    }
    request.once("close", end)
    response.once("close", end)
    this.changed()
  }

  private sessionOk(request: IncomingMessage): boolean {
    const given = request.headers["x-runas-session"]
    return Boolean(this.session) && typeof given === "string" && sameKey(given, this.session!.id)
  }

  private async rpc(request: IncomingMessage, response: ServerResponse): Promise<void> {
    if (!this.sessionOk(request)) return json(response, 403, { error: "Este aparelho não está mais conectado como mestre. Recarregue a página." })
    const raw = await body(request, MAX_RPC_BYTES)
    if (!raw) return json(response, 413, { error: "Pedido grande demais." })
    let message: { channel?: unknown; args?: unknown }
    try {
      message = JSON.parse(raw.toString("utf8")) as { channel?: unknown; args?: unknown }
    } catch {
      return json(response, 400, { error: "Pedido inválido." })
    }
    const channel = typeof message.channel === "string" ? message.channel : ""
    if (!MASTER_CHANNELS.includes(channel)) return json(response, 403, { error: "Isto só pelo computador da sala." })
    try {
      const result = await this.options.invoke(channel, Array.isArray(message.args) ? message.args : [])
      json(response, 200, { result: result ?? null })
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : String(error) })
    }
  }

  private async importAsset(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    if (!this.sessionOk(request)) return json(response, 403, { error: "Este aparelho não está mais conectado como mestre. Recarregue a página." })
    const raw = await body(request, MAX_ASSET_BYTES)
    if (!raw) return json(response, 413, { error: "Arquivo grande demais." })
    try {
      const result = await this.options.invoke(IPC.assetsImport, [url.searchParams.get("kind") ?? "", url.searchParams.get("name") ?? "", new Uint8Array(raw)])
      json(response, 200, { result })
    } catch (error) {
      json(response, 400, { error: error instanceof Error ? error.message : String(error) })
    }
  }

  /** Qualquer asset da mesa aberta (o mestre vê tudo, inclusive o que os jogadores não veem). */
  private async asset(request: IncomingMessage, response: ServerResponse, path: string): Promise<void> {
    const parts = path.split("/").filter(Boolean)
    const world = this.options.world()
    if (!world || parts.length !== 4 || !(ASSET_KINDS as readonly string[]).includes(parts[2]!)) {
      response.writeHead(404, { "cache-control": "no-store" })
      response.end()
      return
    }
    let file: string
    try {
      file = decodeURIComponent(parts[3]!)
    } catch {
      response.writeHead(400)
      response.end()
      return
    }
    const range = typeof request.headers.range === "string" ? request.headers.range : null
    const result = await assetResponse(world.summary.path, `${parts[2]}/${file}`, range)
    response.writeHead(result.status, Object.fromEntries(result.headers.entries()))
    if (request.method === "HEAD" || !result.body) {
      await result.body?.cancel()
      response.end()
      return
    }
    await pipeline(Readable.fromWeb(result.body as WebReadableStream<Uint8Array>), response).catch(() => undefined)
  }
}
