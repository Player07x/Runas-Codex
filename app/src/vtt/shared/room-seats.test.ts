import { describe, expect, it } from "vitest"
import { PortableWorldStore, type WorldFile, type WorldFiles } from "./portable-world-store"
import { RoomAuthority } from "./room-authority"
import { putDocument } from "./world-documents"
import type { PlayerTransportOptions } from "./transport"
import { MAX_PLAYER_SEATS, PlayerSession } from "./player-session"
import { dropNotice, playersNotice, retryAfter } from "./room-drop"

function io(): WorldFiles {
  const entries = new Map<string, { version: WorldFile; bytes: Uint8Array }>()
  let clock = 1
  return {
    list: async () => [...entries.values()].map((e) => ({ ...e.version })),
    read: async (path) => entries.get(path)!.bytes.slice(),
    write: async (path, bytes) => {
      const version = { path, mtime: ++clock, size: bytes.length }
      entries.set(path, { bytes: bytes.slice(), version })
      return { ...version }
    },
  }
}

async function room(seats = 2) {
  const store = new PortableWorldStore(io())
  const summary = await store.create({ title: "Mesa" })
  await store.open(summary.id)
  const db = store.database()
  putDocument(db, { id: "scene", type: "scene", parentId: null, data: { name: "Praça", width: 1000, height: 1000 } })
  putDocument(db, { id: "hero3", type: "token", parentId: "scene", data: { name: "Terceira", x: 1, y: 1, disposition: "player", playerSlotId: "player-3" } })
  let options!: PlayerTransportOptions
  let address = "192.168.1.8"
  const disconnected: string[] = []
  const calls: string[] = []
  const authority = new RoomAuthority(
    store,
    (value) => {
      options = value
      return {
        spectatorCount: 0,
        addressPort: 30000,
        start: async (port, key) => { calls.push(`start:${port}:${key.length}`) },
        stop: async () => { calls.push("stop") },
        publish: () => undefined,
        publishTo: () => undefined,
        disconnectSeat: (slotId) => disconnected.push(slotId),
      }
    },
    () => undefined,
    null,
    () => address,
  )
  const state = await authority.start(30000, seats)
  return { authority, options, state, disconnected, calls, setAddress: (value: string) => { address = value } }
}

describe("assentos com a sala aberta (U89)", () => {
  it("acrescenta um assento no fim com código novo, sem mudar os outros", async () => {
    const { authority, options, state } = await room()
    const next = authority.addSeat()
    expect(next.seats.map((s) => s.slotId)).toEqual(["player-1", "player-2", "player-3"])
    expect(next.seats[2]).toMatchObject({ label: "Jogador 3" })
    expect(next.seats[2]!.code).toBeTruthy()
    expect(options.joinSeat!(next.seats[2]!.code!)?.seat.slotId).toBe("player-3")
    expect(options.joinSeat!(state.seats[0]!.code!)?.seat.slotId).toBe("player-1")
  })

  it("o token que já era do assento volta a ser dele", async () => {
    const { authority } = await room()
    expect(authority.addSeat().seats[2]).toMatchObject({ tokenId: "hero3", status: "attached" })
  })

  it("tira o último assento, desconecta só quem estava nele e invalida o código", async () => {
    const { authority, options, state, disconnected } = await room(3)
    const joined = options.joinSeat!(state.seats[2]!.code!)!
    const next = authority.removeSeat()
    expect(next.seats.map((s) => s.slotId)).toEqual(["player-1", "player-2"])
    expect(disconnected).toEqual(["player-3"])
    expect(options.authenticateSeat!(joined.token)).toBeNull()
    expect(options.joinSeat!(state.seats[2]!.code!)).toBeNull()
    expect(options.joinSeat!(state.seats[0]!.code!)?.seat.slotId).toBe("player-1")
  })

  it("respeita o mínimo de 1 e o máximo de 12 assentos", () => {
    const { session } = PlayerSession.create(1)
    expect(() => session.removeLastSeat()).toThrow(/pelo menos 1/)
    for (let i = 1; i < MAX_PLAYER_SEATS; i++) session.addSeat()
    expect(session.seatCount).toBe(MAX_PLAYER_SEATS)
    expect(() => session.addSeat()).toThrow(/no máximo 12/)
  })

  it("depois de tirar e pôr de novo, o assento volta com o mesmo número", () => {
    const { session } = PlayerSession.create(3)
    session.removeLastSeat()
    expect(session.addSeat().seat.slotId).toBe("player-3")
  })
})

