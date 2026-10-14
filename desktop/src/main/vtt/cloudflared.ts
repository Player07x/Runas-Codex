import { createHash } from "node:crypto"
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { arch, platform } from "node:process"
import { join } from "node:path"
import { spawn, type ChildProcess } from "node:child_process"

interface ReleaseAsset { name: string; executable: string }

interface ReleaseMetadata {
  body: string
  assets: { name: string; browserDownloadUrl: string }[]
}

const OFFICIAL_HOSTS = new Set([
  "api.github.com",
  "github.com",
  "objects.githubusercontent.com",
  "release-assets.githubusercontent.com",
])

function assetForPlatform(): ReleaseAsset {
  const suffix = platform === "win32" ? ".exe" : ""
  if (platform === "win32" && arch === "x64") return { name: "cloudflared-windows-amd64.exe", executable: `cloudflared-windows-amd64${suffix}` }
  if (platform === "win32" && arch === "arm64") return { name: "cloudflared-windows-arm64.exe", executable: `cloudflared-windows-arm64${suffix}` }
  if (platform === "darwin" && arch === "arm64") return { name: "cloudflared-darwin-arm64", executable: "cloudflared-darwin-arm64" }
  if (platform === "darwin" && arch === "x64") return { name: "cloudflared-darwin-amd64", executable: "cloudflared-darwin-amd64" }
  if (platform === "linux" && arch === "x64") return { name: "cloudflared-linux-amd64", executable: "cloudflared-linux-amd64" }
  throw new Error(`cloudflared não tem binário pronto para ${platform}/${arch}.`)
}

function officialApiUrl(): string { return "https://api.github.com/repos/cloudflare/cloudflared/releases/latest" }

function assertOfficialUrl(value: string): URL {
  const parsed = new URL(value)
  if (parsed.protocol !== "https:" || !OFFICIAL_HOSTS.has(parsed.hostname)) throw new Error("O download do cloudflared saiu do GitHub oficial.")
  return parsed
}

async function download(url: string, redirects = 0): Promise<Buffer> {
  if (redirects > 4) throw new Error("Redirecionamentos demais ao baixar o cloudflared.")
  assertOfficialUrl(url)
  const response = await fetch(url, { redirect: "manual", headers: { "User-Agent": "RunasVTT" } })
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location")
    if (!location) throw new Error("Redirecionamento sem destino no download do cloudflared.")
    return download(assertOfficialUrl(new URL(location, url).toString()).toString(), redirects + 1)
  }
  if (!response.ok) throw new Error(`Download do cloudflared falhou (${response.status}).`)
  return Buffer.from(await response.arrayBuffer())
}

function checksum(value: Buffer): string { return createHash("sha256").update(value).digest("hex") }

function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") }

/** Extrai o checksum do arquivo citado no corpo do release oficial. */
export function releaseChecksum(body: string, assetName: string): string | null {
  const match = body.match(new RegExp(`(?:^|\\n)\\s*${escapeRegex(assetName)}\\s*:\\s*([a-f0-9]{64})\\b`, "i"))
  return match?.[1]?.toLowerCase() ?? null
}

async function latestRelease(): Promise<ReleaseMetadata> {
  const response = await fetch(officialApiUrl(), {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "RunasVTT" },
  })
  if (!response.ok) throw new Error(`Metadados do release do cloudflared falharam (${response.status}).`)
  const raw = await response.json() as { body?: unknown; assets?: unknown }
  const body = typeof raw.body === "string" ? raw.body : ""
  const assets = Array.isArray(raw.assets)
    ? raw.assets.flatMap((value) => {
      if (!value || typeof value !== "object") return []
      const record = value as Record<string, unknown>
      return typeof record.name === "string" && typeof record.browser_download_url === "string"
        ? [{ name: record.name, browserDownloadUrl: record.browser_download_url }]
        : []
    })
    : []
  return { body, assets }
}

/** Baixa somente do release oficial e confere o SHA-256 publicado pelo release antes de usar. */
export async function ensureCloudflared(userData: string): Promise<string> {
  const asset = assetForPlatform()
  const directory = join(userData, "cloudflared")
  const target = join(directory, asset.executable)
  const checksumPath = `${target}.sha256`
  const release = await latestRelease()
  const metadata = release.assets.find((candidate) => candidate.name === asset.name)
  const expected = releaseChecksum(release.body, asset.name)
  if (!metadata || !expected) throw new Error(`O release oficial não publicou o checksum de ${asset.name}.`)
  const downloadUrl = assertOfficialUrl(metadata.browserDownloadUrl).toString()
  try {
    const current = await readFile(target)
    if (expected === checksum(current)) return target
  } catch { /* download abaixo */ }

  const binary = await download(downloadUrl)
  if (expected !== checksum(binary)) throw new Error("A verificação SHA-256 do cloudflared falhou; o arquivo não será executado.")
  await mkdir(directory, { recursive: true })
  const temporary = `${target}.download-${process.pid}`
  await writeFile(temporary, binary, { mode: 0o700 })
  await writeFile(`${temporary}.sha256`, expected, "utf8")
  await rename(temporary, target)
  await rename(`${temporary}.sha256`, checksumPath)
  if (platform !== "win32") await chmod(target, 0o700)
  return target
}

/** Onde e como o túnel se conectou à borda da Cloudflare (linha "Registered tunnel connection"). */
export interface TunnelDetails { location: string | null; protocol: string | null }

