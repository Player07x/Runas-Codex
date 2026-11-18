import { platform } from "../platform"
import { createTransferArchive, type TransferFile } from "../core/transfer/archive"
import { isLibraryItemPath, itemAssets, libraryAssetPath, libraryItemPath, LIBRARY_ROOT, parseLibraryItem, type LibraryItem } from "./shared/library"
import type { AssetPath } from "./shared/scene"
import { remoteMaster, vtt } from "./api"
import { fromBase64, HOST } from "./shared/host-services"

/** Leitura e gravação da biblioteca da mesa (U13); as regras do formato ficam em `shared/library.ts`. */
export interface LibraryStore {
  list(): Promise<LibraryItem[]>
  /** Grava o item e as imagens dele (as que já estão na biblioteca, pelo hash, não são copiadas de novo). */
  save(item: LibraryItem, readAsset: (path: AssetPath) => Promise<Uint8Array>): Promise<void>
  remove(item: LibraryItem): Promise<void>
  asset(path: AssetPath): Promise<Uint8Array>
  /** Pacote `.runas` (ADR 0020) só com a biblioteca; importa-se em Importar e exportar, como qualquer pacote. */
  exportPackage(): Promise<Uint8Array>
  /**
   * Copia as imagens do item para a mesa aberta e devolve o caminho de cada uma lá. Só o mestre remoto tem: a cópia
   * é feita no aparelho da sala, sem as imagens irem e voltarem pela rede.
   */
  copyToWorld?(item: LibraryItem): Promise<Map<AssetPath, AssetPath>>
}

const encode = (value: unknown) => new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`)
const decode = (bytes: Uint8Array): unknown => JSON.parse(new TextDecoder().decode(bytes).replace(/^﻿/, ""))

/** No cofre (desktop e Android): a área das mesas, gravada com a versão lida, como a importação de pacotes. */
function vaultLibrary(): LibraryStore {
  const files = async () => (await platform.listTransferFiles!(true)).filter((entry) => entry.path.startsWith(`${LIBRARY_ROOT}/`))
  return {
    async list() {
      const items: LibraryItem[] = []
      for (const entry of (await files()).filter((file) => isLibraryItemPath(file.path))) {
        try {
          const item = parseLibraryItem(decode(await platform.readBinary(entry.path)))
          if (item) items.push(item)
        } catch {
          // Um item corrompido (sincronização pela metade) não esconde os outros.
        }
      }
      return items
    },
    async save(item, readAsset) {
      const present = new Set((await files()).map((entry) => entry.path))
      for (const asset of itemAssets(item)) {
        const path = libraryAssetPath(asset)
        if (!present.has(path)) await platform.writeManagedTransfer!(path, await readAsset(asset), null)
      }
      await platform.writeManagedTransfer!(libraryItemPath(item.id), encode(item), null)
    },
    remove: (item) => platform.trash(libraryItemPath(item.id)),
    asset: (path) => platform.readBinary(libraryAssetPath(path)),
    async exportPackage() {
      const chosen: TransferFile[] = []
      for (const entry of await files()) chosen.push({ path: entry.path, bytes: await platform.readBinary(entry.path) })
      return createTransferArchive("Biblioteca da mesa", chosen)
    },
  }
}

/** Prévia no navegador: a biblioteca vive só nesta aba, como as mesas da prévia. */
function memoryLibrary(): LibraryStore {
  const items = new Map<string, LibraryItem>()
  const assets = new Map<AssetPath, Uint8Array>()
  return {
    list: async () => [...items.values()],
    async save(item, readAsset) {
      for (const asset of itemAssets(item)) if (!assets.has(asset)) assets.set(asset, await readAsset(asset))
      items.set(item.id, structuredClone(item))
    },
    remove: async (item) => { items.delete(item.id) },
    asset: async (path) => {
      const bytes = assets.get(path)
      if (!bytes) throw new Error("Imagem da biblioteca não encontrada.")
      return bytes
    },
    exportPackage: async () => createTransferArchive("Biblioteca da mesa", [
      ...[...items.values()].map((item) => ({ path: libraryItemPath(item.id), bytes: encode(item) })),
      ...[...assets].map(([path, bytes]) => ({ path: libraryAssetPath(path), bytes })),
    ]),
  }
}

/**
 * U47: o mestre remoto (celular comandando a sala) usa a biblioteca do cofre do aparelho da sala, que atende cada
 * pedido pelo app aberto. Guardar lê as imagens da mesa lá mesmo; pôr na cena copia lá mesmo.
 */
function remoteLibrary(): LibraryStore {
  const call = <T>(channel: string, ...args: unknown[]) => {
    if (!vtt.callHost) return Promise.reject(new Error("Biblioteca indisponível."))
    return vtt.callHost(channel, args) as Promise<T>
  }
  return {
    list: () => call<LibraryItem[]>(HOST.libraryList),
    save: (item) => call<void>(HOST.librarySave, item),
    remove: (item) => call<void>(HOST.libraryRemove, item.id),
    asset: async (path) => fromBase64(await call<string>(HOST.libraryAsset, path)),
    exportPackage: () => Promise.reject(new Error("Exporte a biblioteca pelo aparelho da sala.")),
    copyToWorld: async (item) => new Map(await call<[AssetPath, AssetPath][]>(HOST.libraryCopyToWorld, item)),
  }
}

/** No cofre (desktop e Android), no mestre remoto pelo aparelho da sala; sem as gravações da área das mesas (navegador), na memória. */
export const library: LibraryStore | null = remoteMaster ? remoteLibrary()
  : platform.listTransferFiles && platform.writeManagedTransfer ? vaultLibrary()
    : memoryLibrary()
