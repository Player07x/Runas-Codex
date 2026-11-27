import { spawn, spawnSync } from "node:child_process"
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

  // No CI, o principal ficava zumbi com uma thread presa (`Zl`) e o canal do IPC aberto: kill(pid, 0) dava certo
  // para sempre e o auxiliar segurava o job. Aqui o "pai" vira zumbi de verdade e o canal com o teste nunca fecha.
  async function cleansAfterZombie(holderCommand: string, holderArgs: string[]): Promise<void> {
    const owned = mkdtempSync(join(tmpdir(), "codex-teste-zumbi-"))
    roots.push(owned)
    writeFileSync(join(owned, "arquivo"), "temporário")
    const holder = spawn(holderCommand, holderArgs, { stdio: ["ignore", "pipe", "ignore"] })
    try {
      const [line] = (await once(holder.stdout!, "data")) as [Buffer]
      const target = Number(line.toString().trim())
      expect(target).toBeGreaterThan(0)
      const cleaner = spawn(process.execPath, ["-e", SMOKE_CLEANUP_SCRIPT, owned, String(target)], { stdio: ["ignore", "ignore", "ignore", "ipc"] })
      const finished = once(cleaner, "exit")
      expect(existsSync(owned)).toBe(true)
      expect((await finished)[0]).toBe(0)
      expect(existsSync(owned)).toBe(false)
      // O pai continua lá, sem ser recolhido: a limpeza não esperou por isso.
      const stat = readFileSync(`/proc/${target}/stat`, "utf8")
      expect(stat.slice(stat.lastIndexOf(")") + 2)[0]).toBe("Z")
    } finally {
      holder.kill("SIGKILL")
    }
  }

  it.runIf(process.platform === "linux")("apaga a pasta quando o pai vira zumbi e ninguém o recolhe", async () => {
    // O `sleep 0.5` é filho do `sleep 30` (o `exec` troca o shell), que nunca chama wait(): ao sair, fica zumbi.
    await cleansAfterZombie("sh", ["-c", "sleep 0.5 & echo $!; exec sleep 30"])
  })

  const python = process.platform === "linux" && spawnSync("python3", ["--version"]).status === 0
  const exitThread = ({ x64: 60, arm64: 93 } as Record<string, number>)[process.arch]
  it.runIf(python && exitThread !== undefined)("apaga a pasta quando a thread principal sai e outra fica presa (Zl)", async () => {
    // A thread principal sai sozinha (SYS_exit, não exit_group) e a outra continua: o mesmo `Zl` do log do CI.
    const script = `import ctypes, os, sys, threading, time
threading.Thread(target=time.sleep, args=(30,), daemon=True).start()
print(os.getpid(), flush=True)
time.sleep(0.5)
ctypes.CDLL(None).syscall(${exitThread}, 0)`
    await cleansAfterZombie("python3", ["-c", script])
  })
})
