import { execFile } from "node:child_process"
import { isAbsolute } from "node:path"
import { promisify } from "node:util"

const execute = promisify(execFile)
type RunInstaller = (file: string, args: string[]) => Promise<unknown>

/** O polkit pede autorização na sessão gráfica; o aplicativo continua sem privilégios. */
export async function installDeb(file: string, run: RunInstaller = (command, args) => execute(command, args, { maxBuffer: 1024 * 1024 })): Promise<void> {
  if (!isAbsolute(file) || !file.endsWith(".deb")) throw new Error("Pacote de atualização inválido.")
  try {
    // Sem shell, remoções ou downloads adicionais. Só instala o pacote já conferido pelo SHA-256.
    await run("/usr/bin/pkexec", ["--disable-internal-agent", "/usr/bin/apt-get", "--assume-yes", "--no-remove", "--no-download", "-o", "Dpkg::Lock::Timeout=60", "install", "--", file])
  } catch (error) {
    const failure = error as { code?: string | number; stderr?: string }
    if (failure.code === 126) throw new Error("Instalação cancelada na autorização do sistema. O aplicativo continua aberto.")
    if (failure.code === 127 || failure.code === "ENOENT") throw new Error("Não foi possível obter autorização do sistema. Confira se o pkexec e o agente de autenticação do Ubuntu estão disponíveis.")
    const detail = failure.stderr?.trim().slice(-2000)
    throw new Error(`O sistema não concluiu a instalação. O aplicativo continua aberto.${detail ? `\n${detail}` : ""}`)
  }
}
