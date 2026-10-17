import { useEffect, useMemo, useState } from "react"
import { vaultCounts } from "../core/vault-counts"
import { useVault } from "../platform/VaultProvider"
import { vtt } from "../vtt/api"
/** Mesas são manifestos, não notas: a mesma fonte usada por Criar Sala. */
export function useVaultCounts() {
  const vault = useVault(), [worlds, setWorlds] = useState(0)
  useEffect(() => {
    let disposed = false
    setWorlds(0)
    const refresh = () => { if (vault.info && vault.index) void vtt.listWorlds().then(list => { if (!disposed) setWorlds(list.length) }, () => { if (!disposed) setWorlds(0) }) }
    refresh(); window.addEventListener("hashchange", refresh)
    return () => { disposed = true; window.removeEventListener("hashchange", refresh) }
  }, [vault.info?.path, vault.index, vault.version])
  return useMemo(() => vaultCounts(vault.index, worlds), [vault.index, vault.version, worlds])
}
