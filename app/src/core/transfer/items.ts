import { findBooks, readBook } from "../books"
import { campaignInfo, listCampaigns } from "../campaigns"
import { listWikis } from "../wiki"
import type { VaultIndex } from "../vault-index"
import { selectTransferPaths, type TransferEntry } from "./plan"

/**
 * Exportar por itens (U52, ADR 0037): o que cada wiki, livro, mesa ou campanha leva. Um item é uma lista de raízes
 * (pastas sem a barra final, ou arquivos); `expandTransferItems` junta as raízes dos itens marcados e acrescenta os
 * anexos que as notas usam, onde estiverem. Todo arquivo do cofre cai em algum item: o que sobra vira “Outros”.
 */
export type TransferItemKind = "wiki" | "livro" | "mesa" | "biblioteca" | "campanha" | "agenda" | "pasta" | "outros"
export interface TransferItem { id: string; kind: TransferItemKind; name: string; roots: string[] }
/** Uma mesa do VTT, lida do `mesa.json` (a tela lê; o núcleo não toca no disco). */
export interface TransferWorld { root: string; id: string; title: string; cover?: string }
export interface TransferItemStats { paths: string[]; notes: number; attachments: number; size: number }

export const TRANSFER_ITEM_GROUPS: { kind: TransferItemKind; label: string }[] = [
  { kind: "wiki", label: "Wikis" }, { kind: "livro", label: "Livros" }, { kind: "mesa", label: "Mesas do VTT" },
  { kind: "biblioteca", label: "Biblioteca da mesa" }, { kind: "campanha", label: "Campanhas" }, { kind: "agenda", label: "Agenda" },
  { kind: "pasta", label: "Pastas" }, { kind: "outros", label: "Outros arquivos" },
]
const LIBRARY = ".runas/mesas/biblioteca"
/** Pastas que viram itens próprios; as outras pastas do primeiro nível viram “Pasta X”. */
const MODULE_FOLDERS = new Set(["Wikis", "Livros", "Campanhas", "Agenda", ".runas"])
const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "pt-BR")
const under = (path: string, root: string) => path === root || path.startsWith(root + "/")
const parent = (path: string) => path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""

export function listTransferItems(index: VaultIndex, entries: readonly TransferEntry[], worlds: readonly TransferWorld[] = []): TransferItem[] {
  const items: TransferItem[] = []
  const has = (root: string) => entries.some(entry => under(entry.path, root))
  for (const wiki of listWikis(index)) items.push({ id: `wiki:${wiki.name}`, kind: "wiki", name: wiki.name, roots: [wiki.root.slice(0, -1)] })
  for (const book of findBooks(index)) {
    // A pasta do livro inteira; se a nota do livro está solta em Livros/, só ela. Capítulos de fora vêm pela estrutura.
    const folder = parent(book.path)
    const chapters = readBook(index, book).items.flatMap(item => item.note ? [item.note.path] : [])
    items.push({ id: `livro:${book.path}`, kind: "livro", name: book.name, roots: [...new Set([folder === "Livros" ? book.path : folder, ...chapters])] })
  }
  for (const world of [...worlds].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))) {
    const cover = world.cover && entries.some(entry => entry.path === world.cover) ? [world.cover] : []
    items.push({ id: `mesa:${world.root}`, kind: "mesa", name: world.title || world.id, roots: [world.root, ...cover] })
  }
  if (has(LIBRARY)) items.push({ id: "biblioteca", kind: "biblioteca", name: "Biblioteca da mesa", roots: [LIBRARY] })
  for (const campaign of listCampaigns(index).sort(byName)) items.push({ id: `campanha:${campaign.name}`, kind: "campanha", name: campaign.name, roots: [campaign.root.slice(0, -1)] })
  if (has("Agenda")) items.push({ id: "agenda", kind: "agenda", name: "Agenda", roots: ["Agenda"] })
  const folders = new Set(entries.map(entry => entry.path.split("/")[0]!).filter(name => entries.some(entry => entry.path.startsWith(name + "/")) && !MODULE_FOLDERS.has(name)))
  for (const folder of [...folders].sort((a, b) => a.localeCompare(b, "pt-BR"))) items.push({ id: `pasta:${folder}`, kind: "pasta", name: folder, roots: [folder] })
  // O que nenhum item cobre (arquivos na raiz, notas soltas em Wikis/ ou Livros/, livros sem `tipo: livro`…).
  const loose = new Map<string, string[]>()
  for (const entry of entries) {
    if (items.some(item => item.roots.some(root => under(entry.path, root)))) continue
    const top = entry.path.includes("/") ? entry.path.split("/")[0]! : ""
    loose.set(top, [...loose.get(top) ?? [], entry.path])
  }
  for (const [top, paths] of [...loose].sort(([a], [b]) => a.localeCompare(b, "pt-BR")))
    items.push({ id: `outros:${top}`, kind: "outros", name: top ? `Outros em ${top === ".runas" ? "dados das mesas" : top}` : "Arquivos na raiz do cofre", roots: paths })
  return items
}

/**
 * Os caminhos que os itens marcados levam. A campanha leva os eventos da Agenda que apontam para ela e a mesa ligada
 * (como na escolha por pasta); a mesa não puxa a campanha. Notas de outras wikis só entram com `linked`.
 */
export function expandTransferItems(index: VaultIndex, entries: TransferEntry[], items: readonly TransferItem[], linked: boolean, worldRoots: ReadonlyMap<string, string> = new Map()): string[] {
  const roots = new Set(items.flatMap(item => item.roots))
  for (const item of items.filter(item => item.kind === "campanha")) {
    for (const note of index.notesIn(item.roots[0]! + "/"))
      for (const backlink of index.backlinks(note.path)) if (backlink.from.startsWith("Agenda/")) roots.add(backlink.from)
    const mesa = campaignInfo(index, item.name).mesa
    const root = mesa ? worldRoots.get(mesa) : undefined
    if (root) roots.add(root)
  }
  if (!roots.size) return []
  return selectTransferPaths(index, entries, [...roots], linked, false, worldRoots)
}

/** Contagem que a tela mostra antes de salvar: notas, anexos e tamanho. */
export function transferStats(entries: readonly TransferEntry[], paths: readonly string[]): TransferItemStats {
  const sizes = new Map(entries.map(entry => [entry.path, entry.size]))
  const notes = paths.filter(path => /\.md$/i.test(path)).length
  return { paths: [...paths], notes, attachments: paths.length - notes, size: paths.reduce((total, path) => total + (sizes.get(path) ?? 0), 0) }
}

/** Conferência no fim (U51): toda nota escolhida está no pacote. Devolve as que faltam. */
export function missingFromPackage(chosen: readonly string[], packed: readonly string[]): string[] {
  const inside = new Set(packed)
  return chosen.filter(path => /\.md$/i.test(path) && !inside.has(path))
}
