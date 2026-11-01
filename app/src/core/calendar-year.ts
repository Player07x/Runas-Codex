import { addDays, addMonths, monthLength, weekdayIndex, type Calendar, type WorldDate } from "./calendar"

/** Um mês na vista do ano (U9): tamanho real no ano (bissexto), estação e onde cai o dia 1 na semana. */
export interface YearMonth {
  month: number
  name: string
  season?: string
  length: number
  /** Dias intercalares (fora da semana) viram uma faixa, sem colunas. */
  intercalary: boolean
  /** Casas vazias antes do dia 1 (0 nos intercalares e nos calendários sem semana). */
  offset: number
}

export function yearMonths(calendar: Calendar, year: number): YearMonth[] {
  return calendar.months.map((m, i) => {
    const month = i + 1
    const intercalary = m.intercalary || !calendar.weekdays.length
    return {
      month,
      name: m.name,
      ...(m.season ? { season: m.season } : {}),
      length: monthLength(calendar, year, month),
      intercalary,
      offset: intercalary ? 0 : weekdayIndex(calendar, { year, month, day: 1 }) ?? 0,
    }
  })
}

/**
 * Teclado da grade de datas (como a Agenda): setas andam um dia ou uma semana, Page Up/Down um mês, Home/End vão ao
 * começo e ao fim do mês. Devolve `null` para as outras teclas.
 */
export function moveDate(calendar: Calendar, date: WorldDate, key: string): WorldDate | null {
  const week = calendar.weekdays.length || 7
  switch (key) {
    case "ArrowLeft": return addDays(calendar, date, -1)
    case "ArrowRight": return addDays(calendar, date, 1)
    case "ArrowUp": return addDays(calendar, date, -week)
    case "ArrowDown": return addDays(calendar, date, week)
    case "PageUp": return addMonths(calendar, date, -1)
    case "PageDown": return addMonths(calendar, date, 1)
    case "Home": return { year: date.year, month: date.month, day: 1 }
    case "End": return { year: date.year, month: date.month, day: monthLength(calendar, date.year, date.month) }
    default: return null
  }
}
