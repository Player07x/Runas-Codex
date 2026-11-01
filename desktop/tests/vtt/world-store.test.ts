import { existsSync } from "node:fs"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { WorldStore } from "../../src/main/vtt/world-store"

let vault: string
let store: WorldStore

beforeEach(async () => {
  vault = await mkdtemp(join(tmpdir(), "runas-vtt-mesas-"))
  store = new WorldStore(() => vault)
})

afterEach(async () => {
  store.close()
  await rm(vault, { recursive: true, force: true })
})

describe("renomear e excluir mesas (U3)", () => {
  it("renomeia só o manifesto e mantém a pasta e o id", async () => {
    const mesa = await store.create({ title: "Teste" })
    const renamed = await store.rename(mesa.id, "  A Cripta do Lobo  ")
    expect(renamed).toMatchObject({ id: mesa.id, title: "A Cripta do Lobo", path: mesa.path })
    expect(JSON.parse(await readFile(join(mesa.path, "mesa.json"), "utf8")).title).toBe("A Cripta do Lobo")
    expect((await store.list()).map((world) => world.title)).toEqual(["A Cripta do Lobo"])
    await expect(store.rename(mesa.id, "   ")).rejects.toThrow("precisa de um nome")
  })

  it("manda a pasta da mesa para a lixeira do cofre, mesmo aberta", async () => {
    const mesa = await store.create({ title: "Teste" })
    const outra = await store.create({ title: "Outra" })
    await store.open(mesa.id)
    const target = await store.remove(mesa.id)
    expect(store.openWorld).toBeNull()
    expect(existsSync(mesa.path)).toBe(false)
    expect(target.startsWith(".trash/")).toBe(true)
    expect(await readdir(join(vault, target))).toContain("mesa.json")
    expect((await store.list()).map((world) => world.id)).toEqual([outra.id])
    await expect(store.remove(mesa.id)).rejects.toThrow("não encontrada")
  })
})
