/** “editada agora”, “há 5 min”, “há 3 h”, “ontem”, “há 4 dias”, “em 12 de out.” (INI-4). */
export function editedAgo(mtime: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - mtime) / 60_000))
  if (minutes < 1) return "editada agora"
  if (minutes < 60) return `editada há ${minutes} min`
  const hours = Math.round(minutes / 60)
  const start = (t: number) => { const d = new Date(t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
  const days = Math.round((start(now) - start(mtime)) / 86_400_000)
  if (days === 0) return `editada há ${hours} h`
  if (days === 1) return "editada ontem"
  if (days < 7) return `editada há ${days} dias`
  return `editada em ${new Date(mtime).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`
}

/** Espaço de uma nota pelo caminho, como aparece na navegação. */
export function spaceOf(path: string): string {
  const top = path.split("/")[0]
  return ({ Notas: "Notas", Agenda: "Agenda", Wikis: "Wiki", Campanhas: "Campanhas", Livros: "Livros" } as Record<string, string>)[top ?? ""] ?? "Cofre"
}

/**
 * Título para mostrar (INI-4): o `title` do evento (Full Calendar), o primeiro `# título` ou o nome do arquivo sem a
 * data na frente (“2026-10-03 Sessão 10” → “Sessão 10”).
 */
export function displayTitle(note: { name: string; meta: { headings: { level: number; text: string }[]; frontmatter?: { data?: Record<string, unknown> | null } | null } }): string {
  const title = note.meta.frontmatter?.data?.title
  if (typeof title === "string" && title.trim()) return title.trim()
  const h1 = note.meta.headings.find((h) => h.level === 1)?.text.trim()
  if (h1) return h1
  return note.name.replace(/^\d{4}-\d{2}-\d{2}\s+/, "") || note.name
}
