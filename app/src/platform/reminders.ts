import { Capacitor } from "@capacitor/core"
import { LocalNotifications } from "@capacitor/local-notifications"
import type { Reminder } from "../core/agenda"

/**
 * Lembretes fora do desktop: no Android, notificações locais do sistema (disparam com o app fechado; o Android pede
 * permissão de notificação e, para a hora exata, de alarmes); no navegador, só com a aba aberta.
 */

export const isAndroidApp = () => Capacitor.isNativePlatform()

/** Id numérico estável para a notificação (o Android usa inteiros de 32 bits). */
export function notificationId(id: string): number {
  let hash = 0
  for (const char of id) hash = (Math.imul(hash, 31) + char.codePointAt(0)!) | 0
  return Math.abs(hash) % 2_000_000_000
}

const MAX_ANDROID = 60
let browserTimers: ReturnType<typeof setTimeout>[] = []

export async function scheduleOnAndroid(list: Reminder[]): Promise<void> {
  if (list.length) {
    let permission = await LocalNotifications.checkPermissions()
    if (permission.display === "prompt" || permission.display === "prompt-with-rationale") permission = await LocalNotifications.requestPermissions()
    if (permission.display !== "granted") throw new Error("O Android não deixou o app mostrar notificações (veja nas configurações do sistema).")
  }
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) })
  if (!list.length) return
  await LocalNotifications.schedule({
    notifications: list.slice(0, MAX_ANDROID).map((reminder) => ({
      id: notificationId(reminder.id),
      title: reminder.title,
      body: reminder.body,
      schedule: { at: reminder.at, allowWhileIdle: true },
      extra: { path: reminder.path },
    })),
  })
}

/** No Android 12+, a hora exata depende de "Alarmes e lembretes" liberado para o app. */
export async function exactAlarmsAllowed(): Promise<boolean> {
  if (!isAndroidApp()) return true
  try {
    return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === "granted"
  } catch {
    return true
  }
}

export async function openExactAlarmSettings(): Promise<void> {
  if (isAndroidApp()) await LocalNotifications.changeExactNotificationSetting()
}

/** Tocar na notificação abre a nota do evento. */
export function onAndroidReminderOpen(listener: (path: string) => void): () => void {
  if (!isAndroidApp()) return () => undefined
  const handle = LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    const path = (event.notification.extra as { path?: unknown } | undefined)?.path
    if (typeof path === "string") listener(path)
  })
  return () => void handle.then((h) => h.remove())
}

export function scheduleInBrowser(list: Reminder[], fallback: (title: string, body: string) => void): void {
  for (const timer of browserTimers) clearTimeout(timer)
  browserTimers = list
    .filter((reminder) => reminder.at.getTime() - Date.now() < 2_147_000_000)
    .map((reminder) =>
      setTimeout(
        () => {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(reminder.title, { body: reminder.body })
          else fallback(reminder.title, reminder.body)
        },
        Math.max(0, reminder.at.getTime() - Date.now()),
      ),
    )
}
