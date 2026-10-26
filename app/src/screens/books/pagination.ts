import type { PrintOptions } from "../../core/books-finish"
import { Previewer } from "./vendor/paged-0.4.3.js"
import { pageRules, type BookSize } from "../../core/books-preview"
import type { BookLayout } from "../../core/book-layout"

export interface Pagination { total: number; milliseconds: number; dispose(): void }
/** O HTML vem da fonte desenhada pelo Markdown compartilhado (e sanitizada por ele); ver `printableHtml`. */
export async function paginate(html: string, target: HTMLElement, size: BookSize, options?: PrintOptions, layout?: BookLayout, newChapter = true): Promise<Pagination> {
  const previewer = new Previewer()
  const started = performance.now()
  // Passar uma lista explícita impede o Paged.js de retirar folhas de estilo da aplicação.
  try {
    const flow = await previewer.preview(html, [{ [location.href]: pageRules(size, options, layout, newChapter) }], target)
    return { total: flow.total, milliseconds: performance.now() - started, dispose() {
      previewer.chunker.stop()
      previewer.chunker.destroy()
      previewer.polisher.destroy()
    } }
  } catch (error) {
    try { previewer.chunker.destroy() } catch { /* pode falhar antes de criar as páginas */ }
    previewer.polisher.destroy()
    throw error
  }
}

/** Aguarda também os componentes assíncronos (KaTeX/Mermaid), sem paginar placeholders. */
export async function readyForPagination(source: HTMLElement, signal: AbortSignal): Promise<void> {
  for (const details of source.querySelectorAll("details")) details.open = true
  for (const title of source.querySelectorAll<HTMLElement>(".callout-title")) {
    if (title.style.cursor === "pointer" && !title.parentElement?.querySelector(":scope > .callout-body")) title.click()
  }
  for (const img of source.querySelectorAll("img")) img.loading = "eager"
  const deadline = performance.now() + 15000
  while (source.querySelector(".math.loading, .mermaid.loading") || [...source.querySelectorAll("img")].some((img) => !img.complete)) {
    if (signal.aborted) throw new DOMException("Cancelado", "AbortError")
    if (performance.now() > deadline) throw new Error("Um diagrama ou imagem não terminou de carregar. Confira o capítulo e tente atualizar.")
    await new Promise((resolve) => setTimeout(resolve, 40))
  }
  await document.fonts.ready
  if (signal.aborted) throw new DOMException("Cancelado", "AbortError")
}

/** Pontos por polegada das imagens no livro: `imagens` do livro (Tela 150, Gráfica 300, Original sem mexer). */
export const IMAGE_PPI = { tela: 150, grafica: 300, original: 0 } as const
export type ImageQuality = keyof typeof IMAGE_PPI
const reducedCache = new Map<string, Promise<string | null>>()

/** Uma versão menor da imagem para o tamanho em que ela sai no papel; `null` se já é pequena ou não dá para reduzir. */
function reduce(img: HTMLImageElement, ppi: number, readBytes?: (src: string) => Promise<Uint8Array | null>): Promise<string | null> {
  const cssWidth = img.getBoundingClientRect().width
  const target = Math.ceil((cssWidth / 96) * ppi)
  if (!ppi || !cssWidth || !img.naturalWidth || img.naturalWidth <= target * 1.15) return Promise.resolve(null)
  const key = `${img.currentSrc || img.src}|${target}`
  let found = reducedCache.get(key)
  if (!found) {
    found = (async () => {
      try {
        const height = Math.max(1, Math.round((img.naturalHeight * target) / img.naturalWidth))
        // Os anexos do cofre vêm de outra origem (vault-file:) e sujariam o canvas: lidos como bytes, não sujam.
        const bytes = await readBytes?.(img.currentSrc || img.src)
        const bitmap = await createImageBitmap(bytes ? new Blob([bytes as BlobPart]) : img, { resizeWidth: target, resizeHeight: height, resizeQuality: "high" })
        const canvas = document.createElement("canvas")
        canvas.width = target; canvas.height = height
        const context = canvas.getContext("2d")!
        context.drawImage(bitmap, 0, 0)
        bitmap.close()
        // Com transparência fica PNG; sem, JPEG (bem menor para ilustrações e fotos).
        const pixels = context.getImageData(0, 0, target, height).data
        let alpha = false
        for (let i = 3; i < pixels.length; i += 16) if (pixels[i]! < 250) { alpha = true; break }
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, alpha ? "image/png" : "image/jpeg", 0.9))
        return blob ? URL.createObjectURL(blob) : null
      } catch { return null }
    })()
    reducedCache.set(key, found)
  }
  return found
}

/**
 * O HTML que vai para o Paged.js: a fonte com as imagens reduzidas para a qualidade escolhida (o PDF de 7 páginas do
 * Valknut tinha 17 MB com as ilustrações no tamanho original). Os arquivos do cofre não mudam. Também conta as imagens
 * que ficam abaixo de 200 ppi no tamanho impresso, para avisar.
 */
export async function printableHtml(source: HTMLElement, quality: ImageQuality, readBytes?: (src: string) => Promise<Uint8Array | null>, transform?: (clone: HTMLElement) => void): Promise<{ html: string; lowResolution: number }> {
  const images = [...source.querySelectorAll("img")]
  const clone = source.cloneNode(true) as HTMLElement
  const copies = [...clone.querySelectorAll("img")]
  let lowResolution = 0
  await Promise.all(images.map(async (img, i) => {
    const cssWidth = img.getBoundingClientRect().width
    if (cssWidth && img.naturalWidth && img.naturalWidth < (cssWidth / 96) * 200) lowResolution++
    const url = await reduce(img, IMAGE_PPI[quality], readBytes)
    if (url && copies[i]) { copies[i]!.src = url; copies[i]!.removeAttribute("srcset") }
  }))
  transform?.(clone)
  return { html: clone.innerHTML, lowResolution }
}
