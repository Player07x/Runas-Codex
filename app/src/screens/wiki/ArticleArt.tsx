import { useState } from "react"
import type { IndexedNote } from "../../core/vault-index"
import { articleImage, articleKind } from "../../core/wiki"
import { vaultNoteSet } from "../../lib/vault-notes"
import { useVault } from "../../platform/VaultProvider"
/** Mesma resolução dos embeds, sem carregar a nota ou mudar o leitor compartilhado. */
export function ArticleArt({ note, size = "cover" }: { note: IndexedNote; size?: "cover" | "thumb" | "list" }) {
  const vault = useVault(), [failed, setFailed] = useState<string | null>(null)
  const target = articleImage(note)
  let url: string | undefined
  if (target && vault.index && vault.platform.kind !== "memory") {
    const set = vaultNoteSet(vault.index, note.path, {}, vault.platform)
    const data = note.meta.frontmatter?.data ?? {}
    const propertyImage = articleKind(data.tipo)?.fields.some(field => field.kind === "imagem" && String(data[field.key] ?? "").trim())
    const bodyLink = !propertyImage ? note.meta.links.find(link => link.embed && !link.inFrontmatter && link.target === target) : undefined
    const found = set.resolve?.(target, bodyLink?.kind ?? "wiki")
    if (found) url = set.fileUrl?.(found.path)
  }
  return <span className={`wiki-article-art ${size}`} aria-hidden="true">
    {url && failed !== url ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url!)} /> : <span className="wiki-art-initial">{Array.from(note.name.trim())[0]?.toLocaleUpperCase("pt-BR") ?? "?"}</span>}
  </span>
}
