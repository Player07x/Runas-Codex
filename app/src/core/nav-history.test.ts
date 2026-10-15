import { NavHistory, randomNote } from "./nav-history"

describe("voltar e avançar", () => {
  it("acompanha as entradas novas, a volta e o avanço", () => {
    const h = new NavHistory()
    expect([h.canBack, h.canForward]).toEqual([false, false])
    expect(h.arrive(undefined)).toBe(1)
    expect(h.arrive(undefined)).toBe(2)
    expect(h.arrive(1)).toBe(1) // voltou
    expect([h.canBack, h.canForward]).toEqual([true, true])
    expect(h.arrive(2)).toBe(2) // avançou
    expect(h.canForward).toBe(false)
  })

  it("uma entrada nova depois de voltar corta o caminho à frente", () => {
    const h = new NavHistory()
    h.arrive(undefined)
    h.arrive(undefined)
    h.arrive(1)
    expect(h.arrive(undefined)).toBe(2)
    expect(h.canForward).toBe(false)
  })

  it("trocar a entrada atual (rota de ação) não conta como passo", () => {
    const h = new NavHistory(3)
    expect(h.arrive(undefined, true)).toBe(3)
    expect([h.canBack, h.canForward]).toEqual([true, false])
  })
})

describe("nota aleatória", () => {
  it("sorteia outra nota que não a aberta", () => {
    const paths = ["a.md", "b.md", "c.md"]
    expect(randomNote(paths, "a.md", () => 0)).toBe("b.md")
    expect(randomNote(paths, "a.md", () => 0.99)).toBe("c.md")
    expect(randomNote(["a.md"], "a.md", () => 0.5)).toBe("a.md")
    expect(randomNote([], undefined)).toBeNull()
  })
})
