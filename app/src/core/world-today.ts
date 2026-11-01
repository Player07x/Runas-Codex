import { findCodeBlocks, replaceCodeBlock, setBlockLine } from "./codeblocks"
import { dayNumber, parseWorldDate, sameAbbr, worldDateText, type Calendar, type WorldDate } from "./calendar"

/**
 * “Hoje no mundo” é a linha `hoje:` do bloco `runas-calendario` da wiki. A Wiki e as Campanhas avançam o mesmo dia
 * (sobras da revisão das Campanhas): aqui fica só o cálculo, sem tela.
 */

/** O texto da nota com a linha `hoje:` do primeiro bloco trocada; `null` se a nota não tem o bloco. */
export function withWorldToday(text: string, next: WorldDate): string | null {
  const block = findCodeBlocks(text, "runas-calendario")[0]
  if (!block) return null
  return replaceCodeBlock(text, block, setBlockLine(block.content, "hoje", `"${worldDateText(next)}"`))
}

/**
 * A data no mundo de uma sessão, quando ela fica depois de “hoje no mundo” no mesmo calendário: é a data para a qual
 * vale perguntar se o mundo avança ao marcar a sessão como realizada.
 */
export function worldDateAhead(calendar: Calendar | null, text: string | undefined): WorldDate | null {
  const date = text ? parseWorldDate(text) : null
  if (!calendar || !date || (date.calendar && !sameAbbr(date.calendar, calendar.abbr))) return null
  if (calendar.today && dayNumber(calendar, date) <= dayNumber(calendar, calendar.today)) return null
  return { year: date.year, month: date.month, day: date.day }
}
