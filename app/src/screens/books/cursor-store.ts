/**
 * Onde está o cursor do capítulo aberto. Fica fora do estado do React: o editor avisa a cada movimento e só a prévia
 * ao lado redesenha (o editor e o livro não).
 */
export interface BookCursor { path: string; line: number }
export interface CursorStore {
  get(): BookCursor | null
  set(cursor: BookCursor): void
  subscribe(listener: () => void): () => void
}

export function createCursorStore(): CursorStore {
  let current: BookCursor | null = null
  const listeners = new Set<() => void>()
  return {
    get: () => current,
    set(cursor) {
      if (current?.path === cursor.path && current.line === cursor.line) return
      current = cursor
      for (const listener of listeners) listener()
    },
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
  }
}
