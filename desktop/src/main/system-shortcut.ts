import { execFile } from "node:child_process"
import { homedir } from "node:os"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

export type SystemShortcutDesktop = "gnome" | "kde" | null
export interface SystemShortcutStatus { supported: boolean; registered: boolean; desktop: SystemShortcutDesktop }

const GNOME_SCHEMA = "org.gnome.settings-daemon.plugins.media-keys"
const GNOME_ROOT = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings"
const GNOME_PATH = `${GNOME_ROOT}/runas-codex/`
const GNOME_COMMAND = "runas-codex --captura"
const KDE_FILE = join(homedir(), ".local", "share", "applications", "runas-codex.desktop")

function desktop(): SystemShortcutDesktop {
  if (process.platform !== "linux") return null
  const current = process.env.XDG_CURRENT_DESKTOP?.toLowerCase() ?? ""
  if (current.includes("gnome")) return "gnome"
  if (current.includes("kde") || process.env.KDE_FULL_SESSION) return "kde"
  return null
}

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => execFile(command, args, { encoding: "utf8" }, (error, stdout) => error ? reject(error) : resolve(stdout)))
}

function quoteGsettings(values: string[]): string {
  return `[${values.map((value) => `'${value.replace(/'/g, "\\'")}'`).join(", ")}]`
}

export function parseGnomePaths(value: string): string[] {
  return [...value.matchAll(/'([^']+)'/g)].map((match) => match[1]!).filter((path) => path.startsWith(`${GNOME_ROOT}/`))
}

async function gnomePaths(): Promise<string[]> {
  const value = await run("gsettings", ["get", GNOME_SCHEMA, "custom-keybindings"])
  return parseGnomePaths(value)
}

async function createGnome(): Promise<void> {
  const paths = await gnomePaths()
  if (!paths.includes(GNOME_PATH)) await run("gsettings", ["set", GNOME_SCHEMA, "custom-keybindings", quoteGsettings([...paths, GNOME_PATH])])
  const schema = `${GNOME_SCHEMA}.custom-keybinding:${GNOME_PATH}`
  await run("gsettings", ["set", schema, "name", "Runas-Codex — captura rápida"])
  await run("gsettings", ["set", schema, "command", GNOME_COMMAND])
  await run("gsettings", ["set", schema, "binding", "<Control><Alt>n"])
}

async function removeGnome(): Promise<void> {
  const paths = await gnomePaths()
  if (paths.includes(GNOME_PATH)) await run("gsettings", ["set", GNOME_SCHEMA, "custom-keybindings", quoteGsettings(paths.filter((path) => path !== GNOME_PATH))])
}

async function createKde(): Promise<void> {
  const path = KDE_FILE
  await mkdir(dirname(path), { recursive: true })
  const desktopFile = `[Desktop Entry]\nType=Application\nName=Runas-Codex\nExec=runas-codex %U\nActions=Captura;\n\n[Desktop Action Captura]\nName=Captura rápida\nExec=runas-codex --captura\n`
  await writeFile(path, desktopFile, { mode: 0o644 })
}

async function removeKde(): Promise<void> { await rm(KDE_FILE, { force: true }) }

export async function systemShortcut(): Promise<SystemShortcutStatus> {
  const current = desktop()
  if (!current) return { supported: false, registered: false, desktop: null }
  try {
    if (current === "gnome") {
      const paths = await gnomePaths()
      return { supported: true, registered: paths.includes(GNOME_PATH), desktop: current }
    }
    await readFile(KDE_FILE)
    return { supported: true, registered: true, desktop: current }
  } catch {
    return { supported: true, registered: false, desktop: current }
  }
}

export async function createSystemShortcut(): Promise<SystemShortcutStatus> {
  const current = desktop()
  if (!current) throw new Error("O atalho do sistema está disponível apenas no GNOME ou KDE do Linux.")
  if (current === "gnome") await createGnome()
  else await createKde()
  return { supported: true, registered: true, desktop: current }
}

export async function removeSystemShortcut(): Promise<SystemShortcutStatus> {
  const current = desktop()
  if (!current) return { supported: false, registered: false, desktop: null }
  if (current === "gnome") await removeGnome()
  else await removeKde()
  return { supported: true, registered: false, desktop: current }
}
