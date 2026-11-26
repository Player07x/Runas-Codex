import { spawn } from "node:child_process"
import { mkdirSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

interface SmokeApp {
  commandLine: { hasSwitch(name: string): boolean }
  getPath(name: "userData"): string
  setPath(name: "userData" | "sessionData" | "temp", path: string): void
}

export interface SmokeEnvironment {
  root: string
  profile: string
  temporaryProfile: boolean
}

/** Antes do dicionário e do Chromium: cada smoke usa só os seus temporários. */
export function configureSmokeEnvironment(app: SmokeApp, args = process.argv, env = process.env): SmokeEnvironment | null {
  if (!args.includes("--smoke")) return null
  const root = mkdtempSync(join(tmpdir(), "runas-smoke-"))
  const temporary = join(root, "tmp")
  mkdirSync(temporary)
  const temporaryProfile = !app.commandLine.hasSwitch("user-data-dir")
  const profile = temporaryProfile ? join(root, "perfil") : app.getPath("userData")
  if (temporaryProfile) {
    mkdirSync(profile)
    app.setPath("userData", profile)
    app.setPath("sessionData", profile)
  }
  // As exportações e a cópia gravável já usam os.tmpdir(); ficam sob esta raiz, inclusive com perfil explícito.
  env.TMPDIR = temporary
  env.TMP = temporary
  env.TEMP = temporary
  app.setPath("temp", temporary)
  return { root, profile, temporaryProfile }
}

/**
 * Espera o processo sair: no Windows, o Chromium mantém arquivos do perfil abertos até esse momento.
 *
 * No Linux, `kill(pid, 0)` também tem sucesso num zumbi. No CI o app saía deixando o processo principal como zumbi
 * com uma thread presa (`Zl`): o canal do IPC não fechava e a espera não terminava nunca. Por isso o estado vem do
 * `/proc/<pid>/stat` (Z ou X é saída), a hora de início separa o pai de outro processo que herde o PID, e a
 * conferência roda desde o começo; o `disconnect` só a antecipa.
 */
export const SMOKE_CLEANUP_SCRIPT = `
const { readFileSync } = require("node:fs")
const { rm } = require("node:fs/promises")
const root = process.argv[1]
const parent = Number(process.argv[2])
function procStat(pid) {
  try {
    const text = readFileSync("/proc/" + pid + "/stat", "utf8")
    const fields = text.slice(text.lastIndexOf(")") + 2).split(" ")
    return { state: fields[0], start: fields[19] }
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ESRCH") return null
    throw error
  }
}
const proc = process.platform === "linux" && procStat(process.pid) !== null
const started = proc ? procStat(parent)?.start : undefined
function parentAlive() {
  if (proc) {
    const stat = procStat(parent)
    return stat !== null && stat.state !== "Z" && stat.state !== "X" && stat.start === started
  }
  try { process.kill(parent, 0); return true }
  catch (error) { if (error.code === "ESRCH") return false; throw error }
}
let cleaning = false, timer
function check() {
  clearTimeout(timer)
  if (cleaning) return
  try {
    if (parentAlive()) return void (timer = setTimeout(check, 50))
  } catch { process.exit(1) }
  cleaning = true
  rm(root, { recursive: true, force: true, maxRetries: 30, retryDelay: 100 }).then(() => process.exit(0), () => process.exit(1))
}
process.once("disconnect", check)
check()
`

/** Sem shell nem varredura de /tmp: remove apenas a pasta criada por esta execução. */
export function startSmokeCleanup(environment: SmokeEnvironment): void {
  const child = spawn(process.execPath, ["-e", SMOKE_CLEANUP_SCRIPT, environment.root, String(process.pid)], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    detached: true,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  })
  child.on("error", error => console.error("Não foi possível iniciar a limpeza do smoke:", error))
  child.unref()
  child.channel?.unref()
}
