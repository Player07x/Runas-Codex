import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { WorldDatabase } from "../../src/main/vtt/world-database"
import { WorldStore } from "../../src/main/vtt/world-store"
import type { WorldDocument } from "../../../app/src/vtt/shared/world"

let dir: string
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "runas-codex-mesa-"))
})
afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

const doc = (id: string, type: WorldDocument["type"], parentId: string | null, data: unknown = {}): WorldDocument => ({ id, type, parentId, sort: 0, data, createdAt: 1, updatedAt: 1 })

describe("WorldDatabase (JSON por cena)", () => {
  it("grava cada cena num arquivo e o resto em outros.json, e relê igual", async () => {
    const db = new WorldDatabase(dir, 0)
    db.put(doc("cena1", "scene", null, { name: "Taverna" }))
    db.put(doc("tok1", "token", "cena1", { name: "Goblin" }))
    db.put(doc("pl1", "playlist", null, { name: "Trilha" }))
    db.flush()
    expect((await readdir(join(dir, "cenas"))).sort()).toEqual(["cena1.json"])
    expect(JSON.parse(await readFile(join(dir, "outros.json"), "utf8")).map((d: WorldDocument) => d.id)).toEqual(["pl1"])
    db.close()
    const again = new WorldDatabase(dir, 0)
    expect(again.list("token", "cena1").map((d) => d.id)).toEqual(["tok1"])
    expect((again.get("cena1")!.data as { name: string }).name).toBe("Taverna")
    again.close()
  })

  it("apagar a cena apaga o que ela contém e o arquivo dela", async () => {
    const db = new WorldDatabase(dir, 0)
    db.put(doc("cena1", "scene", null))
    db.put(doc("tok1", "token", "cena1"))
    db.flush()
    expect(db.descendantIds("cena1").sort()).toEqual(["cena1", "tok1"])
    db.delete("cena1")
    db.flush()
    expect(db.list("token")).toEqual([])
    expect(await readdir(join(dir, "cenas"))).toEqual([])
  })

  it("junta várias mudanças numa gravação adiada", async () => {
    const db = new WorldDatabase(dir, 50)
    db.put(doc("cena1", "scene", null))
    for (let i = 0; i < 20; i++) db.put(doc("tok1", "token", "cena1", { name: `passo ${i}` }))
    await expect(readdir(join(dir, "cenas"))).rejects.toThrow()
    await new Promise((r) => setTimeout(r, 120))
    const saved = JSON.parse(await readFile(join(dir, "cenas", "cena1.json"), "utf8")) as WorldDocument[]
    expect((saved.find((d) => d.id === "tok1")!.data as { name: string }).name).toBe("passo 19")
    db.close()
  })
})

describe("WorldStore (mesas do cofre)", () => {
  it("cria, lista e abre mesas em .runas/mesas", async () => {
    const store = new WorldStore(() => dir)
    const mesa = await store.create({ title: "Cinzas de Valdris" })
    expect(mesa.path.startsWith(join(dir, ".runas", "mesas"))).toBe(true)
    const opened = await store.open(mesa.id)
    opened.database.put(doc("cena1", "scene", null))
    store.close()
    expect((await store.list()).map((m) => [m.title, m.scenes])).toEqual([["Cinzas de Valdris", 1]])
    await expect(new WorldStore(() => null).list()).rejects.toThrow(/Abra um cofre/)
  })
})
