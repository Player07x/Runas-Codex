import { Notification, type BrowserWindow, type Session, type WebContents } from "electron"
import { appNotification, pagePermissionAllowed } from "../../../app/src/core/page-permissions"

/** As duas portas precisam da mesma política: a consulta e o pedido efetivo do Chromium. */
export function configurePagePermissions(session: Pick<Session, "setPermissionRequestHandler" | "setPermissionCheckHandler">, trusted: (contents: WebContents | null) => boolean): void {
  session.setPermissionRequestHandler((contents, permission, answer) => answer(pagePermissionAllowed(permission, trusted(contents))))
  session.setPermissionCheckHandler((contents, permission) => pagePermissionAllowed(permission, trusted(contents)))
}

/** As notificações do app passam pela ponte autorizada; a API de páginas fica bloqueada. */
export function showAppNotification(title: unknown, body: unknown): void {
  const options = appNotification(title, body)
  if (Notification.isSupported()) new Notification(options).show()
}

/** O smoke consulta permissões sem pedir dispositivos, emitir avisos ou mexer no texto copiado pelo usuário. */
export async function checkPagePermissions(window: BrowserWindow): Promise<boolean> {
  return window.webContents.executeJavaScript(`(async () => {
    for (const name of ["camera", "microphone", "geolocation", "notifications"]) {
      if ((await navigator.permissions.query({ name })).state !== "denied") return false
    }
    return (await navigator.permissions.query({ name: "clipboard-write" })).state === "granted"
  })()`)
}
