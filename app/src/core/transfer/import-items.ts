import { basename, foldName } from "../text"
import { VaultIndex } from "../vault-index"
import { parseWorldManifest } from "../../vtt/shared/world"
import { transferBytes, transferSize, type TransferArchive } from "./archive"
import { expandTransferItems, listTransferItems, type TransferItemKind, type TransferWorld } from "./items"
import { buildImportPlan, decodeTransferText, type ImportPlan, type ImportStrategy, type TransferEntry, type TransferWrite } from "./plan"

/**
 * Importar por itens (U53, ADR 0037): a prévia mostra as wikis, livros, mesas e campanhas que vieram no pacote, cada
 * um com a sua ação. `own` são os arquivos do item (dentro das raízes dele); `uses` são os anexos e notas de fora que
 * ele usa, que entram se faltarem, sem substituir nem copiar (um anexo compartilhado serve às duas cópias).
 */
export interface PackageItem { id: string; kind: TransferItemKind; name: string; roots: string[]; own: string[]; uses: string[] }
export interface ItemChoice { strategy: ImportStrategy; name?: string }
export interface ItemState { exists: boolean; fresh: number; same: number; changed: number }
export interface ItemImportPlan extends ImportPlan {
  /** Arquivos iguais aos do cofre: não são regravados nem entram no pacote de segurança. */
  identical: string[]
  /** Para onde foi a cópia de cada item (id → pasta, ou nome da mesa). */
  destinations: Record<string, string>
}

const under = (path: string, root: string) => path === root || path.startsWith(root + "/")
const WORLD_MANIFEST = /^\.runas\/mesas\/([^/]+)\/mesa\.json$/

/** Os itens do pacote: os do manifesto (pacotes da 1.4) ou, sem ele, deduzidos pelas pastas, como na exportação. */
export function packageItems(archive: TransferArchive): PackageItem[] {
  const entries: TransferEntry[] = archive.files.map(file => ({ path: file.path, size: transferSize(file), mtime: 1 }))
  const texts = Object.fromEntries(archive.files.filter(file => /\.md$/i.test(file.path)).map(file => [file.path, decodeTransferText(file.bytes)]))
  const index = new VaultIndex(entries.filter(entry => !entry.path.startsWith(".runas/")), texts)
  const worlds: TransferWorld[] = []
  for (const file of archive.files) {
    if (!WORLD_MANIFEST.test(file.path)) continue
    try {
      const world = parseWorldManifest(JSON.parse(decodeTransferText(file.bytes).replace(/^﻿/, "")))
      worlds.push({ root: file.path.slice(0, -"/mesa.json".length), id: world.id, title: world.title, ...(world.cover ? { cover: world.cover } : {}) })
    } catch { /* manifesto quebrado: a importação recusa na prévia, com a mensagem de sempre */ }
  }
  const worldRoots = new Map(worlds.map(world => [world.id, world.root]))
  const paths = entries.map(entry => entry.path)
  const deduced = listTransferItems(index, entries, worlds).map(item => {
    const own = paths.filter(path => item.roots.some(root => under(path, root))), mine = new Set(own)
    const uses = expandTransferItems(index, entries, [item], false, worldRoots).filter(path => !mine.has(path))
    return { ...item, own, uses }
  })
  if (!archive.items?.length) return deduced
  const present = new Set(paths)
  const listed: PackageItem[] = archive.items.map((spec, i) => {
    const caminhos = spec.caminhos.filter(path => present.has(path))
    const own = caminhos.filter(path => spec.raizes.some(root => under(path, root))), mine = new Set(own)
    return { id: `pacote:${i}`, kind: spec.tipo, name: spec.nome, roots: spec.raizes, own, uses: caminhos.filter(path => !mine.has(path)) }
  }).filter(item => item.own.length)
  // O que o manifesto não cobre (pacote editado à mão, por exemplo) ainda aparece, deduzido pelas pastas.
  const covered = new Set(listed.flatMap(item => [...item.own, ...item.uses]))
  const rest = deduced.map(item => ({ ...item, own: item.own.filter(path => !covered.has(path)), uses: item.uses.filter(path => !covered.has(path)) })).filter(item => item.own.length)
  return [...listed, ...rest]
}

/** Só pastas inteiras (e mesas) viram cópia com outro nome; a Agenda, a biblioteca e os arquivos soltos, não. */
export function canCopy(item: PackageItem): boolean {
  return ["wiki", "livro", "mesa", "campanha", "pasta"].includes(item.kind) && item.roots.length > 0 && !/\.md$/i.test(item.roots[0]!)
}
export function defaultCopyName(item: PackageItem): string {
  return `${item.kind === "mesa" ? item.name : basename(item.roots[0] ?? item.name)} (cópia)`
}

