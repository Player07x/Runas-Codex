import type { Platform, RoomHostInfo, VaultEntry, VaultInfo } from "./platform"
import { ALL_NOTES } from "../lib/links"

/**
 * Plataforma em memória: usada pelo protótipo e pelos testes. Nada é gravado em disco;
 * as notas de exemplo fazem o papel do cofre.
 */
export function createMemoryPlatform(onNotify?: (title: string, body: string) => void): Platform {
  const files = new Map<string, { content: string; mtime: number }>(ALL_NOTES.map((n) => [n.path, { content: n.markdown, mtime: Date.parse(n.updated) }]))
  const entry = (path: string): VaultEntry => {
    const file = files.get(path)!
    return { path, size: new TextEncoder().encode(file.content).length, mtime: file.mtime }
  }
  const vault: VaultInfo = { name: "Mesa do João", path: "Exemplo em memória", readOnly: false }
  return {
    kind: "memory",
    async vault() {
      return vault
    },
    async chooseVault() {
      return vault
    },
    async listVault(prefix = "") {
      return [...files.keys()].filter((p) => p.startsWith(prefix)).map(entry)
    },
    async readTexts(paths) {
      return Object.fromEntries(paths.filter((p) => files.has(p)).map((p) => [p, files.get(p)!.content]))
    },
    async writeText(path, content, expectedMtime) {
      const current = files.get(path)
      if (current && expectedMtime !== undefined && current.mtime !== expectedMtime) {
        throw new Error(`“${path}” mudou fora do app (por exemplo, no Obsidian). Recarregue antes de gravar.`)
      }
      if (current?.content === content) return entry(path)
      files.set(path, { content, mtime: Date.now() })
      return entry(path)
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
