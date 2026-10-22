export const PALETTES = ["orbita", "floresta", "brasa"] as const
/** Espaçamento do texto de leitura: "muito-amplo" usa os valores da WCAG 1.4.12. */
export const SPACINGS = ["normal", "amplo", "muito-amplo"] as const
export const LINE_WIDTHS = ["estreita", "media", "larga"] as const
/** "legivel" é a Atkinson Hyperlegible Next, embutida no app (sem rede). */
export const READING_FONTS = ["geist", "garamond", "legivel"] as const
/** Espaços que podem ir para a barra inferior do celular (o `match` da navegação; "" é o Início). */
export const BOTTOM_NAV_CHOICES = ["", "notas", "agenda", "wiki", "campanhas", "livros", "vtt"] as const
export const DEFAULT_BOTTOM_NAV = ["", "notas", "agenda", "vtt"]

export interface Appearance {
  scale: number; palette: typeof PALETTES[number]; motion: "system" | "reduce"; tablet: boolean
  spacing: typeof SPACINGS[number]; lineWidth: typeof LINE_WIDTHS[number]; readingFont: typeof READING_FONTS[number]
  /** "system" segue `prefers-contrast: more`; "high" liga sempre. */
  contrast: "system" | "high"; underlineLinks: boolean; solid: boolean; labels: boolean; strongFocus: boolean
  bottomNav: string[]
}

/** O que o "Restaurar padrão" da seção Acessibilidade volta (paleta, tema e barra inferior ficam). */
export const ACCESSIBILITY_DEFAULTS = {
  scale: 100, motion: "system", tablet: false, spacing: "normal", lineWidth: "media", readingFont: "geist",
  contrast: "system", underlineLinks: false, solid: false, labels: false, strongFocus: false,
} satisfies Partial<Appearance>

export const DEFAULT_APPEARANCE: Appearance = { ...ACCESSIBILITY_DEFAULTS, palette: "orbita", bottomNav: [...DEFAULT_BOTTOM_NAV] }

const oneOf = <T extends string>(list: readonly T[], value: unknown, fallback: T): T => (list.includes(value as T) ? value as T : fallback)

/** Quatro espaços diferentes e conhecidos; o que faltar é completado pelo padrão, na ordem dele. */
export function parseBottomNav(value: unknown): string[] {
  const chosen = Array.isArray(value) ? value.filter((item): item is string => (BOTTOM_NAV_CHOICES as readonly string[]).includes(item as string)) : []
  const unique = [...new Set(chosen)].slice(0, 4)
  for (const item of [...DEFAULT_BOTTOM_NAV, ...BOTTOM_NAV_CHOICES]) if (unique.length < 4 && !unique.includes(item)) unique.push(item)
  return unique
}

/** Troca o atalho de uma posição; se o espaço já estava em outra, as duas posições trocam de lugar. */
export function setBottomSlot(current: readonly string[], slot: number, value: string): string[] {
  const next = parseBottomNav(current)
  if (!(BOTTOM_NAV_CHOICES as readonly string[]).includes(value) || slot < 0 || slot > 3) return next
  const other = next.indexOf(value)
  if (other !== -1) next[other] = next[slot]!
  next[slot] = value
  return next
}

/** Preferências antigas ou corrompidas nunca viram estilos arbitrários. */
export function parseAppearance(raw: string | null): Appearance {
  try {
    const value: unknown = JSON.parse(raw ?? "null")
    if (!value || typeof value !== "object") return { ...DEFAULT_APPEARANCE, bottomNav: [...DEFAULT_BOTTOM_NAV] }
    const p = value as Record<string, unknown>
    return { scale: typeof p.scale === "number" && Number.isFinite(p.scale) ? Math.round(Math.min(140, Math.max(85, p.scale))) : 100,
      palette: oneOf(PALETTES, p.palette, "orbita"),
      motion: p.motion === "reduce" ? "reduce" : "system", tablet: p.tablet === true,
      spacing: oneOf(SPACINGS, p.spacing, "normal"), lineWidth: oneOf(LINE_WIDTHS, p.lineWidth, "media"), readingFont: oneOf(READING_FONTS, p.readingFont, "geist"),
      contrast: p.contrast === "high" ? "high" : "system", underlineLinks: p.underlineLinks === true, solid: p.solid === true, labels: p.labels === true, strongFocus: p.strongFocus === true,
      bottomNav: parseBottomNav(p.bottomNav) }
  } catch { return { ...DEFAULT_APPEARANCE, bottomNav: [...DEFAULT_BOTTOM_NAV] } }
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
