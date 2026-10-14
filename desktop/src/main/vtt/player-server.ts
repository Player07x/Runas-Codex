import { createHash } from "node:crypto"
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { Socket } from "node:net"
import { extname, resolve, sep } from "node:path"
import { assetResponse } from "./world-assets"
import { Readable, type Duplex } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as WebReadableStream } from "node:stream/web"
import type { AssetPath } from "../../../../app/src/vtt/shared/scene"
import type { PlayerProjection, PlayerWireMessage } from "../../../../app/src/vtt/shared/player"

export type { PlayerWireMessage }

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
const MAX_FRAME_BYTES = 1024 * 1024
/** Mensagens dos espectadores são pequenas (ping e mover). */
const MAX_CLIENT_FRAME_BYTES = 16 * 1024
/** Mensagens "mover" aceitas por espectador a cada segundo. */
const MOVES_PER_SECOND = 8
const MAX_CONNECTIONS = 24
/**
 * Intervalo do batimento do WebSocket. Um ping a cada 25 s mantém a conexão
 * viva no Cloudflare, no NAT e na operadora (que fecham conexões ociosas) e
 * revela conexões mortas que nunca mandaram um FIN.
 */
const HEARTBEAT_MS = 25_000
/**
 * Sem isto o Node fecha a conexão ociosa depois de 5 s, enquanto o
 * `cloudflared` reaproveita a conexão de origem por ~90 s: o pedido que cai
 * nessa janela volta como 502 e o mapa perde um asset.
 */
const KEEP_ALIVE_TIMEOUT_MS = 120_000
const MAX_JOIN_BODY_BYTES = 2048
const SEAT_COOKIE = "runas_seat"
const ASSET_KINDS = new Set(["maps", "tokens", "tiles", "audio"])
/** Só tentativas com código errado gastam a cota: uma mesa inteira entra de uma vez. */
const JOIN_FAILURES_PER_MINUTE = 5
const JOIN_FAILURES_PER_MINUTE_GLOBAL = 20
const JOIN_WINDOW_MS = 60_000

export interface PlayerSeatConnection {
  slotId: string
  label: string
}

export interface JoinedPlayerSeat {
  seat: PlayerSeatConnection
  token: string
}

interface PlayerServerOptions {
  staticRoot: string
  worldPath: () => string | null
  projection: () => PlayerProjection
  /** Assets que os espectadores podem baixar: os da projeção e os áudios tocando. */
  allowedAssets?: () => readonly AssetPath[]
  snapshot: () => PlayerWireMessage
  onSpectators(count: number): void
  onPlayers?(count: number): void
  joinSeat?(code: string): JoinedPlayerSeat | null
  authenticateSeat?(token: string): PlayerSeatConnection | null
  onSeatConnected?(seat: PlayerSeatConnection): void
  onSeatDisconnected?(seat: PlayerSeatConnection): void
  /** Mensagem de um espectador (além do ping); a resposta vai só para ele. */
  onClientMessage?(message: unknown, seat: PlayerSeatConnection | null): PlayerWireMessage | null
  /** Intervalo do batimento; só os testes mudam o padrão. */
  heartbeatMs?: number
  maxConnections?: number
}

interface Client {
  socket: Duplex
  buffer: Buffer
  send(message: PlayerWireMessage): void
  /** Horários das últimas mensagens, para o limite por segundo. */
  recent: number[]
  seat: PlayerSeatConnection | null
  /** Última vez que qualquer byte chegou deste cliente (mensagem ou pong). */
  lastSeen: number
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
}

function json(res: ServerResponse, status: number, body: unknown, cors = true, extra: Record<string, string> = {}): void {
  const bytes = Buffer.from(JSON.stringify(body))
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": bytes.length, "cache-control": "no-store", ...(cors ? { "access-control-allow-origin": "*" } : {}), ...extra })
  res.end(bytes)
}

function cookie(request: IncomingMessage, name: string): string | null {
  const header = typeof request.headers.cookie === "string" ? request.headers.cookie : ""
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=")
    if (key === name) return decodeURIComponent(value.join("="))
  }
  return null
}