describe("quedas da sala (U89)", () => {
  it("túnel caído e reaberto: a faixa mostra o link novo", async () => {
    const { authority } = await room()
    authority.setPublicUrl("https://a.trycloudflare.com/?k=1")
    authority.markTunnelLost(true)
    expect(authority.state()).toMatchObject({ publicUrl: null, tunnelLost: true, drop: { kind: "tunnel", status: "reconnecting" } })
    expect(dropNotice(authority.state())).toMatchObject({ reconnect: false, link: null })
    authority.setPublicUrl("https://b.trycloudflare.com/?k=1")
    expect(authority.state()).toMatchObject({ tunnelLost: false, drop: { kind: "tunnel", status: "restored" } })
    expect(dropNotice(authority.state())?.link).toBe("https://b.trycloudflare.com/?k=1")
  })

  it("túnel que não reabre pede o mestre", async () => {
    const { authority } = await room()
    authority.markTunnelLost(true)
    authority.markTunnelFailed()
    expect(dropNotice(authority.state())).toMatchObject({ reconnect: true })
  })

  it("percebe a troca de endereço na rede e mostra o link novo", async () => {
    const { authority, setAddress } = await room()
    expect(authority.checkAddress()).toBe(false)
    setAddress("10.0.0.5")
    expect(authority.checkAddress()).toBe(true)
    expect(dropNotice(authority.state())?.link).toContain("10.0.0.5:30000")
    expect(authority.checkAddress()).toBe(false)
  })

  it("Reconectar reabre na mesma porta, com a mesma chave e os mesmos códigos", async () => {
    const { authority, options, state, calls } = await room()
    authority.markServerLost()
    expect(dropNotice(authority.state())).toMatchObject({ reconnect: true })
    const after = await authority.reconnect()
    expect(calls.slice(-2)).toEqual(["stop", "start:30000:32"])
    expect(after.key).toBe(state.key)
    expect(after.localUrl).toBe(state.localUrl)
    expect(after.drop).toMatchObject({ kind: "server", status: "restored" })
    expect(options.joinSeat!(state.seats[1]!.code!)?.seat.slotId).toBe("player-2")
  })

  it("desligar a sala apaga a queda", async () => {
    const { authority } = await room()
    authority.markServerLost()
    await authority.stop()
    expect(authority.state().drop).toBeNull()
    expect(dropNotice(authority.state())).toBeNull()
  })

  it("tenta reabrir com esperas crescentes e para quando a sala fecha", async () => {
    const waits: number[] = []
    let tries = 0
    const sleep = async (ms: number) => { waits.push(ms) }
    expect(await retryAfter(async () => { tries++; if (tries < 3) throw new Error("x"); return "ok" }, () => true, [1, 2, 3, 4], sleep)).toBe("ok")
    expect(waits).toEqual([1, 2, 3])
    expect(await retryAfter(async () => "nunca", () => false, [1], sleep)).toBeNull()
    expect(await retryAfter(async () => { throw new Error("x") }, () => true, [1, 2], sleep)).toBeNull()
  })

  it("o aviso para os jogadores leva o link", () => {
    expect(playersNotice("http://10.0.0.5:30000/?k=a")).toContain("http://10.0.0.5:30000/?k=a")
  })
})
