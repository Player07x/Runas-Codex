import { cp, mkdir, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { app, BrowserWindow, dialog, shell, type OpenDialogOptions } from "electron"
import { IPC, type BackupInfo, type VaultChange, type VaultEntry, type VaultInfo } from "../shared/ipc"
import { backupFolder, backupVault, createFolder, createVault, listBackups, listVault, readBinary, readTexts, renamePath, trashPath, writeBinarySafe, writeTextSafe } from "./vault"
import { installSnippet, mediaFile } from "./vault-files"
import { VaultWatcher } from "./watcher"
import { listTrash, restoreTrash } from "./trash"
import { WriteQueue } from "./write-queue"
import { listTransferFiles, writeManagedTransfer } from "./vault-transfer"

interface Config {
  vaultPath?: string
  /** Cofres em que o usuário liberou a gravação (ou que o app criou). */
  writable?: string[]
}

const DAY = 24 * 60 * 60 * 1000

async function isFolder(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

/**
 * O cofre aberto no desktop: escolher/criar, ler e gravar com as regras de segurança, observar mudanças externas e
 * fazer backups. A configuração fica em `userData/config.json`, fora do cofre.
 */
export class VaultService {
  private config: Config = {}
  private path: string | null = null
  private watcher: VaultWatcher | null = null
  /** No teste, o cofre vem da linha de comando e nada é lembrado. */
  private ephemeral = false
  private ephemeralWritable = false
  private readonly writes = new WriteQueue()

  constructor(
    private readonly window: () => BrowserWindow | null,
    /** Avisa que o cofre vai mudar (a mesa aberta, que mora dentro dele, precisa fechar). */
    private readonly beforeSwitch: () => void | Promise<void> = () => undefined,
  ) {}

  private get configFile(): string {
    return join(app.getPath("userData"), "config.json")
  }

  private get backupsDir(): string {
    return backupFolder(join(app.getPath("userData"), "backups"), this.path ?? "")
  }

  async load(): Promise<void> {
    try {
      this.config = JSON.parse(await readFile(this.configFile, "utf8")) as Config
    } catch {
      this.config = {}
    }
    if (this.config.vaultPath && (await isFolder(this.config.vaultPath))) await this.open(this.config.vaultPath)
  }

  /** Teste (`--smoke`): abre `path` sem lembrar; com `writable`, trabalha numa cópia temporária gravável. */
  async openForSmoke(path: string | undefined, writable: boolean): Promise<void> {
    this.ephemeral = true
    if (!path || !(await isFolder(path))) return
    if (writable) {
      const copy = join(await mkdtemp(join(tmpdir(), "runas-codex-smoke-")), basename(path))
      await cp(path, copy, { recursive: true })
      this.ephemeralWritable = true
      path = copy
    }
    await this.open(path)
  }

  private async save(): Promise<void> {
    if (this.ephemeral) return
    await mkdir(app.getPath("userData"), { recursive: true })
    await writeFile(this.configFile, JSON.stringify(this.config, null, 2) + "\n")
  }

  private async open(path: string): Promise<void> {
    await this.beforeSwitch()
    this.watcher?.stop()
    this.path = path
    // Todas as janelas do app (a principal e as de nota) ficam sabendo do que mudou fora do app.
    this.watcher = new VaultWatcher(path, (changes: VaultChange[]) => this.send(changes))
    await this.watcher.start().catch(() => {
      this.watcher = null
    })
  }

  private send(changes: VaultChange[]): void {
    for (const window of BrowserWindow.getAllWindows()) if (!window.isDestroyed()) window.webContents.send(IPC.vaultChanged, changes)
  }

  /**
   * Com uma janela extra de nota aberta, o que o app grava também é avisado às janelas (o observador não avisa as
   * gravações do próprio app). A janela que gravou já tem aquela versão e ignora o aviso.
   */
  private notify(changes: VaultChange[]): void {
    if (BrowserWindow.getAllWindows().length > 1) this.send(changes)
  }

  info(): VaultInfo | null {
    if (!this.path) return null
    const writable = this.ephemeral ? this.ephemeralWritable : (this.config.writable ?? []).includes(this.path)
    return { name: basename(this.path), path: this.path, readOnly: !writable }
  }

  get rootPath(): string | null {
    return this.path
  }

  private root(): string {
    if (!this.path) throw new Error("Nenhum cofre aberto. Escolha a pasta em Configurações.")
    return this.path
  }

  private writableRoot(): string {
    const root = this.root()
    if (this.info()!.readOnly) throw new Error("Cofre em somente leitura. Libere a gravação em Configurações › Cofre.")
    return root
  }

  private async pickFolder(options: OpenDialogOptions): Promise<string | null> {
    const window = this.window()
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  }

  async choose(): Promise<VaultInfo | null> {
    const chosen = await this.pickFolder({ title: "Abrir pasta do cofre", properties: ["openDirectory"], defaultPath: this.path ?? app.getPath("documents") })
    if (!chosen) return this.info()
    await this.open(chosen)
    this.config.vaultPath = chosen
    await this.save()
    return this.info()
  }

  async create(): Promise<VaultInfo | null> {
    const chosen = await this.pickFolder({
      title: "Criar cofre: escolha ou crie uma pasta vazia",
      buttonLabel: "Criar cofre aqui",
      properties: ["openDirectory", "createDirectory"],
      defaultPath: app.getPath("documents"),
    })
    if (!chosen) return this.info()
    const existing = (await readdir(chosen)).filter((name) => !name.startsWith("."))
    if (existing.length) throw new Error("Escolha uma pasta vazia para o cofre novo (para abrir um cofre que já existe, use “Abrir pasta”).")
    await createVault(chosen)
    await this.open(chosen)
    this.config.vaultPath = chosen
    this.config.writable = [...new Set([...(this.config.writable ?? []), chosen])]
    await this.save()
    return this.info()
  }

  /** Liberar a gravação faz um backup antes, para poder voltar atrás. */
  async setWritable(writable: boolean): Promise<VaultInfo | null> {
    const root = this.root()
    if (this.ephemeral) {
      this.ephemeralWritable = writable
      return this.info()
    }
    if (writable) await this.backup()
    const list = new Set(this.config.writable ?? [])
    if (writable) list.add(root)
    else list.delete(root)
    this.config.writable = [...list]
    await this.save()
    return this.info()
  }

  list(prefix: string): Promise<VaultEntry[]> {
    return listVault(this.root(), prefix)
  }

  read(paths: string[]): Promise<Record<string, string>> {
    return readTexts(this.root(), paths)
  }

  /** Backup automático antes da primeira gravação de cada dia. */
  private async dailyBackup(): Promise<void> {
    if (this.ephemeral) return
    const last = (await listBackups(this.backupsDir))[0]
    if (!last || Date.now() - last.createdAt > DAY) await this.backup()
  }

  async write(path: string, content: string, expected: { mtime: number; size: number } | null | undefined): Promise<VaultEntry> {
    const root = this.writableRoot()
    return this.writes.run(root + "\0" + path, async () => {
      await this.dailyBackup()
      const entry = await writeTextSafe(root, path, content, expected)
      this.watcher?.remember(entry)
      this.notify([{ type: "changed", entry }])
      return entry
    })
  }

  readBinary(path: string): Promise<Uint8Array> {
    return readBinary(this.root(), path)
  }

  async writeBinary(path: string, bytes: Uint8Array, expected: { mtime: number; size: number } | null | undefined): Promise<VaultEntry> {
    const root = this.writableRoot()
    return this.writes.run(root + "\0" + path, async () => {
      await this.dailyBackup()
      const entry = await writeBinarySafe(root, path, bytes, expected)
      this.watcher?.remember(entry)
      this.notify([{ type: "changed", entry }])
      return entry
    })
  }

  async createFolder(path: string): Promise<void> {
    await createFolder(this.writableRoot(), path)
  }

  async rename(from: string, to: string): Promise<void> {
    const root = this.writableRoot()
    await this.dailyBackup()
    this.watcher?.forget(from)
    await renamePath(root, from, to)
    try {
      const info = await stat(join(root, ...to.split("/")))
      if (info.isFile()) {
        const entry = { path: to, size: info.size, mtime: info.mtimeMs }
        this.watcher?.remember(entry)
        this.notify([{ type: "deleted", path: from }, { type: "changed", entry }])
      }
    } catch {
      /* o observador avisa */
    }
  }

  async trash(path: string): Promise<void> {
    const root = this.writableRoot()
    this.watcher?.forget(path)
    await trashPath(root, path)
    this.notify([{ type: "deleted", path }])
  }

  backup(): Promise<BackupInfo> {
    return backupVault(this.root(), this.backupsDir)
  }

  listBackups(): Promise<BackupInfo[]> {
    return this.path ? listBackups(this.backupsDir) : Promise.resolve([])
  }

  /** Abre um anexo de mídia ou PDF no programa padrão (nunca executáveis: só os tipos de `VAULT_FILE_TYPES`). */
  async openFile(path: string): Promise<void> {
    const file = await mediaFile(this.root(), path)
    if (!file) throw new Error(`“${path}” não é um anexo que o app abre.`)
    const error = await shell.openPath(file)
    if (error) throw new Error(error)
  }

  installSnippet(css: string): Promise<string> {
    return installSnippet(this.writableRoot(), css)
  }

  async revealBackups(): Promise<void> {
    await mkdir(this.backupsDir, { recursive: true })
    await shell.openPath(this.backupsDir)
  }

  stop(): void {
    this.watcher?.stop()
  }

  listTrash(): Promise<VaultEntry[]> { return listTrash(this.root()) }
  async restoreTrash(path: string, target: string): Promise<VaultEntry> {
    const root = this.writableRoot()
    await this.dailyBackup()
    const entry = await restoreTrash(root, path, target)
    this.watcher?.remember(entry); this.send([{ type: "changed", entry }])
    return entry
  }
  listTransferFiles(includeWorlds = true): Promise<VaultEntry[]> { return listTransferFiles(this.root(), includeWorlds) }
  async writeManagedTransfer(path: string, bytes: Uint8Array, expected: { size: number; mtime: number } | null): Promise<VaultEntry> {
    const root = this.writableRoot()
    return this.writes.run(root + "\0" + path, async () => {
      await this.dailyBackup()
      return writeManagedTransfer(root, path, bytes, expected)
    })
  }
}
