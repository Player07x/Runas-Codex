import { parseNote } from "./parse"
import { availableAttachmentPath } from "./attachments"
import { basename, extname } from "./text"
import type { VaultIndex } from "./vault-index"
export const DEFAULT_IMAGE_FOLDER = "Anexos/Imagens"
export const isVaultImage = (path: string) => /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i.test(path)
/** Imagens importadas, coladas e recortadas têm um destino comum em todos os espaços. */
export function folderForAttachment(fileName: string, otherFolder: string): string { return isVaultImage(fileName) ? DEFAULT_IMAGE_FOLDER : otherFolder }
export function linkedImages(index: VaultIndex, from: string, text: string): string[] {
  const result = new Set<string>()
  for (const link of parseNote(text).links) {
    const dest = index.resolve(link, from).dest
    if (dest && isVaultImage(dest)) result.add(dest)
  }
  return [...result]
}
export function imageLinkAt(index: VaultIndex, from: string, text: string, at: number): string | null {
  const link = parseNote(text).links.find(link => link.start <= at && at <= link.end)
  const dest = link ? index.resolve(link, from).dest : null
  return dest && isVaultImage(dest) ? dest : null
}
export function imageRenameTarget(path: string, name: string, folder: string): string {
  const ext = extname(path)
  const stem = name.trim().replace(new RegExp(ext.replace(".", "\\.") + "$", "i"), "")
  return `${folder.trim().replace(/^\/+|\/+$/g, "")}/${stem}${ext}`.replace(/^\//, "")
}

/** Simula os nomes finais antes de mover, reservando os destinos sem colidir entre si. */
export function planImageMoves(index: VaultIndex): { from: string; to: string }[] {
  const existing = new Set(index.allFiles().map(file => file.path)), moves: { from: string; to: string }[] = []
  for (const file of index.allFiles().filter(file => isVaultImage(file.path) && !file.path.startsWith(DEFAULT_IMAGE_FOLDER + "/")).sort((a,b) => a.path.localeCompare(b.path,"pt-BR"))) {
    const to = availableAttachmentPath(DEFAULT_IMAGE_FOLDER, basename(file.path), existing)
    existing.add(to); moves.push({ from:file.path, to })
  }
  return moves
}
