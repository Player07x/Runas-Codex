import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { PlayerTransmission } from "../../src/main/vtt/player-transmission"
import { putDocument } from "../../src/main/vtt/world-documents"
import { WorldStore } from "../../src/main/vtt/world-store"
import type { PlayerWireMessage } from "../../../app/src/vtt/shared/player"

let root: string
let store: WorldStore
let transmission: PlayerTransmission
let sent: PlayerWireMessage[]

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "runas-codex-transmission-"))
  store = new WorldStore(() => root)
  const world = await store.create({ title: "Mesa" })
  const { database } = await store.open(world.id)
  putDocument(database, { id: "cena", type: "scene", parentId: null, data: { name: "Cena" } })
  putDocument(database, { id: "outra", type: "scene", parentId: null, data: { name: "Outra" } })
  putDocument(database, { id: "visivel", type: "token", parentId: "cena", data: { name: "Aliado" } })
  putDocument(database, { id: "oculto", type: "token", parentId: "cena", data: { name: "Emboscada", hidden: true } })
  transmission = new PlayerTransmission(store, root, () => undefined)
  // Sem abrir porta: o teste observa só o que seria enviado aos espectadores.
  sent = []
  const internals = transmission as unknown as { enabled: boolean; server: { publish(message: PlayerWireMessage): void } }
  internals.server.publish = (message) => { sent.push(message) }
  internals.enabled = true
  transmission.setMasterView({ sceneId: "cena", selection: [], center: { x: 10, y: 10 }, zoom: 1 })
  sent = []
})

afterEach(async () => {
  store.close()
  await rm(root, { recursive: true, force: true })
})

describe("transmissão da Vista dos Jogadores", () => {
  it("mover a câmera do mestre não move a dos jogadores; só puxar a câmera", () => {
    transmission.setMasterView({ sceneId: "cena", selection: [], center: { x: 500, y: 300 }, zoom: 2 })
    expect(sent).toEqual([])
    transmission.pullCamera()
    expect(sent).toEqual([{ type: "camera", center: { x: 500, y: 300 }, zoom: 2 }])
  })

  it("a régua do mestre só chega aos jogadores na cena transmitida", () => {
    transmission.setRuler({ sceneId: "outra", from: { x: 0, y: 0 }, to: { x: 1, y: 1 } })
    expect(sent).toEqual([])
    transmission.setRuler({ sceneId: "cena", from: { x: 0, y: 0 }, to: { x: 200, y: 0 } })
    transmission.setRuler(null)
    expect(sent).toEqual([
      { type: "ruler", ruler: { sceneId: "cena", from: { x: 0, y: 0 }, to: { x: 200, y: 0 } } },
      { type: "ruler", ruler: null },
    ])
  })

  it("o dano flutua só sobre tokens que os jogadores veem", () => {
    const log = (tokenId: string) => ({ kind: "put" as const, document: { id: `log-${tokenId}`, type: "log-entry" as const, parentId: null, sort: 0, createdAt: 0, updatedAt: 0, data: { kind: "damage", title: "Dano", detail: "", tokenId, tokenName: "", sceneId: "cena", floatingText: "-9" } } })
    transmission.onDocumentChange(log("oculto"))
    transmission.onDocumentChange(log("visivel"))
    expect(sent).toEqual([{ type: "float", tokenId: "visivel", text: "-9", kind: "damage" }])
  })

  it("liga o assento ao token atribuído pelo mestre, e só ele move esse token", async () => {
    const database = store.openWorld!.database
    putDocument(database, { id: "lia", type: "token", parentId: "cena", data: { name: "Lia", disposition: "player", playerSlotId: "player-1" } })
    transmission.setMasterView({ sceneId: "cena", selection: [], center: { x: 100, y: 100 }, zoom: 1 })
    transmission.setCommit(() => undefined)
    const state = await transmission.start(31000 + (Date.now() % 500), 2)
    expect(state.seats.map((seat) => [seat.slotId, seat.status, seat.tokenId])).toEqual([["player-1", "attached", "lia"], ["player-2", "available", null]])
    const move = { type: "move", tokenId: "lia", x: 150, y: 150 }
    expect(transmission.handleClientMessage(move, { slotId: "player-2", label: "Jogador 2" })).toMatchObject({ ok: false })
    expect(transmission.handleClientMessage(move, { slotId: "player-1", label: "Jogador 1" })).toMatchObject({ ok: true })
    // Tirar o token do assento solta o assento.
    const { change } = putDocument(database, { id: "lia", type: "token", parentId: "cena", data: { name: "Lia", disposition: "player" } })
    transmission.onDocumentChange(change)
    expect(transmission.state().seats[0]).toMatchObject({ status: "available", tokenId: null })
    await transmission.stop()
  })
})

describe("link público", () => {
  it("guarda os detalhes do túnel e marca quando ele cai sozinho", () => {
    transmission.setPublicUrl("https://abc.trycloudflare.com/?k=1", { location: "gru01", protocol: "http2" })
    expect(transmission.state()).toMatchObject({ publicUrl: "https://abc.trycloudflare.com/?k=1", tunnel: { location: "gru01", protocol: "http2" }, tunnelLost: false })
    transmission.markTunnelLost()
    expect(transmission.state()).toMatchObject({ publicUrl: null, tunnel: null, tunnelLost: true })
    // Gerar outro link limpa o aviso.
    transmission.setPublicUrl("https://def.trycloudflare.com/?k=1")
    expect(transmission.state()).toMatchObject({ publicUrl: "https://def.trycloudflare.com/?k=1", tunnelLost: false })
  })

  it("encerrar o link de propósito não vira aviso de queda", () => {
    transmission.setPublicUrl("https://abc.trycloudflare.com/?k=1", { location: "gru01", protocol: "http2" })
    transmission.setPublicUrl(null)
    expect(transmission.state()).toMatchObject({ publicUrl: null, tunnel: null, tunnelLost: false })
  })
})
