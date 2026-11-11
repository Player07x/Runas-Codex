import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { collectNotices, noticeTime, taskReminders, TASK_NOTICE_TIME_KEY, type Notices } from "../../core/notices"
import type { Reminder } from "../../core/agenda"
import type { Task } from "../../core/tasks/task"
import { agendaEvents } from "../../lib/agenda-data"
import { useNotesLock } from "../../lib/notes-lock"
import { useTasksSettings, vaultTasks } from "../../lib/tasks"
import { useVault } from "../../platform/VaultProvider"

const timeListeners = new Set<() => void>()

function readTime(): string {
  try {
    return noticeTime(localStorage.getItem(TASK_NOTICE_TIME_KEY))
  } catch {
    return noticeTime(null)
  }
}

/** Hora do aviso das tarefas (preferência do aparelho, D17). */
export function useTaskNoticeTime(): [string, (value: string) => void] {
  const time = useSyncExternalStore((listener) => (timeListeners.add(listener), () => timeListeners.delete(listener)), readTime)
  const set = (value: string) => {
    try {
      localStorage.setItem(TASK_NOTICE_TIME_KEY, noticeTime(value))
    } catch {
      /* sem armazenamento: fica o padrão */
    }
    for (const listener of timeListeners) listener()
  }
  return [time, set]
}

/** Agora, refeito a cada minuto (o que venceu e o que disparou muda com o relógio). */
function useMinute(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/**
 * A lista única de avisos (U45): o sino e o `ReminderSync` leem daqui. As tarefas das Notas somem com o PIN bloqueado,
 * como na Agenda, para o aviso não mostrar o título de uma nota trancada.
 */
export function useNotices(): { notices: Notices; tasks: Task[]; taskReminders: Reminder[] } {
  const vault = useVault()
  const settings = useTasksSettings(vault.info?.path)
  const { locked } = useNotesLock()
  const [time] = useTaskNoticeTime()
  const now = useMinute()
  const { index, version } = vault
  const tasks = useMemo(() => (index ? vaultTasks(index, settings, { notesLocked: locked }) : []), [index, version, settings, locked])
  const events = useMemo(() => (index ? agendaEvents(index) : []), [index, version])
  const notices = useMemo(() => collectNotices(tasks, events, now), [tasks, events, now])
  const reminders = useMemo(() => taskReminders(tasks, now, time), [tasks, now, time])
  return { notices, tasks, taskReminders: reminders }
}
