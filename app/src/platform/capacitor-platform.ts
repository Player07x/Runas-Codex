import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core"
import type { BackupInfo, Platform, RoomHostInfo, VaultEntry, VaultInfo } from "./platform"
import { onAndroidReminderOpen, scheduleOnAndroid } from "./reminders"

/**
 * Plataforma do Android (Capacitor): o cofre real, direto na pasta do disco, pelo plugin nativo `RunasVault`
 * (mobile/android/app/src/main/java/dev/runas/codex/vault/). As regras de gravação são as do desktop e ficam no lado
 * nativo: versão esperada, nada oculto, nada fora do cofre, temporário + troca, lixeira `.trash`, backup diário.
 */

type Expected = { mtime: number; size: number } | null | undefined
type NativeEntry = VaultEntry & { uri?: string }
type NativeInfo = VaultInfo & { mode?: "direct" | "saf" }
type NativeChange = { type: "changed"; entry: NativeEntry } | { type: "deleted"; path: string }

export interface SharedItem {
  text?: string
  subject?: string
  files: { name: string; mime?: string; base64: string }[]
}

interface RunasVaultPlugin {
  current(): Promise<{ vault: NativeInfo | null }>
  choose(): Promise<{ vault: NativeInfo | null }>
  create(): Promise<{ vault: NativeInfo | null }>
  access(): Promise<{ granted: boolean }>
  setWritable(options: { writable: boolean }): Promise<{ vault: NativeInfo | null }>
  list(options: { prefix?: string }): Promise<{ entries: NativeEntry[] }>
  read(options: { paths: string[] }): Promise<{ texts: Record<string, string> }>
  write(options: { path: string; content: string; expected?: { mtime: number; size: number } | null }): Promise<NativeEntry>
  readBinary(options: { path: string }): Promise<{ base64: string }>
  writeBinary(options: { path: string; base64: string; expected?: { mtime: number; size: number } | null }): Promise<NativeEntry>
  createFolder(options: { path: string }): Promise<void>
  rename(options: { from: string; to: string }): Promise<void>
  trash(options: { path: string }): Promise<void>
  listTrash(): Promise<{ entries: VaultEntry[] }>
  restoreTrash(options: { path: string; target: string }): Promise<NativeEntry>
  listTransferFiles(options: { includeWorlds: boolean }): Promise<{ entries: NativeEntry[] }>
  writeManagedTransfer(options: { path: string; base64: string; expected: { size: number; mtime: number } | null }): Promise<NativeEntry>
  installSnippet(options: { css: string }): Promise<{ path: string }>
  backup(): Promise<BackupInfo>
  listBackups(): Promise<{ backups: BackupInfo[] }>
  backupsPath(): Promise<{ path: string }>
  openFile(options: { path: string }): Promise<void>
  saveAs(options: { name: string; mime: string; base64: string }): Promise<{ name: string | null }>
  appVersion(): Promise<{ version: string }>
  setAgendaWidget(options: { items: { when: string; title: string }[] }): Promise<void>
  addListener(event: "change", listener: (data: { changes: NativeChange[] }) => void): Promise<PluginListenerHandle>
  addListener(event: "share", listener: (data: SharedItem) => void): Promise<PluginListenerHandle>
  addListener(event: "open", listener: (data: { route: string }) => void): Promise<PluginListenerHandle>
}

export const RunasVault = registerPlugin<RunasVaultPlugin>("RunasVault")

