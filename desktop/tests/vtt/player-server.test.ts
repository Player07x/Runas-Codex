import { CollaborationRoom } from "../../../app/src/vtt/shared/collaboration"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { connect, type Socket } from "node:net"
import type { IncomingMessage } from "node:http"
import { PlayerServer, clientAddress } from "../../src/main/vtt/player-server"
import type { PlayerProjection } from "../../../app/src/vtt/shared/player"

const projection: PlayerProjection = { scene: null, children: [], assets: [], vision: null, regions: [] }
const servers: PlayerServer[] = []

afterEach(async () => { for (const server of servers.splice(0)) await server.stop() })

describe("servidor da Vista dos Jogadores", () => {
  it("exige a chave para a página e serve só o bundle permitido", async () => {
    const root = join(tmpdir(), `runas-vtt-player-${Date.now()}`)
    await mkdir(root, { recursive: true })
    await writeFile(join(root, "player.html"), "<h1>player</h1>")
    const server = new PlayerServer({ staticRoot: root, worldPath: () => null, projection: () => projection, snapshot: () => ({ type: "snapshot", projection, ruler: null, audio: null, moves: false }), onSpectators: () => undefined })
    servers.push(server)
    await server.start(0, "chave")
    const base = `http://127.0.0.1:${server.addressPort}`
    expect((await fetch(`${base}/`)).status).toBe(404)
    expect((await fetch(`${base}/?k=chave`)).status).toBe(200)
    expect((await fetch(`${base}/player.html?k=errada`)).status).toBe(404)
    await rm(root, { recursive: true, force: true })
  })

  it("serve sem chave só os arquivos do build (código e fontes da página)", async () => {
    const root = join(tmpdir(), `runas-codex-player-bundle-${Date.now()}`)
    const mesa = join(root, "mesa")
    await mkdir(join(root, "assets"), { recursive: true })
    await mkdir(join(mesa, "assets", "maps"), { recursive: true })
    await writeFile(join(root, "player.html"), "<h1>player</h1>")
    await writeFile(join(root, "assets", "geist.woff2"), "fonte")
    await writeFile(join(mesa, "assets", "maps", "segredo.png"), "mapa")
    const server = new PlayerServer({ staticRoot: root, worldPath: () => mesa, projection: () => projection, snapshot: () => ({ type: "snapshot", projection, ruler: null, audio: null, moves: false }), onSpectators: () => undefined })
    servers.push(server)
    await server.start(0, "chave")
    const base = `http://127.0.0.1:${server.addressPort}`
    const font = await fetch(`${base}/assets/geist.woff2`)
    expect(font.status).toBe(200)
    expect(font.headers.get("content-type")).toBe("font/woff2")
    expect((await fetch(`${base}/assets/maps/segredo.png`)).status).toBe(404)
    expect((await fetch(`${base}/assets/maps/segredo.png?k=chave`)).status).toBe(404)
    await rm(root, { recursive: true, force: true })
  })

  it("serve somente assets que a projeção atual referencia", async () => {
    const root = join(tmpdir(), `runas-vtt-player-assets-${Date.now()}`)
    const world = join(root, "world")
    const hash = "a".repeat(64)
    await mkdir(join(world, "assets", "maps"), { recursive: true })
    await writeFile(join(world, "assets", "maps", `${hash}.png`), Buffer.from([1, 2, 3]))
    const server = new PlayerServer({ staticRoot: root, worldPath: () => world, projection: () => ({ scene: null, children: [], assets: [`maps/${hash}.png`], vision: null, regions: [] }), snapshot: () => ({ type: "snapshot", projection, ruler: null, audio: null, moves: false }), onSpectators: () => undefined })
    servers.push(server)
    await server.start(0, "chave")
    const base = `http://127.0.0.1:${server.addressPort}`
    expect((await fetch(`${base}/assets/maps/${hash}.png?k=chave`)).status).toBe(200)
    expect((await fetch(`${base}/assets/maps/${"b".repeat(64)}.png?k=chave`)).status).toBe(404)
    await rm(root, { recursive: true, force: true })
  })

  it("faz o ingresso por código, grava cookie HttpOnly e confere a origem", async () => {
    const root = join(tmpdir(), `runas-codex-player-seat-${Date.now()}`)
    await mkdir(root, { recursive: true })
    await writeFile(join(root, "player.html"), "<h1>player</h1>")
    const server = new PlayerServer({
      staticRoot: root,
      worldPath: () => null,
      projection: () => projection,
      snapshot: () => ({ type: "snapshot", projection, ruler: null, audio: null, moves: false }),
      onSpectators: () => undefined,
      joinSeat: (code) => code === "ABCD-EFGH" ? { seat: { slotId: "player-1", label: "Jogador 1" }, token: "token-secreto" } : null,
      authenticateSeat: (token) => token === "token-secreto" ? { slotId: "player-1", label: "Jogador 1" } : null,
    })
    servers.push(server)
    await server.start(0, "chave")
    const base = `http://127.0.0.1:${server.addressPort}`
    expect((await fetch(`${base}/seat/join?k=chave`, { method: "POST", body: JSON.stringify({ code: "ERRADO" }) })).status).toBe(401)
    const joined = await fetch(`${base}/seat/join?k=chave`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: "ABCD-EFGH" }) })
    expect(joined.status).toBe(200)
    const setCookie = joined.headers.get("set-cookie")
    expect(setCookie).toContain("runas_seat=token-secreto")
    expect(setCookie).toContain("HttpOnly")
    const cookie = setCookie?.split(";")[0]
    expect((await fetch(`${base}/seat`, { headers: { cookie: cookie ?? "" } })).status).toBe(200)
    expect((await fetch(`${base}/seat`)).status).toBe(404)
    expect((await fetch(`${base}/seat`, { headers: { cookie: cookie ?? "", origin: "https://evil.example" } })).status).toBe(403)
    // O antigo caminho das fichas não existe mais.
    expect((await fetch(`${base}/seat/character`, { method: "PUT", headers: { cookie: cookie ?? "" } })).status).toBe(405)
    await rm(root, { recursive: true, force: true })
  })
})

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const emptySnapshot = { type: "snapshot" as const, projection, ruler: null, audio: null, moves: false }

