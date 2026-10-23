import type { VaultEntry } from "../platform/platform"

export interface GeneratedVault { entries: VaultEntry[]; texts: Record<string, string> }

/** Cofre determinístico para comparar índice, busca e gráfico sem dados pessoais. */
export function generateLargeVault(count = 10_000): GeneratedVault {
  const entries: VaultEntry[] = []
  const texts: Record<string, string> = {}
  for (let index = 0; index < count; index++) {
    const path = `Notas/Grande/N${String(index).padStart(5, "0")}.md`
    const first = (index + 1) % count, second = (index * 7 + 13) % count, third = (index * 13 + 17) % count
    const text = `---\nid: ${index}\ntags: [benchmark, cidade/${index % 20}]\n---\n# Nota ${index}\n\nA cidade de Valdris registra o evento ${index}. [[N${String(first).padStart(5, "0")}]] [[N${String(second).padStart(5, "0")}]] [[N${String(third).padStart(5, "0")}]]\n`
    texts[path] = text
    entries.push({ path, size: text.length, mtime: index + 1 })
  }
  return { entries, texts }
}
