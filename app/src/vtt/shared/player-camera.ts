import type { GridConfig, Point } from "./grid"

/**
 * Câmera dos jogadores (1.9). Ao entrar numa cena em que tem token, o jogador começa perto dele, e não vendo o mapa
 * inteiro. O mestre pode prender a câmera ao token e limitar o quanto ela se afasta: um combinado de mesa para não
 * explorar o mapa sem mover o token. Isso trabalha junto da névoa e não esconde nada: todo token revelado continua
 * desenhado. As medidas são em “vezes o tamanho do token”, para valer igual para tokens de tamanhos diferentes.
 */
export interface CameraRules {
  /** A câmera de quem tem token na cena fica presa a ele (sem arrastar o mapa). */
  lockToToken: boolean
  /** Com a câmera presa: quanto ela pode se afastar, em vezes o tamanho do token. */
  maxZoomOut: number
}

export const ZOOM_OUT_LIMITS = { min: 4, max: 30 } as const
export const DEFAULT_CAMERA_RULES: CameraRules = { lockToToken: false, maxZoomOut: 12 }
/** Ao entrar na cena: a área em volta do token, em vezes o tamanho dele, no lado menor da tela. */
export const ENTER_SPAN = 8

export function normalizeCameraRules(value: unknown): CameraRules {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
  const max = typeof raw.maxZoomOut === "number" && Number.isFinite(raw.maxZoomOut) ? Math.round(raw.maxZoomOut) : DEFAULT_CAMERA_RULES.maxZoomOut
  return {
    lockToToken: typeof raw.lockToToken === "boolean" ? raw.lockToToken : DEFAULT_CAMERA_RULES.lockToToken,
    maxZoomOut: Math.min(ZOOM_OUT_LIMITS.max, Math.max(ZOOM_OUT_LIMITS.min, max)),
  }
}

/** Lado do token em pixels da cena (sem grade, a célula vale 100 px, como no resto da mesa). */
export function tokenPixels(size: number, grid: Pick<GridConfig, "type" | "size">): number {
  return Math.max(1, size) * (grid.type === "none" ? 100 : grid.size)
}

/** Escala que mostra `span` vezes o token no lado menor da tela. */
export function zoomForSpan(screen: { width: number; height: number }, tokenSize: number, span: number): number {
  return Math.min(screen.width, screen.height) / (Math.max(1, tokenSize) * Math.max(1, span))
}

export interface CameraToken { id: string; x: number; y: number; size: number }

/**
 * Em que token a câmera fica: o último que o jogador escolheu entre os dele; senão o último que se moveu; senão o
 * primeiro da cena.
 */
export function pickFocusToken(own: readonly CameraToken[], lastSelected: string | null, lastMoved: string | null): CameraToken | null {
  return own.find((token) => token.id === lastSelected) ?? own.find((token) => token.id === lastMoved) ?? own[0] ?? null
}

/** Quais tokens mudaram de lugar desde a última vez (para saber o último que se moveu). */
export function movedTokens(before: ReadonlyMap<string, Point>, now: readonly CameraToken[]): string[] {
  return now.filter((token) => { const old = before.get(token.id); return old !== undefined && (old.x !== token.x || old.y !== token.y) }).map((token) => token.id)
}
