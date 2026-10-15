import type { DocumentInput } from "../shared/ipc"
import { normalizeToken } from "../shared/scene"
import type { WorldDocument } from "../shared/world"
import { SceneHistory } from "./history"
class Store {
  docs = new Map<string, WorldDocument>()
  clock = 0
  fail = ""
  get<T>(id: string) { return (this.docs.get(id) as WorldDocument<T> | undefined) ?? null }
  async put(input: DocumentInput): Promise<WorldDocument> {
    if (input.id === this.fail) throw new Error("Falha na gravação")
    const doc = { ...input, sort: input.sort ?? 0, createdAt: 1, updatedAt: ++this.clock, data: normalizeToken(input.data) }
    this.docs.set(input.id, doc); return doc
  }
  async remove(id: string) { this.docs.delete(id) }
}
const input = (id: string, x = 0): DocumentInput => ({ id, type: "token", parentId: "cena", data: { x } })
describe("Desfazer e refazer na mesa", () => {
  it("agrupa uma edição da seleção e restaura os dois objetos de uma vez", async () => {
    const store = new Store(), history = new SceneHistory(store, () => {})
    await store.put(input("a")); await store.put(input("b"))
    await history.apply([{ id: "a", value: input("a", 100) }, { id: "b", value: input("b", 200) }])
    expect(history.canUndo).toBe(true)
    await history.undo()
    expect(store.get<{ x: number }>("a")?.data.x).toBe(0)
    expect(store.get<{ x: number }>("b")?.data.x).toBe(0)
    await history.redo(); expect(store.get<{ x: number }>("b")?.data.x).toBe(200)
  })
  it("desfaz criação e exclusão e mantém a ordem do documento", async () => {
    const store = new Store(), history = new SceneHistory(store, () => {})
    await history.apply([{ id: "a", value: { ...input("a"), sort: 7 } }]); await history.undo()
    expect(store.get("a")).toBe(null)
    await history.redo(); await history.apply([{ id: "a", value: null }]); await history.undo()
    expect(store.get("a")?.sort).toBe(7)
  })
  it("preserva alterações recebidas de outro aparelho", async () => {
    const store = new Store(), history = new SceneHistory(store, () => {})
    await history.apply([{ id: "a", value: input("a", 100) }]); await store.put(input("a", 500))
    await expect(history.undo()).rejects.toThrow("mudou depois")
    expect(store.get<{ x: number }>("a")?.data.x).toBe(500)
  })
  it("mantém no histórico só a parte gravada se uma operação falhar", async () => {
    const store = new Store(), history = new SceneHistory(store, () => {}); store.fail = "b"
    await expect(history.apply([{ id: "a", value: input("a") }, { id: "b", value: input("b") }])).rejects.toThrow("Falha")
    await history.undo(); expect(store.get("a")).toBe(null); expect(store.get("b")).toBe(null)
  })
  it("serializa ações rápidas e descarta refazer quando chega uma nova edição", async () => {
    const store = new Store(), history = new SceneHistory(store, () => {})
    await Promise.all([history.apply([{ id: "a", value: input("a", 100) }]), history.apply([{ id: "a", value: input("a", 200) }])])
    await history.undo(); expect(store.get<{ x: number }>("a")?.data.x).toBe(100)
    await history.apply([{ id: "b", value: input("b") }]); expect(history.canRedo).toBe(false)
    history.clear(); expect(history.canUndo).toBe(false)
  })
})
