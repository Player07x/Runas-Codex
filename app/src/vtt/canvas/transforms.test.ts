import { normalizeLight, normalizeTile, normalizeToken } from "../shared/scene"
import type { WorldDocument } from "../shared/world"
import { transformObject } from "./transforms"
const document = (type: WorldDocument["type"], data: unknown): WorldDocument => ({ id: "a", type, parentId: "cena", sort: 0, createdAt: 1, updatedAt: 1, data })
describe("Alças da mesa", () => {
  it("redimensiona um token pelo centro e encaixa em meia célula", () => {
    const doc = document("token", normalizeToken({ x: 100, y: 100, size: 1 }))
    expect(transformObject(doc, "size", { x: 150, y: 150 }, { x: 200, y: 200 }, 100, false).data).toMatchObject({ x: 100, y: 100, size: 2 })
  })
  it("gira o token com passos de 15 graus e aceita giro livre", () => {
    const doc = document("token", normalizeToken({ rotation: 0 }))
    expect(transformObject(doc, "rotation", { x: 0, y: -100 }, { x: 100, y: 0 }, 100, false).data).toMatchObject({ rotation: 90 })
    const point = { x: Math.cos(0.1) * 100, y: Math.sin(0.1) * 100 }
    expect((transformObject(doc, "rotation", { x: 100, y: 0 }, point, 100, true).data as { rotation: number }).rotation).toBeCloseTo(5.73, 2)
  })
  it("mantém o centro e a proporção de uma imagem girada", () => {
    const doc = document("tile", normalizeTile({ x: 10, y: 20, width: 200, height: 100, rotation: 40 }))
    expect(transformObject(doc, "size", { x: 210, y: 70 }, { x: 310, y: 70 }, 100, false).data).toMatchObject({ x: -90, y: -30, width: 400, height: 200, rotation: 40 })
  })
  it("as duas alças da luz mantêm plena dentro da penumbra", () => {
    const doc = document("light", normalizeLight({ dim: 4, bright: 2 }))
    expect(transformObject(doc, "dim", { x: 400, y: 0 }, { x: 100, y: 0 }, 100, false).data).toMatchObject({ dim: 1, bright: 1 })
    expect(transformObject(doc, "bright", { x: 0, y: 200 }, { x: 0, y: 600 }, 100, false).data).toMatchObject({ dim: 6, bright: 6 })
  })
})
