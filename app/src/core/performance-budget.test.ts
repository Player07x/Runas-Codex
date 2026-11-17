import { performanceRegressions, type PerformanceBudget } from "./performance-budget"
const base = { openMs: 1000, indexMs: 500, switchMs: 100, wiki420Ms: 200, jsBytes: 10000 }
const budget: PerformanceBudget = { baseline: base, factors: { openMs: 3, indexMs: 3, switchMs: 3, wiki420Ms: 3, jsBytes: 1.15 }, allowances: { openMs: 1000, indexMs: 500, switchMs: 300, wiki420Ms: 500, jsBytes: 1000 } }
describe("orçamento da linha de base", () => {
  it("aceita a base e a folga, mas acusa abrir, trocar, wiki ou pacote mais caros", () => {
    expect(performanceRegressions(base, budget)).toEqual([])
    expect(performanceRegressions({ ...base, openMs: 4000, jsBytes: 12500 }, budget)).toEqual([])
    expect(performanceRegressions({ openMs: 4001, indexMs: 2001, switchMs: 601, wiki420Ms: 1101, jsBytes: 12501 }, budget)).toHaveLength(5)
  })
  it("recusa roteiro incompleto e números que esconderiam uma regressão", () => {
    expect(performanceRegressions({}, budget)).toHaveLength(5)
    for (const value of [NaN, Infinity, -1]) expect(performanceRegressions({ ...base, openMs: value }, budget)).toHaveLength(1)
    expect(performanceRegressions(base, { ...budget, factors: { ...budget.factors, openMs: 0 } })).toHaveLength(1)
  })
})
