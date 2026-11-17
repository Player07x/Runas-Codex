import { createWritePace } from "../src/main/write-pace"

describe("ritmo das gravações em lote (U91)", () => {
  it("deixa passar uma rajada curta e espera entre as gravações seguintes", async () => {
    let clock = 0
    const waits: number[] = []
    const pace = createWritePace({ burst: 3, windowMs: 1_000, gap: 40, now: () => clock, wait: async (ms) => { waits.push(ms); clock += ms } })
    for (let i = 0; i < 5; i++) await pace()
    expect(waits).toEqual([40, 40])
  })

  it("depois de uma pausa, a rajada volta a passar direto", async () => {
    let clock = 0
    const waits: number[] = []
    const pace = createWritePace({ burst: 2, windowMs: 1_000, gap: 40, now: () => clock, wait: async (ms) => { waits.push(ms); clock += ms } })
    await pace(); await pace()
    clock += 2_000
    await pace(); await pace()
    expect(waits).toEqual([])
  })
})
