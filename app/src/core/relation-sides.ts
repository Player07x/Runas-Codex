import { noteName } from "./text"
import type { VaultIndex } from "./vault-index"
import { articleKind, inverseKeyOf, linkTargetOf, propertyValues, RELATION_TYPES, resolveTarget } from "./wiki"

/**
 * Relações escritas dos dois lados (U74) e o conserto das que já existem (U75). Só a conta: quais propriedades de quais
 * notas mudam. Quem grava é a tela, pelo `setProperty` (versão lida; se a nota mudou fora do app, recusa).
 */
export interface PropertyWrite {
  path: string
  key: string
  /** A lista nova; vazia = tirar a propriedade. */
  value: string[]
}

const RELATION_KEYS = new Set(RELATION_TYPES.map((type) => type.key))

/** A frase que confere a escolha no “Adicionar”: quem é o quê de quem. */
export function relationSentence(key: string, here: string, other: string): string {
  const sentences: Record<string, string> = {
    pais: `${other} é pai ou mãe de ${here}`, filhos: `${other} é filho ou filha de ${here}`,
    conjuges: `${here} e ${other} são cônjuges`, irmaos: `${here} e ${other} são irmãos`,
    mentor: `${other} é mentor de ${here}`, discipulos: `${here} é mentor de ${other}`,
    membro_de: `${here} é membro de ${other}`, membros: `${other} é membro de ${here}`,
    lider_de: `${here} é líder de ${other}`, liderado_por: `${other} é líder de ${here}`,
    subordinado_a: `${here} é subordinado a ${other}`, subordinados: `${other} é subordinado a ${here}`,
    aliados: `${here} e ${other} são aliados`, inimigos: `${here} e ${other} são inimigos`, rivais: `${here} e ${other} são rivais`,
    em_guerra_com: `${here} está em guerra com ${other}`, paz_tensa_com: `${here} vive uma paz tensa com ${other}`,
    vassalo_de: `${here} é vassalo de ${other}`, vassalos: `${other} é vassalo de ${here}`,
    localizado_em: `${here} fica em ${other}`, contem: `${other} fica em ${here}`,
    relacoes: `${here} tem outra relação com ${other}`,
  }
  return sentences[key] ?? `${here} → ${other}`
}

/** O link mais curto que chega à nota a partir de `from`: o nome, ou o caminho quando há outra com o mesmo nome. */
export function linkTo(index: VaultIndex, path: string, from: string): string {
  const name = noteName(path)
  return resolveTarget(index, name, from) === path ? `[[${name}]]` : `[[${path.replace(/\.md$/i, "")}]]`
}

const entryFor = (link: string, note?: string) => `${link}${note?.trim() ? ` (${note.trim()})` : ""}`

/** Os valores de uma propriedade de relação e a nota a que cada um leva. */
function linksIn(index: VaultIndex, path: string, key: string): { raw: string; dest: string | null; note: string }[] {
  const data = index.note(path)?.meta.frontmatter?.data
  return propertyValues(data?.[key]).map((raw) => {
    const link = linkTargetOf(raw)
    return { raw, dest: link ? resolveTarget(index, link.target, path) : null, note: link?.extra ?? "" }
  })
}
const hasLink = (index: VaultIndex, path: string, key: string, dest: string) => linksIn(index, path, key).some((item) => item.dest === dest)

/** Rascunho das propriedades que mudam, para juntar várias mudanças numa gravação por nota e chave. */
class Draft {
  private lists = new Map<string, string[]>()
  constructor(private index: VaultIndex) {}
  private id = (path: string, key: string) => `${path}\u0000${key}`
  private list(path: string, key: string): string[] {
    const id = this.id(path, key)
    if (!this.lists.has(id)) this.lists.set(id, propertyValues(this.index.note(path)?.meta.frontmatter?.data?.[key]))
    return this.lists.get(id)!
  }
  add(path: string, key: string, entry: string, dest: string) {
    const list = this.list(path, key)
    const there = list.some((raw) => { const link = linkTargetOf(raw); return link && resolveTarget(this.index, link.target, path) === dest })
    if (!there) list.push(entry)
  }
  remove(path: string, key: string, dest: string) {
    const list = this.list(path, key)
    this.lists.set(this.id(path, key), list.filter((raw) => { const link = linkTargetOf(raw); return !link || resolveTarget(this.index, link.target, path) !== dest }))
  }
  writes(): PropertyWrite[] {
    const out: PropertyWrite[] = []
    for (const [id, value] of this.lists) {
      const [path, key] = id.split("\u0000") as [string, string]
      const before = propertyValues(this.index.note(path)?.meta.frontmatter?.data?.[key])
      if (before.length !== value.length || before.some((item, i) => item !== value[i])) out.push({ path, key, value })
    }
    return out
  }
}

