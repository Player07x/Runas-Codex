/**
 * Tamanho do token em células da grade (U41): qualquer número de 0,25 a 20, com vírgula ou ponto. A mesa já aceitava
 * esse intervalo (`normalizeToken`); este é o mesmo limite para a ficha da Wiki e o painel da mesa.
 */
export const TOKEN_SIZE_MIN = 0.25
export const TOKEN_SIZE_MAX = 20
/** Atalhos mostrados ao lado do campo. */
export const TOKEN_SIZE_SHORTCUTS = [0.5, 1, 2, 3, 4] as const

/** Lê o que o usuário digitou ("1,7", "2.5"); `null` se não for número. Limita ao intervalo e a duas casas. */
export function parseTokenSize(text: string): number | null {
  const clean = text.trim().replace(",", ".")
  if (!/^\d*\.?\d+$|^\d+\.$/.test(clean)) return null
  const value = Number(clean)
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(Math.min(TOKEN_SIZE_MAX, Math.max(TOKEN_SIZE_MIN, value)) * 100) / 100
}

/** "1,5" e não "1.5": a interface é em pt-BR. */
export function formatTokenSize(size: number): string {
  return String(Math.round(size * 100) / 100).replace(".", ",")
}

/** "1 célula", "2,5 células". */
export function tokenSizeLabel(size: number): string {
  return `${formatTokenSize(size)} ${size === 1 ? "célula" : "células"}`
}
