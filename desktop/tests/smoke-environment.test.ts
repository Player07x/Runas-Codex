import { spawn } from "node:child_process"
import { once } from "node:events"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { configureSmokeEnvironment, SMOKE_CLEANUP_SCRIPT } from "../src/main/smoke-environment"

const roots: string[] = []
const originalEnv = { TMPDIR: process.env.TMPDIR, TMP: process.env.TMP, TEMP: process.env.TEMP }
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})
function fakeApp(explicit = false) {
  const paths = { userData: join(tmpdir(), "perfil-existente"), sessionData: "", temp: "" }
  return {
    paths,
    commandLine: { hasSwitch: () => explicit },
    getPath: () => paths.userData,
    setPath: (name: keyof typeof paths, value: string) => { paths[name] = value },
  }
}

describe("isolamento do smoke local", () => {
  it("mantém o app normal e suas preferências intactos", () => {
    const app = fakeApp(), env = { ...originalEnv }
    expect(configureSmokeEnvironment(app, [], env)).toBeNull()
    expect(env).toEqual(originalEnv)
    expect(app.paths.sessionData).toBe("")
  })

  it("cria perfil vazio próprio antes do Chromium e põe os temporários na mesma raiz", () => {
    const app = fakeApp(), env = { ...originalEnv }
    const smoke = configureSmokeEnvironment(app, ["--smoke"], env)!
    roots.push(smoke.root)
    expect(smoke.temporaryProfile).toBe(true)
    expect(smoke.profile).toBe(join(smoke.root, "perfil"))
    expect(app.paths.userData).toBe(smoke.profile)
    expect(app.paths.sessionData).toBe(smoke.profile)
    expect(existsSync(smoke.profile)).toBe(true)
    expect(env.TMPDIR).toBe(join(smoke.root, "tmp"))
    expect(env.TMP).toBe(env.TMPDIR)
    expect(env.TEMP).toBe(env.TMPDIR)
    expect(app.paths.temp).toBe(env.TMPDIR)
  })

  it("conserva o perfil fornecido por --user-data-dir e isola só os temporários", () => {
    const app = fakeApp(true), previous = app.paths.userData
    const smoke = configureSmokeEnvironment(app, ["--smoke", "--user-data-dir=" + previous], { ...originalEnv })!
    roots.push(smoke.root)
    expect(smoke.temporaryProfile).toBe(false)
    expect(app.paths.userData).toBe(previous)
    expect(smoke.profile).toBe(previous)
    expect(app.paths.sessionData).toBe("")
  })

  it("não compartilha perfil nem exportações entre duas execuções", () => {
    const a = configureSmokeEnvironment(fakeApp(), ["--smoke"], { ...originalEnv })!
    const b = configureSmokeEnvironment(fakeApp(), ["--smoke"], { ...originalEnv })!
    roots.push(a.root, b.root)
    expect(a.root).not.toBe(b.root)
    expect(a.profile).not.toBe(b.profile)
  })

  it("apaga perfil, cópia e exportações depois da saída com erro sem apagar pastas vizinhas", async () => {
    const parentRoot = mkdtempSync(join(tmpdir(), "codex-teste-limpeza-"))
    roots.push(parentRoot)
    const owned = join(parentRoot, "smoke"), neighbor = join(parentRoot, "outro-smoke")
    mkdirSync(owned)
    mkdirSync(neighbor)
    writeFileSync(join(neighbor, "preservar"), "intacto")
    for (const folder of ["perfil", "tmp/cofre", "tmp/runas-export-1", "tmp/runas-book-pdf-1"]) {
      mkdirSync(join(owned, folder), { recursive: true })
      writeFileSync(join(owned, folder, "arquivo"), "temporário")
    }
    const parent = spawn(process.execPath, ["-e", "setTimeout(() => process.exit(1), 300)"], { stdio: "ignore" })
    const cleaner = spawn(process.execPath, ["-e", SMOKE_CLEANUP_SCRIPT, owned, String(parent.pid)], { stdio: "ignore" })
    const finished = once(cleaner, "exit")
    expect(existsSync(owned)).toBe(true)
    expect((await once(parent, "exit"))[0]).toBe(1)
    expect((await finished)[0]).toBe(0)
    expect(existsSync(owned)).toBe(false)
    expect(readFileSync(join(neighbor, "preservar"), "utf8")).toBe("intacto")
  })
})
