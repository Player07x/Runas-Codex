import { lstat, mkdir, realpath } from "node:fs/promises"
import { join, sep } from "node:path"
import { managedWorldPath } from "../../../app/src/core/transfer/archive"
import type { VaultEntry } from "../shared/ipc"
import { listVault, writeBinarySafe } from "./vault"

/** A área interna de mesas é tratada como um subcofre; não libera escrita genérica em pastas ocultas. */
async function worldsRoot(root: string, create: boolean): Promise<string | null> {
  const base = await realpath(root)
  let folder = base
  for (const name of [".runas", "mesas"]) {
    folder = join(folder, name)
    let info
    try { info = await lstat(folder) }
    catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") throw error
      if (!create) return null
      try { await mkdir(folder) }
      catch (error) { if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EEXIST") throw error }
      info = await lstat(folder)
    }
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error("A pasta de mesas não pode ser um link simbólico ou arquivo.")
    folder = await realpath(folder)
    if (!folder.startsWith(base + sep)) throw new Error("A pasta de mesas fica fora do cofre.")
  }
  return folder
}

export async function listTransferFiles(root: string, includeWorlds = true): Promise<VaultEntry[]> {
  const files = await listVault(root)
  if (includeWorlds) {
    const folder = await worldsRoot(root, false)
    if (folder) for (const entry of await listVault(folder)) {
      const path = ".runas/mesas/" + entry.path
      if (managedWorldPath(path)) files.push({ ...entry, path })
    }
  }
  return files.sort((a, b) => a.path.localeCompare(b.path, "pt-BR"))
}

export async function writeManagedTransfer(root: string, path: string, bytes: Uint8Array, expected: { size: number; mtime: number } | null): Promise<VaultEntry> {
  const relative = managedWorldPath(path)
  if (!relative || expected === undefined) throw new Error("Caminho ou versão inválida para importar os dados da mesa.")
  const folder = await worldsRoot(root, true)
  const entry = await writeBinarySafe(folder!, relative, bytes, expected)
  return { ...entry, path }
}
