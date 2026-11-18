/**
 * Câmera dos desenhos que se movem livres (organograma e árvore genealógica, U117): o desenho, com `width` × `height`
 * na escala 1, aparece na região deslocado de (`x`, `y`) e multiplicado por `scale`. Antes o desenho andava pela
 * rolagem da caixa e, menor que ela, ficava preso no canto de cima; com a câmera ele vai para qualquer lado.
 */
export interface View { x: number; y: number; scale: number }
export interface Size { width: number; height: number }

export const MIN_SCALE = 0.3
export const MAX_SCALE = 1.6
/** Quanto do desenho fica sempre à vista ao arrastar, para ele não se perder fora da região. */
export const KEEP_VISIBLE = 80
const PAD = 16

export const clampScale = (value: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(value * 100) / 100))

/** Deixa pelo menos `KEEP_VISIBLE` px do desenho dentro da região (ou o desenho inteiro, se for menor que isso). */
export function clampView(view: View, drawing: Size, region: Size): View {
  const keepX = Math.min(KEEP_VISIBLE, drawing.width * view.scale), keepY = Math.min(KEEP_VISIBLE, drawing.height * view.scale)
  const x = Math.min(region.width - keepX, Math.max(keepX - drawing.width * view.scale, view.x))
  const y = Math.min(region.height - keepY, Math.max(keepY - drawing.height * view.scale, view.y))
  return { x, y, scale: view.scale }
}

/** O desenho inteiro, centrado, sem passar de 100 %. */
export function fitView(drawing: Size, region: Size): View {
  const scale = clampScale(Math.min(1, (region.width - PAD * 2) / drawing.width, (region.height - PAD * 2) / drawing.height))
  return centerView(drawing, region, scale)
}

export function centerView(drawing: Size, region: Size, scale: number): View {
  return { x: (region.width - drawing.width * scale) / 2, y: (region.height - drawing.height * scale) / 2, scale }
}

/**
 * Ao abrir: enquadra; mas se tudo só couber abaixo de 60 %, abre a 100 % com o topo do desenho (a organização) no meio
 * da largura e perto do alto (U72).
 */
export function initialView(drawing: Size, region: Size): View {
  const fit = fitView(drawing, region)
  if (fit.scale >= 0.6 || Math.min(1, (region.width - PAD * 2) / drawing.width, (region.height - PAD * 2) / drawing.height) >= 0.6) return fit
  return clampView({ x: (region.width - drawing.width) / 2, y: PAD, scale: 1 }, drawing, region)
}

/** Muda o zoom mantendo parado o ponto (px, py) da região, como num mapa. */
export function zoomAt(view: View, factor: number, px: number, py: number, drawing: Size, region: Size): View {
  const scale = clampScale(view.scale * factor)
  if (scale === view.scale) return view
  const ratio = scale / view.scale
  return clampView({ x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio, scale }, drawing, region)
}

export function panBy(view: View, dx: number, dy: number, drawing: Size, region: Size): View {
  return clampView({ x: view.x + dx, y: view.y + dy, scale: view.scale }, drawing, region)
}

/** Põe o retângulo (em coordenadas do desenho) no meio da região. */
export function centerOn(view: View, box: { x: number; y: number; w: number; h: number }, drawing: Size, region: Size): View {
  const cx = (box.x + box.w / 2) * view.scale, cy = (box.y + box.h / 2) * view.scale
  return clampView({ x: region.width / 2 - cx, y: region.height / 2 - cy, scale: view.scale }, drawing, region)
}

/** Move o mínimo para o retângulo (em coordenadas do desenho) ficar inteiro à vista, com uma margem. */
export function reveal(view: View, box: { x: number; y: number; w: number; h: number }, drawing: Size, region: Size): View {
  const left = view.x + box.x * view.scale, top = view.y + box.y * view.scale
  const right = left + box.w * view.scale, bottom = top + box.h * view.scale
  let dx = 0, dy = 0
  if (left < PAD) dx = PAD - left
  else if (right > region.width - PAD) dx = Math.max(PAD - left, region.width - PAD - right)
  if (top < PAD) dy = PAD - top
  else if (bottom > region.height - PAD) dy = Math.max(PAD - top, region.height - PAD - bottom)
  return dx || dy ? panBy(view, dx, dy, drawing, region) : view
}
