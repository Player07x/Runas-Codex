export type SyncConflictProvider = "syncthing" | "obsidian-sync"

export interface SyncConflict {
  path: string
  /** Caminho que o sincronizador usou como base antes de criar a cópia. */
  originalPath: string
  provider: SyncConflictProvider
}

/** Reconhece os nomes usados pelo Syncthing e pelo Obsidian Sync sem tocar nos arquivos. */
export function detectSyncConflict(path: string): SyncConflict | null {
  const slash = path.split(/[\\/]/).join("/")
  const nameStart = slash.lastIndexOf("/") + 1
  const directory = slash.slice(0, nameStart)
  const name = slash.slice(nameStart)
  const extension = name.match(/(\.[^.]*)$/)?.[1] ?? ""
  const stem = extension ? name.slice(0, -extension.length) : name

  // Syncthing: Note.sync-conflict-20261022-030000-device.md
  const syncthing = /^(.*)\.sync-conflict-\d{8}-\d{6}(?:-[\w.-]+)?$/i.exec(stem)
  if (syncthing) return { path: slash, originalPath: directory + syncthing[1] + extension, provider: "syncthing" }

  // Obsidian Sync uses the same marker; older clients used "(conflicted copy)".
  const obsidian = /^(.*?)(?:\.sync-conflict(?:-[\w.-]+)?|\s*\(conflicted copy(?: \d+)?\))$/i.exec(stem)
  if (obsidian) return { path: slash, originalPath: directory + obsidian[1] + extension, provider: "obsidian-sync" }
  return null
}

export function findSyncConflicts(paths: Iterable<string>): SyncConflict[] {
  return [...paths].flatMap((path) => {
    const conflict = detectSyncConflict(path)
    return conflict ? [conflict] : []
  })
}