/**
 * “Adicionar” uma relação: grava na nota aberta e, com `both`, a ligação de volta na outra (com o mesmo texto entre
 * parênteses). O que já está escrito não se repete.
 */
export function addRelationWrites(index: VaultIndex, here: string, key: string, other: string, options: { note?: string; both: boolean; link?: string }): PropertyWrite[] {
  const draft = new Draft(index)
  draft.add(here, key, entryFor(options.link ?? linkTo(index, other, here), options.note), other)
  if (options.both && index.note(other) && other !== here) draft.add(other, inverseKeyOf(key), entryFor(linkTo(index, here, other), options.note), here)
  return draft.writes()
}

/** Onde a ligação entre as duas notas está escrita: na de cá (`key`), na outra (a chave inversa) ou nas duas. */
export function relationSides(index: VaultIndex, here: string, key: string, other: string): { here: boolean; there: boolean } {
  return { here: hasLink(index, here, key, other), there: hasLink(index, other, inverseKeyOf(key), here) }
}

/** “Remover”: tira dos lados pedidos. */
export function removeRelationWrites(index: VaultIndex, here: string, key: string, other: string, sides: { here: boolean; there: boolean }): PropertyWrite[] {
  const draft = new Draft(index)
  if (sides.here) draft.remove(here, key, other)
  if (sides.there) draft.remove(other, inverseKeyOf(key), here)
  return draft.writes()
}

export interface OneSided { from: string; to: string; key: string; inverse: string; note: string }

/** Relações escritas só de um lado, para a ferramenta “Relações de um lado só”. */
export function oneSidedRelations(index: VaultIndex, scope: string): OneSided[] {
  const out: OneSided[] = [], seen = new Set<string>()
  for (const note of index.notesIn(scope)) {
    const data = note.meta.frontmatter?.data
    if (!data) continue
    for (const key of Object.keys(data)) {
      if (!RELATION_KEYS.has(key)) continue
      const inverse = inverseKeyOf(key)
      for (const item of linksIn(index, note.path, key)) {
        if (!item.dest || item.dest === note.path || !item.dest.startsWith(scope) || hasLink(index, item.dest, inverse, note.path)) continue
        const id = `${item.dest}|${inverse}|${note.path}`
        if (seen.has(id)) continue
        seen.add(id)
        out.push({ from: note.path, to: item.dest, key, inverse, note: item.note })
      }
    }
  }
  return out
}

/** Grava o lado que falta das escolhidas (uma gravação por nota e chave). */
export function completeWrites(index: VaultIndex, items: readonly OneSided[]): PropertyWrite[] {
  const draft = new Draft(index)
  for (const item of items) draft.add(item.to, item.inverse, entryFor(linkTo(index, item.from, item.to), item.note), item.from)
  return draft.writes()
}

export interface Inverted { org: string; person: string; key: string; mirror: string; raw: string }

const ORG_SIDE: Readonly<Record<string, string>> = { membro_de: "membros", lider_de: "liderado_por", subordinado_a: "subordinados" }
const kindOf = (index: VaultIndex, path: string) => articleKind(index.note(path)?.meta.frontmatter?.data?.tipo)?.id

/**
 * Relações que parecem invertidas (U75): uma organização “membro de”, “líder de” ou “subordinada a” um personagem.
 * Quase sempre a intenção era o contrário (o personagem é membro da organização).
 */
export function invertedRelations(index: VaultIndex, scope: string): Inverted[] {
  const out: Inverted[] = []
  for (const note of index.notesIn(scope)) {
    if (kindOf(index, note.path) !== "organizacao") continue
    for (const [key, mirror] of Object.entries(ORG_SIDE)) {
      for (const item of linksIn(index, note.path, key)) {
        if (item.dest && kindOf(index, item.dest) === "personagem") out.push({ org: note.path, person: item.dest, key, mirror, raw: item.raw })
      }
    }
  }
  return out
}

/** Inverter: a ligação sai da chave errada e vai para a do lado da organização, com o mesmo texto. */
export function invertWrites(index: VaultIndex, items: readonly Inverted[]): PropertyWrite[] {
  const draft = new Draft(index)
  for (const item of items) {
    draft.remove(item.org, item.key, item.person)
    draft.add(item.org, item.mirror, item.raw, item.person)
  }
  return draft.writes()
}
