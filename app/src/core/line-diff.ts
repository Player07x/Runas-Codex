/** Comparação linha a linha de duas versões de uma nota (cópia de conflito × original), sem dependências. */
export type DiffLine = { kind: "same" | "removed" | "added"; text: string }
export type DiffItem = DiffLine | { kind: "skip"; count: number }

const lines = (text: string) => text.replace(/\r\n?/g, "\n").split("\n")

/**
 * Linhas iguais, só na primeira versão (`removed`) e só na segunda (`added`), pela maior subsequência comum. O começo e
 * o fim iguais saem antes da tabela; se o meio passar de `limit` células, mostra as duas partes inteiras.
 */
export function lineDiff(before: string, after: string, limit = 2_500_000): DiffLine[] {
  const a = lines(before), b = lines(after)
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let endA = a.length, endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB-- }
  const same = (text: string): DiffLine => ({ kind: "same", text })
  const removed = (text: string): DiffLine => ({ kind: "removed", text })
  const added = (text: string): DiffLine => ({ kind: "added", text })
  const midA = a.slice(start, endA), midB = b.slice(start, endB)
  const n = midA.length, m = midB.length
  const middle: DiffLine[] = []
  if (n * m > limit) {
    middle.push(...midA.map(removed), ...midB.map(added))
  } else {
    const width = m + 1
    const table = new Uint32Array((n + 1) * width)
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i * width + j] = midA[i] === midB[j] ? table[(i + 1) * width + j + 1]! + 1 : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!)
      }
    }
    let i = 0, j = 0
    while (i < n && j < m) {
      if (midA[i] === midB[j]) { middle.push(same(midA[i]!)); i++; j++ }
      else if (table[(i + 1) * width + j]! >= table[i * width + j + 1]!) middle.push(removed(midA[i++]!))
      else middle.push(added(midB[j++]!))
    }
    while (i < n) middle.push(removed(midA[i++]!))
    while (j < m) middle.push(added(midB[j++]!))
  }
  return [...a.slice(0, start).map(same), ...middle, ...a.slice(endA).map(same)]
}

/** Esconde os trechos iguais longos, deixando `context` linhas em volta de cada mudança. */
export function diffHunks(diff: DiffLine[], context = 2): DiffItem[] {
  const keep = diff.map(() => false)
  diff.forEach((line, index) => {
    if (line.kind === "same") return
    for (let k = Math.max(0, index - context); k <= Math.min(diff.length - 1, index + context); k++) keep[k] = true
  })
  const items: DiffItem[] = []
  let skipped = 0
  diff.forEach((line, index) => {
    if (keep[index]) {
      if (skipped) items.push({ kind: "skip", count: skipped })
      skipped = 0
      items.push(line)
    } else skipped++
  })
  if (skipped) items.push({ kind: "skip", count: skipped })
  return items
}
