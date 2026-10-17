export const PALETTES = ["orbita", "floresta", "brasa"] as const
export interface Appearance { scale: number; palette: typeof PALETTES[number]; motion: "system" | "reduce"; tablet: boolean }
export const DEFAULT_APPEARANCE: Appearance = { scale: 100, palette: "orbita", motion: "system", tablet: false }
/** Preferências antigas ou corrompidas nunca viram estilos arbitrários. */
export function parseAppearance(raw: string | null): Appearance {
  try {
    const value: unknown = JSON.parse(raw ?? "null")
    if (!value || typeof value !== "object") return { ...DEFAULT_APPEARANCE }
    const p = value as Record<string, unknown>
    return { scale: typeof p.scale === "number" && Number.isFinite(p.scale) ? Math.round(Math.min(140, Math.max(85, p.scale))) : 100,
      palette: PALETTES.includes(p.palette as Appearance["palette"]) ? p.palette as Appearance["palette"] : "orbita",
      motion: p.motion === "reduce" ? "reduce" : "system", tablet: p.tablet === true }
  } catch { return { ...DEFAULT_APPEARANCE } }
}
/** Contraste sRGB, usado na conferência das variáveis de tema. */
export function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const full = hex.length === 4 ? "#" + [...hex.slice(1)].map(c => c + c).join("") : hex
    const channels = [1, 3, 5].map(i => parseInt(full.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    return channels[0]! * .2126 + channels[1]! * .7152 + channels[2]! * .0722
  }
  const a = luminance(foreground), b = luminance(background)
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
}
