import { addBar, barTemplates, moveBar, newBarLabel, playerBars, projectionForSeat } from "./bars"
import { normalizeToken, type TokenBar } from "./scene"
import { projectScene } from "./player"
import type { WorldDocument } from "./world"

const bar = (label: string, extra: Partial<TokenBar> = {}): TokenBar => ({ label, value: 5, max: 10, color: "#123456", ...extra })

describe("barras do token (U12)", () => {
  it("lê mesas antigas (PV, PA, PE) e aceita mais de três barras, sem rótulo PV inventado", () => {
    const token = normalizeToken({ bars: [bar("PV"), bar("PA"), bar("PE"), bar("Sanidade"), { value: 3 }] })
    expect(token.bars.map((b) => b.label)).toEqual(["PV", "PA", "PE", "Sanidade", "Barra"])
    expect(token.bars[0]).not.toHaveProperty("visibility")
    expect(normalizeToken({ bars: [bar("Mana", { visibility: "mestre" })] }).bars[0]!.visibility).toBe("mestre")
    expect(normalizeToken({ bars: Array.from({ length: 30 }, (_, i) => bar(`B${i}`)) }).bars).toHaveLength(12)
  })

  it("oferece como modelo os nomes já usados na mesa, mais PV, PA e PE", () => {
    const templates = barTemplates([normalizeToken({ bars: [bar("Sanidade", { max: 60 })] }), normalizeToken({ bars: [bar("sanidade", { max: 1 })] })])
    expect(templates.map((t) => t.label)).toEqual(["PA", "PE", "PV", "Sanidade"])
    expect(templates.find((t) => t.label === "Sanidade")).toMatchObject({ max: 60, value: 60 })
  })

  it("acrescenta sem repetir o nome, sobe, desce e escolhe um nome livre", () => {
    const bars = addBar([bar("PV")], bar("Mana", { max: 20 }))
    expect(bars.map((b) => [b.label, b.value])).toEqual([["PV", 5], ["Mana", 20]])
    expect(addBar(bars, bar("mana"))).toHaveLength(2)
    expect(moveBar(bars, 1, -1).map((b) => b.label)).toEqual(["Mana", "PV"])
    expect(moveBar(bars, 0, -1).map((b) => b.label)).toEqual(["PV", "Mana"])
    expect(newBarLabel([bar("Barra")])).toBe("Barra 2")
  })

  it("decide o que sai para a sala pela visibilidade de cada barra", () => {
    const bars = [bar("PV"), bar("Segredo", { visibility: "mestre" }), bar("Moral", { visibility: "todos" }), bar("Mana", { visibility: "dono" })]
    expect(playerBars(bars, "friendly", "hostile", undefined).map((b) => b.label)).toEqual(["Moral"])
    expect(playerBars(bars, "friendly", "friendly", "player-1").map((b) => b.label)).toEqual(["PV", "Moral", "Mana"])
    expect(playerBars(bars, "none", "friendly", "player-1")).toEqual([])
  })

  it("entrega a barra do dono só ao assento dele, nunca a outro jogador ou espectador", () => {
    const scene = { id: "s", type: "scene", parentId: null, sort: 0, createdAt: 0, updatedAt: 0, data: { name: "Cena", width: 1000, height: 1000, background: null, grid: { type: "square", size: 100, color: "#000000", alpha: 0, distance: 1.5, unit: "m", diagonal: "5-10-5" }, vision: { enabled: false } } } as unknown as WorldDocument<never>
    const token = { id: "t", type: "token", parentId: "s", sort: 0, createdAt: 0, updatedAt: 0, data: normalizeToken({ name: "Heroína", disposition: "player", playerSlotId: "player-1", bars: [bar("PV"), bar("Mana", { visibility: "dono" })] }) } as WorldDocument<ReturnType<typeof normalizeToken>>
    const projection = projectScene({ scene, children: { tokens: [token], tiles: [], drawings: [], notes: [] }, bars: "friendly" })
    const labels = (slot: string | null) => { const child = projectionForSeat(projection, slot).children[0]!; return child.type === "token" ? child.data.bars.map((b) => b.label) : [] }
    expect(labels("player-1")).toEqual(["PV", "Mana"])
    expect(labels("player-2")).toEqual(["PV"])
    expect(labels(null)).toEqual(["PV"])
  })
})
