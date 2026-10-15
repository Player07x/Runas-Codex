import { app, globalShortcut, type BrowserWindow } from "electron"
import { IPC } from "../shared/ipc"

/** Captura rápida (checklist F.1): com o app aberto, mesmo em segundo plano, o atalho traz a janela numa nota nova. */
export const QUICK_CAPTURE_SHORTCUT = "CommandOrControl+Alt+N"

/**
 * Registra o atalho global. Devolve `false` se o sistema não aceitou: outro programa já usa a combinação, ou a sessão
 * Wayland não deixa programas registrarem atalhos globais (aí o atalho só funciona com a janela em foco, pelo Ctrl+N).
 */
export function registerQuickCapture(window: () => BrowserWindow | null): boolean {
  const ok = globalShortcut.register(QUICK_CAPTURE_SHORTCUT, () => {
    const target = window()
    if (!target) return
    if (target.isMinimized()) target.restore()
    target.show()
    target.focus()
    target.webContents.send(IPC.quickCapture)
  })
  app.on("will-quit", () => globalShortcut.unregisterAll())
  return ok
}