export interface TunnelOptions {
  /** O `cloudflared` encerrou **depois** de o túnel estar de pé: o link público morreu. */
  onExit?: (code: number | null) => void
  /** Quanto esperar o túnel ficar pronto antes de desistir. */
  timeoutMs?: number
}

/** Tempo máximo para o túnel registrar a conexão com a borda da Cloudflare. */
export const TUNNEL_TIMEOUT_MS = 60_000
/** Falhas de conexão com a borda antes de concluir que a rede bloqueia o `cloudflared`. */
const EDGE_FAILURES_BEFORE_GIVING_UP = 2

export const EDGE_BLOCKED_MESSAGE = "Esta rede não deixa o cloudflared falar com a Cloudflare: a saída na porta 7844 (TCP e UDP) está bloqueada, então o link público não funciona daqui. Use outra rede (por exemplo, o 4G do celular compartilhado) ou peça ao administrador da rede para liberar a porta 7844. A transmissão na rede local continua funcionando."

/** Quantas vezes o `cloudflared` disse que não alcançou a borda da Cloudflare. */
export function edgeFailures(output: string): number {
  return output.match(/Unable to establish connection with Cloudflare edge/gi)?.length ?? 0
}

/**
 * Argumentos do `cloudflared`. No Linux o QUIC (UDP) esbarra no buffer de
 * recebimento do kernel (`net.core.rmem_max`, ~208 KB contra os ~7 MB que o
 * `cloudflared` pede), o que limita a vazão dos mapas; HTTP/2 sobre TCP não
 * depende dessa configuração, que exigiria `sudo`.
 */
export function tunnelArgs(port: number, os: NodeJS.Platform = platform): string[] {
  return ["tunnel", "--no-autoupdate", ...(os === "linux" ? ["--protocol", "http2"] : []), "--url", `http://127.0.0.1:${port}`]
}

/** `location` e `protocol` da primeira conexão registrada, ou `null` se ainda não houve. */
export function parseTunnelDetails(output: string): TunnelDetails | null {
  const line = output.split(/\r?\n/).find((candidate) => /Registered tunnel connection/i.test(candidate))
  if (!line) return null
  return { location: line.match(/\blocation=([\w-]+)/i)?.[1] ?? null, protocol: line.match(/\bprotocol=([\w-]+)/i)?.[1] ?? null }
}

export function startCloudflared(binary: string, port: number, options: TunnelOptions = {}): { process: ChildProcess; url: Promise<string>; details: () => TunnelDetails | null } {
  const child = spawn(binary, tunnelArgs(port), { stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
  let details: TunnelDetails | null = null
  const url = new Promise<string>((resolveUrl, rejectUrl) => {
    let output = ""
    let tunnelUrl: string | null = null
    let found = false
    let failures = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const resolve = (value: string) => { if (timer) clearTimeout(timer); resolveUrl(value) }
    // Sem isto, uma rede que bloqueia a porta 7844 deixava o painel em
    // "Gerando link…" para sempre: o `cloudflared` só repete a tentativa.
    const reject = (error: Error) => { if (timer) clearTimeout(timer); rejectUrl(error); if (!found) child.kill() }
    timer = setTimeout(() => reject(new Error(`O túnel não ficou pronto em ${Math.round((options.timeoutMs ?? TUNNEL_TIMEOUT_MS) / 1000)} s. Confira a conexão com a internet e se a saída na porta 7844 está liberada.`)), options.timeoutMs ?? TUNNEL_TIMEOUT_MS)
    // Os dois canais continuam sendo lidos depois da URL: um pipe cheio
    // bloquearia o cloudflared e derrubaria o túnel no meio da sessão.
    // A URL só é entregue depois que a conexão com a borda da Cloudflare foi
    // registrada; antes disso o endereço existe, mas ainda não atende.
    const onData = (chunk: Buffer) => {
      if (found) return
      const text = chunk.toString("utf8")
      failures += edgeFailures(text)
      output = `${output}${text}`.slice(-12000)
      if (failures >= EDGE_FAILURES_BEFORE_GIVING_UP) { reject(new Error(EDGE_BLOCKED_MESSAGE)); return }
      tunnelUrl ??= quickTunnelUrl(output)
      if (tunnelUrl && /Registered tunnel connection/i.test(output)) { found = true; details = parseTunnelDetails(output); resolve(tunnelUrl) }
    }
    child.stdout?.on("data", onData)
    child.stderr?.on("data", onData)
    child.once("error", reject)
    child.once("exit", (code) => {
      if (!found) reject(new Error(`cloudflared encerrou antes de criar o túnel (${code ?? "sem código"}).`))
      else options.onExit?.(code)
    })
  })
  return { process: child, url, details: () => details }
}

/** Primeiro endereço de Quick Tunnel citado na saída do cloudflared. */
export function quickTunnelUrl(output: string): string | null {
  return output.match(/https:\/\/(?!api\.)[-a-z0-9]+\.trycloudflare\.com/i)?.[0] ?? null
}

/** Link que os jogadores abrem: o túnel só repassa a página se ela levar a chave da sessão. */
export function publicPlayerUrl(tunnelUrl: string, key: string): string {
  const url = new URL(tunnelUrl)
  url.pathname = "/"
  url.search = `?k=${encodeURIComponent(key)}`
  return url.toString()
}
