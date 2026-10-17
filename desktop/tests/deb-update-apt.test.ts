import { execFile } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"
import { installDeb } from "../src/main/deb-update"
const execute = promisify(execFile)
const aptAvailable = process.platform === "linux" && existsSync("/usr/bin/apt-get") && existsSync("/usr/bin/dpkg-deb")

it.runIf(aptAvailable)("o APT real prepara o caminho local sem repositórios e recusa dependências indisponíveis", async () => {
  const base = await mkdtemp(join(tmpdir(), "runas-apt-teste-"))
  try {
    for (const path of ["pkg/DEBIAN", "lists/partial", "archives/partial", "log", "conf.d", "cache"]) await mkdir(join(base,path), { recursive:true })
    const status = join(base,"status"), config = join(base,"apt.conf"), packageFile = join(base,"Pacote com espaço.deb")
    await writeFile(status, "")
    // Não lê hooks/configurações do host. Debug::pkgDPkgPM só imprime o dpkg: não instala o pacote.
    await writeFile(config, `Dir::Etc::parts "${join(base,"conf.d")}";\nDir::Etc::main "${join(base,"empty.conf")}";\n`)
    await writeFile(join(base,"empty.conf"), "")
    const options = ["-o",`Dir::State=${base}`,"-o",`Dir::Cache=${join(base,"cache")}`,"-o",`Dir::State::status=${status}`,"-o",`Dir::State::lists=${join(base,"lists")}`,"-o",`Dir::Cache::archives=${join(base,"archives")}`,"-o",`Dir::Log=${join(base,"log")}`,"-o","Debug::NoLocking=true","-o","Debug::pkgDPkgPM=true"]
    const control = (depends = "") => `Package: runas-update-probe\nVersion: 0.1.0\nArchitecture: all\nMaintainer: Runas <teste@example.invalid>\nDescription: Teste sem instalação real\n${depends ? `Depends: ${depends}\n` : ""}`
    let output = "", failureCode: number | string | undefined
    const build = async (depends = "") => {
      await writeFile(join(base,"pkg/DEBIAN/control"), control(depends))
      await execute("/usr/bin/dpkg-deb",["--build",join(base,"pkg"),packageFile])
    }
    const run = async (_command: string, args: string[]) => {
      try {
        const result = await execute("/usr/bin/apt-get", [...options,...args.slice(2)], { env:{...process.env, APT_CONFIG:config, LC_ALL:"C"} })
        output = result.stdout + result.stderr
      } catch (error) {
        const failure = error as { code?: number | string; stdout?: string; stderr?: string }
        failureCode = failure.code
        output = (failure.stdout ?? "") + (failure.stderr ?? "")
        throw error
      }
    }
    await build()
    await installDeb(packageFile, run)
    expect(output).toContain("--unpack")
    expect(output).toContain(packageFile)
    expect(output).not.toContain("Pathname to install is not absolute")
    expect(output).toContain("Need to get 0 B/")
    expect(await readFile(status,"utf8")).toBe("")
    await build("runas-dependencia-inexistente (>= 1)")
    await expect(installDeb(packageFile, run)).rejects.toThrow("não concluiu")
    expect(failureCode).toBe(100)
    expect(output).toContain("runas-dependencia-inexistente")
    expect(output).not.toContain("--unpack")
    expect(await readFile(status,"utf8")).toBe("")
  } finally {
    await rm(base, { recursive:true, force:true })
  }
}, 15000)
