import { app, dialog, type BrowserWindow } from "electron"
import { mkdtemp, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"

/** Imprime as páginas prontas; não recebe HTML ou caminhos arbitrários do renderer. */
export async function exportBookPdf(window: BrowserWindow, name: string, smoke = false): Promise<string | null> {
  const ready = await window.webContents.executeJavaScript(`Boolean(document.body.classList.contains('book-preview-open') && document.querySelector('.book-preview-output[aria-busy="false"] .pagedjs_page'))`)
  if (!ready) throw new Error("Aguarde a prévia terminar antes de exportar o PDF.")
  const safeName = name.replace(/[\\/:*?"<>|]/g, "-").slice(0, 115).replace(/\.pdf$/i, "") + ".pdf"
  const result = smoke ? { canceled: false, filePath: join(await mkdtemp(join(tmpdir(), "runas-book-pdf-")), safeName) }
    : await dialog.showSaveDialog(window, { defaultPath: join(app.getPath("documents"), safeName), filters: [{ name: "PDF", extensions: ["pdf"] }] })
  if (result.canceled || !result.filePath) return null
  const stillReady = await window.webContents.executeJavaScript(`Boolean(document.querySelector('.book-preview-output[aria-busy="false"] .pagedjs_page'))`)
  if (!stillReady) throw new Error("A prévia mudou. Aguarde a paginação e exporte novamente.")
  const bytes = await window.webContents.printToPDF({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false, margins: { top: 0, bottom: 0, left: 0, right: 0 } })
  await writeFile(result.filePath, bytes)
  return result.filePath
}
