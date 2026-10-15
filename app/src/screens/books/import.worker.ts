import { importDocx } from "../../core/books-import/docx"
import { importHomebrewery } from "../../core/books-import/homebrewery"
import type { ImportOptions } from "../../core/books-import/types"

self.onmessage = async (event: MessageEvent<{ bytes: Uint8Array; options: ImportOptions; format: "docx" | "markdown" }>) => {
  try { self.postMessage({ book: event.data.format === "docx" ? await importDocx(event.data.bytes, event.data.options) : importHomebrewery(new TextDecoder().decode(event.data.bytes), event.data.options) }) }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "Não foi possível ler esse DOCX." }) }
}
