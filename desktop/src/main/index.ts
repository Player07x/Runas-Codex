import { exportBookPdf } from "./books-pdf"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { app, BrowserWindow, dialog, ipcMain, protocol, shell, type IpcMainInvokeEvent } from "electron"
import { IPC } from "../shared/ipc"
import { ReminderScheduler, validReminders } from "./reminders"
import { checkBookFiles, checkMaster, checkPdf, checkRoom, SMOKE_SCRIPT, smokePassed } from "./smoke"
import { VaultService } from "./vault-service"
import { VAULT_FILE_SCHEME } from "../../../app/src/platform/bridge"
import { vaultFilePrivilege, vaultFileResponse } from "./vault-files"
import { assetSchemePrivilege, VttHost } from "./vtt/vtt-host"
import { checkForUpdate, downloadUpdate, installUpdate, updateTarget } from "./updates"
import { attachContextMenu, configureSpellchecker, installDictionary, spellcheckPassed, spellcheckReport } from "./spellcheck"
import { DeepLinks } from "./deep-links"
import { enableShortcutPortal, registerQuickCapture } from "./quick-capture"
import type { UpdateInfo } from "../../../app/src/core/updates"
import { NoteWindows } from "./windows"
import { checkNoteWindows } from "./notes-windows-smoke"

// Instalado ou em desenvolvimento, as configurações ficam na mesma pasta: %APPDATA%\runas-codex no Windows e
// ~/.config/runas-codex no Linux (o nome do produto no instalador não muda a pasta).
if (!app.commandLine.hasSwitch("user-data-dir")) app.setPath("userData", join(app.getPath("appData"), "runas-codex"))

// O dicionário do corretor vai para o perfil antes de o Chromium procurar (senão ele o baixaria do Google).
installDictionary()

// Atalho global de captura rápida no Wayland, pelo portal do desktop (antes de "ready").
if (!process.argv.includes("--smoke")) enableShortcutPortal()

// Antes de "ready" (uma chamada só): imagens e áudio da mesa vêm por `vtt-asset://`; anexos das notas, por `vault-file://`.
protocol.registerSchemesAsPrivileged([assetSchemePrivilege(), vaultFilePrivilege()])

/**
 * `--smoke [--vault=<pasta>] [--write] [--shot=<arquivo.png>] [--hold=<s>]`: abre, confere a ponte, o cofre e o leitor de Notas,
 * imprime o resultado e sai. Com `--write`, trabalha numa cópia temporária do cofre e testa as gravações.
 */
const smoke = process.argv.includes("--smoke")
const argValue = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)

let mainWindow: BrowserWindow | null = null
const noteWindows = new NoteWindows(() => mainWindow)
const vault = new VaultService(() => mainWindow, async () => { await noteWindows.flushAll(); noteWindows.closeAll(); vtt.closeWorld() })
const vtt = new VttHost(() => vault.rootPath, () => vault.info()?.readOnly === false)
const reminders = new ReminderScheduler(() => mainWindow, (path) => mainWindow?.webContents.send(IPC.agendaOpen, path))
// `runas://abrir?nota=…` abre a nota pelo mesmo caminho que um lembrete tocado usa. O smoke roda sem a trava de cópia única.
const deepLinks = new DeepLinks(() => mainWindow, (path) => mainWindow?.webContents.send(IPC.agendaOpen, path))
if (!smoke && !deepLinks.claim()) app.exit(0)

