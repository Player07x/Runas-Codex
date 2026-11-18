import { createHash, randomBytes } from "node:crypto"
import { mkdir, rename, stat, writeFile } from "node:fs/promises"
import { extname, join } from "node:path"

/** Reduz a imagem para `width` px de largura; `null` se ela já é desse tamanho ou menor, ou se não deu para ler. */
export type RenderThumbnail = (file: string, width: number, type: "image/png" | "image/jpeg") => Promise<Buffer | null>

/** Tipos que o `nativeImage` lê em todos os sistemas. GIF (animado), SVG e WebP vão inteiros. */
const RASTER: Record<string, "image/png" | "image/jpeg"> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" }

/**
 * U86: miniaturas das capas e retratos, guardadas na pasta de dados do app (nunca no cofre). A chave leva o caminho, o
 * tamanho e a data do arquivo: trocar a imagem no disco gera outra miniatura. Imagem já pequena fica marcada para não
 * ser lida de novo.
 */
export function createThumbnailer(cacheDir: string, render: RenderThumbnail) {
  const running = new Map<string, Promise<{ path: string; type: string } | null>>()
  const exists = (path: string) => stat(path).then(() => true, () => false)

  async function make(file: string, width: number, type: "image/png" | "image/jpeg", key: string) {
    const out = join(cacheDir, key + (type === "image/png" ? ".png" : ".jpg"))
    const small = join(cacheDir, key + ".inteira")
    if (await exists(out)) return { path: out, type }
    if (await exists(small)) return null
    await mkdir(cacheDir, { recursive: true })
    const bytes = await render(file, width, type)
    // Grava num nome temporário e troca: uma leitura no meio nunca vê a miniatura pela metade.
    const temp = join(cacheDir, `.${key}.${randomBytes(4).toString("hex")}.tmp`)
    await writeFile(temp, bytes ?? "")
    await rename(temp, bytes ? out : small)
    return bytes ? { path: out, type } : null
  }

  return {
    async thumbnail(file: string, width: number) {
      const type = RASTER[extname(file).toLowerCase()]
      if (!type) return null
      const { size, mtimeMs } = await stat(file)
      const key = createHash("sha256").update(`${file}\0${size}\0${Math.trunc(mtimeMs)}\0${width}`).digest("hex").slice(0, 32)
      // Duas telas pedindo a mesma miniatura ao mesmo tempo: uma só leitura da imagem grande.
      let job = running.get(key)
      if (!job) {
        job = make(file, width, type, key).finally(() => running.delete(key))
        running.set(key, job)
      }
      return job
    },
  }
}

export type Thumbnailer = ReturnType<typeof createThumbnailer>
