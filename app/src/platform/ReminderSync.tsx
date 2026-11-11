import { useEffect, useRef } from "react"
import { upcomingReminders } from "../core/agenda"
import { agendaEvents } from "../lib/agenda-data"
import { navigate } from "../lib/router"
import { vaultRoute } from "../lib/vault-notes"
import { useToast } from "../components/ui"
import { useVault } from "./VaultProvider"
import { useNotices } from "../components/notices/useNotices"

const HORIZON_DAYS = 14

/**
 * Mantém os lembretes da Agenda agendados na plataforma: refaz a lista quando as notas de `Agenda/` mudam e a cada
 * poucas horas (os próximos 14 dias). Tocar num lembrete abre a nota do evento.
 */
export function ReminderSync() {
  const vault = useVault()
  const toast = useToast()
  const { index, platform, version } = vault
  // U45: as tarefas que vencem entram na mesma lista (o sino lê a mesma fonte, então nada avisa em dobro).
  const { taskReminders } = useNotices()
  const tasksRef = useRef(taskReminders)
  tasksRef.current = taskReminders
  const tasksKey = taskReminders.map((r) => `${r.id}@${r.at.getTime()}`).join("\n")

  useEffect(() => {
    if (!index) return
    const run = () => {
      const now = new Date()
      const reminders = [...upcomingReminders(agendaEvents(index), now, HORIZON_DAYS), ...tasksRef.current.filter((r) => r.at >= now)].sort((a, b) => a.at.getTime() - b.at.getTime())
      platform.scheduleReminders(reminders).catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
    }
    const first = setTimeout(run, 1200)
    const refresh = setInterval(run, 3 * 60 * 60 * 1000)
    return () => {
      clearTimeout(first)
      clearInterval(refresh)
    }
  }, [index, platform, version, toast, tasksKey])

  useEffect(() => platform.onReminderOpen((path) => navigate(vaultRoute(path))), [platform])

  // Avisos da plataforma do navegador (lembrete sem permissão de notificação, etc.) viram aviso na tela.
  useEffect(() => {
    const onNotice = (event: Event) => {
      const { title, body } = (event as CustomEvent<{ title: string; body: string }>).detail
      toast(`${title} — ${body}`)
    }
    window.addEventListener("runas-codex:aviso", onNotice)
    return () => window.removeEventListener("runas-codex:aviso", onNotice)
  }, [toast])

  return null
}
