/**
 * Fileiras inteiras na grade (U28): quantos cartões mostrar para que a última fileira não fique pela metade. Com tudo
 * cabendo no limite, mostra tudo.
 */
export function fullRows(total: number, limit: number, columns: number): number {
  const size = Math.max(1, Math.floor(columns))
  if (total <= limit) return total
  return Math.min(total, Math.max(size, Math.ceil(Math.max(0, limit) / size) * size))
}

/** O próximo limite do “Mostrar mais”: mais uma página, fechando a fileira. */
export function nextLimit(total: number, current: number, columns: number, page = 60): number {
  return fullRows(total, current + page, columns)
}

/**
 * Páginas da grade (U71): fileiras inteiras com perto de `target` cartões, entre `min` e `max` (8 colunas → 48,
 * 7 → 49, 5 → 50). Na lista (uma coluna) a página tem `target` linhas.
 */
export function pageSize(columns: number, target = 48, min = 40, max = 60): number {
  const size = Math.max(1, Math.floor(columns))
  let rows = Math.max(1, Math.ceil(target / size))
  while (rows > 1 && rows * size > max) rows--
  while (rows * size < min) rows++
  return rows * size
}

/** Quantas páginas há e a página válida mais perto da pedida (a grade pode ter mudado de largura). */
export function pageCount(total: number, size: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / Math.max(1, size)))
}
export function clampPage(page: number, total: number, size: number): number {
  return Math.min(pageCount(total, size), Math.max(1, Math.floor(page) || 1))
}

/** Os números a mostrar na navegação: a primeira, a última e as vizinhas da atual; `null` é um “…”. */
export function pageNumbers(current: number, pages: number): (number | null)[] {
  const wanted = [...new Set([1, pages, current - 1, current, current + 1])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b)
  const out: (number | null)[] = []
  wanted.forEach((n, i) => {
    const previous = wanted[i - 1]
    // Um buraco de uma página só mostra a página em vez do “…”.
    if (previous !== undefined && n - previous === 2) out.push(previous + 1)
    else if (previous !== undefined && n - previous > 2) out.push(null)
    out.push(n)
  })
  return out
}
