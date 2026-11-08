import { articleImage, articleKind } from "../core/wiki"
import { noteToken, type WikiToken } from "../core/wiki-token"
import type { IndexedNote, VaultIndex } from "../core/vault-index"

export interface WikiTokenSource {
  notePath: string
  name: string
  image: string | null
  token: WikiToken
  meta: string
}

/** Fonte local para a aba “Da wiki”; o mestre remoto não passa índice nem plataforma. */
export function listWikiTokens(index: VaultIndex, root: string): WikiTokenSource[] {
  return index.notesIn(root).flatMap((note) => {
    const source = sourceOf(index, note)
    return source ? [source] : []
  })
}

/** A fonte de uma nota só (arrastar da Wiki, Trocar nota…); `null` sem nota ou sem imagem. */
export function wikiTokenSource(index: VaultIndex, path: string): WikiTokenSource | null {
  const note = index.note(path)
  return note ? sourceOf(index, note) : null
}

function sourceOf(index: VaultIndex, note: IndexedNote): WikiTokenSource | null {
  const data = note.meta.frontmatter?.data ?? {}
  const own = noteToken(data)
  // Mapa não é token: a imagem dele (bloco `runas-mapa`) só vale se a nota tiver um token próprio.
  if (!own?.image && articleKind(data.tipo)?.id === "mapa") return null
  const token = own ?? { size: 1, disposition: "neutral", bars: [] as WikiToken["bars"] }
  // `token`/retrato guardam o alvo do link (`guarda.png`); a mesa lê os bytes pelo caminho no cofre.
  const target = token.image ?? articleImage(note)
  const image = target ? index.resolve({ kind: "wiki", embed: true, target, start: 0, end: 0, raw: "", inFrontmatter: true }, note.path).dest : null
  if (!image) return null
  return { notePath: note.path, name: note.name, image, token, meta: [articleKind(data.tipo)?.label, token.disposition === "friendly" ? "Aliado" : token.disposition === "hostile" ? "Hostil" : token.disposition === "player" ? "Jogador" : token.disposition === "secret" ? "Secreto" : "Neutro", token.bars[0] && `${token.bars[0].label} ${token.bars[0].value}/${token.bars[0].max}`].filter(Boolean).join(" · ") }
}
