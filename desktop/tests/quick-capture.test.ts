import { describe, expect, it } from "vitest"
import { parseGnomePaths } from "../src/main/system-shortcut"
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
})
