/** Retângulo na tela (coordenadas da janela, em px). */
export interface Box { top: number; bottom: number; left: number; right: number }

/** Parte comum de dois retângulos (vazia quando não se tocam: `bottom <= top` ou `right <= left`). */
export function intersectBoxes(a: Box, b: Box): Box {
  return { top: Math.max(a.top, b.top), bottom: Math.min(a.bottom, b.bottom), left: Math.max(a.left, b.left), right: Math.min(a.right, b.right) }
}

/**
 * Onde desenhar a barra da seleção (camada fixa, por cima de tudo): acima do trecho selecionado, ou abaixo quando
 * não cabe acima, sempre dentro da parte visível do texto (`visible`) para não cobrir as barras da tela nem ficar
 * embaixo dos painéis ao lado. Larga demais para o texto, ela usa a largura da janela. Some quando o trecho rolou
 * para fora da vista.
 */
export function placeSelectionBar(selection: Box, bar: { width: number; height: number }, visible: Box, viewport: { width: number; height: number }, gap = 8, margin = 8): { top: number; left: number; shown: boolean } {
  const area = intersectBoxes(visible, { top: 0, left: 0, bottom: viewport.height, right: viewport.width })
  const shown = area.bottom > area.top && area.right > area.left && selection.bottom > area.top && selection.top < area.bottom
  const above = selection.top - gap - bar.height
  const below = selection.bottom + gap
  // Seleção maior que a parte visível: a barra fica no alto do texto, sobre a seleção.
  const top = above >= area.top ? above : below + bar.height <= area.bottom ? below : area.top + margin
  const fitsText = bar.width <= area.right - area.left - 2 * margin
  const min = fitsText ? area.left + margin : margin
  const max = fitsText ? area.right - margin - bar.width : viewport.width - margin - bar.width
  const center = (selection.left + selection.right) / 2
  return {
    top: Math.round(Math.max(margin, Math.min(top, viewport.height - margin - bar.height))),
    left: Math.round(Math.max(min, Math.min(center - bar.width / 2, max))),
    shown,
  }
}
