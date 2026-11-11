import { dateProblem, type WorldDate } from "../../core/calendar"
import { withCampaignTime, withoutCampaignTime } from "../../core/campaign-time"
import { clockProblem, type WorldClock } from "../../core/world-clock"
import { useVault } from "../../platform/VaultProvider"
import { useSetWorldClock, useSetWorldToday } from "../wiki/world-today"
import type { CampaignData } from "./campaign-state"

/**
 * Grava o tempo pela campanha (U39): na nota dela (data, hora e período numa gravação só, com a versão lida). Sem
 * nota da campanha, grava no calendário da wiki, como antes.
 */
export function useSetCampaignTime() {
  const vault = useVault()
  const setWorldToday = useSetWorldToday()
  const setWorldClock = useSetWorldClock()
  return async (data: CampaignData, today: WorldDate, clock?: WorldClock) => {
    const ref = data.calendarRef
    if (!ref || !data.calendar) throw new Error("Esta campanha não tem calendário do mundo.")
    const problem = dateProblem(ref.calendar, today) ?? (clock ? clockProblem(clock) : null)
    if (problem) throw new Error(problem)
    const home = data.home ? vault.index?.note(data.home.path) : undefined
    if (!home) return clock ? setWorldClock(ref, clock, today) : setWorldToday(ref, today)
    const text = withCampaignTime(home.text, data.calendar, today, clock ?? data.calendar.worldClock)
    if (text !== home.text) await vault.save(home.path, text)
  }
}

/** Volta a campanha a seguir o `hoje` da wiki (tira as propriedades de tempo da nota dela). */
export function useFollowWiki() {
  const vault = useVault()
  return async (data: CampaignData) => {
    const home = data.home ? vault.index?.note(data.home.path) : undefined
    if (!home) return
    const text = withoutCampaignTime(home.text)
    if (text !== home.text) await vault.save(home.path, text)
  }
}
