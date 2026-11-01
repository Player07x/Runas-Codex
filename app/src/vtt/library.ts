import { platform } from "../platform"
import { createTransferArchive, type TransferFile } from "../core/transfer/archive"
import { isLibraryItemPath, itemAssets, libraryAssetPath, libraryItemPath, LIBRARY_ROOT, parseLibraryItem, type LibraryItem } from "./shared/library"
import type { AssetPath } from "./shared/scene"
import { remoteMaster } from "./api"

/** Leitura e gravação da biblioteca da mesa (U13); as regras do formato ficam em `shared/library.ts`. */
export interface LibraryStore {
  list(): Promise<LibraryItem[]>
  /** Grava o item e as imagens dele (as que já estão na biblioteca, pelo hash, não são copiadas de novo). */
  save(item: LibraryItem, readAsset: (path: AssetPath) => Promise<Uint8Array>): Promise<void>
  remove(item: LibraryItem): Promise<void>
  asset(path: AssetPath): Promise<Uint8Array>
  /** Pacote `.runas` (ADR 0020) só com a biblioteca; importa-se em Importar e exportar, como qualquer pacote. */
  exportPackage(): Promise<Uint8Array>
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
 * A biblioteca é do cofre: o mestre remoto (celular comandando a sala do computador) não tem o cofre e fica sem ela.
 * Sem as gravações da área das mesas (navegador), a prévia guarda na memória.
 */
export const library: LibraryStore | null = remoteMaster ? null
  : platform.listTransferFiles && platform.writeManagedTransfer ? vaultLibrary()
    : memoryLibrary()
