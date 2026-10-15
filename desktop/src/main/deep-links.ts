import { app, type BrowserWindow } from "electron"
import { DEEP_LINK_SCHEME, notePathFromArgv, notePathFromUrl } from "../../../app/src/core/deep-link"

/**
 * `runas://abrir?nota=…`: o sistema abre o app com o endereço (Windows e Linux, na linha de comando; macOS, no evento
 * `open-url`). Com o app já aberto, a segunda cópia passa o endereço para a primeira e fecha — o que também evita duas
 * janelas gravando no mesmo cofre.
 */
export class DeepLinks {
  private pending: string | null = notePathFromArgv(process.argv)

  constructor(
    private readonly window: () => BrowserWindow | null,
    private readonly open: (path: string) => void,
  ) {}

  /** Antes do "ready". `false`: já há um app aberto com este perfil, e esta cópia deve sair. */
  claim(): boolean {
    if (!app.requestSingleInstanceLock()) return false
    app.on("second-instance", (_event, argv) => {
      const window = this.window()
      if (window) {
        if (window.isMinimized()) window.restore()
        window.focus()
      }
      const path = notePathFromArgv(argv)
      if (path) this.deliver(path)
    })
    app.on("open-url", (event, url) => {
      event.preventDefault()
      const path = notePathFromUrl(url)
      if (path) this.deliver(path)
    })
    return true
  }

  /** Só no app instalado: em desenvolvimento, o registro apontaria para o Electron de `node_modules`. */
  register(): void {
    if (app.isPackaged) app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME)
  }

  /** A janela carregou: entrega o endereço com que o app foi aberto (depois de a tela montar). */
  windowReady(): void {
    const path = this.pending
    this.pending = null
    if (path) setTimeout(() => this.deliver(path), 1500)
  }

  private deliver(path: string): void {
    if (!this.window()) {
      this.pending = path
      return
    }
    this.open(path)
  }
}
