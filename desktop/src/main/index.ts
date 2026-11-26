import { checkTransfers } from "./transfer-smoke"
import { DesktopTray } from "./tray"
import { exportBookPdf } from "./books-pdf"
import { mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { app, BrowserWindow, dialog, ipcMain, protocol, session, shell, type IpcMainInvokeEvent } from "electron"
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
import { createSystemShortcut, removeSystemShortcut, systemShortcut } from "./system-shortcut"
import type { UpdateInfo } from "../../../app/src/core/updates"
import { NoteWindows } from "./windows"
import { checkNoteWindows } from "./notes-windows-smoke"
import { NetworkGuard } from "./network-guard"
import { SaveStreams } from "./save-stream"
import { configureSmokeEnvironment, startSmokeCleanup } from "./smoke-environment"
import { runPerformance } from "./performance-run"
import { checkPagePermissions, configurePagePermissions, showAppNotification } from "./page-permissions"

// Instalado ou em desenvolvimento, as configurações ficam na mesma pasta: %APPDATA%\runas-codex no Windows e
// ~/.config/runas-codex no Linux (o nome do produto no instalador não muda a pasta).
if (!app.commandLine.hasSwitch("user-data-dir")) app.setPath("userData", join(app.getPath("appData"), "runas-codex"))

const smokeEnvironment = configureSmokeEnvironment(app)
if (smokeEnvironment) {
  startSmokeCleanup(smokeEnvironment)
  console.log(JSON.stringify({ smokeEnvironment }))
}

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
const saveStreams = new SaveStreams()
app.on("will-quit", () => { void saveStreams.abortAll() })
const networkGuard = smoke ? new NetworkGuard() : null
// No smoke, a consulta de atualizações (a diária, ADR 0038) é contada e recusada: o teste não vai à internet.
let smokeUpdateChecks = 0
const argValue = (name: string) => process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)

