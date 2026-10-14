import { readdir, readFile, realpath, stat } from "node:fs/promises"
import { isAbsolute, join, resolve, sep } from "node:path"
import type { VaultEntry } from "../shared/ipc"

/** Erro com mensagem para o usuário (chega à interface sem o prefixo do Electron). */
export class VaultError extends Error {}

/**
 * Converte um caminho do cofre (`Pasta/Nota.md`) no caminho real do arquivo, sem nunca sair da pasta do cofre:
 * recusa caminhos absolutos, `..` e links simbólicos que apontam para fora.
 */
export async function resolveInside(root: string, path: string): Promise<string> {
  if (typeof path !== "string" || !path || path.includes("\0")) throw new VaultError("Caminho inválido.")
  const parts = path.split(/[\\/]/)
  if (isAbsolute(path) || /^[a-zA-Z]:/.test(path) || parts.includes("..")) throw new VaultError(`Caminho fora do cofre: ${path}`)
  const realRoot = await realpath(root)
  let real: string
  try {
    real = await realpath(resolve(realRoot, ...parts))
  } catch {
    throw new VaultError(`Arquivo não encontrado no cofre: ${path}`)
  }
  if (real !== realRoot && !real.startsWith(realRoot + sep)) throw new VaultError(`Caminho fora do cofre: ${path}`)
  return real
}

/**
 * Lista os arquivos do cofre de uma vez. Pastas com ponto (`.obsidian`, `.trash`, `.git`, `.runas`) ficam de fora,
 * como no Obsidian; links simbólicos não são seguidos (evita laços e saídas do cofre).
 */
export async function listVault(root: string, prefix = ""): Promise<VaultEntry[]> {
  const entries: VaultEntry[] = []
  const walk = async (dir: string, relDir: string): Promise<void> => {
    const items = await readdir(dir, { withFileTypes: true })
    await Promise.all(
      items.map(async (item) => {
        if (item.name.startsWith(".")) return
        const rel = relDir ? `${relDir}/${item.name}` : item.name
        const full = join(dir, item.name)
        if (item.isDirectory()) return walk(full, rel)
        if (!item.isFile()) return
        const info = await stat(full)
        entries.push({ path: rel, size: info.size, mtime: info.mtimeMs })
      }),
    )
  }
  await walk(await realpath(root), "")
  return entries.filter((entry) => entry.path.startsWith(prefix)).sort((a, b) => a.path.localeCompare(b.path, "pt-BR"))
}

/** Lê vários arquivos de texto num pedido só. Arquivos que sumiram ficam fora do resultado. */
export async function readTexts(root: string, paths: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const path of paths) {
    let real: string
    try {
      real = await resolveInside(root, path)
    } catch (error) {
      if (error instanceof VaultError && error.message.startsWith("Arquivo não encontrado")) continue
      throw error
    }
    result[path] = await readFile(real, "utf8")
  }
  return result
}
