import { Notification, type BrowserWindow } from "electron"

export interface ScheduledReminder {
  id: string
  /** Quando dispara (ms desde 1970). */
  at: number
  title: string
  body: string
  /** Nota do evento, aberta ao clicar na notificação. */
  path: string
}

/** O `setTimeout` do Node não passa de ~24,8 dias; o app reagenda bem antes disso. */
const MAX_DELAY = 2_147_000_000

/** Valida a lista que vem da janela (nada de tipos estranhos chegando ao sistema de notificações). */
export function validReminders(value: unknown): ScheduledReminder[] {
  if (!Array.isArray(value)) throw new Error("Lista de lembretes inválida.")
  return value.slice(0, 500).flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return []
    const r = item as Partial<ScheduledReminder>
    if (typeof r.id !== "string" || typeof r.at !== "number" || !Number.isFinite(r.at) || typeof r.title !== "string" || typeof r.body !== "string" || typeof r.path !== "string") return []
    return [{ id: r.id.slice(0, 300), at: r.at, title: r.title.slice(0, 200), body: r.body.slice(0, 500), path: r.path.slice(0, 1000) }]
  })
}

/**
 * Lembretes da Agenda no desktop: a janela manda a lista dos próximos dias e o processo principal dispara as
 * notificações do sistema na hora (mesmo com a janela minimizada). Com o app fechado não há lembrete — fica para a
 * bandeja/iniciar com o sistema (docs/02, riscos).
 */
export class ReminderScheduler {
  private timers = new Map<string, NodeJS.Timeout>()
  private fired = new Set<string>()

  constructor(
    private readonly window: () => BrowserWindow | null,
    private readonly openNote: (path: string) => void,
  ) {}

  schedule(list: ScheduledReminder[], now = Date.now()): number {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    for (const reminder of list) {
      const delay = reminder.at - now
      if (delay < -60_000 || delay > MAX_DELAY || this.fired.has(reminder.id)) continue
      this.timers.set(reminder.id, setTimeout(() => this.fire(reminder), Math.max(0, delay)))
    }
    return this.timers.size
  }

  private fire(reminder: ScheduledReminder): void {
    this.timers.delete(reminder.id)
    this.fired.add(reminder.id)
    if (!Notification.isSupported()) return
    const notification = new Notification({ title: reminder.title, body: reminder.body })
    notification.on("click", () => {
      const window = this.window()
      if (window) {
        if (window.isMinimized()) window.restore()
        window.show()
        window.focus()
      }
      this.openNote(reminder.path)
    })
    notification.show()
  }

  stop(): void {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
  }
}
