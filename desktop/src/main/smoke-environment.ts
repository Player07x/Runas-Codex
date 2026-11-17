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

/** Espera o processo sair: no Windows, o Chromium mantém arquivos do perfil abertos até esse momento. */
export const SMOKE_CLEANUP_SCRIPT = `
const { rm } = require("node:fs/promises")
const root = process.argv[1]
const parent = Number(process.argv[2])
async function cleanup() {
  while (true) {
    try { process.kill(parent, 0) }
    catch (error) { if (error.code === "ESRCH") break; throw error }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  await rm(root, { recursive: true, force: true, maxRetries: 30, retryDelay: 100 })
}
if (process.connected) process.once("disconnect", () => { void cleanup().catch(() => process.exit(1)) })
else void cleanup().catch(() => process.exit(1))
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