/** Cliente WebSocket cru que nunca responde a ping: imita uma conexão que sumiu sem FIN. */
async function silentClient(port: number, key: string): Promise<{ socket: Socket; head: () => string; closed: Promise<void> }> {
  const socket = connect(port, "127.0.0.1")
  let received = ""
  socket.on("data", (chunk) => { received += chunk.toString("latin1") })
  const closed = new Promise<void>((resolve) => { socket.once("close", () => resolve()) })
  socket.write(`GET /socket?k=${key} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n`)
  for (let attempt = 0; attempt < 50 && !received.includes("\r\n\r\n"); attempt += 1) await wait(10)
  return { socket, head: () => received, closed }
}

function newServer(overrides: Partial<ConstructorParameters<typeof PlayerServer>[0]> = {}): PlayerServer {
  const server = new PlayerServer({ staticRoot: tmpdir(), worldPath: () => null, projection: () => projection, snapshot: () => emptySnapshot, onSpectators: () => undefined, ...overrides })
  servers.push(server)
  return server
}

describe("conexões dos jogadores atrás de túnel", () => {
  it("derruba quem parou de responder e libera a vaga", async () => {
    const counts: number[] = []
    const server = newServer({ heartbeatMs: 40, onSpectators: (count) => { counts.push(count) } })
    await server.start(0, "chave")
    const client = await silentClient(server.addressPort, "chave")
    expect(client.head()).toContain("101 Switching Protocols")
    expect(server.spectatorCount).toBe(1)
    await client.closed
    expect(server.spectatorCount).toBe(0)
    expect(counts.at(-1)).toBe(0)
  })

  it("mantém vivo o cliente que responde ao ping", async () => {
    const server = newServer({ heartbeatMs: 40 })
    await server.start(0, "chave")
    const socket = new WebSocket(`ws://127.0.0.1:${server.addressPort}/socket?k=chave`)
    await new Promise<void>((resolve, reject) => { socket.onopen = () => resolve(); socket.onerror = () => reject(new Error("falhou")) })
    await wait(400)
    expect(socket.readyState).toBe(WebSocket.OPEN)
    expect(server.spectatorCount).toBe(1)
    socket.close()
  })

  it("lotado, responde 503 em vez de fechar em silêncio", async () => {
    const server = newServer({ maxConnections: 1, heartbeatMs: 60_000 })
    await server.start(0, "chave")
    const first = await silentClient(server.addressPort, "chave")
    const second = await silentClient(server.addressPort, "chave")
    expect(first.head()).toContain("101")
    expect(second.head()).toContain("503 Service Unavailable")
    first.socket.destroy()
  })

  it("configura os tempos de conexão persistente acima dos do cloudflared", async () => {
    const server = newServer()
    await server.start(0, "chave")
    const http = (server as unknown as { server: { keepAliveTimeout: number; headersTimeout: number } }).server
    expect(http.keepAliveTimeout).toBeGreaterThanOrEqual(90_000)
    expect(http.headersTimeout).toBeGreaterThan(http.keepAliveTimeout)
  })

  it("responde /healthz sem chave e sem revelar nada", async () => {
    const server = newServer()
    await server.start(0, "chave")
    const response = await fetch(`http://127.0.0.1:${server.addressPort}/healthz`)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("ok")
    expect(response.headers.get("cache-control")).toBe("no-store")
  })
})

