import type { BackupInfo, Platform, RoomHostInfo, VaultChange, VaultEntry, VaultInfo } from "./platform"
import { ALL_NOTES } from "../lib/links"
import { DEMO_ASSETS, DEMO_TEXT_FILES } from "../data/demo-vault"

/**
 * Plataforma em memória: o cofre de exemplo do navegador (e dos testes). Aceita gravar, mas nada vai para o disco —
 * recarregar a página volta ao exemplo. Segue as mesmas regras da plataforma real (versão esperada, lixeira…).
 */
export function createMemoryPlatform(onNotify?: (title: string, body: string) => void): Platform {
  const files = new Map<string, { content: string; mtime: number }>([
    ...ALL_NOTES.map((n) => [n.path, { content: n.markdown, mtime: Date.parse(n.updated) }] as const),
    ...Object.entries(DEMO_TEXT_FILES).map(([path, content]) => [path, { content, mtime: Date.parse("2026-10-14T09:00:00") }] as const),
    // Anexos: só o nome entra no cofre; a imagem vem empacotada com o app (`fileUrl`).
    ...Object.keys(DEMO_ASSETS).map((path) => [path, { content: "", mtime: Date.parse("2026-10-14T09:00:00") }] as const),
  ])
  const listeners = new Set<(changes: VaultChange[]) => void>()
  const backups: BackupInfo[] = []
  let vault: VaultInfo = { name: "Mesa do João (exemplo)", path: "Exemplo em memória — nada é salvo", readOnly: false }
  let clock = Date.now()
  const entry = (path: string): VaultEntry => {
    const file = files.get(path)!
    return { path, size: new TextEncoder().encode(file.content).length, mtime: file.mtime }
  }
  const hidden = (path: string) => path.split("/").some((part) => part.startsWith("."))
  const ensureWritable = (path: string) => {
    if (vault.readOnly) throw new Error("Cofre em somente leitura. Libere a gravação em Configurações › Cofre.")
    if (hidden(path) || path.split("/").includes("..")) throw new Error(`O app não grava em pastas ou arquivos ocultos: ${path}`)
  }
  return {
    kind: "memory",
    async vault() {
      return vault
    },
    async chooseVault() {
      return vault
    },
    async createVault() {
      return vault
    },
    async setWritable(writable) {
      vault = { ...vault, readOnly: !writable }
      return vault
    },
    async listVault(prefix = "") {
      return [...files.keys()].filter((p) => p.startsWith(prefix) && !hidden(p)).sort().map(entry)
    },
    async readTexts(paths) {
      return Object.fromEntries(paths.filter((p) => files.has(p)).map((p) => [p, files.get(p)!.content]))
    },
    async writeText(path, content, expected) {
      ensureWritable(path)
      const current = files.has(path) ? entry(path) : null
      if (expected === null && current) throw new Error(`Já existe “${path}”.`)
      if (expected && (!current || current.mtime !== expected.mtime || current.size !== expected.size)) {
        throw new Error(`“${path}” mudou fora do app (por exemplo, no Obsidian). Recarregue antes de gravar.`)
      }
      if (current && files.get(path)!.content === content) return current
      files.set(path, { content, mtime: (clock = Math.max(clock + 1, Date.now())) })
      return entry(path)
    },
    async createFolder(path) {
      ensureWritable(path)
    },
    async rename(from, to) {
      ensureWritable(to)
      const moved = [...files.keys()].filter((p) => p === from || p.startsWith(from + "/"))
      if (!moved.length) throw new Error(`Arquivo não encontrado no cofre: ${from}`)
      const caseOnly = from.toLowerCase() === to.toLowerCase()
      if (!caseOnly && [...files.keys()].some((p) => p === to || p.startsWith(to + "/"))) throw new Error(`Já existe “${to}”.`)
      for (const path of moved) {
        const file = files.get(path)!
        files.delete(path)
        files.set(to + path.slice(from.length), file)
      }
    },
    async trash(path) {
      ensureWritable(path)
      for (const p of [...files.keys()]) if (p === path || p.startsWith(path + "/")) files.delete(p)
    },
    watch(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async backup() {
      const info = { id: new Date().toISOString(), createdAt: Date.now(), files: files.size, size: [...files.values()].reduce((n, f) => n + f.content.length, 0) }
      backups.unshift(info)
      return info
    },
    async listBackups() {
      return backups
    },
    async revealBackups() {
      onNotify?.("Backups", "No exemplo em memória os backups não vão para o disco.")
    },
    fileUrl(path) {
      return DEMO_ASSETS[path] ?? null
    },
    async openFile(path) {
      onNotify?.("Anexos", `No exemplo do navegador, “${path}” não abre fora do app.`)
    },
    async installSnippet() {
      return ".obsidian/snippets/runas-codex.css"
    },
    async notify(title, body) {
      onNotify?.(title, body)
    },
    async hostRoom(): Promise<RoomHostInfo> {
      return { lanUrl: "http://192.168.0.12:30000/?k=8f2c9a71", code: "K7QM-2XPA" }
    },
    async stopRoom() {},
  }
}
