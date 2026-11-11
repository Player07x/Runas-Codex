import { parseWorldDate, sameAbbr, worldDateText, type Calendar, type WorldDate } from "./calendar"
import { setProperty } from "./properties"
import { DEFAULT_CLOCK, type WorldClock } from "./world-clock"

/**
 * Tempo de cada campanha (U39): a data e a hora no mundo ficam na nota da campanha (`data_mundo: "4031-07-15 OC"`,
 * `hora_mundo: "07:30"`, `periodo_mundo: Dia`), separadas da wiki. Sem essas propriedades a campanha segue o `hoje:`
 * do calendário; a primeira vez que o mestre muda a data ou a hora pela campanha, ela passa a ter as suas. A regra
 * do relógio (horas por período, períodos) continua no calendário, porque é do mundo; o ponteiro é da campanha.
 */
export const CAMPAIGN_TIME_KEYS = ["data_mundo", "hora_mundo", "periodo_mundo"] as const

export interface CampaignTime {
  today: WorldDate
  hora?: string
  periodo?: string
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")

/** O tempo próprio da campanha, se ela tem `data_mundo` neste calendário (sigla igual ou sem sigla). */
export function campaignTime(data: Record<string, unknown> | null | undefined, calendar: Calendar | null): CampaignTime | null {
  if (!data || !calendar) return null
  const date = parseWorldDate(str(data.data_mundo))
  if (!date || (date.calendar && !sameAbbr(date.calendar, calendar.abbr))) return null
  const hora = str(data.hora_mundo)
  const periodo = str(data.periodo_mundo)
  return { today: { year: date.year, month: date.month, day: date.day }, ...(/^\d{1,2}:\d{2}$/.test(hora) ? { hora: hora.padStart(5, "0") } : {}), ...(periodo ? { periodo } : {}) }
}

/** O calendário como a campanha o vê: o mesmo, com o `hoje` e o ponteiro do relógio dela. */
export function calendarForCampaign(calendar: Calendar, time: CampaignTime | null): Calendar {
  if (!time) return calendar
  // Sem `relogio:` no calendário, a campanha que já tem hora usa a regra padrão (12 h, Dia e Noite), como o cartão.
  const clock = calendar.worldClock ?? (time.hora ? DEFAULT_CLOCK : undefined)
  return {
    ...calendar,
    today: time.today,
    ...(clock ? { worldClock: { ...clock, ...(time.hora ? { hora: time.hora } : {}), ...(time.periodo && clock.periodos.includes(time.periodo) ? { periodo: time.periodo } : {}) } } : {}),
  }
}

/** O texto da nota da campanha com a data (e, se veio, a hora e o período) no mundo; numa gravação só. */
export function withCampaignTime(text: string, calendar: Calendar, today: WorldDate, clock?: Pick<WorldClock, "hora" | "periodo">): string {
  let next = setProperty(text, "data_mundo", `${worldDateText(today)} ${calendar.abbr}`)
  if (clock) {
    next = setProperty(next, "hora_mundo", clock.hora)
    next = setProperty(next, "periodo_mundo", clock.periodo)
  }
  return next
}

/** Volta a seguir a wiki: tira as três propriedades. */
export function withoutCampaignTime(text: string): string {
  return CAMPAIGN_TIME_KEYS.reduce((acc, key) => setProperty(acc, key, undefined), text)
}
