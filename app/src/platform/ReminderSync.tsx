import { useEffect } from "react"
import { upcomingReminders } from "../core/agenda"
import { agendaEvents } from "../lib/agenda-data"
import { navigate } from "../lib/router"
import { vaultRoute } from "../lib/vault-notes"
import { useToast } from "../components/ui"
import { useVault } from "./VaultProvider"

const HORIZON_DAYS = 14

/**
 * Mantém os lembretes da Agenda agendados na plataforma: refaz a lista quando as notas de `Agenda/` mudam e a cada
 * poucas horas (os próximos 14 dias). Tocar num lembrete abre a nota do evento.
 */
export function ReminderSync() {
  const vault = useVault()
  const toast = useToast()
  const { index, platform, version } = vault

  useEffect(() => {
    if (!index) return
    const run = () => {
      const reminders = upcomingReminders(agendaEvents(index), new Date(), HORIZON_DAYS)
      platform.scheduleReminders(reminders).catch((error: unknown) => toast(error instanceof Error ? error.message : String(error)))
    }
    const first = setTimeout(run, 1200)
    const refresh = setInterval(run, 3 * 60 * 60 * 1000)
    return () => {
      clearTimeout(first)
      clearInterval(refresh)
    }
  }, [index, platform, version, toast])

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
