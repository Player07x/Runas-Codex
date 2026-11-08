import { TOKEN_DISPOSITIONS, type TokenBar, type TokenData, type TokenDisposition } from "../vtt/shared/scene"

/** Propriedades de token gravadas na ficha da nota da Wiki. */
export const TOKEN_KEYS = ["token", "token_tamanho", "token_disposicao", "token_barras"] as const
export type WikiToken = { image?: string; size: number; disposition: TokenDisposition; bars: TokenBar[] }

const link = (value: unknown) => typeof value === "string" ? (value.match(/^!??\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/)?.[1]?.trim() ?? value.trim()) : ""
const number = (value: unknown, fallback: number) => typeof value === "number" && Number.isFinite(value) ? value : fallback
const color = (value: unknown) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#82aaa6"

/** Lê uma barra no formato visível da mesa, por exemplo `PV 12/12`. */
export function parseTokenBar(value: unknown): TokenBar | null {
  if (typeof value !== "string") return null
  const match = /^\s*(.{1,24}?)\s+(-?\d+(?:[.,]\d+)?)\s*\/\s*(-?\d+(?:[.,]\d+)?)\s*$/.exec(value)
  if (!match) return null
  const label = match[1]!.trim()
  if (!label) return null
  return { label, value: Number(match[2]!.replace(",", ".")), max: Number(match[3]!.replace(",", ".")), color: color(undefined) }
}

export function tokenBarText(bar: Pick<TokenBar, "label" | "value" | "max">): string {
  return `${bar.label} ${bar.value}/${bar.max}`
}

export function noteToken(data: Record<string, unknown>): WikiToken | null {
  const image = link(data.token)
  const disposition = typeof data.token_disposicao === "string" && (TOKEN_DISPOSITIONS as readonly string[]).includes(data.token_disposicao) ? data.token_disposicao as TokenDisposition : "neutral"
  const rawBars = Array.isArray(data.token_barras) ? data.token_barras : typeof data.token_barras === "string" ? [data.token_barras] : []
  const bars = rawBars.flatMap((value) => typeof value === "string" ? [parseTokenBar(value)].filter((bar): bar is TokenBar => Boolean(bar)) : [])
  if (!image && bars.length === 0 && data.token_tamanho === undefined && data.token_disposicao === undefined) return null
  return { ...(image ? { image } : {}), size: Math.min(20, Math.max(0.25, number(data.token_tamanho, 1))), disposition, bars }
}

/** Valores prontos para `setProperty`, preservando links e o texto aprovado no formato do cofre. */
export function tokenProperties(token: WikiToken | null): Record<string, unknown> {
  if (!token) return { token: undefined, token_tamanho: undefined, token_disposicao: undefined, token_barras: undefined }
  return {
    token: token.image ? `[[${token.image}]]` : undefined,
    token_tamanho: token.size,
    token_disposicao: token.disposition,
    token_barras: token.bars.length ? token.bars.map(tokenBarText) : undefined,
  }
}

/**
 * “Importar de um token salvo…” (U22): o tamanho, a disposição e as barras do token da biblioteca viram o token da
 * ficha; `image` é o anexo já copiado para o cofre (sem ele, fica a imagem que a nota já tinha).
 */
export function tokenFromSaved(saved: Pick<TokenData, "size" | "disposition" | "bars">, image: string | undefined, current: WikiToken | null): WikiToken {
  const kept = image ?? current?.image
  return {
    ...(kept ? { image: kept } : {}),
    size: Math.min(20, Math.max(0.25, number(saved.size, 1))),
    disposition: (TOKEN_DISPOSITIONS as readonly string[]).includes(saved.disposition) ? saved.disposition : "neutral",
    bars: saved.bars.map((bar) => ({ ...bar })),
  }
}

/** Nome do anexo da imagem do token salvo: o nome do token com a extensão da imagem guardada. */
export function savedTokenFileName(name: string, asset: string): string {
  const ext = /\.([a-z0-9]{2,5})$/i.exec(asset)?.[1]?.toLowerCase() ?? "png"
  const base = name.replace(/[\\/:*?"<>|#^[\]]+/g, " ").replace(/\s+/g, " ").trim() || "Token"
  return `${base} (token).${ext}`
}
