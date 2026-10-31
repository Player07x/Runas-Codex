import { execFile } from "node:child_process"
import { isAbsolute, join } from "node:path"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { promisify } from "node:util"

const execute = promisify(execFile)
type RunInstaller = (file: string, args: string[]) => Promise<unknown>
/** Lê o pacote (`dpkg-deb`) e o estado instalado (`dpkg-query`), sem privilégio. */
export type ReadPackage = (command: string, args: string[]) => Promise<string>

const readCommand: ReadPackage = async (command, args) => (await execute(command, args, { maxBuffer: 1024 * 1024 })).stdout

/**
 * O polkit pede autorização na sessão gráfica; o aplicativo continua sem privilégios.
 *
 * O `apt-get` sai com erro também quando **outro** pacote do sistema está pela metade (a pós-instalação dele falha a
 * cada `apt-get`): o Runas-Codex instala, mas o `dpkg` devolve 1. Por isso, depois de uma falha, o app confere se a
 * versão do pacote baixado ficou instalada; se ficou, a atualização valeu e o erro é só do outro pacote.
 */
export async function installDeb(file: string, run: RunInstaller = (command, args) => execute(command, args, { maxBuffer: 4 * 1024 * 1024 }), read: ReadPackage = readCommand): Promise<{ warning?: string }> {
  if (!isAbsolute(file) || !file.endsWith(".deb")) throw new Error("Pacote de atualização inválido.")
  const expected = await packageOf(file, read)
  const profile = await mkdtemp(join(tmpdir(), "runas-apt-"))
  try {
    const sources = join(profile, "sources.list"), parts = join(profile, "sources.list.d")
    await writeFile(sources, "")
    await mkdir(parts)
    // --no-download também pula a preparação do .deb local e perde seu caminho no APT.
    // Fontes vazias permitem essa preparação sem oferecer repositórios/downloads de dependências.
    // O pkexec limpa o ambiente: o `env` diz ao debconf que não há terminal, sem as linhas de aviso.
    await run("/usr/bin/pkexec", ["--disable-internal-agent", "/usr/bin/env", "DEBIAN_FRONTEND=noninteractive", "/usr/bin/apt-get", "--assume-yes", "--no-remove", "-o", `Dir::Etc::sourcelist=${sources}`, "-o", `Dir::Etc::sourceparts=${parts}`, "-o", "Dpkg::Lock::Timeout=60", "install", "--", file])
    return {}
  } catch (error) {
    const failure = error as { code?: string | number; stdout?: string; stderr?: string }
    if (failure.code === 126) throw new Error("Instalação cancelada na autorização do sistema. O aplicativo continua aberto.")
    if (failure.code === 127 || failure.code === "ENOENT") throw new Error("Não foi possível obter autorização do sistema. Confira se o pkexec e o agente de autenticação do Ubuntu estão disponíveis.")
    const output = `${failure.stdout ?? ""}\n${failure.stderr ?? ""}`
    const others = failedPackages(output).filter(name => name !== expected?.name)
    if (expected && await installedVersion(expected.name, read) === expected.version) {
      return { warning: others.length ? `O Runas-Codex foi atualizado, mas o sistema avisou erro em outro pacote: ${others.join(", ")}.` : "O Runas-Codex foi atualizado, mas o APT terminou com aviso." }
    }
    throw new Error(aptFailureMessage(output, others))
  } finally {
    await rm(profile, { recursive: true, force: true })
  }
}

async function packageOf(file: string, read: ReadPackage): Promise<{ name: string; version: string } | null> {
  try {
    const fields = await read("/usr/bin/dpkg-deb", ["--field", file, "Package", "Version"])
    const name = /^Package:\s*(\S+)/m.exec(fields)?.[1], version = /^Version:\s*(\S+)/m.exec(fields)?.[1]
    return name && version ? { name, version } : null
  } catch {
    return null
  }
}

async function installedVersion(name: string, read: ReadPackage): Promise<string | null> {
  try {
    // "ii " = pedido para instalar e instalado de fato (não pela metade).
    const [status, version] = (await read("/usr/bin/dpkg-query", ["--show", "--showformat=${db:Status-Abbrev}|${Version}", name])).split("|")
    return status?.trim() === "ii" && version ? version.trim() : null
  } catch {
    return null
  }
}

/** Pacotes que o `dpkg` não conseguiu configurar, no fim da saída do APT (em português ou em inglês). */
export function failedPackages(output: string): string[] {
  const names = new Set<string>()
  for (const match of output.matchAll(/dpkg: (?:erro processando pacote|error processing package) (\S+)/g)) names.add(match[1]!.replace(/:\S+$/, ""))
  const list = /(?:Erros foram encontrados durante o processamento de|Errors were encountered while processing):\s*\n((?:[ \t]+\S+\s*\n?)+)/.exec(output)
  for (const line of list?.[1]?.split("\n") ?? []) if (line.trim()) names.add(line.trim().replace(/:\S+$/, ""))
  return [...names]
}

/** A mensagem diz a causa: o pacote que falhou e as últimas linhas da saída, sem o ruído do debconf. */
export function aptFailureMessage(output: string, others = failedPackages(output)): string {
  const lines = output.split("\n").map(line => line.trimEnd()).filter(line => line && !/^debconf: /.test(line))
  const tail = lines.slice(-12).join("\n").slice(-2000)
  const cause = others.length
    ? `\nO pacote ${others.join(", ")} do sistema está com a instalação pela metade e faz o APT falhar. No terminal, \`sudo dpkg --configure -a\` mostra o erro dele; depois de corrigi-lo, tente de novo.`
    : ""
  return `O sistema não concluiu a instalação. O aplicativo continua aberto.${cause}${tail ? `\n${tail}` : ""}`
}
