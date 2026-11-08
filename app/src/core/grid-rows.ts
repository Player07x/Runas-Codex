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
