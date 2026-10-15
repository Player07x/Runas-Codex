import { app, globalShortcut, type BrowserWindow } from "electron"
import { IPC } from "../shared/ipc"

/** Captura rápida (checklist F.1): com o app aberto, mesmo em segundo plano, o atalho traz a janela numa nota nova. */
export const QUICK_CAPTURE_SHORTCUT = "CommandOrControl+Alt+N"

/**
 * Antes do "ready": no Linux com Wayland, atalho global só pelo portal `GlobalShortcuts` do desktop (o GNOME pede
 * permissão uma vez). No X11, no Windows e no macOS a opção não muda nada.
 *
 * Testado em 15/10/2026 (Electron 44.4.2, GNOME 50.1, xdg-desktop-portal 1.21): o Chromium registra o app no portal,
 * mas o Electron ainda não abre a sessão de atalhos, e o `register` devolve `false`. A opção fica ligada para quando o
 * Electron resolver; o GNOME 50.0/50.1 também exige identificador no formato `dev.runas.codex` (hoje é `runas-codex`).
 */
export function enableShortcutPortal(): void {
  if (process.platform === "linux") app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal")
}

/**
 * Registra o atalho global. Devolve `false` se o sistema não aceitou: outro programa já usa a combinação, ou a sessão
 * Wayland não tem o portal de atalhos (aí só o Ctrl+N, com a janela em foco).
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