const desktopTray=new DesktopTray()
let mainWindow: BrowserWindow | null = null
const noteWindows = new NoteWindows(() => mainWindow)
const vault = new VaultService(() => mainWindow, async () => { await noteWindows.flushAll(); noteWindows.closeAll(); vtt.closeWorld() })
const vtt = new VttHost(() => vault.rootPath, () => vault.info()?.readOnly === false)
const reminders = new ReminderScheduler(() => mainWindow, (path) => mainWindow?.webContents.send(IPC.agendaOpen, path))
// `runas://abrir?nota=…` abre a nota pelo mesmo caminho que um lembrete tocado usa. O smoke roda sem a trava de cópia única.
const deepLinks = new DeepLinks(
  () => mainWindow,
  (path) => mainWindow?.webContents.send(IPC.agendaOpen, path),
  () => mainWindow?.webContents.send(IPC.quickCapture),
)
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
  handle(IPC.vaultBackupSchedule, () => vault.backupSchedule())
  handle(IPC.vaultSetBackupSchedule, (_event, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Configuração de backup inválida.")
    const input = value as { enabled?: unknown; time?: unknown; keep?: unknown }
    return vault.setBackupSchedule({
      ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
      ...(typeof input.time === "string" ? { time: input.time } : {}),
      ...(typeof input.keep === "number" ? { keep: input.keep } : {}),
    })
  })
  handle(IPC.vaultListSyncConflicts, () => vault.listSyncConflicts())
  handle(IPC.vaultArchiveSyncConflict, (_event, path) => vault.archiveSyncConflict(text(path, "caminho")))
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
  handle(IPC.trayEnabled,(_event,enabled)=>desktopTray.set(enabled===true))
  handle(IPC.systemShortcutStatus, () => systemShortcut())
  handle(IPC.systemShortcutCreate, () => createSystemShortcut())
  handle(IPC.systemShortcutRemove, () => removeSystemShortcut())
  handle(IPC.booksPdf, (_event, name) => exportBookPdf(mainWindow!, text(name, "nome"), smoke && process.argv.includes("--write")))
  vtt.register(handle)
  handle(IPC.vaultReadBinary, (_event, path) => vault.readBinary(text(path, "caminho")))
  handle(IPC.vaultTransferList, (_event, includeWorlds) => { if (includeWorlds !== false) vtt.flushWorld(); return vault.listTransferFiles(includeWorlds !== false) })
  handle(IPC.vaultTransferWrite, async (_event, path, bytes, expected) => {
    if (!(bytes instanceof Uint8Array)) throw new Error("Conteúdo inválido para importar a mesa.")
    const version = versionOf(expected)
    if (version === undefined) throw new Error("A versão lida é obrigatória para importar a mesa.")
    vtt.closeWorld()
    return vault.writeManagedTransfer(text(path, "caminho"), bytes, version)
  })
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
  // "Verificar atualizações" (ADR 0017) e a consulta diária (ADR 0038). Instala só o que a última consulta encontrou.
  let lastUpdate: UpdateInfo | null = null
  let installingUpdate = false
  handle(IPC.appVersion, () => app.getVersion())
  handle(IPC.updatesCheck, async () => {
    if (smoke) {
      smokeUpdateChecks++
      throw new Error("No teste automático o app não consulta a internet.")
    }
    const target = updateTarget()
    if (!target) throw new Error("A atualização pelo app existe no Windows e no Linux.")
    lastUpdate = await checkForUpdate(app.getVersion(), target)
    return lastUpdate
  })
  handle(IPC.updatesInstall, async () => {
    if (installingUpdate) throw new Error("Uma atualização já está em andamento.")
    const target = updateTarget()
    if (!target || !lastUpdate?.newer) throw new Error("Verifique as atualizações primeiro.")
    installingUpdate = true
    try {
      const file = await downloadUpdate(lastUpdate, join(app.getPath("downloads"), "Runas-Codex"), (received, total) => mainWindow?.webContents.send(IPC.updatesProgress, { received, total }))
      return await installUpdate(file, target, {
        openPath: (path) => shell.openPath(path),
        beforeRestart: async () => {
          await noteWindows.flushAll()
          await mainWindow?.webContents.executeJavaScript(`(async()=>{const pending=[];window.dispatchEvent(new CustomEvent('runas-codex:gravar-notas',{detail:pending}));await Promise.all(pending)})()`)
        },
        quit: () => app.quit(),
        relaunch: (execPath) => {
          app.relaunch({ execPath })
          app.exit(0)
        },
      })
    } finally {
      installingUpdate = false
    }
  })
  handle(IPC.openWindow, (_event, route) => noteWindows.open(text(route, "rota")))
  handle(IPC.vaultListTrash, () => vault.listTrash())
  handle(IPC.vaultRestoreTrash, (_event, path, target) => vault.restoreTrash(text(path, "lixeira"), text(target, "destino")))
  // U50 (ADR 0037): exportação em pedaços; o diálogo vem antes, os bytes depois, e o parcial some se der errado.
  handle(IPC.saveStreamStart, async (_event, name) => {
    const fileName = text(name, "nome").replace(/[\\/:*?"<>|]/g, "-").slice(0, 120)
    const result = smoke && process.argv.includes("--write")
      ? { canceled: false, filePath: join(await mkdtemp(join(tmpdir(), "runas-export-")), fileName) }
      : await dialog.showSaveDialog(mainWindow!, { defaultPath: join(app.getPath("documents"), fileName) })
    if (result.canceled || !result.filePath) return null
    return { id: await saveStreams.start(result.filePath), path: result.filePath }
  })
  handle(IPC.saveStreamWrite, (_event, id, bytes) => {
    if (typeof id !== "number" || !(bytes instanceof Uint8Array)) throw new Error("Parâmetro inválido: pedaço da exportação.")
    return saveStreams.write(id, bytes)
  })
  handle(IPC.saveStreamFinish, (_event, id) => { if (typeof id !== "number") throw new Error("Parâmetro inválido."); return saveStreams.finish(id) })
  handle(IPC.saveStreamAbort, (_event, id) => { if (typeof id !== "number") throw new Error("Parâmetro inválido."); return saveStreams.abort(id) })
  handle(IPC.appNotify, (_event, title, body) => showAppNotification(title, body))
  handle(IPC.vaultCheckWrite, () => vault.checkWrite())
  // U91: endereço local do Windows (abre a Segurança do Windows, sem rede); nos outros sistemas não faz nada.
  handle(IPC.openSecuritySettings, async () => { if (process.platform === "win32") await shell.openExternal("windowsdefender://ransomwareprotection") })
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
      // No smoke a janela fica escondida; no Windows o Chromium a trata como em segundo plano e segura o
      // requestAnimationFrame, e o CodeMirror deixa de medir as linhas (falha intermitente do clique no editor).
      backgroundThrottling: !smoke,
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

  if(!smoke)desktopTray.attach(window)

  // Sugestões do corretor e recortar/copiar/colar no clique direito.
  attachContextMenu(window)
  // U40: o título de cada rota (document.title) serve ao leitor de tela; a janela fica sempre "Runas-Codex".
  window.on("page-title-updated", (event) => event.preventDefault())
  // U91: a nota com texto não gravado no cofre segura o fechamento (beforeunload); aqui o usuário decide.
  window.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(window, { type: "warning", buttons: ["Fechar mesmo assim", "Continuar no app"], defaultId: 1, cancelId: 1, title: "Runas-Codex", message: "Há texto que não foi gravado no cofre.", detail: "Ele fica guardado neste aparelho e volta quando você abrir a nota de novo." })
    if (choice === 0) event.preventDefault()
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
    if (result.vault && !(result.vault as { readOnly: boolean }).readOnly) result.noteWindows = await checkNoteWindows(window)
    if (result.room) result.roomCheck = await checkRoom(result.room as { port: number; key: string; codes: string[] })
    const bookPdf = result.bookPdf as { path?: string | null } | undefined
    if (bookPdf?.path) result.bookPdfCheck = await checkPdf(bookPdf.path)
    const bookFiles = result.bookFiles as { epub?: string | null; docx?: string | null } | undefined
    if (bookFiles?.epub && bookFiles.docx) result.bookFilesCheck = await checkBookFiles(bookFiles.epub, bookFiles.docx)
    const master = result.master as { key?: string | null } | undefined
    if (result.room && master?.key) result.masterCheck = await checkMaster(window, (result.room as { port: number }).port, master.key, String(result.masterScene ?? ""), () => vtt.master.rotate(), argValue("shot-master"))
    if (result.vault && !(result.vault as { readOnly: boolean }).readOnly) result.transfers = await checkTransfers(window)
    const shot = argValue("shot")
    if (shot) await writeFile(shot, (await window.webContents.capturePage()).toPNG())
    result.pagePermissions = await checkPagePermissions(window)
    result.spellcheck = spellcheckReport()
    result.network = networkGuard?.report() ?? { requests: 0, violations: [] }
    // U84: depois de o smoke passar por várias rotas, a janela continua “Runas-Codex” (o título da rota fica no documento).
    result.windowTitle = window.getTitle()
    result.updateChecks = smokeUpdateChecks
    console.log(JSON.stringify(result, null, 2))
    ok = smokePassed(result, vault.rootPath !== null) && spellcheckPassed(spellcheckReport()) && (!result.transfers || (result.transfers as { ok?: boolean }).ok === true) && result.windowTitle === "Runas-Codex"
    ok = ok && result.pagePermissions === true
    // `--hold=<segundos>`: mantém a sala aberta para conferir a página dos jogadores num navegador.
    const hold = Number(argValue("hold") ?? 0)
    if (hold > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(hold, 600) * 1000))
  } catch (error) {
    console.error(error)
  }
  // O resultado já saiu. No CI do Linux o processo às vezes não fechava depois daqui e prendia o job até o limite de
  // 30 min, sem o smoke com gravação chegar a rodar: se a limpeza ou o app.exit não terminarem em 15 s, sai assim mesmo.
  setTimeout(() => {
    console.error("Smoke: o app não fechou 15 s depois do resultado; saindo à força.")
    process.exit(ok ? 0 : 1)
  }, 15_000)
  vtt.closeWorld()
  vault.stop()
  await saveStreams.abortAll()
  app.exit(ok ? 0 : 1)
}

