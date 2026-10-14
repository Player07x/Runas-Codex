import { Previewer } from "./vendor/paged-0.4.3.js"
import { pageRules, type BookSize } from "../../core/books-preview"

export interface Pagination { total: number; milliseconds: number; dispose(): void }
/** A fonte já foi desenhada pelo Markdown compartilhado e sanitizada por ele. */
export async function paginate(source: HTMLElement, target: HTMLElement, size: BookSize): Promise<Pagination> {
  const previewer = new Previewer()
  const started = performance.now()
  // Passar uma lista explícita impede o Paged.js de retirar folhas de estilo da aplicação.
  try {
    const flow = await previewer.preview(source.innerHTML, [{ [location.href]: pageRules(size) }], target)
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