export function toBase64(bytes: Uint8Array): string {
  let binary = ""
  // Em pedaços: `String.fromCharCode(...bytes)` estoura a pilha com arquivos grandes.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Só passa `expected` quando foi dado (ausente = grava por cima; `null` = só cria), como no desktop. */
function withExpected<T extends object>(options: T, expected: Expected): T & { expected?: { mtime: number; size: number } | null } {
  return expected === undefined ? options : { ...options, expected: expected && { mtime: expected.mtime, size: expected.size } }
}

/** Lê os textos em lotes (a ponte do Capacitor leva tudo como JSON numa mensagem só). */
const READ_BATCH = 400

export function createCapacitorPlatform(): Platform {
  let root: string | null = null
  let saf = false
  const sources = new Map<string, string>()
  const remember = (info: NativeInfo | null) => {
    if (root !== (info?.path ?? null)) sources.clear()
    root = info?.path ?? null
    saf = info?.mode === "saf"
    return info
  }
  const rememberEntry = (entry: NativeEntry) => {
    if (entry.uri) sources.set(entry.path, entry.uri)
    return entry
  }
  const forget = (path: string) => {
    for (const key of sources.keys()) if (key === path || key.startsWith(path + "/")) sources.delete(key)
  }
  return {
    kind: "capacitor",
    vault: async () => remember((await RunasVault.current()).vault),
    chooseVault: async () => remember((await RunasVault.choose()).vault),
    createVault: async () => remember((await RunasVault.create()).vault),
    setWritable: async (writable) => remember((await RunasVault.setWritable({ writable })).vault),
    async listVault(prefix) {
      const { entries } = await RunasVault.list({ prefix: prefix ?? "" })
      for (const path of sources.keys()) if (!prefix || path.startsWith(prefix)) sources.delete(path)
      return entries.map(rememberEntry)
    },
    async readTexts(paths) {
      const out: Record<string, string> = {}
      for (let i = 0; i < paths.length; i += READ_BATCH) Object.assign(out, (await RunasVault.read({ paths: paths.slice(i, i + READ_BATCH) })).texts)
      return out
    },
    writeText: async (path, content, expected) => rememberEntry(await RunasVault.write(withExpected({ path, content }, expected))),
    createFolder: (path) => RunasVault.createFolder({ path }),
    rename: async (from, to) => { await RunasVault.rename({ from, to }); forget(from) },
    trash: async (path) => { await RunasVault.trash({ path }); forget(path) },
    watch(listener) {
      const handle = RunasVault.addListener("change", (data) => {
        for (const change of data.changes) {
          if (change.type === "changed") rememberEntry(change.entry)
          else forget(change.path)
        }
        listener(data.changes)
      })
      return () => void handle.then((h) => h.remove())
    },
    backup: () => RunasVault.backup(),
    listBackups: async () => (await RunasVault.listBackups()).backups,
    async revealBackups() {
      // O Android não abre a pasta do app num gerenciador de arquivos: o caminho vai para o aviso na tela.
      const { path } = await RunasVault.backupsPath()
      window.dispatchEvent(new CustomEvent("runas-codex:aviso", { detail: { title: "Backups", body: `Ficam em ${path} (zip com as notas).` } }))
    },
    fileUrl: (path) => {
      const source = saf ? sources.get(path) : root ? `${root}/${path}` : null
      return source ? Capacitor.convertFileSrc(source) : null
    },
    openFile: (path) => RunasVault.openFile({ path }),
    installSnippet: async (css) => (await RunasVault.installSnippet({ css })).path,
    async notify(title, body) {
      window.dispatchEvent(new CustomEvent("runas-codex:aviso", { detail: { title, body } }))
    },
    scheduleReminders: (reminders) => scheduleOnAndroid(reminders),
    onReminderOpen: onAndroidReminderOpen,
    saveFile: async (name, content, mime) => (await RunasVault.saveAs({ name, mime, base64: toBase64(new TextEncoder().encode(content)) })).name,
    async hostRoom(): Promise<RoomHostInfo> {
      throw new Error("Hospedar a sala pelo celular chega na etapa A2.")
    },
    async stopRoom() {},
    readBinary: async (path) => fromBase64((await RunasVault.readBinary({ path })).base64),
    writeBinary: async (path, bytes, expected) => rememberEntry(await RunasVault.writeBinary(withExpected({ path, base64: toBase64(bytes) }, expected))),
    saveBytes: async (name, bytes, mime) => (await RunasVault.saveAs({ name, mime, base64: toBase64(bytes) })).name,
    appVersion: async () => (await RunasVault.appVersion()).version,
    listTrash: async () => (await RunasVault.listTrash()).entries,
    restoreTrash: async (path, target) => rememberEntry(await RunasVault.restoreTrash({ path, target })),
    listTransferFiles: async (includeWorlds = true) => (await RunasVault.listTransferFiles({ includeWorlds })).entries.map(rememberEntry),
    writeManagedTransfer: async (path, bytes, expected) => rememberEntry(await RunasVault.writeManagedTransfer({ path, base64: toBase64(bytes), expected })),
  }
}
