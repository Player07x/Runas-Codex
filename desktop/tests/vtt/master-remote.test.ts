import { createServer, type Server } from "node:http"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { IPC } from "../../../app/src/vtt/shared/ipc"
import type { MasterHello, MasterState } from "../../../app/src/vtt/shared/master"
import type { WorldSummary } from "../../../app/src/vtt/shared/world"
import { MasterRemote } from "../../src/main/vtt/master-remote"

const TOKEN = `tokens/${"a".repeat(64)}.png`

let base: string
let server: Server
let origin: string
let remote: MasterRemote
let calls: { channel: string; args: unknown[] }[]
let states: MasterState[]

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "runas-master-"))
  await writeFile(join(base, "master.html"), "<!doctype html><title>Mesa do mestre</title>")
  await mkdir(join(base, "mesa", "assets", "tokens"), { recursive: true })
  await writeFile(join(base, "mesa", "assets", TOKEN), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  const world: WorldSummary = { formatVersion: 1, id: "mesa-1", title: "Mesa do teste", description: "", createdAt: 1, updatedAt: 1, path: join(base, "mesa") }
  calls = []
  states = []
  remote = new MasterRemote({
    staticRoot: base,
    world: () => ({ summary: world }),
    invoke: async (channel, args) => {
      calls.push({ channel, args })
      if (channel === IPC.documentsDelete) throw new Error("Documento não encontrado.")
      return { channel, echo: args }
    },
    onState: (state) => states.push(state),
  })
  server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`)
    void remote.handle(request, response, url).then((handled) => {
      if (!handled) {
        response.writeHead(418)
        response.end()
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`
})

afterEach(async () => {
  remote.stop()
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  await rm(base, { recursive: true, force: true })
})

/** Abre o canal de eventos e lê até a primeira mensagem `hello`. */
async function connect(key: string): Promise<{ hello: MasterHello; read: () => Promise<string>; cancel: () => Promise<void> }> {
  const response = await fetch(`${origin}/master/events?m=${key}`)
  expect(response.status).toBe(200)
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  const read = async () => {
    for (;;) {
      const end = buffer.indexOf("\n\n")
      if (end >= 0) {
        const message = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        if (!message.startsWith(":")) return message
        continue
      }
      const chunk = await reader.read()
      if (chunk.done) return ""
      buffer += decoder.decode(chunk.value, { stream: true })
    }
  }
  const first = await read()
  expect(first.split("\n")[0]).toBe("event: hello")
  return { hello: JSON.parse(first.split("\n")[1]!.slice(6)) as MasterHello, read, cancel: () => reader.cancel() }
}

const rpc = (key: string, session: string, channel: string, args: unknown[] = [], extra: Record<string, string> = {}) =>
  fetch(`${origin}/master/rpc?m=${key}`, { method: "POST", headers: { "content-type": "application/json", "x-runas-session": session, ...extra }, body: JSON.stringify({ channel, args }) })

describe("MasterRemote", () => {
  it("só abre com a sala ligada e a chave certa", async () => {
    expect((await fetch(`${origin}/master?m=qualquer`)).status).toBe(404)
    remote.start()
    const key = remote.state().key!
    const page = await fetch(`${origin}/master?m=${key}`)
    expect(page.status).toBe(200)
    expect(await page.text()).toContain("Mesa do mestre")
    expect((await fetch(`${origin}/master?m=${key.replace(/.$/, "0")}x`)).status).toBe(404)
    expect((await fetch(`${origin}/outra`)).status).toBe(418)
  })

  it("um aparelho por vez: a sessão do canal de eventos vale para as chamadas", async () => {
    remote.start()
    const key = remote.state().key!
    const master = await connect(key)
    expect(master.hello.world.title).toBe("Mesa do teste")
    expect(remote.state().connected).toBe(true)
    expect((await fetch(`${origin}/master/events?m=${key}`)).status).toBe(409)
    expect((await rpc(key, "sessao-errada", IPC.documentsList, ["token"])).status).toBe(403)
    const listed = await rpc(key, master.hello.session, IPC.documentsList, ["token", null])
    expect(listed.status).toBe(200)
    expect(await listed.json()).toEqual({ result: { channel: IPC.documentsList, echo: ["token", null] } })
    await master.cancel()
  })

  it("recusa canais que são só do computador e devolve o erro do tratador", async () => {
    remote.start()
    const key = remote.state().key!
    const master = await connect(key)
    for (const channel of [IPC.playerStop, IPC.openWorld, IPC.playerPublicLink, "vtt:master-rotate"]) {
      expect((await rpc(key, master.hello.session, channel)).status).toBe(403)
    }
    const failed = await rpc(key, master.hello.session, IPC.documentsDelete, ["x"])
    expect(failed.status).toBe(400)
    expect(await failed.json()).toEqual({ error: "Documento não encontrado." })
    expect(calls.map((call) => call.channel)).toEqual([IPC.documentsDelete])
    // Outro site não chama a mesa pelo navegador de quem está com a chave.
    expect((await rpc(key, master.hello.session, IPC.documentsList, [], { origin: "http://exemplo.com" })).status).toBe(404)
    await master.cancel()
  })

  it("repassa as mudanças da mesa ao celular, e só os eventos da mesa", async () => {
    remote.start()
    const master = await connect(remote.state().key!)
    remote.emit("vtt:qualquer-outro", { segredo: true })
    remote.emit(IPC.documentsChanged, { kind: "delete", ids: ["a"] })
    expect(await master.read()).toBe(`event: ${IPC.documentsChanged}\ndata: {"kind":"delete","ids":["a"]}`)
    await master.cancel()
  })

  it("trocar a chave derruba o aparelho e invalida o link antigo", async () => {
    remote.start()
    const old = remote.state().key!
    const master = await connect(old)
    const next = remote.rotate()
    expect(next.key).not.toBe(old)
    expect(next.connected).toBe(false)
    expect(await master.read()).toBe("event: closed\ndata: {}")
    expect((await fetch(`${origin}/master?m=${old}`)).status).toBe(404)
    expect((await fetch(`${origin}/master?m=${next.key}`)).status).toBe(200)
    expect(states.at(-1)).toEqual(next)
  })

  it("serve os assets da mesa e importa arquivos com a sessão", async () => {
    remote.start()
    const key = remote.state().key!
    const master = await connect(key)
    const asset = await fetch(`${origin}/master/asset/${TOKEN}?m=${key}`)
    expect(asset.status).toBe(200)
    expect(new Uint8Array(await asset.arrayBuffer())).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))
    expect((await fetch(`${origin}/master/asset/tokens/..%2F..%2Fsegredo.png?m=${key}`)).status).toBe(404)
    const imported = await fetch(`${origin}/master/asset?m=${key}&kind=tokens&name=heroi.png`, { method: "POST", headers: { "x-runas-session": master.hello.session }, body: new Uint8Array([1, 2, 3]) })
    expect(imported.status).toBe(200)
    expect(calls.at(-1)).toEqual({ channel: IPC.assetsImport, args: ["tokens", "heroi.png", new Uint8Array([1, 2, 3])] })
    await master.cancel()
  })
})
