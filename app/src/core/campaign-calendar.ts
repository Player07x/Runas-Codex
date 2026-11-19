import { parseWorldDate, sameAbbr } from "./calendar"
import { calendarByAbbr, listWikis, mainCalendar, type CalendarRef } from "./wiki"
import type { VaultIndex } from "./vault-index"

/**
 * O calendário de uma campanha: o da sigla da `data_mundo` dela (o mestre pode escolher outro calendário da wiki em
 * “Ajustar data e hora”); sem data própria, ou com uma sigla que nenhum calendário tem, o padrão da wiki.
 */
export function campaignCalendar(index: VaultIndex, root: string, data: Record<string, unknown> | null | undefined): CalendarRef | null {
  const main = mainCalendar(index, root, listWikis(index).find((wiki) => wiki.root === root)?.home)
  const date = parseWorldDate(typeof data?.data_mundo === "string" ? data.data_mundo : "")
  if (!date?.calendar || (main && sameAbbr(main.calendar.abbr, date.calendar))) return main
  const found = calendarByAbbr(index, date.calendar, root)
  return "calendar" in found ? found : main
}
