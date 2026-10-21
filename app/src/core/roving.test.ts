import { nextIndex } from "./roving"

describe("navegação por teclado em menus e abas", () => {
  const livres = [false, false, false, false]

  it("desce e sobe um item por vez e dá a volta nas pontas", () => {
    expect(nextIndex("ArrowDown", 0, livres)).toBe(1)
    expect(nextIndex("ArrowDown", 3, livres)).toBe(0)
    expect(nextIndex("ArrowUp", 0, livres)).toBe(3)
  })

  it("vai ao primeiro e ao último com Home e End", () => {
    expect(nextIndex("Home", 2, livres)).toBe(0)
    expect(nextIndex("End", 0, livres)).toBe(3)
  })

  it("pula itens desativados", () => {
    const comDesativados = [false, true, true, false]
    expect(nextIndex("ArrowDown", 0, comDesativados)).toBe(3)
    expect(nextIndex("ArrowUp", 3, comDesativados)).toBe(0)
    expect(nextIndex("Home", 3, [true, false, false])).toBe(1)
    expect(nextIndex("End", 0, [false, false, true])).toBe(1)
  })

  it("usa as setas do lado nas listas horizontais", () => {
    expect(nextIndex("ArrowRight", 1, livres, "horizontal")).toBe(2)
    expect(nextIndex("ArrowLeft", 0, livres, "horizontal")).toBe(3)
    expect(nextIndex("ArrowDown", 1, livres, "horizontal")).toBeNull()
  })

  it("não move o foco sem itens disponíveis ou com outra tecla", () => {
    expect(nextIndex("ArrowDown", 0, [])).toBeNull()
    expect(nextIndex("ArrowDown", 0, [true, true])).toBeNull()
    expect(nextIndex("Enter", 0, livres)).toBeNull()
  })

  it("começa do primeiro item quando nada está focado", () => {
    expect(nextIndex("ArrowDown", -1, livres)).toBe(0)
    expect(nextIndex("ArrowUp", -1, livres)).toBe(3)
  })
})