/** Só a janela do app conversa com o processo principal. */
function handle(channel: string, listener: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown): void {
  ipcMain.handle(channel, (event, ...args) => {
    if ((!mainWindow || event.sender !== mainWindow.webContents) && !noteWindows.owns(event.sender)) throw new Error("Origem não autorizada.")
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
  handle(IPC.vaultOpenFile, (_event, path) => vault.openFile(text(path, "caminho")))
  handle(IPC.vaultInstallSnippet, (_event, css) => vault.installSnippet(text(css, "snippet")))
  handle(IPC.agendaSchedule, (_event, list) => reminders.schedule(validReminders(list)))
  handle(IPC.saveFile, async (_event, name, content) => {
    const fileName = text(name, "nome").replace(/[\\/:*?"<>|]/g, "-").slice(0, 120)
    const result = await dialog.showSaveDialog(mainWindow!, { defaultPath: join(app.getPath("documents"), fileName) })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, text(content, "conteúdo"), "utf8")
    return result.filePath
  })
  handle(IPC.booksPdf, (_event, name) => exportBookPdf(mainWindow!, text(name, "nome"), smoke && process.argv.includes("--write")))
  vtt.register(handle)
  handle(IPC.vaultReadBinary, (_event, path) => vault.readBinary(text(path, "caminho")))
  handle(IPC.vaultWriteBinary, (_event, path, content, expected) => {
    if (!(content instanceof Uint8Array)) throw new Error("Parâmetro inválido: conteúdo.")
    return vault.writeBinary(text(path, "caminho"), content, versionOf(expected))
  })
  handle(IPC.saveBytes, async (_event, name, content) => {
    if (!(content instanceof Uint8Array)) throw new Error("Parâmetro inválido: conteúdo.")
    const fileName = text(name, "nome").replace(/[\\/:*?"<>|]/g, "-").slice(0, 120)
    // No `--smoke --write`, as exportações vão para uma pasta temporária, sem diálogo (como o PDF do livro).
    const result = smoke && process.argv.includes("--write")
      ? { canceled: false, filePath: join(await mkdtemp(join(tmpdir(), "runas-export-")), fileName) }
      : await dialog.showSaveDialog(mainWindow!, { defaultPath: join(app.getPath("documents"), fileName) })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, content)
    return result.filePath
  })
  // "Verificar atualizações" (ADR 0017): só quando o usuário clica. Instala só o que a última consulta encontrou.
  let lastUpdate: UpdateInfo | null = null
  handle(IPC.appVersion, () => app.getVersion())
  handle(IPC.updatesCheck, async () => {
    const target = updateTarget()
    if (!target) throw new Error("A atualização pelo app existe no Windows e no Linux.")
    lastUpdate = await checkForUpdate(app.getVersion(), target)
    return lastUpdate
  })
  handle(IPC.updatesInstall, async () => {
    const target = updateTarget()
    if (!target || !lastUpdate?.newer) throw new Error("Verifique as atualizações primeiro.")
    const file = await downloadUpdate(lastUpdate, join(app.getPath("downloads"), "Runas-Codex"), (received, total) => mainWindow?.webContents.send(IPC.updatesProgress, { received, total }))
    return installUpdate(file, target, {
      openPath: (path) => shell.openPath(path),
      quit: () => app.quit(),
      relaunch: (execPath) => {
        app.relaunch({ execPath })
        app.exit(0)
      },
    })
  })
  handle(IPC.openWindow, (_event, route) => noteWindows.open(text(route, "rota")))
  handle(IPC.vaultListTrash, () => vault.listTrash())
  handle(IPC.vaultRestoreTrash, (_event, path, target) => vault.restoreTrash(text(path, "lixeira"), text(target, "destino")))
}

/** Versão que a interface leu (`null` = só criar; ausente = sem conferência). */
function versionOf(expected: unknown): { mtime: number; size: number } | null | undefined {
  if (expected === null) return null
  if (expected && typeof expected === "object" && typeof (expected as { mtime?: unknown }).mtime === "number" && typeof (expected as { size?: unknown }).size === "number") {
    return { mtime: (expected as { mtime: number }).mtime, size: (expected as { size: number }).size }
  }
  return undefined
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

  // O app nunca abre janelas nem sai de si mesmo; a navegação é toda por hash. Links http(s) e mailto das notas
  // abrem no navegador do sistema (só quando o usuário clica).
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:\/\/|mailto:)/i.test(url)) void shell.openExternal(url)
    return { action: "deny" }
  })
  window.webContents.on("will-navigate", (event, url) => {
    if (url.split("#")[0] !== window.webContents.getURL().split("#")[0]) event.preventDefault()
  })

  // Sugestões do corretor e recortar/copiar/colar no clique direito.
  attachContextMenu(window)

  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, "../renderer/index.html"))
  return window
}

async function runSmoke(window: BrowserWindow): Promise<void> {
  let ok = false
  try {
    await new Promise<void>((resolve) => window.webContents.once("did-finish-load", () => resolve()))
    const result = (await window.webContents.executeJavaScript(SMOKE_SCRIPT)) as Record<string, unknown>
    if (result.vault && !(result.vault as { readOnly: boolean }).readOnly) result.noteWindows = await checkNoteWindows(window)
    if (result.room) result.roomCheck = await checkRoom(result.room as { port: number; key: string; codes: string[] })
    const bookPdf = result.bookPdf as { path?: string | null } | undefined
    if (bookPdf?.path) result.bookPdfCheck = await checkPdf(bookPdf.path)
    const bookFiles = result.bookFiles as { epub?: string | null; docx?: string | null } | undefined
    if (bookFiles?.epub && bookFiles.docx) result.bookFilesCheck = await checkBookFiles(bookFiles.epub, bookFiles.docx)
    const master = result.master as { key?: string | null } | undefined
    if (result.room && master?.key) result.masterCheck = await checkMaster(window, (result.room as { port: number }).port, master.key, String(result.masterScene ?? ""), () => vtt.master.rotate(), argValue("shot-master"))
    const shot = argValue("shot")
    if (shot) await writeFile(shot, (await window.webContents.capturePage()).toPNG())
    result.spellcheck = spellcheckReport()
    console.log(JSON.stringify(result, null, 2))
    ok = smokePassed(result, vault.rootPath !== null) && spellcheckPassed(spellcheckReport())
    // `--hold=<segundos>`: mantém a sala aberta para conferir a página dos jogadores num navegador.
    const hold = Number(argValue("hold") ?? 0)
    if (hold > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(hold, 600) * 1000))
  } catch (error) {
    console.error(error)
  }
  vtt.closeWorld()
  vault.stop()
  app.exit(ok ? 0 : 1)
}

void app.whenReady().then(async () => {
  configureSpellchecker()
  if (smoke) await vault.openForSmoke(argValue("vault"), process.argv.includes("--write"))
  else await vault.load()
  registerIpc()
  vtt.registerProtocol()
  protocol.handle(VAULT_FILE_SCHEME, (request) => vaultFileResponse(vault.rootPath, request.url, request.headers.get("range")))
  mainWindow = createMainWindow()
  if (smoke) void runSmoke(mainWindow)
  else {
    deepLinks.register()
    mainWindow.webContents.once("did-finish-load", () => deepLinks.windowReady())
    if (!registerQuickCapture(() => mainWindow)) console.warn("Atalho global de captura rápida indisponível neste sistema.")
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createMainWindow()
  })
})

app.on("window-all-closed", () => {
  reminders.stop()
  vtt.closeWorld()
  vault.stop()
  if (process.platform !== "darwin") app.quit()
})
