import { createHash, randomBytes } from "node:crypto"
import { lstat, mkdir, readdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises"
import { basename, dirname, extname, isAbsolute, join, resolve, sep } from "node:path"
import { zipSync } from "fflate"
import type { BackupInfo, VaultEntry } from "../shared/ipc"

/** Erro com mensagem para o usuário (chega à interface sem o prefixo do Electron). */
export class VaultError extends Error {}

const fold = (path: string) => path.normalize("NFC").toLowerCase()

function splitVaultPath(path: string): string[] {
  if (typeof path !== "string" || !path || path.includes("\0")) throw new VaultError("Caminho inválido.")
  const parts = path.split(/[\\/]/)
  if (isAbsolute(path) || /^[a-zA-Z]:/.test(path) || parts.includes("..")) throw new VaultError(`Caminho fora do cofre: ${path}`)
  return parts.filter(Boolean)
}

const inside = (realRoot: string, real: string) => real === realRoot || real.startsWith(realRoot + sep)

/**
 * Converte um caminho do cofre (`Pasta/Nota.md`) no caminho real do arquivo, sem nunca sair da pasta do cofre:
 * recusa caminhos absolutos, `..` e links simbólicos que apontam para fora.
 */
export async function resolveInside(root: string, path: string): Promise<string> {
  const parts = splitVaultPath(path)
  const realRoot = await realpath(root)
  let real: string
  try {
    real = await realpath(resolve(realRoot, ...parts))
  } catch {
    throw new VaultError(`Arquivo não encontrado no cofre: ${path}`)
  }
  if (!inside(realRoot, real)) throw new VaultError(`Caminho fora do cofre: ${path}`)
  return real
}

/**
 * Caminho para criar ou gravar (o arquivo pode ainda não existir). Além das regras de leitura: nada dentro de
 * pastas com ponto (`.obsidian`, `.trash`…) e nada através de link simbólico.
 */
export async function resolveForWrite(root: string, path: string): Promise<string> {
  const parts = splitVaultPath(path)
  if (parts.some((part) => part.startsWith("."))) throw new VaultError(`O app não grava em pastas ou arquivos ocultos: ${path}`)
  const realRoot = await realpath(root)
  const full = resolve(realRoot, ...parts)
  // O ancestral mais próximo que existe precisa estar dentro do cofre.
  let ancestor = dirname(full)
  for (;;) {
    try {
      const real = await realpath(ancestor)
      if (!inside(realRoot, real)) throw new VaultError(`Caminho fora do cofre: ${path}`)
      break
    } catch (error) {
      if (error instanceof VaultError) throw error
      if (ancestor === realRoot || dirname(ancestor) === ancestor) throw new VaultError(`Caminho inválido: ${path}`)
      ancestor = dirname(ancestor)
    }
  }
  try {
    if ((await lstat(full)).isSymbolicLink()) throw new VaultError(`O app não grava através de links simbólicos: ${path}`)
  } catch (error) {
    if (error instanceof VaultError) throw error
  }
  return full
}

async function entryOf(full: string, path: string): Promise<VaultEntry> {
  const info = await stat(full)
  return { path, size: info.size, mtime: info.mtimeMs }
}

/**
 * Lista os arquivos do cofre de uma vez. Pastas com ponto (`.obsidian`, `.trash`, `.git`, `.runas`) ficam de fora,
 * como no Obsidian; links simbólicos não são seguidos (evita laços e saídas do cofre).
 */
export async function listVault(root: string, prefix = "", includeHidden = false): Promise<VaultEntry[]> {
  const entries: VaultEntry[] = []
  const walk = async (dir: string, relDir: string): Promise<void> => {
    const items = await readdir(dir, { withFileTypes: true })
    await Promise.all(
      items.map(async (item) => {
        if (item.name.startsWith(".") && !includeHidden) return
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

/** O arquivo no disco ainda é o que o app leu? (o Obsidian ou a sincronização podem ter mudado). */
export function sameVersion(current: { mtime: number; size: number }, expected: { mtime: number; size: number }): boolean {
  return current.size === expected.size && Math.abs(current.mtime - expected.mtime) < 2
}

/** Anexos (imagens, PDFs) maiores que isto não passam pela ponte da interface de uma vez. */
export const MAX_BINARY_SIZE = 100 * 1024 * 1024

/**
 * Grava um arquivo com segurança (texto ou bytes):
 * - `expected` = versão lida pelo app; se o arquivo mudou desde então, recusa (nada se perde);
 * - `expected === null` = só cria, recusa se já existir;
 * - conteúdo igual ao do disco não é regravado;
 * - grava num temporário e troca de uma vez (sem arquivo pela metade se faltar energia).
 */
async function writeSafe(root: string, path: string, content: string | Uint8Array, expected?: { mtime: number; size: number } | null): Promise<VaultEntry> {
  const full = await resolveForWrite(root, path)
  let current: VaultEntry | null = null
  try {
    current = await entryOf(full, path)
  } catch {
    current = null
  }
  if (expected === null && current) throw new VaultError(`Já existe “${path}”.`)
  if (expected && (!current || !sameVersion(current, expected))) throw new VaultError(`“${path}” mudou fora do app (por exemplo, no Obsidian). Recarregue antes de gravar.`)
  if (current) {
    const same = typeof content === "string" ? (await readFile(full, "utf8")) === content : current.size === content.byteLength && Buffer.from(content).equals(await readFile(full))
    if (same) return current
  }
  await mkdir(dirname(full), { recursive: true })
  const temp = join(dirname(full), `.${basename(full)}.${randomBytes(4).toString("hex")}.runas-tmp`)
  try {
    if (typeof content === "string") await writeFile(temp, content, "utf8")
    else await writeFile(temp, content)
    await rename(temp, full)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
  return entryOf(full, path)
}

/** Grava um arquivo de texto com segurança (as regras de `writeSafe`). */
export function writeTextSafe(root: string, path: string, content: string, expected?: { mtime: number; size: number } | null): Promise<VaultEntry> {
  return writeSafe(root, path, content, expected)
}

/** Grava um anexo (imagem, PDF…) com as mesmas regras do texto. */
export async function writeBinarySafe(root: string, path: string, bytes: Uint8Array, expected?: { mtime: number; size: number } | null): Promise<VaultEntry> {
  if (bytes.byteLength > MAX_BINARY_SIZE) throw new VaultError(`“${path}” passa de ${MAX_BINARY_SIZE / 1024 / 1024} MB.`)
  return writeSafe(root, path, bytes, expected)
}

/** Lê um arquivo do cofre como bytes (as mesmas regras de leitura do texto). */
export async function readBinary(root: string, path: string): Promise<Uint8Array> {
  const real = await resolveInside(root, path)
  if ((await stat(real)).size > MAX_BINARY_SIZE) throw new VaultError(`“${path}” passa de ${MAX_BINARY_SIZE / 1024 / 1024} MB.`)
  return new Uint8Array(await readFile(real))
}

export async function createFolder(root: string, path: string): Promise<void> {
  await mkdir(await resolveForWrite(root, path), { recursive: true })
}

/** Renomeia ou move arquivo ou pasta. Trocar só maiúsculas passa por um nome temporário (Windows e Android). */
export async function renamePath(root: string, from: string, to: string): Promise<void> {
  const source = await resolveInside(root, from)
  if (from.split(/[\\/]/).some((part) => part.startsWith("."))) throw new VaultError(`O app não mexe em arquivos ocultos: ${from}`)
  const target = await resolveForWrite(root, to)
  const caseOnly = fold(source) === fold(target) && source !== target
  let exists = false
  try {
    await lstat(target)
    exists = true
  } catch {
    exists = false
  }
  if (exists && !caseOnly) throw new VaultError(`Já existe “${to}”.`)
  await mkdir(dirname(target), { recursive: true })
  if (caseOnly) {
    const temp = `${target}.${randomBytes(4).toString("hex")}.runas-tmp`
    await rename(source, temp)
    await rename(temp, target)
  } else await rename(source, target)
}

/** Manda para a lixeira do cofre (`.trash`, a mesma do Obsidian), sem apagar. Devolve o caminho na lixeira. */
export async function trashPath(root: string, path: string): Promise<string> {
  const source = await resolveInside(root, path)
  const trash = join(await realpath(root), ".trash")
  await mkdir(trash, { recursive: true })
  const ext = extname(source)
  const stem = basename(source, ext)
  for (let n = 0; ; n++) {
    const name = n === 0 ? `${stem}${ext}` : `${stem} ${n}${ext}`
    try {
      await lstat(join(trash, name))
    } catch {
      await rename(source, join(trash, name))
      return `.trash/${name}`
    }
  }
}

/** Pastas dos espaços de um cofre novo do Runas-Codex. */
export const SPACE_FOLDERS = ["Notas", "Agenda", "Wikis", "Campanhas", "Livros", "Mesas"]

/** Prepara uma pasta como cofre do Runas-Codex (e do Obsidian), sem apagar nem sobrescrever nada. */
export async function createVault(root: string): Promise<void> {
  for (const folder of SPACE_FOLDERS) await mkdir(join(root, folder), { recursive: true })
  await mkdir(join(root, ".obsidian"), { recursive: true })
  try {
    await writeFile(join(root, ".obsidian", "app.json"), JSON.stringify({ newLinkFormat: "shortest", useMarkdownLinks: false, alwaysUpdateLinks: true }, null, 2) + "\n", { flag: "wx" })
  } catch {
    /* já existe: fica como está */
  }
}

// ---------- Backups ----------

const BACKUP_TEXT = /\.(md|canvas|base)$/i

/** Pasta de backups de um cofre: fora do cofre, para não ir para a sincronização nem para o Obsidian. */
export function backupFolder(backupsRoot: string, vaultRoot: string): string {
  return join(backupsRoot, createHash("sha1").update(resolve(vaultRoot)).digest("hex").slice(0, 12))
}

/**
 * Backup das notas (texto: `.md`, `.canvas`, `.base` e as configurações do `.obsidian`) num zip com data. Anexos
 * (imagens, PDFs, áudio) ficam de fora: são grandes e o app não os altera. Guarda os `keep` mais recentes.
 */
export async function backupVault(vaultRoot: string, folder: string, keep = 15): Promise<BackupInfo> {
  const files: Record<string, Uint8Array> = {}
  for (const entry of await listVault(vaultRoot, "", true)) {
    const hidden = entry.path.split("/").some((part) => part.startsWith("."))
    const obsidianConfig = entry.path.startsWith(".obsidian/") && entry.path.endsWith(".json") && !/workspace/.test(entry.path)
    if ((!hidden && BACKUP_TEXT.test(entry.path)) || obsidianConfig) files[entry.path] = await readFile(join(await realpath(vaultRoot), ...entry.path.split("/")))
  }
  const zip = zipSync(files, { level: 6, mtime: new Date() })
  await mkdir(folder, { recursive: true })
  const createdAt = Date.now()
  const id = new Date(createdAt).toISOString().replace(/[:.]/g, "-")
  await writeFile(join(folder, `${id}.zip`), zip)
  const all = await listBackups(folder)
  for (const old of all.slice(keep)) await rm(join(folder, `${old.id}.zip`), { force: true })
  return { id, createdAt, files: Object.keys(files).length, size: zip.length }
}

export async function listBackups(folder: string): Promise<BackupInfo[]> {
  let names: string[] = []
  try {
    names = await readdir(folder)
  } catch {
    return []
  }
  const backups = await Promise.all(
    names
      .filter((name) => name.endsWith(".zip"))
      .map(async (name) => {
        const info = await stat(join(folder, name))
        return { id: name.slice(0, -4), createdAt: info.mtimeMs, files: 0, size: info.size }
      }),
  )
  return backups.sort((a, b) => b.createdAt - a.createdAt)
}
