import { access, readFile, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { installDeb } from "../src/main/deb-update"

describe("atualização do pacote Ubuntu", () => {
  it("pede autorização gráfica e passa o caminho como argumento, sem shell", async () => {
    let profile = ""
    const run = vi.fn(async (_command: string, args: string[]) => {
      const sources = args.find(arg => arg.startsWith("Dir::Etc::sourcelist="))!.split("=")[1]!
      const parts = args.find(arg => arg.startsWith("Dir::Etc::sourceparts="))!.split("=")[1]!
      profile = dirname(sources)
      expect(await readFile(sources, "utf8")).toBe("")
      expect(await readdir(parts)).toEqual([])
    })
    const file = "/home/pessoa/Downloads/Runas Codex/novo $(teste).deb"
    await installDeb(file, run)
    expect(run).toHaveBeenCalledWith("/usr/bin/pkexec", ["--disable-internal-agent", "/usr/bin/apt-get", "--assume-yes", "--no-remove", "-o", `Dir::Etc::sourcelist=${join(profile,"sources.list")}`, "-o", `Dir::Etc::sourceparts=${join(profile,"sources.list.d")}`, "-o", "Dpkg::Lock::Timeout=60", "install", "--", file])
    expect(run.mock.calls[0]![1]).not.toContain("--no-download")
    await expect(access(profile)).rejects.toThrow()
  })

  it("recusa caminho relativo e arquivo que não é pacote antes de pedir autorização", async () => {
    const run = vi.fn(async () => undefined)
    for (const file of ["novo.deb", "/tmp/novo.sh"]) await expect(installDeb(file, run)).rejects.toThrow("inválido")
    expect(run).not.toHaveBeenCalled()
  })

  it.each([[126, "cancelada"], [127, "autorização"], ["ENOENT", "pkexec"], [100, "não concluiu"]])("explica a falha %s sem dizer que atualizou", async (code, message) => {
    await expect(installDeb("/tmp/novo.deb", async () => { throw { code, stderr: "Falha do sistema" } })).rejects.toThrow(String(message))
  })
})
