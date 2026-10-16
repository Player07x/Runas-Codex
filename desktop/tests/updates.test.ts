import { createHash } from "node:crypto"
import { createServer, type Server } from "node:http"
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkForUpdate, downloadUpdate, installUpdate, updateTarget } from "../src/main/updates"

const installer = Buffer.from("instalador novo do Runas-Codex")
const sha = createHash("sha256").update(installer).digest("hex")
let base: string
let server: Server
let origin: string
let sums: string

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "runas-updates-"))
  sums = `${sha}  Runas-Codex-0.1.0-beta.2-linux-x86_64.AppImage\n${"0".repeat(64)}  Runas-Codex-Setup-0.1.0-beta.2.exe\n`
  server = createServer((request, response) => {
    const url = request.url ?? "/"
    if (url.startsWith("/api")) {
      const asset = (name: string, size: number) => ({ name, size, browser_download_url: `${origin}/download/v0.1.0-beta.2/${name}` })
      response.writeHead(200, { "content-type": "application/json" })
      response.end(JSON.stringify([
        { tag_name: "v0.1.0-beta.2", prerelease: true, draft: false, body: "Novidades", html_url: "x", published_at: "2026-10-15T12:00:00Z", assets: [asset("Runas-Codex-0.1.0-beta.2-linux-x86_64.AppImage", installer.length), asset("Runas-Codex-Setup-0.1.0-beta.2.exe", installer.length), asset("SHA256SUMS.txt", 100)] },
        { tag_name: "v0.1.0-beta.1", prerelease: true, draft: false, body: "", assets: [] },
      ]))
    } else if (url.endsWith("SHA256SUMS.txt")) {
      response.end(sums)
    } else if (url.startsWith("/download/")) {
      response.writeHead(200, { "content-length": installer.length })
      response.end(installer)
    } else {
      response.writeHead(404)
      response.end()
    }
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`
})

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve))
  await rm(base, { recursive: true, force: true })
})

describe("atualizações", () => {
  it("escolhe o instalador pelo sistema", () => {
    expect(updateTarget("win32", {})).toBe("windows")
    expect(updateTarget("linux", { APPIMAGE: "/home/x/Runas.AppImage" })).toBe("appimage")
    expect(updateTarget("linux", {})).toBe("deb")
    expect(updateTarget("darwin", {})).toBeNull()
  })

  it("consulta as releases e baixa o instalador conferindo a soma SHA-256", async () => {
    const info = await checkForUpdate("0.1.0-beta.1", "appimage", `${origin}/api`)
    expect(info).toMatchObject({ newer: true, latest: { version: "0.1.0-beta.2", notes: "Novidades" }, asset: { name: "Runas-Codex-0.1.0-beta.2-linux-x86_64.AppImage" } })
    const progress: number[] = []
    const file = await downloadUpdate(info, join(base, "baixados"), (received) => progress.push(received), `${origin}/download/`)
    expect(await readFile(file)).toEqual(installer)
    expect(progress.at(-1)).toBe(installer.length)
  })

  it("recusa arquivo que não confere com a soma e endereço fora das releases", async () => {
    const info = await checkForUpdate("0.1.0-beta.1", "windows", `${origin}/api`)
    await expect(downloadUpdate(info, join(base, "baixados"), () => undefined, `${origin}/download/`)).rejects.toThrow("não confere com a soma")
    expect(await readdir(join(base, "baixados"))).toEqual([])
    await expect(downloadUpdate(info, join(base, "baixados"), () => undefined)).rejects.toThrow("Endereço de download inesperado")
    expect((await checkForUpdate("0.1.0-beta.2", "windows", `${origin}/api`)).newer).toBe(false)
  })

  it("AppImage: troca o próprio arquivo do app e reinicia", async () => {
    const current = join(base, "Runas-Codex.AppImage")
    await writeFile(current, "versão velha")
    const downloaded = join(base, "novo.AppImage")
    await writeFile(downloaded, installer)
    const relaunched: string[] = []
    const opened: string[] = []
    const actions = { openPath: async (path: string) => (opened.push(path), ""), quit: () => undefined, relaunch: (path: string) => void relaunched.push(path) }
    expect(await installUpdate(downloaded, "appimage", actions, { APPIMAGE: current })).toBe("reiniciar")
    expect(await readFile(current)).toEqual(installer)
    expect((await stat(current)).mode & 0o111).not.toBe(0)
    expect(relaunched).toEqual([current])
    expect(opened).toEqual([])
  })

  it("Ubuntu: aguarda a instalação, salva as notas e só então reinicia", async () => {
    const order: string[] = []
    let installed!: () => void
    const pending = new Promise<void>(resolve => { installed = resolve })
    const actions = { openPath: vi.fn(async () => ""), quit: vi.fn(), beforeRestart: async () => { order.push("salvou") }, relaunch: () => { order.push("reiniciou") } }
    const result = installUpdate("/tmp/novo.deb", "deb", actions, {}, async () => { await pending; order.push("instalou") })
    expect(order).toEqual([])
    installed()
    expect(await result).toBe("reiniciar")
    expect(order).toEqual(["instalou", "salvou", "reiniciou"])
    expect(actions.openPath).not.toHaveBeenCalled()
  })

  it("Ubuntu: cancelamento ou falha não fecha nem reinicia o aplicativo", async () => {
    const actions = { openPath: vi.fn(async () => ""), quit: vi.fn(), relaunch: vi.fn() }
    await expect(installUpdate("/tmp/novo.deb", "deb", actions, {}, async () => { throw new Error("Instalação cancelada") })).rejects.toThrow("cancelada")
    expect(actions.quit).not.toHaveBeenCalled()
    expect(actions.relaunch).not.toHaveBeenCalled()
    expect(actions.openPath).not.toHaveBeenCalled()
  })

  it("mantém o aplicativo aberto se as notas não puderem ser salvas antes de reiniciar", async () => {
    const actions = { openPath: vi.fn(async () => ""), quit: vi.fn(), relaunch: vi.fn(), beforeRestart: async () => { throw new Error("Conflito ao salvar") } }
    await expect(installUpdate("/tmp/novo.deb", "deb", actions, {}, async () => undefined)).rejects.toThrow("Conflito")
    expect(actions.relaunch).not.toHaveBeenCalled()
  })
})
