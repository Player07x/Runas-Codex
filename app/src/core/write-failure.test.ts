import { describe, expect, it } from "vitest"
import { retryDelay, writeFailure } from "./write-failure"

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
