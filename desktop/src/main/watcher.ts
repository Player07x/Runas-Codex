import { watch, type FSWatcher } from "node:fs"
import { realpath, stat } from "node:fs/promises"
import { join } from "node:path"
import type { VaultChange, VaultEntry } from "../shared/ipc"
import { listVault, sameVersion } from "./vault"

/**
 * Observa o cofre e junta as mudanças feitas fora do app (Obsidian, Syncthing…) em lotes. Pastas e arquivos com
 * ponto ficam de fora (inclusive os temporários do próprio app). O que o app acabou de gravar não volta como mudança.
 */
export class VaultWatcher {
  private watcher: FSWatcher | null = null
  private pending = new Set<string>()
  private timer: NodeJS.Timeout | null = null
  private readonly ownWrites = new Map<string, { mtime: number; size: number; at: number }>()

  constructor(
    private readonly root: string,
    private readonly onChanges: (changes: VaultChange[]) => void,
    private readonly delay = 250,
  ) {}

  async start(): Promise<void> {
    const realRoot = await realpath(this.root)
    this.watcher = watch(realRoot, { recursive: true }, (_event, filename) => {
      if (!filename) return
      const path = filename.toString().split(/[\\/]/).join("/")
      if (path.split("/").some((part) => part.startsWith("."))) return
      this.pending.add(path)
      if (this.timer) clearTimeout(this.timer)
      this.timer = setTimeout(() => void this.flush(realRoot), this.delay)
    })
    this.watcher.on("error", () => this.stop())
  }

  /** Registra uma gravação do próprio app, para não avisá-la como mudança externa. */
  remember(entry: VaultEntry): void {
    this.ownWrites.set(entry.path, { mtime: entry.mtime, size: entry.size, at: Date.now() })
  }

  /** Esquece um caminho que o app removeu ou moveu (para não avisar a remoção). */
  forget(path: string): void {
    this.ownWrites.set(path, { mtime: -1, size: -1, at: Date.now() })
  }

  private async flush(realRoot: string): Promise<void> {
    const paths = [...this.pending]
    this.pending.clear()
    const changes: VaultChange[] = []
    const now = Date.now()
    for (const [path, own] of this.ownWrites) if (now - own.at > 5000) this.ownWrites.delete(path)
    for (const path of paths) {
      const own = this.ownWrites.get(path)
      try {
        const info = await stat(join(realRoot, ...path.split("/")))
        if (info.isDirectory()) {
          // Pasta nova (ou movida para dentro): avisa cada arquivo dela.
          for (const entry of await listVault(realRoot, path + "/")) changes.push({ type: "changed", entry })
          continue
        }
        const entry = { path, size: info.size, mtime: info.mtimeMs }
        if (own && sameVersion(entry, own)) continue
        changes.push({ type: "changed", entry })
      } catch {
        if (own && own.mtime === -1) continue
        changes.push({ type: "deleted", path })
      }
    }
    if (changes.length) this.onChanges(changes)
  }

  stop(): void {
    this.watcher?.close()
    this.watcher = null
    if (this.timer) clearTimeout(this.timer)
  }
}
