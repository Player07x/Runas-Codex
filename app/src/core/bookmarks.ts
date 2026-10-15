import { basename, noteName } from "./text"

/**
 * Favoritos (checklist A.3): notas, títulos, pastas e buscas. O formato é o do `.obsidian/bookmarks.json` (plugin
 * Marcadores do Obsidian: `type` `file`, `folder` ou `search`, com `subpath` `#Título` nos títulos), assim os marcadores
 * de lá aparecem aqui. Os grupos do Obsidian viram uma lista só.
 */
export type Bookmark =
  | { type: "file"; path: string; subpath?: string; title?: string }
  | { type: "folder"; path: string; title?: string }
  | { type: "search"; query: string; title?: string }

export function bookmarkKey(b: Bookmark): string {
  return b.type === "search" ? `search:${b.query}` : `${b.type}:${b.path}${b.type === "file" && b.subpath ? b.subpath : ""}`
}

export function hasBookmark(list: Bookmark[], b: Bookmark): boolean {
  const key = bookmarkKey(b)
  return list.some((item) => bookmarkKey(item) === key)
}

/** Tira o favorito se ele já está na lista; senão, põe no fim. */
export function toggleBookmark(list: Bookmark[], b: Bookmark): Bookmark[] {
  const key = bookmarkKey(b)
  return hasBookmark(list, b) ? list.filter((item) => bookmarkKey(item) !== key) : [...list, b]
}

export function bookmarkLabel(b: Bookmark): string {
  if (b.title) return b.title
  if (b.type === "search") return b.query
  if (b.type === "folder") return basename(b.path) || "Raiz do cofre"
  const name = /\.md$/i.test(b.path) ? noteName(b.path) : basename(b.path)
  return b.subpath ? `${name} › ${b.subpath.replace(/^#\^?/, "").split("#").join(" › ")}` : name
}

/** Depois de renomear ou mover `from` (nota ou pasta) para `to`, os favoritos que apontavam para lá. */
export function renameInBookmarks(list: Bookmark[], from: string, to: string): Bookmark[] {
  const move = (path: string) => (path === from ? to : path.startsWith(from + "/") ? to + path.slice(from.length) : path)
  return list.map((b) => (b.type === "search" ? b : { ...b, path: move(b.path) }))
}

function valid(item: unknown): Bookmark[] {
  if (!item || typeof item !== "object") return []
  const b = item as Record<string, unknown>
  const title = typeof b.title === "string" && b.title.trim() ? { title: b.title } : {}
  if (b.type === "group" && Array.isArray(b.items)) return b.items.flatMap(valid)
  if (b.type === "file" && typeof b.path === "string" && b.path) return [{ type: "file", path: b.path, ...(typeof b.subpath === "string" && b.subpath ? { subpath: b.subpath } : {}), ...title }]
  if (b.type === "folder" && typeof b.path === "string") return [{ type: "folder", path: b.path, ...title }]
  if (b.type === "search" && typeof b.query === "string" && b.query.trim()) return [{ type: "search", query: b.query, ...title }]
  return []
}

/** Lê uma lista de favoritos no formato do Obsidian (`{ "items": [...] }`); o que não reconhece fica de fora. */
export function parseBookmarks(json: string | null | undefined): Bookmark[] {
  if (!json) return []
  try {
    const data = JSON.parse(json) as { items?: unknown }
    return Array.isArray(data.items) ? data.items.flatMap(valid) : []
  } catch {
    return []
  }
}

export function serializeBookmarks(list: Bookmark[]): string {
  return JSON.stringify({ items: list })
}