void app.whenReady().then(async () => {
  configureSpellchecker()
  configurePagePermissions(session.defaultSession, contents => contents !== null && ((mainWindow !== null && contents === mainWindow.webContents) || noteWindows.owns(contents)))
  networkGuard?.attach(session.defaultSession)
  if (smoke) await vault.openForSmoke(argValue("vault"), process.argv.includes("--write"))
  else await vault.load()
  registerIpc()
  vtt.registerProtocol()
  protocol.handle(VAULT_FILE_SCHEME, (request) => vaultFileResponse(vault.rootPath, request.url, request.headers.get("range")))
  mainWindow = createMainWindow()
  if (smoke && process.argv.includes("--performance")) {
    try { await runPerformance(mainWindow, vault.rootPath); vtt.closeWorld(); vault.stop(); app.exit(0) }
    catch (error) { console.error(error); vtt.closeWorld(); vault.stop(); app.exit(1) }
    return
  }
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

// Falha antes de abrir a janela também encerra o smoke e libera a limpeza dos temporários.
if (smoke) process.on("unhandledRejection", (error) => {
  console.error(error)
  app.exit(1)
})

app.on("window-all-closed", () => {
  reminders.stop()
  vtt.closeWorld()
  vault.stop()
  if (process.platform !== "darwin") app.quit()
})

// No smoke ninguém clica: sem este ouvinte, uma exceção no processo principal abre a caixa de erro do Electron, que no
// Linux é um diálogo GTK modal (gtk_dialog_run) e prendia o app depois do resultado. Aqui ela vai para o log e o
// smoke falha, mesmo que aconteça ao fechar.
if (smoke) process.on("uncaughtException", (error) => {
  console.error("Smoke: exceção não tratada no processo principal:", error)
  app.exit(1)
})
