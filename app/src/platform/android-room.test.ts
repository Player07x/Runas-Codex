import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Platform, VaultEntry } from "./platform"
const native = vi.hoisted(() => ({
  callbacks: new Map<string, (event: unknown) => void>(),
  start: vi.fn(async (_options: { roomId: string }) => ({ port: 30000, address: "192.168.0.8" })),
  stop: vi.fn(async () => undefined),
  answer: vi.fn(async (_value: { id: string; result: unknown }) => undefined),
  publish: vi.fn(async () => undefined),
  masterState: vi.fn(async () => ({ key: "a".repeat(32), connected: false })),
  masterRotate: vi.fn(async () => ({ key: "b".repeat(32), connected: false })),
  masterDisconnect: vi.fn(async () => ({ key: "a".repeat(32), connected: false })),
  masterEmit: vi.fn(async (_value: { channel: string; payload: unknown }) => undefined),
  openUrl: vi.fn(async () => undefined),
  addListener: vi.fn(async (name: string, callback: (event: unknown) => void) => {
    native.callbacks.set(name, callback)
    return { remove: async () => undefined }
  }),
}))
vi.mock("@capacitor/core", () => ({ registerPlugin: () => native }))
import { createAndroidVttApi } from "./android-room"

function fixture() {
  let clock = 1
  const files = new Map<string, { entry: VaultEntry; bytes: Uint8Array }>()
  const platform = {
    listTransferFiles: async () => [...files.values()].map((f) => f.entry),
    readBinary: async (path: string) => files.get(path)!.bytes.slice(),
    writeManagedTransfer: async (path: string, bytes: Uint8Array, expected: VaultEntry | null) => {
      const current = files.get(path)
      if (current && (!expected || current.entry.mtime !== expected.mtime)) throw new Error("Mudou fora do app")
      const entry = { path, mtime: ++clock, size: bytes.length }
      files.set(path, { entry, bytes: bytes.slice() })
      return entry
    },
    fileUrl: (path: string) => `https://localhost/_capacitor_file_/${path}`,
    notify: vi.fn(async () => undefined),
  } as unknown as Platform
  return { api: createAndroidVttApi(platform), files, platform }
}
async function rpc(kind: string, payload: object): Promise<Record<string, unknown>> {
  const id = crypto.randomUUID()
  native.callbacks.get("request")!({ id, kind, payload, roomId: native.start.mock.calls.at(-1)?.[0].roomId ?? "" })
  await vi.waitFor(() => expect(native.answer.mock.calls.some(([value]) => value.id === id)).toBe(true))
  return native.answer.mock.calls.find(([value]) => value.id === id)![0].result as Record<string, unknown>
}
beforeEach(() => {
  vi.clearAllMocks()
  native.callbacks.clear()
})
describe("ponte da sala Android", () => {
  it("abre a mesma mesa em montagens concorrentes e resolve assets apenas enquanto ela está aberta", async () => {
    const { api } = fixture(),
      world = await api.createWorld({ title: "Mesa" })
    const opened = await Promise.all([api.openWorld(world.id), api.openWorld(world.id)])
    expect(opened.map((w) => w.id)).toEqual([world.id, world.id])
    const asset = `maps/${"a".repeat(64)}.png`
    expect(api.assets.url!(asset)).toContain(world.path + "/assets/" + asset)
    await api.closeWorld()
    expect(api.assets.url!(asset)).toBeNull()
  })
  it("autentica pela ponte, publica só a projeção e grava o movimento antes de responder", async () => {
    const { api, files } = fixture(),
      world = await api.createWorld({ title: "Mesa real" })
    await api.openWorld(world.id)
    await api.documents.put({ id: "scene", type: "scene", parentId: null, data: { name: "Praça", width: 1000, height: 1000 } })
    await api.documents.put({
      id: "hero",
      type: "token",
      parentId: "scene",
      data: { name: "Lia", disposition: "player", playerSlotId: "player-1", x: 150, y: 150 },
    })
    await api.documents.put({ id: "secret", type: "token", parentId: "scene", data: { name: "SEGREDO", hidden: true } })
    await api.table.report({ sceneId: "scene", selection: [], center: null })
    const state = await api.player.start()
    const joined = await rpc("join", { code: state.seats[0]!.code })
    const authenticated = await rpc("authenticate", { token: joined.token })
    expect(authenticated.seat).toMatchObject({ slotId: "player-1" })
    const snapshot = await rpc("snapshot", { seat: authenticated.seat })
    expect(JSON.stringify(snapshot)).toContain("Lia")
    expect(JSON.stringify(snapshot)).not.toContain("SEGREDO")
    const moved = await rpc("message", { seat: authenticated.seat, message: { type: "move", tokenId: "hero", x: 250, y: 250 } })
    expect(moved.message).toMatchObject({ ok: true })
    const stored = JSON.parse(new TextDecoder().decode(files.get(`${world.path}/cenas/scene.json`)!.bytes)) as {
      id: string
      data: { x: number }
    }[]
    expect(stored.find((d) => d.id === "hero")?.data.x).toBe(250)
    await api.player.rotateSeatCode("player-1")
    expect((await rpc("authenticate", { token: joined.token })).seat).toBeNull()
    await api.player.stop()
    expect((await api.player.state()).enabled).toBe(false)
  })
  it("o mestre remoto grava pela mesma API, publica aos jogadores e recebe eventos locais", async () => {
    const { api, files } = fixture()
    const world = await api.createWorld({ title: "Mesa remota" })
    await api.openWorld(world.id)
    await api.documents.put({ id: "scene", type: "scene", parentId: null, data: { name: "Pátio" } })
    await api.table.report({ sceneId: "scene", selection: [], center: null })
    await api.player.start()
    expect((await rpc("master-world", {})).world).toMatchObject({ id: world.id })
    const document = { id: "remote-hero", type: "token", parentId: "scene", data: { name: "Criado pelo tablet", x: 150, y: 250 } }
    const result = await rpc("master", { channel: "vtt:documents-put", args: [document] })
    expect(result.result).toMatchObject({ id: document.id, data: document.data })
    expect(new TextDecoder().decode(files.get(`${world.path}/cenas/scene.json`)!.bytes)).toContain("Criado pelo tablet")
    expect(native.publish).toHaveBeenCalled()
    expect(native.masterEmit).toHaveBeenCalledWith(expect.objectContaining({ channel: "vtt:documents-changed", payload: expect.objectContaining({ kind: "put" }) }))
    expect((await rpc("master", { channel: "vtt:player-set-scene", args: ["scene"] })).error).toBeUndefined()
    expect((await api.player.state()).sceneId).toBe("scene")
    expect((await rpc("master", { channel: "vtt:worlds-create", args: [{ title: "Proibida" }] })).error).toBeDefined()
    expect((await rpc("master", { channel: "vtt:player-set-bars", args: ["inexistente"] })).error).toBeDefined()
    expect((await rpc("master", { channel: "vtt:documents-put", args: [{ ...document, id: "invalido", parentId: "sem-cena" }] })).error).toBeDefined()
    expect(await api.listWorlds()).toHaveLength(1)
    await api.player.stop()
    expect((await rpc("master", { channel: "vtt:documents-put", args: [document] })).error).toBeDefined()
  })
  it("importa pela gravação versionada e encaminha áudio, chaves e desconexão", async () => {
    const { api, files } = fixture()
    const world = await api.createWorld({ title: "Mesa" })
    await api.openWorld(world.id)
    await api.player.start()
    const asset = await rpc("master-asset", { kind: "audio", name: "sino.mp3", base64: btoa("som") })
    expect(files.has(`${world.path}/assets/${String(asset.result)}`)).toBe(true)
    await api.documents.put({ id: "playlist", type: "playlist", parentId: null, data: { name: "Sons", mode: "soundboard" } })
    await api.documents.put({ id: "track", type: "track", parentId: "playlist", data: { name: "Sino", audio: asset.result } })
    await rpc("master", { channel: "vtt:audio-play-track", args: ["track"] })
    expect((await api.audio.state()).sounds).toHaveLength(1)
    expect(native.masterEmit).toHaveBeenCalledWith(expect.objectContaining({ channel: "vtt:audio-state-changed" }))
    expect((await rpc("master-asset", { kind: "../cofre", name: "x.png", base64: btoa("imagem") })).error).toBeDefined()
    expect((await rpc("master-asset", { kind: "maps", name: "x.exe", base64: btoa("imagem") })).error).toBeDefined()
    const listener = vi.fn(), off = api.master!.onState(listener)
    native.callbacks.get("master-state")!({ key: "a".repeat(32), connected: true })
    expect(listener).toHaveBeenCalledWith({ key: "a".repeat(32), connected: true })
    off()
    await api.master!.state(); await api.master!.rotate(); await api.master!.disconnect()
    expect(native.masterRotate).toHaveBeenCalledOnce()
    expect(native.masterDisconnect).toHaveBeenCalledOnce()
    await api.closeWorld()
    expect(native.stop).toHaveBeenCalled()
  })
  it("recusa pedidos de uma sessão anterior depois de reabrir a sala", async () => {
    const { api } = fixture(), world = await api.createWorld({ title: "Mesa" })
    await api.openWorld(world.id)
    await api.player.start()
    const id = crypto.randomUUID()
    native.callbacks.get("request")!({ id, roomId: "sala-antiga", kind: "master-world", payload: {} })
    await vi.waitFor(() => expect(native.answer).toHaveBeenCalledWith({ id, result: { error: expect.any(String) } }))
    await api.player.stop()
  })
  it("encerra a sala ao receber a ação de parar do serviço", async () => {
    const { api } = fixture(),
      world = await api.createWorld({ title: "Mesa" })
    await api.openWorld(world.id)
    await api.player.start()
    native.callbacks.get("stopped")!({ enabled: false })
    await vi.waitFor(async () => expect((await api.player.state()).enabled).toBe(false))
    await expect(api.player.publicLink()).rejects.toThrow("rede local")
    await expect(api.player.testPublicLink()).rejects.toThrow("ainda não está disponível")
    await expect(api.player.downloadCloudflared()).rejects.toThrow("ainda não está disponível")
  })
})
