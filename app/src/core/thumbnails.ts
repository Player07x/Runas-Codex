/**
 * U86: larguras de miniatura que o app pede ao cofre. Poucas larguras fixas, para o cache (fora do cofre) servir de
 * novo a mesma miniatura em telas diferentes.
 */
export const THUMB_WIDTHS = [64, 128, 256, 640, 1280] as const

/** A menor largura de miniatura que cobre `cssWidth` px na densidade da tela; `null` se nenhuma cobre (imagem inteira). */
export function thumbWidth(cssWidth: number, pixelRatio = 1): number | null {
  const needed = Math.ceil(cssWidth * Math.max(1, Math.min(pixelRatio, 3)))
  return THUMB_WIDTHS.find((width) => width >= needed) ?? null
}

/** Lê a largura pedida na URL (`?w=`); só vale uma das larguras fixas. */
export function requestedThumbWidth(value: string | null): number | null {
  const width = Number(value)
  return (THUMB_WIDTHS as readonly number[]).includes(width) ? width : null
}
