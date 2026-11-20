import { formatDate as formatWorld } from "./calendar"
import { campaignCalendarLookup } from "./campaign-calendar"
import { calendarForCampaign, campaignTime } from "./campaign-time"
import { listCampaigns, type CampaignInfo } from "./campaigns"
import { groupAgendaTasks, taskState } from "./tasks/agenda"
import type { Task } from "./tasks/task"
import type { VaultIndex } from "./vault-index"
import { clockMinutes, clockText, parseWorldClock } from "./world-clock"

/**
 * Início 1.6 (U46, maquete aprovada em 17/11): o bloco “Hoje” troca o “No horizonte” e “Campanhas ativas” troca a
 * fileira de contadores. Nada novo é gravado: as tarefas vêm do formato do Tasks e a data do mundo, do calendário
 * da wiki (ou da `data_mundo` da campanha), como no Painel da campanha.
 */
export interface HomeTasks {
  /** Atrasadas primeiro, depois as que vencem hoje. */
  tasks: { task: Task; overdue: boolean }[]
  /** Hábitos (todo dia) que valem hoje: sem prazo ou com prazo até hoje. */
  habits: Task[]
  /** Quantos ficaram de fora dos limites (vão para a Agenda). */
  hidden: number
}

export function homeTasks(all: Task[], today: string, limit = 3, habitLimit = 2): HomeTasks {
  const groups = groupAgendaTasks(all, today)
  const due = [...groups.atrasadas.map((task) => ({ task, overdue: true })), ...groups.hoje.map((task) => ({ task, overdue: false }))]
  const habits = groups.habitos.filter((task) => taskState(task, today) !== "proxima")
  return { tasks: due.slice(0, limit), habits: habits.slice(0, habitLimit), hidden: Math.max(0, due.length - limit) + Math.max(0, habits.length - habitLimit) }
}

export interface CampaignNow {
  campaign: CampaignInfo
  /** “18 de Aurion de 4031 · 16:00”; `null` sem calendário do mundo. */
  world: string | null
}

/** As campanhas ativas, a mais mexida primeiro, com a data (e a hora, se o calendário tem relógio) no mundo. */
export function activeCampaignsNow(index: VaultIndex, limit = 3): { list: CampaignNow[]; total: number } {
  const active = listCampaigns(index).filter((campaign) => campaign.status === "ativa")
  const touched = (campaign: CampaignInfo) => (campaign.home ? index.note(campaign.home)?.mtime ?? 0 : 0)
  active.sort((a, b) => touched(b) - touched(a) || a.name.localeCompare(b.name, "pt-BR"))
  const calendarOf = campaignCalendarLookup(index)
  const list = active.slice(0, limit).map((campaign) => {
    const root = campaign.wiki ? `Wikis/${campaign.wiki}/` : "Wikis/"
    const data = campaign.home ? index.note(campaign.home)?.meta.frontmatter?.data : undefined
    const ref = calendarOf(root, data)
    if (!ref) return { campaign, world: null }
    const calendar = calendarForCampaign(ref.calendar, campaignTime(data, ref.calendar))
    if (!calendar.today) return { campaign, world: null }
    const date = formatWorld(calendar, calendar.today)
    const clock = calendar.worldClock ? parseWorldClock(calendar) : null
    return { campaign, world: clock ? `${date} · ${clockText(clockMinutes(clock), clock)}` : date }
  })
  return { list, total: active.length }
}
