import { upcomingReminders, type AgendaEvent, type Reminder } from "./agenda"
import { addDays } from "./tasks/dates"
import { groupAgendaTasks, isOpen } from "./tasks/agenda"
import type { Task } from "./tasks/task"

/**
 * Central de avisos (U45): o sino ao lado do tema. Lê a mesma lista que vira notificação do sistema (`ReminderSync`),
 * para nada avisar duas vezes de jeitos diferentes: lembretes dos eventos e tarefas que vencem. Tarefa não ganha
 * sintaxe de lembrete: o app avisa no dia do prazo, na hora escolhida em Configurações.
 */
export const DEFAULT_TASK_NOTICE_TIME = "09:00"
export const TASK_NOTICE_TIME_KEY = "runas-codex:aviso-tarefas-hora"
export const SEEN_NOTICES_KEY = "runas-codex:avisos-vistos"

const pad = (n: number) => String(n).padStart(2, "0")
const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

/** "HH:MM" válido, ou o padrão. */
export function noticeTime(value: string | null | undefined): string {
  return value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : DEFAULT_TASK_NOTICE_TIME
}

/** A chave de um aviso de tarefa: muda se a tarefa muda de prazo ou de texto (aí é outro aviso). */
export function taskNoticeId(task: Task): string {
  return `tarefa:${task.path}|${task.dueDate ?? ""}|${task.description}`
}

/** Um lembrete por tarefa aberta com prazo entre hoje e `horizonDays`, no dia do prazo, na hora escolhida. */
export function taskReminders(tasks: Task[], now: Date, time = DEFAULT_TASK_NOTICE_TIME, horizonDays = 14): Reminder[] {
  const [hours, minutes] = noticeTime(time).split(":").map(Number) as [number, number]
  const today = isoDay(now)
  const last = addDays(today, horizonDays)
  const list: Reminder[] = []
  for (const task of tasks) {
    if (!isOpen(task) || !task.dueDate || task.dueDate < today || task.dueDate > last) continue
    const [y, m, d] = task.dueDate.split("-").map(Number) as [number, number, number]
    const at = new Date(y, m - 1, d, hours, minutes)
    if (at < now) continue
    list.push({ id: taskNoticeId(task), at, title: `Vence hoje: ${task.description}`, body: "Tarefa com prazo para hoje.", path: task.path })
  }
  return list
}

export interface Notices {
  atrasadas: Task[]
  hoje: Task[]
  /** Lembretes de eventos das últimas e das próximas 24 h; `fired` = já passou a hora. */
  lembretes: (Reminder & { fired: boolean })[]
}

/** O que o painel mostra agora. */
export function collectNotices(tasks: Task[], events: AgendaEvent[], now: Date): Notices {
  const today = isoDay(now)
  const groups = groupAgendaTasks(tasks, today)
  const habitsDue = groups.habitos.filter((t) => t.dueDate === today)
  const since = new Date(now.getTime() - 86_400_000)
  const until = now.getTime() + 86_400_000
  const lembretes = upcomingReminders(events, since, 2)
    .filter((r) => r.at.getTime() <= until)
    .map((r) => ({ ...r, fired: r.at <= now }))
  return { atrasadas: groups.atrasadas, hoje: [...groups.hoje, ...habitsDue], lembretes }
}

/** As chaves que entram na contagem do sino: o que já venceu ou já disparou. Lembretes futuros não contam. */
export function noticeIds(notices: Notices): string[] {
  return [...notices.atrasadas.map(taskNoticeId), ...notices.hoje.map(taskNoticeId), ...notices.lembretes.filter((r) => r.fired).map((r) => r.id)]
}

/** Quantos avisos ainda não foram vistos neste aparelho. */
export function unseenCount(notices: Notices, seen: ReadonlySet<string>): number {
  return noticeIds(notices).filter((id) => !seen.has(id)).length
}

/** A lista de vistos depois de abrir o painel: só o que ainda existe (a lista não cresce para sempre). */
export function markSeen(notices: Notices): string[] {
  return noticeIds(notices)
}
