import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron"
import { IPC } from "../shared/ipc"
import { SMOKE_SCRIPT, smokePassed } from "./smoke"
import { VaultService } from "./vault-service"

// Instalado ou em desenvolvimento, as configurações ficam na mesma pasta: %APPDATA%\runas-codex no Windows e
// ~/.config/runas-codex no Linux (o nome do produto no instalador não muda a pasta).
if (!app.commandLine.hasSwitch("user-data-dir")) app.setPath("userData", join(app.getPath("appData"), "runas-codex"))

/**
 * `--smoke [--vault=<pasta>] [--write] [--shot=<arquivo.png>]`: abre, confere a ponte, o cofre e o leitor de Notas,
 * imprime o resultado e sai. Com `--write`, trabalha numa cópia temporária do cofre e testa as gravações.
 */
const smoke = process.argv.includes("--smoke")
const argValue = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)

let mainWindow: BrowserWindow | null = null
const vault = new VaultService(() => mainWindow)

/** Só a janela do app conversa com o processo principal. */
function handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Origem não autorizada.")
    return listener(event, ...args)
  })
}

const text = (value: unknown, name: string): string => {
  if (typeof value !== "string") throw new Error(`Parâmetro inválido: ${name}.`)
  return value
}

function registerIpc(): void {
  handle(IPC.vaultCurrent, () => vault.info())
  handle(IPC.vaultChoose, () => vault.choose())
  handle(IPC.vaultCreate, () => vault.create())
  handle(IPC.vaultSetWritable, (_event, writable) => vault.setWritable(writable === true))
  handle(IPC.vaultList, (_event, prefix) => vault.list(typeof prefix === "string" ? prefix : ""))
  handle(IPC.vaultRead, (_event, paths) => {
    if (!Array.isArray(paths) || !paths.every((path) => typeof path === "string")) throw new Error("Lista de caminhos inválida.")
    return vault.read(paths)
  })
  handle(IPC.vaultWrite, (_event, path, content, expected) => {
    const version =
      expected === null ? null
      : expected && typeof expected === "object" && typeof (expected as { mtime?: unknown }).mtime === "number" && typeof (expected as { size?: unknown }).size === "number"
        ? { mtime: (expected as { mtime: number }).mtime, size: (expected as { size: number }).size }
        : undefined
    return vault.write(text(path, "caminho"), text(content, "conteúdo"), version)
  })
  handle(IPC.vaultCreateFolder, (_event, path) => vault.createFolder(text(path, "caminho")))
  handle(IPC.vaultRename, (_event, from, to) => vault.rename(text(from, "origem"), text(to, "destino")))
  handle(IPC.vaultTrash, (_event, path) => vault.trash(text(path, "caminho")))
  handle(IPC.vaultBackup, () => vault.backup())
  handle(IPC.vaultListBackups, () => vault.listBackups())
  handle(IPC.vaultRevealBackups, () => vault.revealBackups())
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: "#11131a",
    title: "Runas-Codex",
    show: !smoke,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })

  // O app nunca abre janelas nem sai de si mesmo; a navegação é toda por hash.
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  window.webContents.on("will-navigate", (event, url) => {
    if (url.split("#")[0] !== window.webContents.getURL().split("#")[0]) event.preventDefault()
  })

  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, "../renderer/index.html"))
  return window
}

async function runSmoke(window: BrowserWindow): Promise<void> {
  let ok = false
  try {
    await new Promise<void>((resolve) => window.webContents.once("did-finish-load", () => resolve()))
    const result = (await window.webContents.executeJavaScript(SMOKE_SCRIPT)) as Record<string, unknown>
    const shot = argValue("shot")
    if (shot) await writeFile(shot, (await window.webContents.capturePage()).toPNG())
    console.log(JSON.stringify(result, null, 2))
    ok = smokePassed(result, vault.rootPath !== null)
  } catch (error) {
    console.error(error)
  }
  vault.stop()
  app.exit(ok ? 0 : 1)
}

void app.whenReady().then(async () => {
  if (smoke) await vault.openForSmoke(argValue("vault"), process.argv.includes("--write"))
  else await vault.load()
  registerIpc()
  mainWindow = createMainWindow()
  if (smoke) void runSmoke(mainWindow)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
  })
})

app.on("window-all-closed", () => {
  vault.stop()
  if (process.platform !== "darwin") app.quit()
})
