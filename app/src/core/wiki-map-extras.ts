/**
 * Partes extras do bloco `runas-mapa`: camadas de imagem por era (crônicas) e desenhos (áreas, rotas e rótulos). Os
 * pontos são frações da imagem (0 a 1). Campos novos só vão para o bloco quando têm valor, então um mapa antigo lido e
 * gravado de novo continua igual.
 */
export interface EraRange { from?: number; to?: number; secret?: boolean }
export interface MapImageLayer extends EraRange { name: string; image: string; opacity: number }
export type AreaShape = "retangulo" | "elipse" | "livre"
export type AreaBorder = "continua" | "tracejada" | "nenhuma"
export interface MapDrawing extends EraRange {
  kind: "zona" | "rota" | "rotulo"
  points: { x: number; y: number }[]
  color: string
  text: string
  layer: string
  /** Preenchimento da área, de 0 a 1 (sem o campo, 0,2). */
  opacity?: number
  /** Borda da área (sem o campo, contínua). */
  border?: AreaBorder
  /** Alvo do link da nota da área (`[[alvo]]`). */
  note?: string
  /** Como a área foi desenhada; editar os vértices a torna livre. */
  shape?: AreaShape
}
export interface MapExtras { images?: MapImageLayer[]; drawings?: MapDrawing[] }

export const DEFAULT_DRAWING_COLOR = "#76558f"
export const DEFAULT_AREA_OPACITY = 0.2
const SHAPES: AreaShape[] = ["retangulo", "elipse", "livre"]
const BORDERS: AreaBorder[] = ["continua", "tracejada", "nenhuma"]

const object = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v)
const round = (n: number) => Math.round(n * 10_000) / 10_000
const linkTarget = (value: string) => /^\s*\[\[([^\]|#]+)/.exec(value)?.[1]?.trim() ?? value.trim()

const range = (d: Record<string, unknown>): EraRange => ({
  ...(finite(d.era_inicio) ? { from: d.era_inicio } : {}),
  ...(finite(d.era_fim) ? { to: d.era_fim } : {}),
  ...(d.segredo === true ? { secret: true } : {}),
})

export const inEra = (range: EraRange, year: number, players = false) =>
  !(players && range.secret) && (range.from === undefined || year >= range.from) && (range.to === undefined || year <= range.to)

export function parseMapExtras(data: Record<string, unknown>): MapExtras {
  const images = (Array.isArray(data.imagens) ? data.imagens : []).map((value): MapImageLayer => {
    const d = object(value)
    if (typeof d.nome !== "string" || typeof d.imagem !== "string") throw new Error("Cada camada de imagem precisa de nome e imagem.")
    return { name: d.nome, image: d.imagem.replace(/^\[\[|\]\]$/g, ""), opacity: finite(d.opacidade) ? Math.max(0, Math.min(1, d.opacidade)) : 1, ...range(d) }
  })
  const drawings = (Array.isArray(data.desenhos) ? data.desenhos : []).map((value): MapDrawing => {
    const d = object(value)
    if (!["zona", "rota", "rotulo"].includes(String(d.tipo)) || !Array.isArray(d.pontos)) throw new Error("Desenho precisa de tipo e pontos.")
    const points = d.pontos.map((value) => {
      const p = object(value)
      if (!finite(p.x) || !finite(p.y)) throw new Error("Coordenada inválida no desenho.")
      return { x: Math.max(0, Math.min(1, p.x)), y: Math.max(0, Math.min(1, p.y)) }
    })
    if (points.length < (d.tipo === "zona" ? 3 : d.tipo === "rota" ? 2 : 1) || points.length > 10000) throw new Error("Quantidade de pontos inválida no desenho.")
    return {
      kind: d.tipo as MapDrawing["kind"],
      points,
      color: typeof d.cor === "string" && /^#[0-9a-f]{6}$/i.test(d.cor) ? d.cor : DEFAULT_DRAWING_COLOR,
      text: typeof d.texto === "string" ? d.texto : "",
      layer: typeof d.camada === "string" ? d.camada : "",
      ...range(d),
      ...(finite(d.opacidade) ? { opacity: Math.max(0, Math.min(1, d.opacidade)) } : {}),
      ...(BORDERS.includes(d.borda as AreaBorder) ? { border: d.borda as AreaBorder } : {}),
      ...(typeof d.nota === "string" && d.nota.trim() ? { note: linkTarget(d.nota) } : {}),
      ...(SHAPES.includes(d.forma as AreaShape) ? { shape: d.forma as AreaShape } : {}),
    }
  })
  return { ...(images.length ? { images } : {}), ...(drawings.length ? { drawings } : {}) }
}

const yamlRange = (d: EraRange) => ({ ...(d.from !== undefined ? { era_inicio: d.from } : {}), ...(d.to !== undefined ? { era_fim: d.to } : {}), ...(d.secret ? { segredo: true } : {}) })

export function mapExtrasYaml(extras: MapExtras) {
  return {
    imagens: (extras.images ?? []).map((d) => ({ nome: d.name, imagem: `[[${d.image}]]`, opacidade: d.opacity, ...yamlRange(d) })),
    desenhos: (extras.drawings ?? []).map((d) => ({
      tipo: d.kind,
      pontos: d.points.map((p) => ({ x: round(p.x), y: round(p.y) })),
      cor: d.color,
      texto: d.text,
      camada: d.layer,
      ...yamlRange(d),
      ...(d.opacity !== undefined ? { opacidade: round(d.opacity) } : {}),
      ...(d.border ? { borda: d.border } : {}),
      ...(d.note ? { nota: `[[${d.note}]]` } : {}),
      ...(d.shape ? { forma: d.shape } : {}),
    })),
  }
}
