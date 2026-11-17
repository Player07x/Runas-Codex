import { describe, expect, it } from "vitest"
import { lostFolderPermission, retryDelay, writeFailure } from "./write-failure"

describe("motivo da gravação que falhou (U91)", () => {
  it("no Windows, EPERM vindo do IPC vira bloqueio da segurança, com o botão da proteção", () => {
    const failure = writeFailure("Error invoking remote method 'vault:write': Error: EPERM: operation not permitted, rename 'C:\\Users\\a\\Documents\\Cofre\\.Nota.md.1a2b.runas-tmp'", "windows")
    expect(failure.kind).toBe("seguranca")
    expect(failure.windowsProtection).toBe(true)
    expect(failure.steps.join(" ")).toContain("Acesso controlado a pastas")
  })

  it("o mesmo erro no Android pede a pasta de novo; no Linux, fala de permissão", () => {
    expect(writeFailure("java.lang.SecurityException: Permission Denial", "android")).toMatchObject({ kind: "sem-permissao", windowsProtection: false })
    expect(writeFailure("EACCES: permission denied, open '/cofre/.a.md.runas-tmp'", "outro").title).toBe("Sem permissão para gravar na pasta do cofre")
  })

  it("separa disco cheio, arquivo em uso, somente leitura e pasta que sumiu", () => {
    expect(writeFailure("ENOSPC: no space left on device", "windows").kind).toBe("sem-espaco")
    expect(writeFailure("EBUSY: resource busy or locked", "windows").kind).toBe("em-uso")
    expect(writeFailure("EROFS: read-only file system", "outro").kind).toBe("somente-leitura")
    expect(writeFailure("ENOENT: no such file or directory", "outro").kind).toBe("pasta-sumiu")
    expect(writeFailure("algo estranho", "windows")).toMatchObject({ kind: "outro", windowsProtection: false })
  })

  it("tenta de novo em 5 s, 15 s, 30 s e depois uma vez por minuto", () => {
    expect([0, 1, 2, 3, 9].map(retryDelay)).toEqual([5_000, 15_000, 30_000, 60_000, 60_000])
  })
})

describe("permissão da pasta perdida no Android (U91, item 5)", () => {
  it("reconhece as mensagens do seletor de pastas (SAF) e do acesso a todos os arquivos", () => {
    for (const message of [
      "Sem acesso à pasta do cofre. Escolha-a novamente pelo seletor.",
      "O provedor não deixou criar o documento no cofre.",
      "O Android tirou o acesso a todos os arquivos do Runas-Codex. Escolha novamente a pasta em Configurações.",
    ]) expect(writeFailure(message, "android").kind).toBe("sem-permissao")
  })

  it("só oferece escolher a pasta de novo no Android e quando a causa é a permissão", () => {
    expect(lostFolderPermission("Sem acesso à pasta do cofre. Escolha-a novamente pelo seletor.", "android")).toBe(true)
    expect(lostFolderPermission("Sem acesso à pasta do cofre. Escolha-a novamente pelo seletor.", "windows")).toBe(false)
    expect(lostFolderPermission("ENOSPC: no space left on device", "android")).toBe(false)
    expect(lostFolderPermission(undefined, "android")).toBe(false)
  })
})