describe("limite de tentativas de entrada", () => {
  const join = (base: string, code: string, ip?: string) => fetch(`${base}/seat/join?k=chave`, { method: "POST", headers: { "content-type": "application/json", ...(ip ? { "cf-connecting-ip": ip } : {}) }, body: JSON.stringify({ code }) })

  it("não gasta a cota com o código certo: a mesa inteira entra de uma vez", async () => {
    const server = newServer({ joinSeat: (code) => code === "ABCD-EFGH" ? { seat: { slotId: "player-1", label: "Jogador 1" }, token: "t" } : null })
    await server.start(0, "chave")
    const base = `http://127.0.0.1:${server.addressPort}`
    for (let index = 0; index < 12; index += 1) expect((await join(base, "ABCD-EFGH")).status).toBe(200)
  })

  it("bloqueia depois de 5 erros do mesmo endereço, sem afetar os outros", async () => {
    const server = newServer({ joinSeat: () => null })
    await server.start(0, "chave")
    const base = `http://127.0.0.1:${server.addressPort}`
    for (let index = 0; index < 5; index += 1) expect((await join(base, "ERRADO", "203.0.113.7")).status).toBe(401)
    const blocked = await join(base, "ERRADO", "203.0.113.7")
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBe("60")
    expect((await join(base, "ERRADO", "198.51.100.9")).status).toBe(401)
  })

  it("só confia em cf-connecting-ip quando o pedido vem do próprio computador", () => {
    const request = (remoteAddress: string) => ({ socket: { remoteAddress }, headers: { "cf-connecting-ip": "1.2.3.4" } }) as unknown as IncomingMessage
    expect(clientAddress(request("127.0.0.1"))).toBe("1.2.3.4")
    expect(clientAddress(request("::ffff:127.0.0.1"))).toBe("1.2.3.4")
    expect(clientAddress(request("192.168.0.5"))).toBe("192.168.0.5")
  })
})


describe("privacidade das atividades na conexão real",()=>{
 it("filtra destinatários na conexão inicial e nas atualizações, sem transmitir avaliações",async()=>{
  const room=new CollaborationRoom(),ana={slotId:"a",label:"Ana"},bia={slotId:"b",label:"Bia"}
  room.command({type:"prompt",prompt:{id:"p",kind:"avaliacao",title:"Sessão",options:[]}})
  room.reply({type:"reply",promptId:"p",score:8,text:"avaliacao-privada"},ana,"r")
  room.command({type:"handout",handout:{title:"Reservado",text:"privado-apenas-ana",recipients:["a"]}})
  const server=newServer({snapshot:seat=>({...emptySnapshot,collaboration:room.publicSnapshot(seat?.slotId)}),authenticateSeat:token=>token==="a"?ana:token==="b"?bia:null})
  await server.start(0,"chave")
  const sockets:Socket[]=[]
  async function client(token?:string){
   const socket=connect(server.addressPort,"127.0.0.1");sockets.push(socket);let output=""
   socket.on("data",bytes=>{output+=bytes.toString("utf8")})
   socket.write(`GET /socket?k=chave HTTP/1.1\r\nHost: 127.0.0.1:${server.addressPort}\r\nOrigin: http://127.0.0.1:${server.addressPort}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n${token?`Cookie: runas_seat=${token}\r\n`:""}\r\n`)
   for(let i=0;i<100&&!output.includes('"snapshot"');i++)await wait(10)
   expect(output).toContain("101 Switching Protocols")
   return ()=>output
  }
  try{
   const first=await client("a"),second=await client("b"),guest=await client()
   expect(first()).toContain("privado-apenas-ana")
   expect(second()).not.toContain("privado-apenas-ana")
   expect(guest()).not.toContain("privado-apenas-ana")
   for(const output of [first(),second(),guest()]){expect(output).not.toContain("avaliacao-privada");expect(output).not.toContain("recipients")}
   room.command({type:"handout",handout:{title:"Reservado",text:"segunda-apresentacao",recipients:["b"]}})
   server.publishTo(seat=>({type:"collaboration",collaboration:room.publicSnapshot(seat?.slotId)}))
   for(let i=0;i<100&&!second().includes("segunda-apresentacao");i++)await wait(10)
   expect(second()).toContain("segunda-apresentacao")
   expect(first()).not.toContain("segunda-apresentacao")
   expect(guest()).not.toContain("segunda-apresentacao")
  }finally{for(const socket of sockets)socket.destroy()}
 })
})
