import { mkdir, readFile, stat, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { app, BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent, type OpenDialogOptions } from "electron"
import { IPC, type VaultInfo } from "../shared/ipc"
import { listVault, readTexts } from "./vault"

// Instalado ou em desenvolvimento, as configurações ficam na mesma pasta: %APPDATA%\runas-codex no Windows e
// ~/.config/runas-codex no Linux (o nome do produto no instalador não muda a pasta).
if (!app.commandLine.hasSwitch("user-data-dir")) app.setPath("userData", join(app.getPath("appData"), "runas-codex"))

/** `--smoke [--vault=<pasta>] [--shot=<arquivo.png>]`: abre, confere a ponte e o cofre, imprime o resultado e sai. */
const smoke = process.argv.includes("--smoke")
const argValue = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)

let mainWindow: BrowserWindow | null = null
let vaultPath: string | null = null

const configFile = () => join(app.getPath("userData"), "config.json")

async function isFolder(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

async function loadConfig(): Promise<void> {
  try {
    const config = JSON.parse(await readFile(configFile(), "utf8")) as { vaultPath?: unknown }
    if (typeof config.vaultPath === "string" && (await isFolder(config.vaultPath))) vaultPath = config.vaultPath
  } catch {
    vaultPath = null
  }
}

async function saveConfig(): Promise<void> {
  await mkdir(app.getPath("userData"), { recursive: true })
  await writeFile(configFile(), JSON.stringify({ vaultPath }, null, 2) + "\n")
}

/** Até a etapa 3a o app só lê: a primeira abertura de um cofre nunca grava. */
function vaultInfo(): VaultInfo | null {
  return vaultPath ? { name: basename(vaultPath), path: vaultPath, readOnly: true } : null
}

function openVault(): string {
  if (!vaultPath) throw new Error("Nenhum cofre aberto. Escolha a pasta em Configurações.")
  return vaultPath
}

/** Só a janela do app conversa com o processo principal. */
function handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) throw new Error("Origem não autorizada.")
    return listener(event, ...args)
  })
}

function registerIpc(): void {
  handle(IPC.vaultCurrent, () => vaultInfo())
  handle(IPC.vaultChoose, async () => {
    const options: OpenDialogOptions = { title: "Abrir pasta do cofre", properties: ["openDirectory"], defaultPath: vaultPath ?? app.getPath("documents") }
    const result = mainWindow ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options)
    const chosen = result.filePaths[0]
    if (result.canceled || !chosen) return vaultInfo()
    vaultPath = chosen
    await saveConfig()
    return vaultInfo()
  })
  handle(IPC.vaultList, (_event, prefix) => listVault(openVault(), typeof prefix === "string" ? prefix : ""))
  handle(IPC.vaultRead, (_event, paths) => {
    if (!Array.isArray(paths) || !paths.every((path) => typeof path === "string")) throw new Error("Lista de caminhos inválida.")
    return readTexts(openVault(), paths)
  })
  handle(IPC.vaultWrite, () => {
    throw new Error("Cofre em somente leitura: a gravação chega na etapa 3a.")
  })
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

/** Roda no renderer: confere a ponte, a recusa de caminhos fora do cofre e a lista de Notas. */
const SMOKE_SCRIPT = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms))
  const bridge = window.runasCodex
  const result = { bridge: Boolean(bridge), title: document.title }
  if (!bridge) return result
  result.vault = await bridge.vault.current()
  if (!result.vault) return result
  const entries = await bridge.vault.list()
  result.files = entries.length
  result.markdown = entries.filter((e) => e.path.endsWith(".md")).length
  for (const path of ["../fora.md", "/etc/passwd"]) {
    try { await bridge.vault.read([path]); result.escape = "LEU " + path } catch (e) { result.escape = result.escape ?? e.message }
  }
  try { await bridge.vault.write("x.md", "x"); result.write = "GRAVOU" } catch (e) { result.write = e.message }
  location.hash = "/notas"
  for (let i = 0; i < 50 && !document.querySelector(".vault-tree"); i++) await wait(100)
  result.listed = [...document.querySelectorAll(".vault-tree .note-item strong")].map((el) => el.textContent)
  const linked = entries.find((e) => e.path.endsWith("Aldren.md")) ?? entries.find((e) => e.path.endsWith(".md"))
  if (linked) {
    location.hash = "/notas/" + encodeURIComponent(linked.path)
    for (let i = 0; i < 30 && !document.querySelector(".editor-body .md"); i++) await wait(100)
    await wait(300)
    result.opened = linked.path
    result.backlinks = [...document.querySelectorAll(".pane-right .card strong")].map((el) => el.textContent)
    result.wikilinks = [...document.querySelectorAll(".editor-body .wikilink")].map((el) => (el.classList.contains("broken") ? "✗ " : "✓ ") + el.textContent)
  }
  return result
})()`

async function runSmoke(window: BrowserWindow): Promise<void> {
  let ok = false
  try {
    await new Promise<void>((resolve) => window.webContents.once("did-finish-load", () => resolve()))
    const result = (await window.webContents.executeJavaScript(SMOKE_SCRIPT)) as Record<string, unknown>
    const shot = argValue("shot")
    if (shot) await writeFile(shot, (await window.webContents.capturePage()).toPNG())
    console.log(JSON.stringify(result, null, 2))
    const listed = Array.isArray(result.listed) ? result.listed.length : -1
    const vaultOk =
      typeof result.markdown === "number" &&
      result.markdown > 0 &&
      listed === result.markdown &&
      Array.isArray(result.backlinks) &&
      result.backlinks.length > 0 &&
      String(result.escape).startsWith("Caminho fora do cofre") &&
      String(result.write).startsWith("Cofre em somente leitura")
    ok = result.bridge === true && (!vaultPath || vaultOk)
  } catch (error) {
    console.error(error)
  }
  app.exit(ok ? 0 : 1)
}

void app.whenReady().then(async () => {
  await loadConfig()
  // No teste, o cofre vem da linha de comando e não é lembrado.
  const smokeVault = argValue("vault")
  if (smoke) vaultPath = smokeVault && (await isFolder(smokeVault)) ? smokeVault : null
  registerIpc()
  mainWindow = createMainWindow()
  if (smoke) void runSmoke(mainWindow)
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
