import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { createWriteStream } from "node:fs"
import { chmod, copyFile, mkdir, rename, rm } from "node:fs/promises"
import { join } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as WebReadableStream } from "node:stream/web"
import { installDeb } from "./deb-update"
import { checksumFor, parseReleases, pickUpdate, RELEASES_REPO, type UpdateInfo, type UpdateInstallResult, type UpdateTarget } from "../../../app/src/core/updates"

/**
 * "Verificar atualizações" (ADR 0017): a única ida à internet fora da sala do VTT, e só quando o usuário clica. Lê as
 * releases do GitHub, baixa o instalador deste sistema da própria release, confere pelo `SHA256SUMS.txt` e instala.
 */
export const RELEASES_API = `https://api.github.com/repos/${RELEASES_REPO}/releases?per_page=20`
/** Só se baixa o que está nas releases deste repositório (o GitHub redireciona para o servidor de arquivos dele). */
export const DOWNLOAD_PREFIX = `https://github.com/${RELEASES_REPO}/releases/download/`

const TIMEOUT_MS = 20_000

export function updateTarget(platform = process.platform, env = process.env): UpdateTarget | null {
  if (platform === "win32") return "windows"
  if (platform === "linux") return env.APPIMAGE ? "appimage" : "deb"
  return null
}

export async function checkForUpdate(current: string, target: UpdateTarget, api = RELEASES_API, fetcher: typeof fetch = fetch): Promise<UpdateInfo> {
  const response = await fetcher(api, { headers: { accept: "application/vnd.github+json", "user-agent": `Runas-Codex/${current}` }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!response.ok) throw new Error(response.status === 403 ? "O GitHub limitou as consultas por agora. Tente de novo em alguns minutos." : `O GitHub respondeu ${response.status}.`)
  return pickUpdate(current, parseReleases(await response.json()), target)
}

/**
 * Baixa o instalador da versão encontrada para `folder` e confere a soma SHA-256 publicada na mesma release. Devolve
 * o caminho do arquivo; se a soma não bate, apaga e recusa.
 */
export async function downloadUpdate(info: UpdateInfo, folder: string, onProgress: (received: number, total: number) => void, prefix = DOWNLOAD_PREFIX, fetcher: typeof fetch = fetch): Promise<string> {
  const { asset, checksums } = info
  if (!info.newer || !asset) throw new Error("Não há instalador novo para este sistema.")
  if (!checksums) throw new Error("A release não tem o SHA256SUMS.txt; o app não instala sem conferir o arquivo.")
  for (const url of [asset.url, checksums.url]) if (!url.startsWith(prefix)) throw new Error("Endereço de download inesperado.")
  const sums = await fetcher(checksums.url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!sums.ok) throw new Error(`Não foi possível baixar as somas (${sums.status}).`)
  const expected = checksumFor(await sums.text(), asset.name)
  if (!expected) throw new Error(`O SHA256SUMS.txt não tem a soma de ${asset.name}.`)

  const response = await fetcher(asset.url)
  if (!response.ok || !response.body) throw new Error(`Não foi possível baixar o instalador (${response.status}).`)
  const total = Number(response.headers.get("content-length")) || asset.size
  await mkdir(folder, { recursive: true })
  const file = join(folder, asset.name)
  const partial = `${file}.part`
  const hash = createHash("sha256")
  let received = 0
  const counter = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength
      hash.update(chunk)
      onProgress(received, total)
      controller.enqueue(chunk)
    },
  })
  try {
    await pipeline(Readable.fromWeb(response.body.pipeThrough(counter) as WebReadableStream<Uint8Array>), createWriteStream(partial))
    if (hash.digest("hex") !== expected) throw new Error("O arquivo baixado não confere com a soma SHA-256 da release. Nada foi instalado.")
    await rename(partial, file)
  } catch (error) {
    await rm(partial, { force: true })
    throw error
  }
  return file
}

/**
 * Instala o arquivo baixado:
 * - Windows: abre o instalador (NSIS) e o app fecha para ele trocar os arquivos;
 * - AppImage: troca o próprio arquivo do app (cópia ao lado e troca de uma vez) e reinicia;
 * - `.deb`: instala pelo APT, com autorização gráfica do polkit, e só reinicia se a instalação terminar.
 */
export async function installUpdate(file: string, target: UpdateTarget, actions: { openPath(path: string): Promise<string>; quit(): void; relaunch(execPath: string): void; beforeRestart?(): Promise<void> }, env = process.env, debInstaller = installDeb): Promise<UpdateInstallResult> {
  if (target === "windows") {
    spawn(file, [], { detached: true, stdio: "ignore" }).unref()
    setTimeout(() => actions.quit(), 800)
    return "instalador-aberto"
  }
  if (target === "appimage") {
    const current = env.APPIMAGE
    if (!current) throw new Error("Este app não está rodando como AppImage.")
    const next = `${current}.novo`
    await copyFile(file, next)
    await chmod(next, 0o755)
    await rename(next, current)
    await actions.beforeRestart?.()
    actions.relaunch(current)
    return "reiniciar"
  }
  await debInstaller(file)
  await actions.beforeRestart?.()
  actions.relaunch(process.execPath)
  return "reiniciar"
}
