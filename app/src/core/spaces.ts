import type { SpaceId } from "../data/types"
import { SPACES } from "../lib/spaces"

/**
 * Escopo de uma nota: o espaço (pasta de topo) e a raiz onde busca, backlinks e autocomplete procuram por padrão.
 * Cada wiki é um mundo próprio (`Wikis/<wiki>/`); os outros espaços são uma pasta só. Notas fora dos espaços ficam
 * na raiz do cofre (espaço `null`).
 */
export interface Scope {
  space: SpaceId | null
  root: string
}

export function scopeOf(path: string): Scope {
  for (const info of Object.values(SPACES)) {
    if (!path.startsWith(info.folder)) continue
    if (info.id === "wiki") {
      const rest = path.slice(info.folder.length)
      const slash = rest.indexOf("/")
      return { space: "wiki", root: slash < 0 ? info.folder : info.folder + rest.slice(0, slash + 1) }
    }
    return { space: info.id, root: info.folder }
  }
  return { space: null, root: "" }
}

export function sameScope(a: string, b: string): boolean {
  return scopeOf(a).root === scopeOf(b).root
}
