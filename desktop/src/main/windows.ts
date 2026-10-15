import { join } from "node:path"
import { BrowserWindow, dialog, shell, type WebContents } from "electron"
import { attachContextMenu } from "./spellcheck"

/**
 * Janelas extras de nota (checklist A.3, "várias janelas no desktop"): a nota abre noutra janela (para o segundo
 * monitor), sem a barra lateral do app (`?janela=1`, ver `lib/tabs.ts`). Elas conversam com o processo principal como a
 * janela principal — a trava de origem do IPC aceita as duas e nada mais — e fecham junto com a principal.
 */
export class NoteWindows {
  private readonly windows = new Set<BrowserWindow>()

  constructor(private readonly main: () => BrowserWindow | null) {}

  /** O pedido veio de uma janela de nota aberta pelo app? */
  owns(contents: WebContents): boolean {
    for (const window of this.windows) if (!window.isDestroyed() && window.webContents === contents) return true
    return false
  }

  async flushAll(): Promise<void> { await Promise.all([...this.windows].filter(w => !w.isDestroyed()).map(w => this.flush(w))) }
  closeAll(): void { for (const window of this.windows) if (!window.isDestroyed()) window.destroy() }
  private flush(window: BrowserWindow): Promise<void> {
    return window.webContents.executeJavaScript(`(async()=>{const pending=[];window.dispatchEvent(new CustomEvent('runas-codex:gravar-notas',{detail:pending}));await Promise.all(pending)})()`)
  }

  /** Abre `/notas/<caminho>` numa janela nova. Só rotas de nota. */
  open(route: string): void {
    if (route.length > 2000 || !/^\/notas\/[^?#\s][^?#]*$/.test(route)) throw new Error("Rota de janela inválida.")
    const main = this.main()
    const at = main && !main.isDestroyed() ? main.getBounds() : null
    const window = new BrowserWindow({
      width: 960,
      height: 860,
      ...(at ? { x: at.x + 48 + this.windows.size * 24, y: at.y + 48 + this.windows.size * 24 } : {}),
      minWidth: 360,
      minHeight: 400,
      backgroundColor: "#11131a",
      title: "Runas-Codex",
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    })
    // As mesmas regras da janela principal: nada de janelas novas nem de sair do app; links externos no navegador.
    window.webContents.setWindowOpenHandler(({ url }) => {
      if (/^(https?:\/\/|mailto:)/i.test(url)) void shell.openExternal(url)
      return { action: "deny" }
    })
    window.webContents.on("will-navigate", (event, url) => {
      if (url.split("#")[0] !== window.webContents.getURL().split("#")[0]) event.preventDefault()
    })
    attachContextMenu(window)
    this.windows.add(window)
    let closing = false, flushing = false
    window.on("close", event => {
      if (closing) return
      event.preventDefault()
      if (flushing) return
      flushing = true
      void this.flush(window).then(() => { closing = true; window.close() }, async error => {
        const answer = await dialog.showMessageBox(window, { type: "warning", message: "A nota não pôde ser salva.", detail: String(error), buttons: ["Continuar editando", "Fechar sem salvar"], defaultId: 0, cancelId: 0 })
        if (answer.response === 1) { closing = true; window.close() }
      }).finally(() => { flushing = false })
    })
    const closeWithMain = () => { if (!window.isDestroyed()) window.close() }
    window.on("closed", () => { this.windows.delete(window); main?.removeListener("closed", closeWithMain) })
    main?.once("closed", closeWithMain)
    if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(`${process.env.ELECTRON_RENDERER_URL.replace(/\/$/, "")}/?janela=1#${route}`)
    else void window.loadFile(join(__dirname, "../renderer/index.html"), { query: { janela: "1" }, hash: route })
  }
}
