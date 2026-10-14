import { mkdir, realpath, rename, stat, writeFile } from "node:fs/promises"
import { extname, join, sep } from "node:path"
import { randomBytes } from "node:crypto"
import { VAULT_FILE_SCHEME } from "../../../app/src/platform/bridge"
import { resolveInside, VaultError } from "./vault"
import { fileStream, parseRange } from "./vtt/world-assets"

/**
 * Anexos do cofre na interface (`vault-file://cofre/<caminho>`): imagens, áudio, vídeo e PDF das notas. Só tipos de
 * mídia, nada em pastas com ponto e nada fora do cofre (as mesmas regras de leitura das notas).
 */
export const VAULT_FILE_TYPES: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
  ".svg": "image/svg+xml", ".bmp": "image/bmp",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg", ".m4a": "audio/mp4", ".flac": "audio/flac", ".opus": "audio/ogg", ".3gp": "audio/3gpp",
  ".mp4": "video/mp4", ".webm": "video/webm", ".ogv": "video/ogg", ".mov": "video/quicktime", ".mkv": "video/x-matroska",
  ".pdf": "application/pdf",
}

export function vaultFilePrivilege() {
  // Como https: o `<audio>`/`<video>` pede trechos (Range) e o Chromium só faz isso em esquemas "padrão".
  return { scheme: VAULT_FILE_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
}

function hidden(path: string): boolean {
  return path.split("/").some((part) => part.startsWith("."))
}

/** Caminho real de um anexo que pode ser mostrado; `null` se o tipo não é de mídia ou o caminho é proibido. */
export async function mediaFile(root: string, path: string): Promise<string | null> {
  if (hidden(path) || !VAULT_FILE_TYPES[extname(path).toLowerCase()]) return null
  try {
    return await resolveInside(root, path)
  } catch {
    return null
  }
}

/** Resposta do protocolo `vault-file://` (com Range, para áudio e vídeo começarem de qualquer ponto). */
export async function vaultFileResponse(root: string | null, url: string, range: string | null): Promise<Response> {
  const parsed = new URL(url)
  if (!root || parsed.hostname !== "cofre") return new Response(null, { status: 404 })
  let path: string
  try {
    path = parsed.pathname.slice(1).split("/").map(decodeURIComponent).join("/")
  } catch {
    return new Response(null, { status: 400 })
  }
  const file = await mediaFile(root, path)
  if (!file) return new Response(null, { status: 404 })
  // `no-cache`: o anexo pode mudar no disco (outra imagem com o mesmo nome).
  const headers: Record<string, string> = { "content-type": VAULT_FILE_TYPES[extname(file).toLowerCase()]!, "cache-control": "no-cache", "accept-ranges": "bytes", "x-content-type-options": "nosniff" }
  try {
    const { size } = await stat(file)
    if (!range) return new Response(fileStream(file), { headers: { ...headers, "content-length": String(size) } })
    const slice = parseRange(range, size)
    if (!slice) return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${size}` } })
    return new Response(fileStream(file, slice.start, slice.end), { status: 206, headers: { ...headers, "content-range": `bytes ${slice.start}-${slice.end}/${size}`, "content-length": String(slice.end - slice.start + 1) } })
  } catch {
    return new Response(null, { status: 404 })
  }
}

export const SNIPPET_PATH = ".obsidian/snippets/runas-codex.css"

/**
 * Grava o snippet `runas-codex.css` do Obsidian — o único arquivo dentro de `.obsidian` que o app escreve. Ativar o
 * snippet continua sendo escolha do usuário (Configurações › Aparência no Obsidian).
 */
export async function installSnippet(root: string, css: string): Promise<string> {
  if (typeof css !== "string" || css.length > 200_000) throw new VaultError("Snippet inválido.")
  // `.obsidian` pode ser um link simbólico: a pasta real precisa continuar dentro do cofre antes de criar qualquer coisa.
  const config = join(root, ".obsidian")
  await mkdir(config, { recursive: true })
  const [realRoot, realConfig] = [await realpath(root), await realpath(config)]
  if (!realConfig.startsWith(realRoot + sep)) throw new VaultError("A pasta .obsidian fica fora do cofre.")
  await mkdir(join(realConfig, "snippets"), { recursive: true })
  const folder = await realpath(join(realConfig, "snippets"))
  if (!folder.startsWith(realRoot + sep)) throw new VaultError("A pasta .obsidian/snippets fica fora do cofre.")
  const target = join(folder, "runas-codex.css")
  const temp = join(folder, `.runas-codex.css.${randomBytes(4).toString("hex")}.runas-tmp`)
  await writeFile(temp, css, "utf8")
  await rename(temp, target)
  return SNIPPET_PATH
}
