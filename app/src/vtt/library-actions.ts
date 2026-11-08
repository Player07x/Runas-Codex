import { resolveAssetUrl, vtt } from "./api"
import { newId, type DocumentStore } from "./document-store"
import { library } from "./library"
import { instantiateScene, instantiateToken, itemAssets, sceneItem, tokenItem, type LibraryItem } from "./shared/library"
import type { AssetPath, SceneData, TokenData } from "./shared/scene"
import type { AssetKind } from "./shared/world"
import type { WikiTokenSource } from "./wiki-tokens"
import { platform } from "../platform"

/** Tipo de dado arrastado da Biblioteca para a cena. */
export const LIBRARY_DRAG_TYPE = "application/x-runas-biblioteca"
/** Arrastar uma nota de “Da wiki” para a cena: o dado é o caminho da nota. */
export const WIKI_TOKEN_DRAG_TYPE = "application/x-runas-wiki-token"
/** Avisa o painel Biblioteca que um item entrou (guardado pelo token ou pela cena). */
export const LIBRARY_CHANGED = "runas-codex:biblioteca"

/** Bytes de uma imagem da mesa aberta (o mesmo endereço que a cena desenha). */
async function worldAsset(path: AssetPath): Promise<Uint8Array> {
  const response = await fetch(resolveAssetUrl(path))
  if (!response.ok) throw new Error("Não foi possível ler a imagem da mesa.")
  return new Uint8Array(await response.arrayBuffer())
}

function requireLibrary() {
  if (!library) throw new Error("A biblioteca fica no cofre do computador da sala; o mestre remoto não a alcança.")
  return library
}

export async function saveTokenToLibrary(store: DocumentStore, tokenId: string): Promise<string> {
  const token = store.get<TokenData>(tokenId)
  if (!token || token.type !== "token") throw new Error("Escolha um token.")
  await requireLibrary().save(tokenItem(token, newId(), Date.now()), worldAsset)
  window.dispatchEvent(new Event(LIBRARY_CHANGED))
  return token.data.name
}

export async function saveSceneToLibrary(store: DocumentStore, sceneId: string): Promise<string> {
  const scene = store.get<SceneData>(sceneId)
  if (!scene || scene.type !== "scene") throw new Error("Escolha uma cena.")
  const children = Object.values(store.children(sceneId)).flat()
  await requireLibrary().save(sceneItem(scene, children, newId(), Date.now()), worldAsset)
  window.dispatchEvent(new Event(LIBRARY_CHANGED))
  return scene.data.name
}

/** Copia as imagens do item para a mesa aberta (pelo hash, sem duplicar) e devolve o caminho de cada uma lá. */
async function copyAssets(item: LibraryItem): Promise<Map<AssetPath, AssetPath>> {
  const copied = new Map<AssetPath, AssetPath>()
  for (const asset of itemAssets(item)) {
    const [kind, file] = asset.split("/") as [AssetKind, string]
    copied.set(asset, await vtt.assets.import(kind, file, await requireLibrary().asset(asset)))
  }
  return copied
}

export async function placeToken(store: DocumentStore, item: LibraryItem, sceneId: string, at: { x: number; y: number }): Promise<void> {
  await store.put(instantiateToken(item, sceneId, at, newId(), await copyAssets(item)))
}

/** Põe uma nota da Wiki diretamente na cena e mantém o vínculo só no documento do mestre. */
export async function placeWikiToken(store: DocumentStore, source: WikiTokenSource, sceneId: string, at: { x: number; y: number }): Promise<void> {
  const image = source.image ? await vtt.assets.import("tokens", source.image.split("/").at(-1) ?? "token.png", await platform.readBinary(source.image)) : null
  await store.put({ id: newId(), type: "token", parentId: sceneId, data: {
    name: source.name, notePath: source.notePath, x: at.x, y: at.y, size: source.token.size, image,
    rotation: 0, mirror: false, hidden: false, locked: false, disposition: source.token.disposition, elevation: 0,
    bars: source.token.bars, showName: true, vision: { enabled: true, range: 0 }, light: { bright: 0, dim: 0, color: "#ffb45a" },
  } })
}

/** Reimporta os dados visuais e as barras da nota, preservando o valor atual de barras de mesmo nome. */
export async function reimportWikiToken(store: DocumentStore, tokenId: string, source: WikiTokenSource): Promise<void> {
  const current = store.get<TokenData>(tokenId)
  if (!current || current.type !== "token") throw new Error("Escolha um token ligado a uma nota.")
  const image = source.image ? await vtt.assets.import("tokens", source.image.split("/").at(-1) ?? "token.png", await platform.readBinary(source.image)) : null
  const oldValues = new Map(current.data.bars.map((bar) => [bar.label.toLocaleLowerCase("pt-BR"), bar.value]))
  await store.put({ ...current, data: { ...current.data, name: source.name, notePath: source.notePath, image, size: source.token.size, disposition: source.token.disposition, bars: source.token.bars.map((bar) => ({ ...bar, value: oldValues.get(bar.label.toLocaleLowerCase("pt-BR")) ?? bar.value })) } })
}

/** Um mapa da biblioteca vira cena nova (cena primeiro; os objetos dependem dela). Devolve o id da cena. */
export async function placeScene(store: DocumentStore, item: LibraryItem): Promise<string> {
  const documents = instantiateScene(item, newId, await copyAssets(item))
  for (const document of documents) await store.put(document)
  return documents[0]!.id
}
