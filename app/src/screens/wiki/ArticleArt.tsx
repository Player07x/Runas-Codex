import { useState } from "react"
import type { IndexedNote } from "../../core/vault-index"
import { articleImage, articleKind } from "../../core/wiki"
import { articleCategory, categoryLook } from "../../core/personalization"
import { toneStyle } from "../../core/tones"
import { emblemIcon } from "../../components/kit/Emblem"
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
  // Sem imagem: o ícone e a cor da categoria (ADR 0027), ou a inicial.
  const wikiRoot = /^Wikis\/[^/]+\//.exec(note.path)?.[0]
  const category = wikiRoot && vault.index ? articleCategory(note.path, wikiRoot) : null
  const look = category && vault.index && !(url && failed !== url) ? categoryLook(vault.index, category) : null
  const Emblem = emblemIcon(look?.emblem)
  return <span className={`wiki-article-art ${size}${look?.tone ? " toned" : ""}`} style={toneStyle(look?.tone)} aria-hidden="true">
    {url && failed !== url ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFailed(url!)} /> : Emblem ? <Emblem className="wiki-art-emblem" /> : <span className="wiki-art-initial">{Array.from(note.name.trim())[0]?.toLocaleUpperCase("pt-BR") ?? "?"}</span>}
  </span>
}
