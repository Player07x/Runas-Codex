import type { PropertyValue } from "./properties"
import { parseEmblem, parseTone, withToneClass, type Tone } from "./tones"
import type { IndexedNote, VaultIndex } from "./vault-index"

/**
 * Personalização de campanhas e categorias da Wiki (ADR 0027): `cor`, `icone`, `capa` e, na categoria, `descricao`.
 * São propriedades da nota da campanha (`Campanhas/<nome>/<nome>.md`) e da nota da categoria
 * (`Wikis/<mundo>/<Pasta>/<Pasta>.md`, com `tipo: categoria`), então vão para o cofre e valem em todos os aparelhos.
 */

export interface Look {
  tone: Tone | null
  /** Id do ícone (`coroa`), de `EMBLEMS`. */
  emblem: string | null
  /** Alvo da imagem de capa, como num link (`Imagens/valdris.png`). */
  cover: string | null
  description?: string
}

export const EMPTY_LOOK: Look = { tone: null, emblem: null, cover: null }

/** `[[x.png]]`, `![[x.png]]`, `"x.png"` ou `[[x.png|legenda]]` → `x.png`. */
export function imageTarget(value: unknown): string | null {
  const text = (Array.isArray(value) ? value[0] : value)
  if (typeof text !== "string" || !text.trim()) return null
  const inner = /^!?\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]$/.exec(text.trim())?.[1] ?? text.trim().replace(/^!/, "")
  return inner.trim() || null
}

export function lookOf(data: Record<string, unknown> | undefined): Look {
  const d = data ?? {}
  const description = typeof d.descricao === "string" && d.descricao.trim() ? d.descricao.trim() : undefined
  return { tone: parseTone(d.cor), emblem: parseEmblem(d.icone), cover: imageTarget(d.capa), ...(description ? { description } : {}) }
}

const dataOf = (note: IndexedNote | undefined) => note?.meta.frontmatter?.data ?? {}

// ---------- Campanhas ----------

export const campaignHomePath = (name: string) => `Campanhas/${name}/${name}.md`

export function campaignOfPath(path: string): string | null {
  return /^Campanhas\/([^/]+)\//.exec(path)?.[1] ?? null
}

export function campaignLook(index: VaultIndex, name: string): Look {
  return lookOf(dataOf(index.note(campaignHomePath(name))))
}

// ---------- Categorias da Wiki ----------

/** Nota da categoria de uma pasta: `Personagens/Personagens.md`. */
export function categoryNotePath(folder: string): string {
  const clean = folder.replace(/\/$/, "")
  return `${clean}/${clean.split("/").at(-1)}.md`
}

/** Só conta como nota da categoria (e sai da lista de artigos) a que diz `tipo: categoria`. */
export function isCategoryNote(note: IndexedNote): boolean {
  const tipo = dataOf(note).tipo
  return typeof tipo === "string" && tipo.trim().toLocaleLowerCase("pt-BR") === "categoria" && note.path === categoryNotePath(note.path.slice(0, note.path.lastIndexOf("/")))
}

export function categoryLook(index: VaultIndex, folder: string): Look {
  const note = index.note(categoryNotePath(folder))
  return note && isCategoryNote(note) ? lookOf(dataOf(note)) : EMPTY_LOOK
}

/** A categoria de um artigo é a primeira pasta dentro da wiki (`Wikis/Mundo/Personagens`). */
export function articleCategory(path: string, wikiRoot: string): string | null {
  const root = wikiRoot.endsWith("/") ? wikiRoot : `${wikiRoot}/`
  if (!path.startsWith(root)) return null
  const first = path.slice(root.length).split("/")
  return first.length > 1 ? `${root}${first[0]}` : null
}

// ---------- Gravação ----------

/** Propriedades a gravar; `undefined` apaga a chave. `cssclasses` troca só a classe do tom (snippet do Obsidian). */
export function lookProperties(look: Look, current: Record<string, unknown>, withDescription: boolean): [string, PropertyValue | undefined][] {
  const classes = withToneClass(current.cssclasses, look.tone)
  const entries: [string, PropertyValue | undefined][] = [
    ["cor", look.tone ? look.tone.id : undefined],
    ["icone", look.emblem ?? undefined],
    ["capa", look.cover ? `[[${look.cover}]]` : undefined],
    ["cssclasses", classes.length ? classes : undefined],
  ]
  if (withDescription) entries.push(["descricao", look.description?.trim() || undefined])
  return entries
}
