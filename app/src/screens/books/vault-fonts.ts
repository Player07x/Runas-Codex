import { fontFromFile } from "../../core/book-style"
import type { VaultIndex } from "../../core/vault-index"
import type { Platform } from "../../platform/platform"
import { TEXT_FONTS, TITLE_FONTS } from "./book-fonts"

/**
 * Fontes do próprio cofre (.ttf, .otf, .woff, .woff2) para o livro (L3, ADR 0033): os bytes vêm pelo Platform e a
 * fonte é registrada na hora com FontFace, sem rede e sem mudar a CSP. No Obsidian elas não fazem diferença.
 */
export function vaultFonts(index: VaultIndex): { name: string; path: string }[] {
  const builtIn = new Set<string>([...TITLE_FONTS, ...TEXT_FONTS])
  const seen = new Set<string>()
  return index.allFiles().flatMap((file) => {
    const name = fontFromFile(file.path)
    if (!name || builtIn.has(name) || seen.has(name)) return []
    seen.add(name)
    return [{ name, path: file.path }]
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
}

const loaded = new Map<string, Promise<void>>()

/** Registra as fontes do cofre que o livro usa; as que já vêm com o app não precisam. Falha vira aviso, não erro. */
export async function loadVaultFonts(index: VaultIndex, platform: Platform, names: string[]): Promise<string[]> {
  const files = vaultFonts(index)
  const missing: string[] = []
  await Promise.all(names.map(async (name) => {
    const file = files.find((f) => f.name === name)
    if (!file) return
    const key = `${file.path}|${index.allFiles().find((f) => f.path === file.path)?.mtime ?? ""}`
    let found = loaded.get(key)
    if (!found) {
      found = (async () => {
        const bytes = await platform.readBinary(file.path)
        const face = new FontFace(name, bytes.slice().buffer)
        await face.load()
        document.fonts.add(face)
      })()
      loaded.set(key, found)
    }
    try { await found } catch { loaded.delete(key); missing.push(name) }
  }))
  return missing
}
