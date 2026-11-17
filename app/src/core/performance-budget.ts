export const PERFORMANCE_METRICS = ["openMs", "indexMs", "switchMs", "wiki420Ms", "jsBytes"] as const
export type PerformanceMetric = typeof PERFORMANCE_METRICS[number]
export type PerformanceNumbers = Record<PerformanceMetric, number>
export interface PerformanceBudget { baseline: PerformanceNumbers; factors: PerformanceNumbers; allowances: PerformanceNumbers; screens?: Record<string, number> }

/** Um número ausente ou inválido também reprova: um roteiro quebrado não pode parecer mais rápido. */
export function performanceRegressions(actual: Partial<PerformanceNumbers>, budget: PerformanceBudget): string[] {
  return PERFORMANCE_METRICS.flatMap(key => {
    const measured = actual[key], base = budget.baseline[key], factor = budget.factors[key], allowance = budget.allowances[key]
    if (![base, factor, allowance].every(Number.isFinite) || base < 0 || factor < 1 || allowance < 0) return [`${key}: orçamento inválido`]
    if (measured === undefined || !Number.isFinite(measured) || measured < 0) return [`${key}: medição ausente ou inválida`]
    const limit = base * factor + allowance
    return measured > limit ? [`${key}: ${Math.round(measured)} excede ${Math.round(limit)} (base ${Math.round(base)})`] : []
  })
}

export interface RenderSample { route: string; actualMs: number; baseMs: number; phase: string }

/** Cada tela tem o próprio teto para uma Configuração lenta não esconder uma regressão na Agenda. */
export function performanceScreenRegressions(actual: Record<string, number>, budget: PerformanceBudget): string[] {
  return Object.entries(budget.screens ?? {}).flatMap(([name, baseline]) => {
    const measured = actual[name]
    if (!Number.isFinite(baseline) || baseline < 0) return [`${name}: orçamento inválido`]
    if (measured === undefined || !Number.isFinite(measured) || measured < 0) return [`${name}: medição ausente ou inválida`]
    const limit = baseline * 3 + 300
    return measured > limit ? [`${name}: ${Math.round(measured)} excede ${Math.round(limit)} ms`] : []
  })
}
