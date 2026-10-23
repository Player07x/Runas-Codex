import type { Occurrence } from "./agenda"

/**
 * Contas das grades da Agenda (rework F4d, ADR 0026): para onde cada tecla leva no mês, o nome de cada dia para o
 * leitor de tela e a disposição dos eventos que se sobrepõem na semana e no dia. Sem React, para ter testes.
 */

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** Mesmo dia em outro mês; o 31 vira o último dia de um mês mais curto (como nos seletores de data). */
export function addMonths(d: Date, n: number): Date {
  const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate()
  return new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last))
}

/**
 * Tecla na grade do mês (padrão de grade de datas da WAI-ARIA): setas andam um dia ou uma semana, Home e End vão ao
 * domingo e ao sábado da semana, PageUp e PageDown trocam de mês e, com Shift, de ano. Outra tecla: `null`.
 */
export function moveDay(day: Date, key: string, shift = false): Date | null {
  switch (key) {
    case "ArrowLeft": return addDays(day, -1)
    case "ArrowRight": return addDays(day, 1)
    case "ArrowUp": return addDays(day, -7)
    case "ArrowDown": return addDays(day, 7)
    case "Home": return addDays(day, -day.getDay())
    case "End": return addDays(day, 6 - day.getDay())
    case "PageUp": return addMonths(day, shift ? -12 : -1)
    case "PageDown": return addMonths(day, shift ? 12 : 1)
    default: return null
  }
}

/** Nome do dia na grade: “quinta-feira, 22 de outubro de 2026, hoje, 4 eventos”. */
export function dayLabel(day: Date, today: Date, events: number, free?: string | null): string {
  const parts = [day.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })]
  if (startOfDay(day).getTime() === startOfDay(today).getTime()) parts.push("hoje")
  parts.push(events === 0 ? "nada marcado" : events === 1 ? "1 evento" : `${events} eventos`)
  if (free) parts.push(`${free} livres`)
  return parts.join(", ")
}

export interface Placed {
  occurrence: Occurrence
  top: number
  height: number
  column: number
  columns: number
}

/** “+N” de uma faixa com eventos demais para caber lado a lado. */
export interface Overflow {
  top: number
  height: number
  column: number
  columns: number
  hidden: Occurrence[]
}

const HOUR_MS = 3_600_000

/**
 * Eventos com horário de um dia, lado a lado quando se sobrepõem. Numa faixa com mais de `maxColumns` colunas, as
 * primeiras `maxColumns - 1` ficam e a última vira um “+N” com os que sobraram, para nenhum bloco ficar fino demais
 * para ler.
 */
export function layoutDay(list: Occurrence[], day: Date, hourPx: number, maxColumns = 3): { placed: Placed[]; overflow: Overflow[] } {
  const dayStart = startOfDay(day).getTime()
  const items = list
    .map((occurrence) => ({ occurrence, from: Math.max(occurrence.start.getTime(), dayStart), to: Math.min(occurrence.end.getTime(), dayStart + 24 * HOUR_MS), column: 0 }))
    .sort((a, b) => a.from - b.from || b.to - a.to)
  const placed: Placed[] = []
  const overflow: Overflow[] = []
  const toPx = (ms: number) => (ms / HOUR_MS) * hourPx
  let cluster: typeof items = []
  let clusterEnd = 0
  const close = () => {
    if (!cluster.length) return
    const columns = Math.max(...cluster.map((i) => i.column + 1))
    const keep = columns > maxColumns ? maxColumns - 1 : columns
    const total = columns > maxColumns ? maxColumns : columns
    const hidden = cluster.filter((i) => i.column >= keep)
    for (const item of cluster) {
      if (item.column >= keep) continue
      placed.push({ occurrence: item.occurrence, top: toPx(item.from - dayStart), height: Math.max(22, toPx(item.to - item.from) - 2), column: item.column, columns: total })
    }
    if (hidden.length) {
      const from = Math.min(...hidden.map((i) => i.from))
      const to = Math.max(...hidden.map((i) => i.to))
      overflow.push({ top: toPx(from - dayStart), height: Math.max(22, toPx(to - from) - 2), column: keep, columns: total, hidden: hidden.map((i) => i.occurrence) })
    }
    cluster = []
  }
  for (const item of items) {
    if (cluster.length && item.from >= clusterEnd) close()
    const used = new Set(cluster.filter((i) => i.to > item.from).map((i) => i.column))
    while (used.has(item.column)) item.column++
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.to)
  }
  close()
  return { placed, overflow }
}
