import { useEffect, useRef } from "react"
import { useVault } from "../platform/VaultProvider"
import { vtt } from "./api"
import { library } from "./library"
import { copyAssets, LIBRARY_CHANGED, worldAsset } from "./library-actions"
import { saveTableSession, sessionTargets } from "./session-save"
import { HOST, hostArgs, toBase64, type SessionInput } from "./shared/host-services"
import type { LibraryItem } from "./shared/library"
import type { AssetPath } from "./shared/scene"

/**
 * U47: enquanto a sala está aberta, o app do aparelho da sala atende os pedidos do cofre do mestre remoto: a
 * biblioteca (listar, guardar, pôr na mesa, apagar) e “Salvar Sessão”. Grava pelos mesmos caminhos da mesa local
 * (biblioteca do cofre e `useVault()`), e nada roda sem o app aberto.
 */
export function HostServices() {
  const vault = useVault()
  const current = useRef(vault)
  current.current = vault
  useEffect(() => {
    if (!vtt.serveHost || !library) return
    const store = library
    const changed = () => window.dispatchEvent(new Event(LIBRARY_CHANGED))
    return vtt.serveHost(async (channel, raw) => {
      const args = hostArgs(channel, raw)
      switch (channel) {
        case HOST.libraryList: return store.list()
        case HOST.libraryAsset: return toBase64(await store.asset(args[0] as AssetPath))
        case HOST.librarySave: await store.save(args[0] as LibraryItem, worldAsset); changed(); return null
        case HOST.libraryRemove: {
          const item = (await store.list()).find((entry) => entry.id === args[0])
          if (!item) throw new Error("Item da biblioteca não encontrado.")
          await store.remove(item)
          changed()
          return null
        }
        case HOST.libraryCopyToWorld: return [...await copyAssets(args[0] as LibraryItem)]
        case HOST.sessionTargets: return sessionTargets(current.current.index, current.current.info?.readOnly ?? true)
        case HOST.sessionSave: {
          const { index, info, createNote } = current.current
          return saveTableSession({ index, readOnly: info?.readOnly ?? true, createNote }, args[0] as SessionInput)
        }
        default: throw new Error("Isto só pelo computador da sala.")
      }
    })
  }, [])
  return null
}
