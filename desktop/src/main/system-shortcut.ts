import { execFile } from "node:child_process"
import { homedir } from "node:os"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

export type SystemShortcutDesktop = "gnome" | "kde" | null
export interface SystemShortcutStatus { supported: boolean; registered: boolean; desktop: SystemShortcutDesktop }

const GNOME_SCHEMA = "org.gnome.settings-daemon.plugins.media-keys"
const GNOME_ROOT = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings"
const GNOME_PATH = `${GNOME_ROOT}/runas-codex/`
const DESKTOP_NAME = "runas-codex.desktop"
const KDE_FILE = join(homedir(), ".local", "share", "applications", DESKTOP_NAME)
/** Cópia de um `.desktop` que a pessoa já tinha na pasta dela, devolvida ao remover o atalho. */
const KDE_BACKUP = `${KDE_FILE}.antes-da-captura`
/** Marca do `.desktop` escrito pelo app: só esse ele altera ou apaga. */
export const CAPTURE_MARK = "X-Runas-Codex-Captura=true"

/** Como chamar o app: o AppImage pelo caminho dele (não fica no PATH); o .deb pelo `runas-codex` de /usr/bin. */
export function launcher(env: NodeJS.ProcessEnv = process.env): string {
  return env.APPIMAGE ? `"${env.APPIMAGE.replace(/(["\\`$])/g, "\\$1")}"` : "runas-codex"
}

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
  await run("gsettings", ["set", schema, "command", `${launcher()} --captura`])
  await run("gsettings", ["set", schema, "binding", "<Control><Alt>n"])
}

async function removeGnome(): Promise<void> {
  const paths = await gnomePaths()
  if (paths.includes(GNOME_PATH)) await run("gsettings", ["set", GNOME_SCHEMA, "custom-keybindings", quoteGsettings(paths.filter((path) => path !== GNOME_PATH))])
}

/**
 * O `.desktop` com a ação “Captura rápida” do KDE. Ele substitui, na pasta da pessoa, o do instalador (mesmo nome), então
 * parte de uma cópia dele: ícone, `runas://` (MimeType) e o resto continuam. Sem `.desktop` instalado (AppImage), monta
 * um completo. A ação chama o mesmo programa da entrada principal, com `--captura`.
 */
export function kdeDesktopFile(base: string | null, command = launcher()): string {
  const action = (exec: string) => `[Desktop Action Captura]\nName=Captura rápida\nExec=${exec} --captura\n`
  if (!base) {
    return ["[Desktop Entry]", "Type=Application", "Name=Runas-Codex", `Exec=${command} %U`, "Icon=runas-codex", "Terminal=false",
      "Categories=Office;", "MimeType=x-scheme-handler/runas;", "StartupWMClass=runas-codex", "Actions=Captura;", CAPTURE_MARK, "", action(command)].join("\n")
  }
  // Tira uma ação Captura de antes e a marca, para refazer as duas.
  const lines = base.replace(/\r\n?/g, "\n").replace(/\n\[Desktop Action Captura\][\s\S]*?(?=\n\[|$)/, "").split("\n").filter((line) => line !== CAPTURE_MARK)
  const start = lines.findIndex((line) => line.trim() === "[Desktop Entry]")
  if (start < 0) return kdeDesktopFile(null, command)
  const next = lines.findIndex((line, i) => i > start && /^\[.*\]\s*$/.test(line))
  const end = next < 0 ? lines.length : next
  const entry = lines.slice(start, end)
  const exec = entry.find((line) => line.startsWith("Exec="))?.slice(5).replace(/\s+%[a-zA-Z]/g, "").trim() || command
  const actionsAt = entry.findIndex((line) => line.startsWith("Actions="))
  if (actionsAt < 0) entry.push("Actions=Captura;")
  else if (!entry[actionsAt]!.split(/[=;]/).includes("Captura")) entry[actionsAt] = `${entry[actionsAt]!.replace(/;?\s*$/, ";")}Captura;`
  while (entry.length && !entry.at(-1)!.trim()) entry.pop()
  entry.push(CAPTURE_MARK)
  const rest = lines.slice(end).join("\n").trim()
  return `${[...lines.slice(0, start), ...entry].join("\n")}\n\n${rest ? `${rest}\n\n` : ""}${action(exec)}`
}

/** O `.desktop` do instalador (.deb), nas pastas de dados do sistema. */
async function installedDesktop(): Promise<string | null> {
  const dirs = (process.env.XDG_DATA_DIRS || "/usr/local/share:/usr/share").split(":").filter(Boolean)
  for (const dir of dirs) {
    try { return await readFile(join(dir, "applications", DESKTOP_NAME), "utf8") } catch { /* tenta a próxima */ }
  }
  return null
}

const readText = (path: string) => readFile(path, "utf8").catch(() => null)

async function createKde(): Promise<void> {
  await mkdir(dirname(KDE_FILE), { recursive: true })
  const own = await readText(KDE_FILE)
  // Um `.desktop` da pessoa (sem a marca) é guardado e vira a base; o do app é refeito a partir do instalado.
  if (own !== null && !own.includes(CAPTURE_MARK) && (await readText(KDE_BACKUP)) === null) await writeFile(KDE_BACKUP, own, { mode: 0o644 })
  const base = own !== null && !own.includes(CAPTURE_MARK) ? own : (await readText(KDE_BACKUP)) ?? (await installedDesktop())
  await writeFile(KDE_FILE, kdeDesktopFile(base), { mode: 0o644 })
}

async function removeKde(): Promise<void> {
  const own = await readText(KDE_FILE)
  if (own === null || !own.includes(CAPTURE_MARK)) return
  // Devolve o arquivo que a pessoa tinha; sem ele, o do instalador volta a valer.
  if ((await readText(KDE_BACKUP)) !== null) await rename(KDE_BACKUP, KDE_FILE)
  else await rm(KDE_FILE, { force: true })
}

export async function systemShortcut(): Promise<SystemShortcutStatus> {
  const current = desktop()
  if (!current) return { supported: false, registered: false, desktop: null }
  try {
    if (current === "gnome") {
      const paths = await gnomePaths()
      return { supported: true, registered: paths.includes(GNOME_PATH), desktop: current }
    }
    return { supported: true, registered: Boolean((await readText(KDE_FILE))?.includes(CAPTURE_MARK)), desktop: current }
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
