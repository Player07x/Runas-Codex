import * as P from "./generator-tables-x4-pessoas"
import * as L from "./generator-tables-x4-lugares"
import * as E from "./generator-tables-x4-enredo"
import * as M from "./generator-tables-x4-mundo"

/**
 * As opções dos geradores ×4 (U32) por lista: `X4_DESIRES_1`, `X4_DESIRES_2`… viram `DESIRES`; o clima vem por
 * estação. `generator-tables.ts` acrescenta cada uma no fim da lista original, sem repetir o que já existe.
 */
export const X4: Record<string, unknown[]> = {}
for (const module of [P, L, E, M]) for (const [name, value] of Object.entries(module)) {
  if (!name.startsWith("X4_") || !value || typeof value !== "object") continue
  const key = name.slice(3).replace(/_\d+$/, "")
  const parts: [string, unknown[]][] = Array.isArray(value) ? [[key, value]] : Object.entries(value as Record<string, unknown[]>).map(([season, list]) => [`${key}.${season}`, list])
  for (const [list, items] of parts) X4[list] = [...(X4[list] ?? []), ...items]
}
