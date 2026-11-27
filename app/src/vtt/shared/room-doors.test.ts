import { describe, expect, it } from "vitest"
import { PortableWorldStore, type WorldFile, type WorldFiles } from "./portable-world-store"
import { RoomAuthority, seatTokenScenes } from "./room-authority"
import { putDocument } from "./world-documents"
import { VisionService } from "./vision-service"
import { FOLLOW_TOKENS_SCENE, playerDoor, projectScene, type PlayerWireMessage } from "./player"
import type { PlayerSeatConnection, PlayerTransportOptions } from "./transport"
import { normalizeScene, normalizeToken, normalizeWall, type WallData } from "./scene"
import { computeVision } from "./vision"
import { importFoundryScene } from "./importers"
import type { WorldDocument } from "./world"

function files(): WorldFiles {
  const entries = new Map<string, { version: WorldFile; bytes: Uint8Array }>()
  let clock = 1
  return {
    list: async () => [...entries.values()].map((e) => ({ ...e.version })),
    read: async (path) => {
      const value = entries.get(path)
      if (!value) throw new Error("Ausente")
      return value.bytes.slice()
    },
    write: async (path, bytes) => {
      const version = { path, mtime: ++clock, size: bytes.length }
      entries.set(path, { bytes: bytes.slice(), version })
      return { ...version }
    },
  }
}

const SEATS: PlayerSeatConnection[] = [{ slotId: "player-1", label: "Jogador 1" }, { slotId: "player-2", label: "Jogador 2" }]

/** Sala com duas cenas: a Heroína (assento 1) na Praça e o Ladino (assento 2) na Caverna; o mestre com a Praça aberta. */
async function room() {
  const store = new PortableWorldStore(files())
  const summary = await store.create({ title: "Portas" })
  await store.open(summary.id)
  const db = store.database()
  putDocument(db, { id: "praca", type: "scene", parentId: null, data: { name: "Praça", width: 1000, height: 1000 } })
  putDocument(db, { id: "caverna", type: "scene", parentId: null, data: { name: "Caverna", width: 1000, height: 1000 } })
  putDocument(db, { id: "hero", type: "token", parentId: "praca", data: { name: "Heroína", x: 150, y: 150, disposition: "player", playerSlotId: "player-1" } })
  putDocument(db, { id: "rogue", type: "token", parentId: "caverna", data: { name: "Ladino", x: 150, y: 150, disposition: "player", playerSlotId: "player-2" } })
  putDocument(db, { id: "porta", type: "wall", parentId: "praca", data: { x1: 500, y1: 400, x2: 500, y2: 500, kind: "door" } })
  putDocument(db, { id: "trancada", type: "wall", parentId: "praca", data: { x1: 600, y1: 400, x2: 600, y2: 500, kind: "door", doorLocked: true } })
  putDocument(db, { id: "secreta", type: "wall", parentId: "praca", data: { x1: 700, y1: 400, x2: 700, y2: 500, kind: "secret" } })
  putDocument(db, { id: "parede", type: "wall", parentId: "praca", data: { x1: 800, y1: 0, x2: 800, y2: 1000 } })
  let options!: PlayerTransportOptions
  const sent: { seat: string; message: PlayerWireMessage }[] = []
  const authority = new RoomAuthority(
    store,
    (value) => {
      options = value
      return {
        spectatorCount: 0,
        addressPort: 30000,
        start: async () => undefined,
        stop: async () => undefined,
        publish: (message) => sent.push({ seat: "*", message }),
        publishTo: (make) => { for (const seat of [null, ...SEATS]) sent.push({ seat: seat?.slotId ?? "", message: make(seat) }) },
      }
    },
    () => undefined,
    new VisionService(() => db),
  )
  authority.setCommit((change) => authority.onDocumentChange(change))
  authority.setMasterView({ sceneId: "praca", selection: [], center: null })
  await authority.start(30000, 2)
  return { db, authority, options, sent }
}

const sceneOf = (message: PlayerWireMessage) => message.type === "snapshot" ? message.projection.scene?.id : undefined

