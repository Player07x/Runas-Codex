/** Páginas não acessam dispositivos nem notificações; copiar texto continua nas janelas do app. */
export function pagePermissionAllowed(permission: string, trustedWindow: boolean): boolean {
  return trustedWindow && permission === "clipboard-sanitized-write"
}

export function appNotification(title: unknown, body: unknown): { title: string; body: string } {
  if (typeof title !== "string" || !title.trim() || title.length > 200 || typeof body !== "string" || body.length > 2000) {
    throw new Error("Texto inválido para a notificação do aplicativo.")
  }
  return { title, body }
}
