import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

interface BuilderConfig {
  appId: string
  productName: string
  win: { target: { target: string; arch: string[] }[] }
  nsis: { createDesktopShortcut: boolean; createStartMenuShortcut: boolean; uninstallDisplayName: string; deleteAppDataOnUninstall: boolean }
  linux: { executableName: string; artifactName: string; icon: string; target: { target: string; arch: string[] }[] }
}
const desktop = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { build: BuilderConfig }
const build = desktop.build

describe("metadados dos instaladores", () => {
  it("mantém identidade, ícone, nomes e desinstalação do desktop", () => {
    expect(build.appId).toBe("dev.runas.codex")
    expect(build.productName).toBe("Runas-Codex")
    expect(build.win.target[0]!.target).toBe("nsis")
    expect(build.win.target[0]!.arch).toEqual(["x64"])
    expect(build.nsis.createDesktopShortcut).toBe(true)
    expect(build.nsis.createStartMenuShortcut).toBe(true)
    expect(build.nsis.uninstallDisplayName).toBe("Runas-Codex")
    expect(build.nsis.deleteAppDataOnUninstall).toBe(false)
    expect(build.linux.executableName).toBe("runas-codex")
    expect(build.linux.artifactName).toContain("Runas-Codex-")
    expect(build.linux.icon).toBe("build/icon.png")
    expect(existsSync(new URL("../build/icon.png", import.meta.url))).toBe(true)
  })

  it("declara os quatro alvos da Release e assinatura do APK", () => {
    const linux = build.linux.target.map((target: { target: string }) => target.target)
    expect(linux).toEqual(expect.arrayContaining(["deb", "AppImage"]))
    const workflow = readFileSync(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8")
    expect(workflow).toContain("npm run dist:linux")
    expect(workflow).toContain("npm run dist:win")
    expect(workflow).toContain("assembleRelease")
    expect(workflow).toContain("verify --print-certs")
  })
})
