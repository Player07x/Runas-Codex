import { lstat, readFile, realpath, unlink } from "node:fs/promises"
import { join, sep } from "node:path"
import { listVault, resolveInside, writeBinarySafe } from "./vault"
import type { VaultEntry } from "../shared/ipc"

async function source(root: string, path: string): Promise<string> {
  const parts = path.split("/")
  if (parts[0] !== ".trash" || parts.length < 2 || parts.some(p => !p || p === "." || p === ".." || /[\\\0]/.test(p))) throw new Error("Caminho de lixeira inválido.")
  let current = await realpath(root)
  for (const part of parts) { current = join(current, part); if ((await lstat(current)).isSymbolicLink()) throw new Error("A lixeira não pode conter links simbólicos.") }
  const full = await resolveInside(root, path)
  if (!full.startsWith(join(await realpath(root), ".trash") + sep) || !(await lstat(full)).isFile()) throw new Error("Escolha um arquivo da lixeira.")
  return full
}
export async function listTrash(root: string): Promise<VaultEntry[]> {
  const trash = join(await realpath(root), ".trash")
  try { if (!(await lstat(trash)).isDirectory() || (await lstat(trash)).isSymbolicLink()) return [] } catch { return [] }
  const entries = (await listVault(trash, "", true)).map(entry => ({ ...entry, path: ".trash/" + entry.path })).sort((a, b) => b.mtime - a.mtime)
  const safe: VaultEntry[] = []
  for (const entry of entries) { try { await source(root, entry.path); safe.push(entry) } catch { /* arquivo sumiu ou é um atalho */ } }
  return safe
}
export async function restoreTrash(root: string, path: string, target: string): Promise<VaultEntry> {
  const full = await source(root, path)
  const entry = await writeBinarySafe(root, target, new Uint8Array(await readFile(full)), null)
  // Só remove da lixeira depois de criar o destino; nunca substitui um arquivo existente.
  await unlink(full)
  return entry
}