describe("portas para os jogadores (anexo 2, 25/11)", () => {
  it("guarda “trancada” só nas portas comuns e lê a tranca do Foundry", () => {
    expect(normalizeWall({ kind: "door", doorLocked: true }).doorLocked).toBe(true)
    expect(normalizeWall({ kind: "secret", doorLocked: true }).doorLocked).toBe(false)
    expect(normalizeWall({ kind: "wall", doorLocked: true }).doorLocked).toBe(false)
    expect(normalizeWall({ kind: "door" }).doorLocked).toBe(false)
    const imported = importFoundryScene({ name: "Cena", width: 1000, height: 1000, walls: [{ c: [0, 0, 100, 0], door: 1, ds: 2 }, { c: [0, 0, 0, 100], door: 1, ds: 1 }] })
    const walls = imported.documents.filter((document) => document.type === "wall").map((document) => document.data as WallData)
    expect(walls.map((wall) => [wall.open, wall.doorLocked])).toEqual([[false, true], [true, false]])
  })

  it("manda só o meio das portas comuns que algum aliado vê, nunca paredes nem portas secretas", () => {
    const scene = { id: "s", type: "scene", parentId: null, sort: 0, createdAt: 0, updatedAt: 0, data: normalizeScene({ name: "S", width: 1000, height: 1000 }) } as const
    const walls = [
      { id: "porta", data: normalizeWall({ x1: 500, y1: 400, x2: 500, y2: 500, kind: "door", doorLocked: true }) },
      { id: "secreta", data: normalizeWall({ x1: 700, y1: 400, x2: 700, y2: 500, kind: "secret" }) },
      { id: "parede", data: normalizeWall({ x1: 800, y1: 0, x2: 800, y2: 1000 }) },
    ].map((wall) => ({ ...wall, type: "wall" as const, parentId: "s", sort: 0, createdAt: 0, updatedAt: 0 })) as WorldDocument<WallData>[]
    const projection = projectScene({ scene, children: { tokens: [], tiles: [], drawings: [], notes: [], walls }, bars: "friendly" })
    expect(projection.children).toEqual([{ id: "porta", type: "door", parentId: "s", sort: 0, data: { x: 500, y: 450, open: false, locked: true } }])
    expect(JSON.stringify(projection)).not.toContain("x1")

    // Com névoa: a porta atrás da parede não aparece; a do lado do aliado aparece.
    const dark = normalizeScene({ name: "S", width: 1000, height: 1000, vision: { enabled: true, globalLight: true } })
    const viewer = { id: "hero", data: normalizeToken({ x: 100, y: 450, disposition: "player", vision: { enabled: true } }) }
    const sight = computeVision(dark, [viewer], walls.map((wall) => wall.data), [])
    expect(playerDoor(walls[0]!.data, sight, 100)).toMatchObject({ x: 500, y: 450 })
    expect(playerDoor(normalizeWall({ x1: 900, y1: 400, x2: 900, y2: 500, kind: "door" }), sight, 100)).toBeNull()
  })

  it("o jogador abre e fecha a porta destrancada; a trancada, a secreta e o espectador são recusados", async () => {
    const { db, options } = await room()
    const seat = SEATS[0]!
    const door = (doorId: string, who: PlayerSeatConnection | null = seat) => options.onClientMessage!({ type: "door", doorId }, who)
    expect(door("porta", null)).toMatchObject({ type: "door-result", ok: false })
    expect(door("trancada")).toMatchObject({ ok: false, reason: "A porta está trancada: só o mestre abre." })
    expect(door("secreta")).toMatchObject({ ok: false })
    expect(door("parede")).toMatchObject({ ok: false })
    expect(door("porta")).toMatchObject({ ok: true })
    expect(db.get("porta")?.data).toMatchObject({ open: true })
    expect(door("porta")).toMatchObject({ ok: true })
    expect(db.get("porta")?.data).toMatchObject({ open: false })
  })
})

describe("cada jogador na cena do próprio token (anexo 2, 25/11)", () => {
  it("acha a cena de cada assento pelo token dele", async () => {
    const { db } = await room()
    expect(seatTokenScenes(db)).toEqual(new Map([["player-1", "praca"], ["player-2", "caverna"]]))
  })

  it("mostra a cada assento a cena do token dele; o espectador vê a do mestre", async () => {
    const { authority, options } = await room()
    expect(sceneOf(options.snapshot(SEATS[1]!))).toBe("praca")
    authority.setScene(FOLLOW_TOKENS_SCENE)
    expect(authority.state().sceneId).toBe(FOLLOW_TOKENS_SCENE)
    expect(sceneOf(options.snapshot(null))).toBe("praca")
    expect(sceneOf(options.snapshot(SEATS[0]!))).toBe("praca")
    expect(sceneOf(options.snapshot(SEATS[1]!))).toBe("caverna")
    // O Ladino só mexe na cena dele.
    expect(options.onClientMessage!({ type: "move", tokenId: "rogue", x: 250, y: 150 }, SEATS[1]!)).toMatchObject({ ok: true })
    authority.setScene(null)
    expect(sceneOf(options.snapshot(SEATS[1]!))).toBe("praca")
  })

  it("quando o token vai para outra cena, só aquele jogador recebe a cena nova inteira", async () => {
    const { db, authority, sent } = await room()
    authority.setScene(FOLLOW_TOKENS_SCENE)
    sent.length = 0
    const rogue = db.get("rogue")!
    const change = putDocument(db, { id: "rogue", type: "token", parentId: "praca", data: { ...(rogue.data as object), x: 300 } }).change
    authority.onDocumentChange(change)
    const bySeat = new Map(sent.map(({ seat, message }) => [seat, message]))
    expect(sceneOf(bySeat.get("player-2")!)).toBe("praca")
    expect(bySeat.get("player-1")?.type).toBe("projection-patch")
    expect(bySeat.get("")?.type).toBe("projection-patch")
  })
})

describe("régua do mestre para todos (1.9)", () => {
  it("desligada, apaga a régua na tela dos jogadores e não manda as próximas", async () => {
    const { authority, sent } = await room()
    authority.setRuler({ sceneId: "praca", from: { x: 0, y: 0 }, to: { x: 200, y: 0 } })
    sent.length = 0
    authority.setShareRuler(false)
    expect(sent.some((entry) => entry.message.type === "ruler" && entry.message.ruler === null)).toBe(true)
    expect(authority.state().shareRuler).toBe(false)
    sent.length = 0
    authority.setRuler({ sceneId: "praca", from: { x: 0, y: 0 }, to: { x: 300, y: 0 } })
    expect(sent.filter((entry) => entry.message.type === "ruler" && entry.message.ruler !== null)).toEqual([])
    authority.setShareRuler(true)
    authority.setRuler({ sceneId: "praca", from: { x: 0, y: 0 }, to: { x: 300, y: 0 } })
    expect(sent.some((entry) => entry.message.type === "ruler" && entry.message.ruler !== null)).toBe(true)
  })
})
