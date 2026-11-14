/**
 * Pastas abertas e fechadas na árvore das Notas (U70), lembradas por aparelho. Só entra a pasta que a pessoa abriu ou
 * fechou: as outras seguem o padrão da tela (primeiro nível aberto, Arquivo fechado). O que guardar fica em
 * `lib/remembered` (`localStorage`, regra 5); aqui só a conta.
 */
export type FolderMemory = Readonly<Record<string, boolean>>

/** Mais que isso é lixo de pastas apagadas há tempo: guarda as últimas mexidas. */
const LIMIT = 2000

export function parseFolderMemory(raw: unknown): FolderMemory {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const entries = Object.entries(raw as Record<string, unknown>).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean" && entry[0].length > 0)
  return Object.fromEntries(entries.slice(-LIMIT))
}

/** A escolha da pessoa para uma pasta; a mais recente vai para o fim (o corte do limite tira as antigas). */
export function rememberFolder(memory: FolderMemory, path: string, open: boolean): FolderMemory {
  const rest = Object.entries(memory).filter(([key]) => key !== path)
  return parseFolderMemory(Object.fromEntries([...rest, [path, open]]))
}

/** “Recolher tudo”: todas as pastas fechadas, inclusive as que ainda não foram desenhadas. */
export function collapseFolders(memory: FolderMemory, folders: readonly string[]): FolderMemory {
  const closed: Record<string, boolean> = Object.fromEntries(Object.keys(memory).map((path) => [path, false]))
  for (const path of folders) closed[path] = false
  return parseFolderMemory(closed)
}

/** Pasta renomeada ou movida: ela e as de dentro levam a escolha junto. */
export function moveFolderMemory(memory: FolderMemory, from: string, to: string): FolderMemory {
  if (from === to) return memory
  const moved = Object.entries(memory).map(([path, open]): [string, boolean] =>
    path === from || path.startsWith(from + "/") ? [to + path.slice(from.length), open] : [path, open])
  return parseFolderMemory(Object.fromEntries(moved))
}
