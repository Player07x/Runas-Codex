import { parseWorldDate, sameAbbr } from "./calendar"
import { wikiHomePath } from "./personalization"
import { calendarByAbbr, calendarListLookup, mainCalendar, wikiRootOf, WIKI_ROOT, type CalendarRef } from "./wiki"
import type { VaultIndex } from "./vault-index"

type CampaignDates = Record<string, unknown> | null | undefined

/** Usa a sigla da campanha ou o padrão da wiki. Campanhas da mesma wiki reutilizam esse padrão. */
export function campaignCalendarLookup(index: VaultIndex, list = calendarListLookup(index)) {
  const defaults = new Map<string, CalendarRef | null>()
  return (root: string, data: CampaignDates): CalendarRef | null => {
    let main = defaults.get(root)
    if (main === undefined) {
      const name = wikiRootOf(root) === root ? root.slice(WIKI_ROOT.length, -1) : ""
      const home = name ? wikiHomePath(root, name) : undefined
      main = mainCalendar(index, root, home, list)
      defaults.set(root, main)
    }
    const date = parseWorldDate(data?.data_mundo)
    if (!date?.calendar || (main && sameAbbr(main.calendar.abbr, date.calendar))) return main
    const found = calendarByAbbr(index, date.calendar, root, list)
    return "calendar" in found ? found : main
  }
}

export function campaignCalendar(index: VaultIndex, root: string, data: CampaignDates, list = calendarListLookup(index)): CalendarRef | null {
  return campaignCalendarLookup(index, list)(root, data)
}
