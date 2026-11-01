import { filterLibrary, instantiateScene, instantiateToken, itemAssets, libraryAssetPath, libraryItemPath, parseLibraryItem, sceneItem, tokenItem } from "./library"
import { normalizeScene, normalizeToken, type SceneData, type TokenData } from "./scene"
import { managedWorldPath } from "../../core/transfer/archive"
import type { WorldDocument } from "./world"

const hash = "a".repeat(64)
const doc = <T,>(id: string, type: WorldDocument["type"], data: T, parentId: string | null = null, sort = 0): WorldDocument<T> => ({ id, type, parentId, sort, createdAt: 0, updatedAt: 0, data })

describe("biblioteca da mesa (U13)", () => {
  it("guarda o token sem posição nem dono e copia a imagem junto", () => {
    const token = doc("t1", "token", normalizeToken({ name: "Lobo", x: 300, y: 400, image: `tokens/${hash}.png`, playerSlotId: "player-1", bars: [{ label: "PV", value: 3, max: 9 }] }))
    const item = tokenItem(token as WorldDocument<TokenData>, "item1", 5)
    expect(item).toMatchObject({ kind: "token", name: "Lobo", data: { x: 0, y: 0 } })
    expect(item.data).not.toHaveProperty("playerSlotId")
    expect(itemAssets(item)).toEqual([`tokens/${hash}.png`])
    expect(instantiateToken(item, "cena", { x: 50, y: 60 }, "novo")).toMatchObject({ id: "novo", type: "token", parentId: "cena", data: { name: "Lobo", x: 50, y: 60 } })
  })

  it("guarda o mapa com paredes, luzes, regiões e imagens, sem tokens nem notas, e vira cena nova", () => {
    const scene = doc("s1", "scene", normalizeScene({ name: "Cripta", background: `maps/${hash}.webp` })) as WorldDocument<SceneData>
    const children = [doc("w1", "wall", { x1: 0, y1: 0, x2: 10, y2: 0 }, "s1", 2), doc("t1", "token", normalizeToken({}), "s1"), doc("l1", "light", { x: 5, y: 5 }, "s1", 1), doc("n1", "note", { text: "x" }, "s1")]
    const item = sceneItem(scene, children, "item2", 7)
    expect(item.children.map((child) => child.type)).toEqual(["light", "wall"])
    expect(itemAssets(item)).toEqual([`maps/${hash}.webp`])
    let n = 0
    const docs = instantiateScene(item, () => `id${++n}`, new Map([[`maps/${hash}.webp`, `maps/${"b".repeat(64)}.webp`]]), 1)
    expect(docs.map((d) => [d.id, d.type, d.parentId])).toEqual([["id1", "scene", null], ["id2", "light", "id1"], ["id3", "wall", "id1"]])
    expect((docs[0]!.data as SceneData).background).toBe(`maps/${"b".repeat(64)}.webp`)
  })

  it("lê só itens válidos e de versão conhecida", () => {
    expect(parseLibraryItem({ formatVersion: 1, id: "x", kind: "token", name: "  Goblin ", data: { name: "G" } })).toMatchObject({ name: "Goblin", kind: "token" })
    expect(parseLibraryItem({ formatVersion: 2, id: "x", kind: "token", data: {} })).toBeNull()
    expect(parseLibraryItem({ formatVersion: 1, id: "../x", kind: "token", data: {} })).toBeNull()
    expect(parseLibraryItem({ formatVersion: 1, id: "x", kind: "nota", data: {} })).toBeNull()
  })

  it("busca por nome e tipo, os mais novos primeiro", () => {
    const items = [parseLibraryItem({ formatVersion: 1, id: "a", kind: "token", name: "Lobo cinzento", createdAt: 1, data: {} })!, parseLibraryItem({ formatVersion: 1, id: "b", kind: "scene", name: "Covil do lobo", createdAt: 2, data: {} })!]
    expect(filterLibrary(items, "lobo", "todos").map((i) => i.id)).toEqual(["b", "a"])
    expect(filterLibrary(items, "", "token").map((i) => i.id)).toEqual(["a"])
  })

  it("usa caminhos que o cofre já transporta e grava como área das mesas", () => {
    expect(managedWorldPath(libraryItemPath("abc"))).toBe("biblioteca/cenas/abc.json")
    expect(managedWorldPath(libraryAssetPath(`tokens/${hash}.png`))).toBe(`biblioteca/assets/tokens/${hash}.png`)
  })
})
