import { checksumFor, compareVersions, parseReleases, parseVersion, pickUpdate } from "./updates"

const asset = (name: string) => ({ name, size: 10, browser_download_url: `https://github.com/Player07x/Runas-Codex/releases/download/x/${name}` })
const release = (tag: string, prerelease: boolean, draft = false) => ({
  tag_name: tag,
  prerelease,
  draft,
  body: `Notas da ${tag}`,
  html_url: `https://github.com/Player07x/Runas-Codex/releases/tag/${tag}`,
  published_at: "2026-10-15T12:00:00Z",
  assets: [asset(`Runas-Codex-Setup-${tag.slice(1)}.exe`), asset(`Runas-Codex-${tag.slice(1)}-linux-amd64.deb`), asset(`Runas-Codex-${tag.slice(1)}-linux-x86_64.AppImage`), asset("SHA256SUMS.txt")],
})

describe("versões", () => {
  it("segue a precedência do SemVer, com betas antes da estável", () => {
    expect(parseVersion("v0.1.0-beta.2")).toEqual({ core: [0, 1, 0], pre: ["beta", 2] })
    expect(parseVersion("1.2")).toBeNull()
    const ordered = ["0.0.1", "0.1.0-alpha", "0.1.0-beta.1", "0.1.0-beta.2", "0.1.0-beta.10", "0.1.0", "0.1.1", "1.0.0"]
    for (let i = 1; i < ordered.length; i++) expect(compareVersions(ordered[i - 1]!, ordered[i]!)).toBeLessThan(0)
    expect(compareVersions("v0.1.0", "0.1.0")).toBe(0)
  })
})

describe("pickUpdate", () => {
  const releases = parseReleases([release("v0.1.0-beta.2", true), release("v0.1.0-beta.1", true), release("v0.0.9", false), release("v0.2.0", false, true), { tag_name: "nao-e-versao" }])

  it("lê as releases da API e ignora rascunhos e tags que não são versão", () => {
    expect(releases.map((r) => r.tag)).toEqual(["v0.1.0-beta.2", "v0.1.0-beta.1", "v0.0.9"])
    expect(releases[0]!.notes).toBe("Notas da v0.1.0-beta.2")
  })

  it("quem está numa beta recebe a beta mais nova, com o instalador do sistema e as somas", () => {
    const info = pickUpdate("0.1.0-beta.1", releases, "windows")
    expect(info.newer).toBe(true)
    expect(info.latest?.version).toBe("0.1.0-beta.2")
    expect(info.asset?.name).toBe("Runas-Codex-Setup-0.1.0-beta.2.exe")
    expect(info.checksums?.name).toBe("SHA256SUMS.txt")
    expect(pickUpdate("0.1.0-beta.1", releases, "appimage").asset?.name).toBe("Runas-Codex-0.1.0-beta.2-linux-x86_64.AppImage")
    expect(pickUpdate("0.1.0-beta.1", releases, "deb").asset?.name).toBe("Runas-Codex-0.1.0-beta.2-linux-amd64.deb")
  })

  it("quem está numa estável só vê estáveis; na mais nova, nada a fazer", () => {
    expect(pickUpdate("0.0.1", releases, "windows").latest?.version).toBe("0.0.9")
    expect(pickUpdate("0.0.9", releases, "windows").newer).toBe(false)
    expect(pickUpdate("0.1.0-beta.2", releases, "deb").newer).toBe(false)
    expect(pickUpdate("0.1.0", [], "deb")).toMatchObject({ latest: null, newer: false, asset: null })
  })
})

describe("checksumFor", () => {
  it("acha a soma do arquivo no formato do sha256sum", () => {
    const sums = `${"a".repeat(64)}  Runas-Codex-Setup-0.1.0.exe\r\n${"B".repeat(64)} *Runas-Codex-0.1.0-linux-amd64.deb\n`
    expect(checksumFor(sums, "Runas-Codex-Setup-0.1.0.exe")).toBe("a".repeat(64))
    expect(checksumFor(sums, "Runas-Codex-0.1.0-linux-amd64.deb")).toBe("b".repeat(64))
    expect(checksumFor(sums, "outro.exe")).toBeNull()
  })
})


describe("APK Android", () => {
  it("prefere o APK assinado e mantém o debug como compatibilidade de releases antigas", () => {
    const item = release("v0.1.0-beta.14", true)
    item.assets.push(asset("Runas-Codex-0.1.0-beta.14-android-debug.apk"))
    expect(pickUpdate("0.1.0-beta.13", parseReleases([item]), "android").asset?.name).toContain("android-debug.apk")
    item.assets.push(asset("Runas-Codex-0.1.0-beta.14-android.apk"))
    const update = pickUpdate("0.1.0-beta.13", parseReleases([item]), "android")
    expect(update.asset?.name).toBe("Runas-Codex-0.1.0-beta.14-android.apk")
    expect(update.newer).toBe(true)
    expect(update.checksums?.name).toBe("SHA256SUMS.txt")
  })
})
