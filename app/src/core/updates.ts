/**
 * Atualização manual (ADR 0017): só quando o usuário clica em "Verificar atualizações", o app lê as releases do
 * GitHub, escolhe a versão mais nova e o instalador deste sistema, e confere o arquivo pelo `SHA256SUMS.txt` da
 * própria release. Nada aqui faz rede: o processo principal busca e passa os dados.
 */

export const RELEASES_REPO = "Player07x/Runas-Codex"

export interface ReleaseAsset {
  name: string
  size: number
  url: string
}

export interface Release {
  tag: string
  version: string
  prerelease: boolean
  notes: string
  url: string
  publishedAt: string
  assets: ReleaseAsset[]
}

/** Qual instalador serve para este app: o `.exe` (NSIS), o AppImage (troca o próprio arquivo) ou o `.deb`. */
export type UpdateTarget = "windows" | "appimage" | "deb"

/** Depois de baixar: o instalador do Windows abriu (o app fecha), o AppImage foi trocado (reinicia) ou o `.deb` abriu no instalador do sistema. */
export type UpdateInstallResult = "instalador-aberto" | "reiniciar" | "pacote-aberto"

export interface UpdateInfo {
  current: string
  /** A release mais nova que serve para esta versão (estável; ou também beta, se a instalada é beta). */
  latest: Release | null
  newer: boolean
  /** O instalador deste sistema na release mais nova. */
  asset: ReleaseAsset | null
  checksums: ReleaseAsset | null
}

interface Version {
  core: [number, number, number]
  pre: (string | number)[]
}

/** Versão no formato do SemVer (`1.2.3`, `v0.1.0-beta.2`); `null` se não for. */
export function parseVersion(value: string): Version | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value.trim())
  if (!match) return null
  const pre = match[4] ? match[4].split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part)) : []
  return { core: [Number(match[1]), Number(match[2]), Number(match[3])], pre }
}

/** Precedência do SemVer: `0.1.0-beta.1` < `0.1.0-beta.2` < `0.1.0` < `0.1.1`. Inválidas ficam por último. */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a)
  const y = parseVersion(b)
  if (!x || !y) return x ? 1 : y ? -1 : 0
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i]! - y.core[i]!
  if (!x.pre.length || !y.pre.length) return x.pre.length ? -1 : y.pre.length ? 1 : 0
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i]
    const q = y.pre[i]
    if (p === undefined) return -1
    if (q === undefined) return 1
    if (p === q) continue
    if (typeof p === "number" && typeof q === "number") return p - q
    if (typeof p === "number") return -1
    if (typeof q === "number") return 1
    return p < q ? -1 : 1
  }
  return 0
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

/** Lê a resposta da API de releases do GitHub; ignora rascunhos e tags que não são versão. */
export function parseReleases(json: unknown): Release[] {
  if (!Array.isArray(json)) return []
  const releases: Release[] = []
  for (const item of json) {
    if (!isRecord(item) || item.draft === true || typeof item.tag_name !== "string") continue
    const version = item.tag_name.replace(/^v/, "")
    if (!parseVersion(version)) continue
    const assets = Array.isArray(item.assets)
      ? item.assets.filter(isRecord).flatMap((asset) => (typeof asset.name === "string" && typeof asset.browser_download_url === "string" ? [{ name: asset.name, size: typeof asset.size === "number" ? asset.size : 0, url: asset.browser_download_url }] : []))
      : []
    releases.push({
      tag: item.tag_name,
      version,
      prerelease: item.prerelease === true,
      notes: typeof item.body === "string" ? item.body : "",
      url: typeof item.html_url === "string" ? item.html_url : `https://github.com/${RELEASES_REPO}/releases/tag/${item.tag_name}`,
      publishedAt: typeof item.published_at === "string" ? item.published_at : "",
      assets,
    })
  }
  return releases
}

/** O instalador deste sistema numa release (pelos nomes que o workflow Release gera). */
export function assetFor(release: Release, target: UpdateTarget): ReleaseAsset | null {
  const pattern = target === "windows" ? /^Runas-Codex-Setup-.+\.exe$/ : target === "appimage" ? /^Runas-Codex-.+-linux-x86_64\.AppImage$/ : /^Runas-Codex-.+-linux-amd64\.deb$/
  return release.assets.find((asset) => pattern.test(asset.name)) ?? null
}

/** Versão mais nova que serve: quem está numa beta também recebe betas; quem está numa estável, só estáveis. */
export function pickUpdate(current: string, releases: Release[], target: UpdateTarget): UpdateInfo {
  const wantsBeta = (parseVersion(current)?.pre.length ?? 0) > 0
  const candidates = releases.filter((release) => wantsBeta || !release.prerelease).sort((a, b) => compareVersions(b.version, a.version))
  const latest = candidates[0] ?? null
  return {
    current,
    latest,
    newer: Boolean(latest && compareVersions(latest.version, current) > 0),
    asset: latest ? assetFor(latest, target) : null,
    checksums: latest?.assets.find((asset) => asset.name === "SHA256SUMS.txt") ?? null,
  }
}

/** A soma SHA-256 de um arquivo no `SHA256SUMS.txt` (formato do `sha256sum`). */
export function checksumFor(sums: string, name: string): string | null {
  for (const line of sums.split(/\r?\n/)) {
    const match = /^([a-f0-9]{64})\s+\*?(.+)$/i.exec(line.trim())
    if (match && match[2] === name) return match[1]!.toLowerCase()
  }
  return null
}
