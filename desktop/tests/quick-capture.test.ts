import { describe, expect, it } from "vitest"
import { CAPTURE_MARK, kdeDesktopFile, launcher, parseGnomePaths } from "../src/main/system-shortcut"
import { quickCaptureRequested } from "../src/main/deep-links"

describe("atalho de captura no sistema", () => {
  it("lê somente caminhos de custom-keybindings do GNOME", () => {
    expect(parseGnomePaths("['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/', '/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/runas-codex/']")).toEqual([
      "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/",
      "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/runas-codex/",
    ])
    expect(parseGnomePaths("@as []")).toEqual([])
  })
  it("reconhece a entrada de linha de comando sem aceitar prefixos", () => {
    expect(quickCaptureRequested(["runas-codex", "--captura"])).toBe(true)
    expect(quickCaptureRequested(["runas-codex", "--captura=sim"])).toBe(false)
  })
  it("acrescenta a captura ao .desktop instalado sem perder ícone nem runas://", () => {
    const installed = "[Desktop Entry]\nName=Runas-Codex\nExec=/opt/Runas-Codex/runas-codex %U\nIcon=runas-codex\nMimeType=x-scheme-handler/runas;\nCategories=Office;\n"
    const file = kdeDesktopFile(installed)
    expect(file).toContain("Icon=runas-codex")
    expect(file).toContain("MimeType=x-scheme-handler/runas;")
    expect(file).toContain("Actions=Captura;")
    expect(file).toContain(CAPTURE_MARK)
    expect(file).toContain("[Desktop Action Captura]\nName=Captura rápida\nExec=/opt/Runas-Codex/runas-codex --captura")
    // Refazer não duplica a ação nem a marca.
    const again = kdeDesktopFile(file)
    expect(again.match(/\[Desktop Action Captura\]/g)).toHaveLength(1)
    expect(again.split(CAPTURE_MARK)).toHaveLength(2)
    expect(again.match(/Captura;/g)).toHaveLength(1)
  })
  it("mantém as ações que o .desktop já tinha", () => {
    const file = kdeDesktopFile("[Desktop Entry]\nExec=runas-codex %U\nActions=Nova;\n\n[Desktop Action Nova]\nName=Nova\nExec=runas-codex --nova\n")
    expect(file).toContain("Actions=Nova;Captura;")
    expect(file).toContain("[Desktop Action Nova]\nName=Nova\nExec=runas-codex --nova")
  })
  it("sem .desktop instalado (AppImage), monta um completo com o caminho do AppImage", () => {
    const command = launcher({ APPIMAGE: "/home/eu/Apps/Runas-Codex.AppImage" })
    expect(command).toBe('"/home/eu/Apps/Runas-Codex.AppImage"')
    const file = kdeDesktopFile(null, command)
    expect(file).toContain(`Exec=${command} %U`)
    expect(file).toContain(`Exec=${command} --captura`)
    expect(file).toContain("MimeType=x-scheme-handler/runas;")
    expect(launcher({})).toBe("runas-codex")
  })
})
