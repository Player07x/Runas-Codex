import { access, readFile, readdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { aptFailureMessage, failedPackages, installDeb, type ReadPackage } from "../src/main/deb-update"

/** `dpkg-deb` e `dpkg-query` de mentira: o pacote baixado e o que ficou instalado depois do APT. */
const reader = (installed: string): ReadPackage => async (command) => command.endsWith("dpkg-deb") ? "Package: runas-codex\nVersion: 0.1.0~beta.24\n" : installed

// Saída real do APT no Ubuntu do dono (30/10): outro pacote com a pós-instalação quebrada faz o dpkg devolver 1.
const brokenOther = {
  code: 100,
  stdout: "Desempacotando runas-codex (0.1.0~beta.24) sobre (0.1.0~beta.22) ...\nConfigurando freedownloadmanager (6.35.2.7075) ...\nJob for apparmor.service failed because the control process exited with error code.\nConfigurando runas-codex (0.1.0~beta.24) ...\nErros foram encontrados durante o processamento de:\n freedownloadmanager\n",
  stderr: "debconf: incapaz de inicializar interface: Dialog\ndpkg: erro processando pacote freedownloadmanager (--configure):\n o sub-processo do pacote antigo freedownloadmanager, script de maintainer postinst falhou com o código de saída 1\nE: Sub-process /usr/bin/dpkg returned an error code (1)\n",
}

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
    await installDeb(file, run, reader("ii |0.1.0~beta.24"))
    expect(run).toHaveBeenCalledWith("/usr/bin/pkexec", ["--disable-internal-agent", "/usr/bin/env", "DEBIAN_FRONTEND=noninteractive", "/usr/bin/apt-get", "--assume-yes", "--no-remove", "-o", `Dir::Etc::sourcelist=${join(profile,"sources.list")}`, "-o", `Dir::Etc::sourceparts=${join(profile,"sources.list.d")}`, "-o", "Dpkg::Lock::Timeout=60", "install", "--", file])
    expect(run.mock.calls[0]![1]).not.toContain("--no-download")
    await expect(access(profile)).rejects.toThrow()
  })

  it("recusa caminho relativo e arquivo que não é pacote antes de pedir autorização", async () => {
    const run = vi.fn(async () => undefined)
    for (const file of ["novo.deb", "/tmp/novo.sh"]) await expect(installDeb(file, run, reader(""))).rejects.toThrow("inválido")
    expect(run).not.toHaveBeenCalled()
  })

  it.each([[126, "cancelada"], [127, "autorização"], ["ENOENT", "pkexec"], [100, "não concluiu"]])("explica a falha %s sem dizer que atualizou", async (code, message) => {
    await expect(installDeb("/tmp/novo.deb", async () => { throw { code, stderr: "Falha do sistema" } }, reader("ii |0.1.0~beta.22"))).rejects.toThrow(String(message))
  })

  it("conta como atualizado quando o erro é de outro pacote e a versão nova ficou instalada", async () => {
    const result = await installDeb("/tmp/novo.deb", async () => { throw brokenOther }, reader("ii |0.1.0~beta.24"))
    expect(result.warning).toContain("freedownloadmanager")
  })

  it("diz qual pacote quebrou o APT quando a versão nova não ficou instalada", async () => {
    const failure = installDeb("/tmp/novo.deb", async () => { throw brokenOther }, reader("iU |0.1.0~beta.24"))
    await expect(failure).rejects.toThrow("O pacote freedownloadmanager do sistema está com a instalação pela metade")
    await expect(failure).rejects.toThrow("dpkg --configure -a")
  })

  it("mostra o fim da saída do APT sem as linhas do debconf", () => {
    expect(failedPackages(brokenOther.stdout + brokenOther.stderr)).toEqual(["freedownloadmanager"])
    expect(failedPackages("dpkg: error processing package outro:amd64 (--configure):\nErrors were encountered while processing:\n outro:amd64\n")).toEqual(["outro"])
    const message = aptFailureMessage(brokenOther.stdout + brokenOther.stderr)
    expect(message).toContain("postinst falhou")
    expect(message).not.toContain("debconf")
  })
})