async function requestBody(request: IncomingMessage, limit: number): Promise<Buffer | null> {
  const contentLength = Number(request.headers["content-length"] ?? 0)
  if (Number.isFinite(contentLength) && contentLength > limit) return null
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += value.length
    if (size > limit) return null
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

function isSafeStaticPath(root: string, pathname: string): string | null {
  const relative = pathname.replace(/^\/+/, "")
  if (!relative || relative.includes("\0") || relative.split("/").some((part) => part === "..")) return null
  const target = resolve(root, relative)
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null
  return target
}

function frame(opcode: number, payload: Buffer): Buffer {
  const length = payload.length
  if (length > MAX_FRAME_BYTES) throw new Error("Mensagem WebSocket grande demais.")
  if (length < 126) return Buffer.concat([Buffer.from([0x80 | opcode, length]), payload])
  if (length <= 0xffff) {
    const header = Buffer.alloc(4)
    header[0] = 0x80 | opcode
    header[1] = 126
    header.writeUInt16BE(length, 2)
    return Buffer.concat([header, payload])
  }
  const header = Buffer.alloc(10)
  header[0] = 0x80 | opcode
  header[1] = 127
  header.writeBigUInt64BE(BigInt(length), 2)
  return Buffer.concat([header, payload])
}

function textFrame(value: PlayerWireMessage): Buffer {
  return frame(0x1, Buffer.from(JSON.stringify(value)))
}

function isLoopback(address: string | undefined): boolean {
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1"
}

/**
 * Quem está do outro lado. `cf-connecting-ip` só vale quando o pedido chega
 * do próprio computador (o `cloudflared`): na rede local qualquer um poderia
 * inventar o cabeçalho e escapar do limite por endereço.
 */
export function clientAddress(request: IncomingMessage): string {
  const remote = request.socket.remoteAddress
  const forwarded = request.headers["cf-connecting-ip"]
  if (typeof forwarded === "string" && forwarded && isLoopback(remote)) return forwarded
  return remote ?? "unknown"
}

/** Servidor mínimo da sala dos jogadores: a página, os assets da cena projetada, os assentos e o WebSocket. */
export class PlayerServer {
  private server: Server | null = null
  private key = ""
  private clients = new Set<Client>()
  private joinFailures: number[] = []
  private readonly joinFailuresByAddress = new Map<string, number[]>()
  private heartbeat: ReturnType<typeof setInterval> | null = null

  constructor(private readonly options: PlayerServerOptions) {}

  get listening(): boolean { return this.server?.listening === true }
  get playerCount(): number { return [...this.clients].filter((client) => client.seat !== null).length }
  get spectatorCount(): number { return this.clients.size - this.playerCount }
  get addressPort(): number {
    const address = this.server?.address()
    return address && typeof address === "object" ? address.port : 0
  }

  async start(port: number, key: string): Promise<void> {
    if (this.server) await this.stop()
    this.key = key
    this.joinFailures = []
    this.joinFailuresByAddress.clear()
    const server = createServer((request, response) => { void this.handleRequest(request, response) })
    server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS
    // O `headersTimeout` precisa passar do `keepAliveTimeout`, senão o Node fecha antes.
    server.headersTimeout = KEEP_ALIVE_TIMEOUT_MS + 5_000
    server.on("upgrade", (request, socket) => this.handleUpgrade(request, socket))
    this.server = server
    await new Promise<void>((resolvePromise, reject) => {
      const onError = (error: Error) => { server.off("listening", onListening); this.server = null; reject(error) }
      const onListening = () => { server.off("error", onError); resolvePromise() }
      server.once("error", onError)
      server.once("listening", onListening)
      server.listen({ host: "0.0.0.0", port })
    })
    this.startHeartbeat()
  }

  async stop(): Promise<void> {
    this.key = ""
    if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = null }
    this.joinFailures = []
    this.joinFailuresByAddress.clear()
    for (const client of this.clients) {
      client.socket.end(frame(0x8, Buffer.from([0x03, 0xe9])))
    }
    this.clients.clear()
    this.options.onSpectators(0)
    this.options.onPlayers?.(0)
    const server = this.server
    this.server = null
    if (!server) return
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()))
  }

  publish(message: PlayerWireMessage): void {
    for (const client of this.clients) client.send(message)
  }

  publishToSeat(slotId: string, message: PlayerWireMessage): void {
    for (const client of this.clients) if (client.seat?.slotId === slotId) client.send(message)
  }

  private authorized(request: IncomingMessage): boolean {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)
    return this.authorizedUrl(url)
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)
    if (request.method === "POST" && url.pathname === "/seat/join") {
      await this.handleJoin(request, response, url)
      return
    }
    if (url.pathname === "/healthz" && (request.method === "GET" || request.method === "HEAD")) {
      // Sem chave e sem dados: só confirma que o caminho até o servidor existe
      // (o mestre testa o link público com isto).
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8", "content-length": 2, "cache-control": "no-store" })
      response.end(request.method === "HEAD" ? undefined : "ok")
      return
    }
    if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405, { allow: "GET, HEAD, POST" }); response.end(); return }
    const staticBundleAsset = url.pathname.startsWith("/assets/") && url.pathname.split("/").filter(Boolean).length === 2
    const seat = this.seatForRequest(request)
    const seatPath = url.pathname === "/seat"
    if (!this.validOrigin(request) && seatPath) { response.writeHead(403, { "cache-control": "no-store" }); response.end(); return }
    // Arquivos do build (`/assets/<arquivo>`: código e fontes da página) são públicos, como o app no GitHub Pages; as
    // fontes são pedidas pelo CSS, sem a chave. Mapas, tokens e áudio da mesa (`/assets/<tipo>/<arquivo>`) seguem
    // exigindo a chave e só saem se a cena projetada os usa.
    if (!this.authorized(request) && !(staticBundleAsset && Boolean(this.key)) && !(seat && seatPath)) { response.writeHead(404); response.end(); return }
    if (url.pathname === "/seat") {
      if (!seat) { response.writeHead(401, { "cache-control": "no-store" }); response.end(); return }
      json(response, 200, { seat }, false)
      return
    }
    if (url.pathname.startsWith("/assets/")) {
      const parts = url.pathname.split("/").filter(Boolean)
      // Assets do not go through the static bundle path. They are served only
      // when the current projection (or audio playing now) references the exact hash-named file.
      const allowed = this.options.allowedAssets?.() ?? this.options.projection().assets
      if (parts.length === 3 && ASSET_KINDS.has(parts[1]!) && allowed.includes(`${parts[1]}/${parts[2]}` as AssetPath)) {
        const worldPath = this.options.worldPath()
        if (!worldPath) { response.writeHead(404); response.end(); return }
        const range = typeof request.headers.range === "string" ? request.headers.range : null
        const result = await assetResponse(worldPath, `${parts[1]}/${parts[2]}`, range)
        response.writeHead(result.status, Object.fromEntries(result.headers.entries()))
        if (request.method === "HEAD" || !result.body) { await result.body?.cancel(); response.end(); return }
        // Transmitido por stream: uma música de 1 h não pode virar um Buffer na memória do processo.
        await pipeline(Readable.fromWeb(result.body as WebReadableStream<Uint8Array>), response).catch(() => undefined)
        return
      }
    }
    const relative = url.pathname === "/" || url.pathname === "/player.html" ? "player.html" : url.pathname.replace(/^\//, "")
    const target = isSafeStaticPath(this.options.staticRoot, relative)
    if (!target) { response.writeHead(404); response.end(); return }
    try {
      const file = await stat(target)
      if (!file.isFile()) throw new Error("not a file")
      response.writeHead(200, { "content-type": CONTENT_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream", "content-length": file.size, "cache-control": relative === "player.html" ? "no-store" : "public, max-age=31536000, immutable", "access-control-allow-origin": "*" })
      if (request.method === "HEAD") { response.end(); return }
      createReadStream(target).pipe(response)
    } catch {
      response.writeHead(404)
      response.end()
    }
  }

  private async handleJoin(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
    if (!this.authorizedUrl(url)) { response.writeHead(404); response.end(); return }
    if (!this.validOrigin(request)) { response.writeHead(403, { "cache-control": "no-store" }); response.end(); return }
    const address = clientAddress(request)
    if (this.joinBlocked(address)) { json(response, 429, { error: "Tente novamente em alguns instantes." }, false, { "retry-after": "60" }); return }
    const body = await requestBody(request, MAX_JOIN_BODY_BYTES)
    if (!body) { json(response, 413, { error: "Pedido grande demais." }, false); return }
    let code: unknown
    try { code = (JSON.parse(body.toString("utf8")) as { code?: unknown }).code } catch { code = null }
    if (typeof code !== "string" || code.length > 128 || !this.options.joinSeat) { this.recordJoinFailure(address); json(response, 401, { error: "Código inválido." }, false); return }
    const joined = this.options.joinSeat(code)
    if (!joined) { this.recordJoinFailure(address); json(response, 401, { error: "Código inválido." }, false); return }
    const value = encodeURIComponent(joined.token)
    json(response, 200, { seat: joined.seat }, false, { "set-cookie": `${SEAT_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400` })
  }

  private authorizedUrl(url: URL): boolean {
    return Boolean(this.key) && url.searchParams.get("k") === this.key
  }

  private validOrigin(request: IncomingMessage): boolean {
    const origin = typeof request.headers.origin === "string" ? request.headers.origin : ""
    if (!origin) return true
    try {
      const protocol = typeof request.headers["x-forwarded-proto"] === "string" ? request.headers["x-forwarded-proto"].split(",")[0]!.trim() : "http"
      const expected = new URL(`${protocol}://${request.headers.host ?? "localhost"}`)
      const actual = new URL(origin)
      return actual.protocol === expected.protocol && actual.host === expected.host
    } catch { return false }
  }

  /** A cota é de tentativas erradas: entrar com o código certo nunca a consome. */
  private joinBlocked(address: string): boolean {
    const now = Date.now()
    this.joinFailures = this.joinFailures.filter((at) => now - at < JOIN_WINDOW_MS)
    const failures = (this.joinFailuresByAddress.get(address) ?? []).filter((at) => now - at < JOIN_WINDOW_MS)
    if (failures.length === 0) this.joinFailuresByAddress.delete(address)
    else this.joinFailuresByAddress.set(address, failures)
    return this.joinFailures.length >= JOIN_FAILURES_PER_MINUTE_GLOBAL || failures.length >= JOIN_FAILURES_PER_MINUTE
  }

  private recordJoinFailure(address: string): void {
    const now = Date.now()
    this.joinFailures.push(now)
    this.joinFailuresByAddress.set(address, [...(this.joinFailuresByAddress.get(address) ?? []), now])
  }

  private seatForRequest(request: IncomingMessage): PlayerSeatConnection | null {
    const token = cookie(request, SEAT_COOKIE)
    return token && this.options.authenticateSeat ? this.options.authenticateSeat(token) : null
  }

  private handleUpgrade(request: IncomingMessage, socket: Duplex): void {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)
    if (url.pathname !== "/socket" || request.headers.upgrade?.toLowerCase() !== "websocket") { socket.destroy(); return }
    const seat = this.seatForRequest(request)
    if ((!this.authorized(request) && !seat) || !this.validOrigin(request)) { socket.destroy(); return }
    const nonce = request.headers["sec-websocket-key"]
    if (typeof nonce !== "string") { socket.destroy(); return }
    if (this.clients.size >= (this.options.maxConnections ?? MAX_CONNECTIONS)) this.evictStale()
    if (this.clients.size >= (this.options.maxConnections ?? MAX_CONNECTIONS)) {
      socket.end("HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nRetry-After: 30\r\nContent-Length: 0\r\n\r\n")
      return
    }
    // Sem isto, uma conexão que some sem FIN (rede móvel, rota ruim) ficaria
    // para sempre e ocuparia uma das vagas.
    if (socket instanceof Socket) { socket.setNoDelay(true); socket.setKeepAlive(true, 30_000) }
    const accept = createHash("sha1").update(`${nonce}${WS_GUID}`).digest("base64")
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`)
    const client: Client = {
      socket,
      buffer: Buffer.alloc(0),
      send: (message) => { if (!socket.destroyed) socket.write(textFrame(message)) },
      recent: [],
      seat,
      lastSeen: Date.now(),
    }
    this.clients.add(client)
    this.options.onSpectators(this.spectatorCount)
    this.options.onPlayers?.(this.playerCount)
    if (seat) this.options.onSeatConnected?.(seat)
    // Quem chega recebe o estado completo agora, e não a última mensagem
    // enviada (que pode ser só uma régua ou um movimento de câmera).
    client.send(this.options.snapshot())
    if (seat) client.send({ type: "seat-status", seat })
    socket.on("data", (chunk) => this.readFrames(client, chunk))
    const remove = () => { this.release(client) }
    socket.once("close", remove)
    socket.once("error", remove)
  }

  /** Tira o cliente da lista e avisa a interface; não fecha o socket. */
  private release(client: Client): boolean {
    if (!this.clients.delete(client)) return false
    this.options.onSpectators(this.spectatorCount)
    this.options.onPlayers?.(this.playerCount)
    if (client.seat) this.options.onSeatDisconnected?.(client.seat)
    return true
  }

  private get heartbeatMs(): number { return this.options.heartbeatMs ?? HEARTBEAT_MS }

  /** Cliente que não deu sinal por dois batimentos está morto. */
  private isStale(client: Client, now: number): boolean { return now - client.lastSeen > this.heartbeatMs * 2 }

  private evictStale(): void {
    const now = Date.now()
    for (const client of [...this.clients]) {
      if (!this.isStale(client, now)) continue
      this.release(client)
      client.socket.destroy()
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeat) clearInterval(this.heartbeat)
    this.heartbeat = setInterval(() => {
      const now = Date.now()
      for (const client of [...this.clients]) {
        if (this.isStale(client, now)) { this.release(client); client.socket.destroy(); continue }
        if (!client.socket.destroyed) client.socket.write(frame(0x9, Buffer.alloc(0)))
      }
    }, this.heartbeatMs)
    this.heartbeat.unref()
  }

  private readFrames(client: Client, chunk: Buffer): void {
    client.lastSeen = Date.now()
    client.buffer = Buffer.concat([client.buffer, chunk])
    while (client.buffer.length >= 2) {
      const first = client.buffer[0]!
      const second = client.buffer[1]!
      const opcode = first & 0x0f
      const masked = (second & 0x80) !== 0
      let length = second & 0x7f
      let offset = 2
      if (length === 126) { if (client.buffer.length < 4) return; length = client.buffer.readUInt16BE(2); offset = 4 }
      else if (length === 127) { if (client.buffer.length < 10) return; const long = client.buffer.readBigUInt64BE(2); if (long > BigInt(MAX_FRAME_BYTES)) { client.socket.destroy(); return }; length = Number(long); offset = 10 }
      if (!masked || length > MAX_CLIENT_FRAME_BYTES) { client.socket.destroy(); return }
      if (client.buffer.length < offset + 4 + length) return
      const mask = client.buffer.subarray(offset, offset + 4)
      offset += 4
      const payload = Buffer.from(client.buffer.subarray(offset, offset + length))
      for (let index = 0; index < payload.length; index += 1) {
        const maskByte = mask[index % 4]
        const value = payload[index]
        if (maskByte !== undefined && value !== undefined) payload[index] = value ^ maskByte
      }
      client.buffer = client.buffer.subarray(offset + length)
      if (opcode === 0x8) { client.socket.end(frame(0x8, payload.subarray(0, 125))); return }
      if (opcode === 0x9) { client.socket.write(frame(0xA, payload)); continue }
      if (opcode !== 0x1) continue
      try {
        const message = JSON.parse(payload.toString("utf8")) as { type?: unknown; tokenId?: unknown }
        if (message.type === "ping") { client.socket.write(textFrame({ type: "pong" })); continue }
        const now = Date.now()
        client.recent = client.recent.filter((at) => now - at < 1000)
        if (client.recent.length >= MOVES_PER_SECOND) {
          client.send({ type: "move-result", tokenId: typeof message.tokenId === "string" ? message.tokenId.slice(0, 64) : "", ok: false, reason: "Devagar: muitos movimentos seguidos." })
          continue
        }
        client.recent.push(now)
        const reply = this.options.onClientMessage?.(message, client.seat)
        if (reply) client.send(reply)
      } catch { /* clientes não controlam o estado e mensagens inválidas são ignoradas */ }
    }
  }
}
