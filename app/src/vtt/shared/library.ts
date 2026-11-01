import type { DocumentInput } from "./ipc"
import { isAssetPath, normalizeDocumentData, type AssetPath, type SceneData, type TileData, type TokenData } from "./scene"
import type { DocumentType, WorldDocument } from "./world"

/**
 * Biblioteca da mesa (U13): mapas e tokens guardados para usar de novo, do cofre e não de uma mesa só. Fica numa pasta
 * reservada da área das mesas (`.runas/mesas/biblioteca/`, sem `mesa.json`, então não aparece como mesa): é a área
 * oculta que o cofre já transporta nos pacotes e que o desktop e o Android gravam com versão. Cada item é um JSON em
 * `cenas/<id>.json` e as imagens ficam por hash em `assets/<tipo>/`, como nas mesas.
 */
export const LIBRARY_ROOT = ".runas/mesas/biblioteca"
export const LIBRARY_FORMAT_VERSION = 1

export type LibraryKind = "token" | "scene"
/** Objetos de um mapa que vão junto: o que desenha e o que bloqueia a visão (os tokens são itens próprios). */
export const MAP_CHILD_TYPES = ["tile", "drawing", "wall", "light", "region"] as const satisfies readonly DocumentType[]
type MapChildType = (typeof MAP_CHILD_TYPES)[number]

export interface LibraryChild { type: MapChildType; data: unknown }
export interface LibraryItem {
  formatVersion: number
  id: string
  kind: LibraryKind
  name: string
  createdAt: number
  /** Token: os dados do token. Cena: os dados da cena. */
  data: TokenData | SceneData
  /** Só nas cenas: paredes, luzes, regiões, imagens e desenhos. */
  children: LibraryChild[]
}

export const libraryItemPath = (id: string) => `${LIBRARY_ROOT}/cenas/${id}.json`
export const libraryAssetPath = (asset: AssetPath) => `${LIBRARY_ROOT}/assets/${asset}`
export const isLibraryItemPath = (path: string) => path.startsWith(`${LIBRARY_ROOT}/cenas/`) && path.endsWith(".json")

/** Token guardado: sem posição nem dono (cada mesa tem seus assentos); o resto vai igual. */
export function tokenItem(document: WorldDocument<TokenData>, id: string, now: number): LibraryItem {
  const { playerSlotId: _seat, ...data } = structuredClone(document.data)
  return { formatVersion: LIBRARY_FORMAT_VERSION, id, kind: "token", name: data.name, createdAt: now, data: { ...data, x: 0, y: 0 }, children: [] }
}

/** Mapa guardado: a cena (grade, fundo, visão) e os objetos do mapa, sem tokens, notas, sons nem névoa explorada. */
export function sceneItem(scene: WorldDocument<SceneData>, children: readonly WorldDocument[], id: string, now: number): LibraryItem {
  const kept = children.filter((child): child is WorldDocument & { type: MapChildType } => (MAP_CHILD_TYPES as readonly string[]).includes(child.type))
  return {
    formatVersion: LIBRARY_FORMAT_VERSION, id, kind: "scene", name: scene.data.name, createdAt: now, data: structuredClone(scene.data),
    children: kept.sort((a, b) => a.sort - b.sort).map((child) => ({ type: child.type, data: structuredClone(child.data) })),
  }
}

/** Imagens que o item usa (token, fundo da cena, imagens soltas no mapa), para copiar junto. */
export function itemAssets(item: LibraryItem): AssetPath[] {
  const found = new Set<AssetPath>()
  const add = (value: unknown) => { if (isAssetPath(value)) found.add(value) }
  if (item.kind === "token") add((item.data as TokenData).image)
  else {
    add((item.data as SceneData).background)
    for (const child of item.children) if (child.type === "tile") add((child.data as TileData).image)
  }
  return [...found]
}

/** Lê um item do disco, normalizando os dados como a mesa faz; devolve `null` se não for um item válido. */
export function parseLibraryItem(value: unknown): LibraryItem | null {
  if (!value || typeof value !== "object") return null
  const raw = value as Record<string, unknown>
  if (typeof raw.formatVersion !== "number" || raw.formatVersion > LIBRARY_FORMAT_VERSION) return null
  if (typeof raw.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(raw.id)) return null
  if (raw.kind !== "token" && raw.kind !== "scene") return null
  const data = normalizeDocumentData(raw.kind, raw.data) as TokenData | SceneData
  const children = raw.kind === "scene" && Array.isArray(raw.children)
    ? raw.children.flatMap((child): LibraryChild[] => {
      const entry = child && typeof child === "object" ? child as Record<string, unknown> : {}
      const type = entry.type as MapChildType
      return (MAP_CHILD_TYPES as readonly string[]).includes(type) ? [{ type, data: normalizeDocumentData(type, entry.data) }] : []
    })
    : []
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 80) : (data as { name: string }).name
  return { formatVersion: LIBRARY_FORMAT_VERSION, id: raw.id, kind: raw.kind, name, createdAt: typeof raw.createdAt === "number" ? raw.createdAt : 0, data, children }
}

/** Busca por nome e tipo; os mais novos primeiro. */
export function filterLibrary(items: readonly LibraryItem[], query: string, kind: LibraryKind | "todos"): LibraryItem[] {
  const q = query.trim().toLocaleLowerCase("pt-BR")
  return items
    .filter((item) => (kind === "todos" || item.kind === kind) && (!q || item.name.toLocaleLowerCase("pt-BR").includes(q)))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Troca as imagens pelos caminhos na mesa de destino (o hash é o mesmo, mas a cópia pode ter outra extensão). */
function remap<T>(data: T, assets: ReadonlyMap<AssetPath, AssetPath>): T {
  const walk = (value: unknown): unknown => typeof value === "string" ? assets.get(value) ?? value
    : Array.isArray(value) ? value.map(walk)
    : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, walk(item)])) : value
  return walk(data) as T
}

/** Um token do item como cópia nova na cena, no ponto onde foi solto. */
export function instantiateToken(item: LibraryItem, sceneId: string, at: { x: number; y: number }, id: string, assets: ReadonlyMap<AssetPath, AssetPath> = new Map()): DocumentInput {
  return { id, type: "token", parentId: sceneId, data: { ...remap(item.data as TokenData, assets), x: at.x, y: at.y } }
}

/** Uma cena nova com os objetos do mapa; o primeiro documento é a cena (os filhos dependem dela). */
export function instantiateScene(item: LibraryItem, newId: () => string, assets: ReadonlyMap<AssetPath, AssetPath> = new Map(), sort = Date.now()): DocumentInput[] {
  const sceneId = newId()
  return [
    { id: sceneId, type: "scene", parentId: null, sort, data: remap(item.data as SceneData, assets) },
    ...item.children.map((child, index): DocumentInput => ({ id: newId(), type: child.type, parentId: sceneId, sort: index, data: remap(child.data, assets) })),
  ]
}
