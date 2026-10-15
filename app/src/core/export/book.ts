import { bookProperties, readBook } from "../books"
import { previewChapters, previewSettings } from "../books-preview"
import type { IndexedNote, VaultIndex } from "../vault-index"

/** Árvore já desenhada pelo leitor compartilhado. Não depende de DOM, React ou da plataforma. */
export type ExportNode = string | { tag: string; attrs: Record<string, string>; children: ExportNode[] }
export interface ExportAsset { name: string; mime: string; bytes: Uint8Array; width?: number; height?: number }
export interface ExportSection { title: string; kind: string; path: string; nodes: ExportNode[] }
export interface ExportBook {
  title: string; author: string; language: string; identifier: string
  theme: ReturnType<typeof previewSettings>["theme"]; size: ReturnType<typeof previewSettings>["size"]
  sections: ExportSection[]; assets: ExportAsset[]; css: string; warnings: string[]
}
export function bookExportPlan(index: VaultIndex, book: IndexedNote, draft?: { path: string; text: string }) {
  const structure = readBook(index, book)
  if (structure.error) throw new Error(structure.error)
  const missing = structure.items.filter((item) => !item.note)
  if (missing.length) throw new Error(`Corrija os links da estrutura antes de exportar: ${missing.map((item) => item.link).join(", ")}`)
  const data = bookProperties(book)
  return {
    title: book.name, author: typeof data.autor === "string" ? data.autor : "", language: "pt-BR",
    identifier: `urn:runas:${encodeURIComponent(book.path)}`, ...previewSettings(book),
    sections: [
      { path: book.path, title: book.name, kind: "capa", body: "" },
      ...(typeof data.creditos === "string" && data.creditos.trim() ? [{ path: book.path, title: "Créditos", kind: "creditos", body: data.creditos }] : []),
      ...previewChapters(index, book, draft),
      ...(typeof data.contracapa === "string" && data.contracapa.trim() ? [{ path: book.path, title: "Contracapa", kind: "contracapa", body: data.contracapa }] : []),
    ],
  }
}
export const xml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
export const plainText = (node: ExportNode): string => typeof node === "string" ? node : node.children.map(plainText).join("")
export function nodeXml(node: ExportNode): string {
  if (typeof node === "string") return xml(node)
  const attrs = Object.entries(node.attrs).map(([key, value]) => ` ${key}="${xml(value)}"`).join("")
  if (["img", "br", "hr", "input", "wbr", "source", "col"].includes(node.tag)) return `<${node.tag}${attrs} />`
  return `<${node.tag}${attrs}>${node.children.map(nodeXml).join("")}</${node.tag}>`
}