/** Novo, igual ou diferente do que está no cofre, contando os arquivos do próprio item. */
export function itemState(item: PackageItem, existing: readonly TransferEntry[], identical: ReadonlySet<string>): ItemState {
  const keys = new Set(existing.map(entry => foldName(entry.path)))
  let fresh = 0, same = 0, changed = 0
  for (const path of item.own) {
    if (!keys.has(foldName(path))) fresh++
    else if (identical.has(path)) same++
    else changed++
  }
  // Mesa com a mesma pasta no cofre já existe, mesmo que os arquivos dentro sejam outros.
  const world = item.kind === "mesa" && item.roots[0] ? foldName(item.roots[0]) : null
  const exists = same + changed > 0 || Boolean(world && existing.some(entry => under(foldName(entry.path), world)))
  return { exists, fresh, same, changed }
}

/**
 * Arquivos do pacote iguais aos do cofre (mesmo caminho, tamanho e conteúdo). Só lê do cofre os que têm o mesmo
 * tamanho, um por vez.
 */
export async function findIdentical(archive: TransferArchive, existing: readonly TransferEntry[], read: (path: string) => Promise<Uint8Array>, onProgress?: (done: number, total: number) => void): Promise<Set<string>> {
  const byName = new Map(existing.map(entry => [foldName(entry.path), entry]))
  const candidates = archive.files.filter(file => byName.get(foldName(file.path))?.size === transferSize(file))
  const same = new Set<string>()
  for (const [i, file] of candidates.entries()) {
    onProgress?.(i, candidates.length)
    const current = await read(byName.get(foldName(file.path))!.path)
    // Sob demanda (C2), o binário do pacote é lido aqui, comparado e solto.
    const bytes = await transferBytes(file)
    if (current.length === bytes.length && current.every((byte, j) => byte === bytes[j])) same.add(file.path)
  }
  return same
}

/**
 * Junta as ações de cada item marcado num plano só. Um arquivo que é de dois itens segue o primeiro da lista; o que
 * só é usado (anexos de fora) entra se faltar. Substituir troca só os arquivos diferentes. Cada cópia é planejada à
 * parte, depois do resto, para não cair num caminho que o próprio pacote ocupa.
 */
export function buildItemsImportPlan(archive: TransferArchive, existing: TransferEntry[], items: readonly PackageItem[], choices: ReadonlyMap<string, ItemChoice>, identical: ReadonlySet<string>, newId: () => string = () => crypto.randomUUID()): ItemImportPlan {
  const owner = new Map<string, string>(), wanted = new Set<string>()
  for (const item of items) {
    if (!choices.has(item.id)) continue
    for (const path of item.own) { if (!owner.has(path)) owner.set(path, item.id); wanted.add(path) }
    for (const path of item.uses) wanted.add(path)
  }
  const byPath = new Map(archive.files.map(file => [file.path, file]))
  const sub = (paths: string[]): TransferArchive => ({ ...archive, files: paths.map(path => byPath.get(path)!) })
  const merge: string[] = [], replace: string[] = [], copies = new Map<string, string[]>(), kept: string[] = []
  for (const path of archive.files.map(file => file.path).filter(path => wanted.has(path))) {
    const id = owner.get(path), strategy = id ? choices.get(id)!.strategy : "merge"
    if (strategy === "duplicate") copies.set(id!, [...copies.get(id!) ?? [], path])
    else if (strategy === "replace" && identical.has(path)) kept.push(path)
    else (strategy === "replace" ? replace : merge).push(path)
  }
  const plans: ImportPlan[] = []
  if (merge.length) plans.push(buildImportPlan(sub(merge), existing, "merge"))
  if (replace.length) plans.push(buildImportPlan(sub(replace), existing, "replace"))
  const destinations: Record<string, string> = {}
  for (const [id, paths] of copies) {
    const item = items.find(candidate => candidate.id === id)!, name = choices.get(id)!.name?.trim()
    const taken = [...existing, ...plans.flatMap(plan => plan.writes.map(write => ({ path: write.path, size: transferSize(write), mtime: 0 })))]
    const plan = buildImportPlan(sub(paths), taken, "duplicate", newId, canCopy(item) && name ? { root: item.roots[0]!, name } : undefined)
    plans.push(plan)
    const root = item.roots[0], target = root ? plan.copies?.[root] : undefined
    if (target) destinations[id] = target
  }
  const writes: TransferWrite[] = plans.flatMap(plan => plan.writes)
  const seen = new Set<string>()
  for (const write of writes) {
    const key = foldName(write.path)
    if (seen.has(key)) throw new Error(`Dois itens gravariam “${write.path}”. Desmarque um deles ou importe um como cópia.`)
    seen.add(key)
  }
  // O manifesto da mesa por último, como na importação por arquivos.
  writes.sort((a, b) => Number(a.path.endsWith("/mesa.json")) - Number(b.path.endsWith("/mesa.json")))
  const identicalSkipped = [...kept, ...merge.filter(path => identical.has(path))]
  return {
    writes, identical: identicalSkipped, destinations,
    skipped: plans.flatMap(plan => plan.skipped).concat(kept),
    conflicts: plans.flatMap(plan => plan.conflicts),
    replacements: plans.flatMap(plan => plan.replacements),
  }
}
