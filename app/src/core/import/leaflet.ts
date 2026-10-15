import { parse as parseYaml } from "yaml"
import { flowList, flowMap } from "./yaml-out"

/**
 * Blocos ```leaflet``` (plugin Obsidian Leaflet) viram blocos ```runas-mapa``` (ADR 0010), com os marcadores do bloco,
 * os do `data.json` do plugin (os criados com o clique direito, guardados pelo `id` do mapa) e os das notas com
 * `location` no frontmatter (`markerFile`, `markerFolder`, `markerTag`).
 *
 * Num mapa de imagem o Leaflet usa coordenadas `CRS.Simple`: sem `bounds`, um ponto da imagem em pixels (px, py) fica
 * em `lat = -py / 2^(maxZoom-1)`, `long = px / 2^(maxZoom-1)`. Por isso a conversão precisa do tamanho da imagem.
 * Os marcadores salvos já trazem `percent` (a posição de 0 a 1), que é o que o app usa.
 */

type Json = Record<string, unknown>
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v])
const num = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v.replace(/%$/, "")) : NaN
  return Number.isFinite(n) ? n : undefined
}

/** Alvo de um link (`[[Nota|apelido]]`, `[texto](Nota.md)` ou texto solto), sem `#seção`. */
export function linkTarget(link: unknown): string | undefined {
  if (typeof link !== "string" || !link.trim()) return undefined
  const wiki = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/.exec(link)
  const md = /\[[^\]]*\]\(([^)]+)\)/.exec(link)
  const raw = (wiki?.[1] ?? md?.[1] ?? link.replace(/[[\]]/g, "")).trim()
  return raw || undefined
}

const isUrl = (text: string) => /^[a-z][a-z0-9+.-]*:\/\//i.test(text)

/** Divide `tipo, lat, long, [[link]], descrição` pelas vírgulas que não estão em links nem entre aspas. */
export function splitCsv(line: string): string[] {
  const out: string[] = []
  let current = ""
  let depth = 0
  let quote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') quote = !quote
    else if (!quote && line.startsWith("[[", i)) depth++
    else if (!quote && line.startsWith("]]", i) && depth) depth--
    if (ch === "," && !quote && !depth) {
      out.push(current.trim())
      current = ""
    } else current += ch
  }
  out.push(current.trim())
  return out.map((part) => part.replace(/^"(.*)"$/, "$1"))
}

export interface LeafletParams {
  id?: string
  images: string[]
  markers: string[]
  commandMarkers: number
  markerFiles: string[]
  markerFolders: string[]
  markerTags: string[][]
  bounds?: [[number, number], [number, number]]
  maxZoom: number
  scale?: number
  unit?: string
  distanceMultiplier?: number
  /** Recursos que o app não tem (overlay, geojson, gpx…), para o aviso. */
  unsupported: string[]
}

/** Lê o bloco como o plugin lê: YAML com chaves repetidas (`marker:` várias vezes) e os links trocados antes. */
export function readLeafletBlock(source: string): LeafletParams {
  const links: string[] = []
  const masked = source.replace(/(?:\[[^\]\n]*\]\(|\[\[)[^[\]\n]*(?:\)|\]\])/g, (link) => `LEAFLET_LINK_${links.push(link) - 1}`)
  const unmask = (v: unknown): unknown => (typeof v === "string" ? v.replace(/LEAFLET_LINK_(\d+)/g, (_, i: string) => links[Number(i)] ?? "") : Array.isArray(v) ? v.map(unmask) : v)
  let params: Json = {}
  try {
    params = obj(parseYaml(masked, { uniqueKeys: false }))
  } catch {
    for (const line of masked.split(/\r?\n/)) {
      const m = /^([A-Za-z]+):\s?(.*)$/.exec(line)
      if (m) params[m[1]!] = m[2]
    }
  }
  // Chaves que se repetem (várias linhas `marker:`, `image:`): o YAML fica com a última, então lemos as linhas.
  const repeated = (key: string): string[] | null => {
    const lines = [...masked.matchAll(new RegExp(`^${key}:\\s?(.*)$`, "gm"))].map((m) => m[1]!.trim())
    return lines.length > 1 ? lines.map((l) => String(unmask(l))) : null
  }
  const list = (key: string): string[] => repeated(key) ?? arr(unmask(params[key])).flatMap((v) => (Array.isArray(v) ? [v.join(", ")] : v === undefined || v === null ? [] : [String(v)]))
  const boundsRaw = unmask(params.bounds)
  const bounds = Array.isArray(boundsRaw) && boundsRaw.length === 2 && boundsRaw.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => num(n) !== undefined)) ? (boundsRaw.map((p) => (p as unknown[]).map((n) => num(n)!)) as [[number, number], [number, number]]) : undefined
  const unsupported = ["overlay", "overlayTag", "imageOverlay", "geojson", "geojsonFolder", "gpx", "gpxFolder", "linksTo", "linksFrom", "tileServer", "tileOverlay"].filter((key) => arr(params[key]).length > 0)
  return {
    ...(typeof params.id === "string" || typeof params.id === "number" ? { id: String(params.id) } : {}),
    images: list("image"),
    markers: list("marker"),
    commandMarkers: list("commandMarker").length,
    markerFiles: list("markerFile").flatMap((v) => v.split(/,\s*(?=\[\[)/)),
    markerFolders: list("markerFolder"),
    markerTags: (repeated("markerTag") ?? arr(unmask(params.markerTag)).map((v) => (Array.isArray(v) ? v.join(",") : String(v)))).map((v) => v.split(/,\s*/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean)),
    ...(bounds ? { bounds } : {}),
    maxZoom: num(params.maxZoom) ?? 10,
    ...(num(params.scale) !== undefined ? { scale: num(params.scale) } : {}),
    ...(typeof params.unit === "string" && params.unit.trim() ? { unit: params.unit.trim() } : {}),
    ...(num(params.distanceMultiplier) !== undefined ? { distanceMultiplier: num(params.distanceMultiplier) } : {}),
    unsupported,
  }
}

/** Um mapa salvo no `data.json` do plugin (`mapMarkers`). */
export interface LeafletSavedMap {
  id: string
  markers: { type: string; loc?: [number, number]; percent?: [number, number]; link?: string; description?: string; command?: boolean }[]
  overlays: number
  shapes: number
}

export function leafletSavedMaps(json: string): LeafletSavedMap[] {
  let data: Json
  try {
    data = obj(JSON.parse(json))
  } catch {
    return []
  }
  return arr(data.mapMarkers).flatMap((m): LeafletSavedMap[] => {
    const o = obj(m)
    if (typeof o.id !== "string") return []
    const pair = (v: unknown): [number, number] | undefined => (Array.isArray(v) && v.length >= 2 && num(v[0]) !== undefined && num(v[1]) !== undefined ? [num(v[0])!, num(v[1])!] : undefined)
    return [
      {
        id: o.id,
        markers: arr(o.markers).map((x) => {
          const k = obj(x)
          const type = typeof k.type === "string" ? k.type : "default"
          const loc = pair(k.loc)
          const percent = pair(k.percent)
          return { type, ...(loc ? { loc } : {}), ...(percent ? { percent } : {}), ...(typeof k.link === "string" && k.link ? { link: k.link } : {}), ...(typeof k.description === "string" && k.description ? { description: k.description } : {}), ...(k.command === true ? { command: true } : {}) }
        }),
        overlays: arr(o.overlays).length,
        shapes: arr(o.shapes).length,
      },
    ]
  })
}

/** Nota com marcador no frontmatter (`location: [lat, long]` ou `mapmarkers`). */
export interface LocatedNote {
  path: string
  /** Como a nota é escrita num link (o nome, sem `.md`). */
  linkText: string
  tags: string[]
  data: Record<string, unknown>
}

export interface LeafletContext {
  /** Caminho no cofre do alvo de um link, a partir da nota do bloco; `null` se não acha. */
  resolve(target: string): string | null
  /** Tamanho da imagem do mapa (pelo caminho no cofre), se der para ler. */
  imageSize(path: string): { width: number; height: number } | null
  saved?: LeafletSavedMap
  located: LocatedNote[]
}

export interface MapConversion {
  /** Conteúdo do bloco ```runas-mapa```, ou `null` se o bloco não dá para converter (o motivo está nos avisos). */
  yaml: string | null
  pins: number
  warnings: string[]
}

interface RawMarker {
  type: string
  lat?: number
  long?: number
  percent?: [number, number]
  link?: string
  description?: string
}

export function convertLeaflet(source: string, ctx: LeafletContext): MapConversion {
  const warnings: string[] = []
  const params = readLeafletBlock(source)
  const image = params.images[0]
  if (!image || image === "real" || params.unsupported.includes("tileServer")) return { yaml: null, pins: 0, warnings: ["Mapa do mundo real (camadas da internet): o app não usa a rede, e o bloco ficou como está."] }
  const imageTarget = linkTarget(image)!
  if (isUrl(imageTarget)) return { yaml: null, pins: 0, warnings: [`A imagem do mapa vem da internet (${imageTarget}); o app não usa a rede, e o bloco ficou como está.`] }
  if (params.images.length > 1) warnings.push(`O mapa tem ${params.images.length} imagens (camadas do Leaflet); só a primeira foi levada.`)
  const imagePath = ctx.resolve(imageTarget)
  if (!imagePath) warnings.push(`A imagem “${imageTarget}” não está no cofre.`)
  if (params.unsupported.length) warnings.push(`O app não tem: ${params.unsupported.join(", ")} (ficaram de fora).`)
  if (params.commandMarkers) warnings.push(`${params.commandMarkers} marcador(es) de comando do Obsidian ficaram de fora.`)
  if (params.distanceMultiplier !== undefined && params.distanceMultiplier !== 1) warnings.push(`O multiplicador de distância (${params.distanceMultiplier}) ficou de fora; a escala vale a distância principal.`)

  // Marcadores do bloco, do data.json e das notas.
  const markers: RawMarker[] = []
  for (const line of params.markers) {
    const [type, lat, long, link, description] = splitCsv(line)
    if (num(lat) === undefined || num(long) === undefined) {
      warnings.push(`Marcador sem coordenadas ignorado: “${line}”.`)
      continue
    }
    markers.push({ type: type || "default", lat: num(lat)!, long: num(long)!, ...(link && link !== "undefined" ? { link } : {}), ...(description && description !== "undefined" ? { description } : {}) })
  }
  if (params.id && ctx.saved) {
    for (const m of ctx.saved.markers) {
      if (m.command) {
        warnings.push("Um marcador de comando do Obsidian ficou de fora.")
        continue
      }
      markers.push({ type: m.type, ...(m.loc ? { lat: m.loc[0], long: m.loc[1] } : {}), ...(m.percent ? { percent: m.percent } : {}), ...(m.link ? { link: m.link } : {}), ...(m.description ? { description: m.description } : {}) })
    }
    if (ctx.saved.overlays) warnings.push(`${ctx.saved.overlays} círculo(s) desenhado(s) no mapa ficaram de fora (o app ainda não tem zonas).`)
    if (ctx.saved.shapes) warnings.push(`${ctx.saved.shapes} desenho(s) no mapa ficaram de fora (o app ainda não tem desenhos).`)
  }
  const fromNotes = new Set<string>()
  const files = new Set(params.markerFiles.map((f) => ctx.resolve(linkTarget(f) ?? f)).filter((p): p is string => Boolean(p)))
  for (const note of ctx.located) {
    const folder = params.markerFolders.some((f) => {
      const clean = f.replace(/^\/+|\/+$/g, "")
      return !clean || note.path.startsWith(clean + "/")
    })
    const lower = note.tags.map((t) => t.toLowerCase())
    const tagged = params.markerTags.some((tags) => tags.length > 0 && tags.every((t) => lower.includes(t.toLowerCase())))
    if (!files.has(note.path) && !folder && !tagged) continue
    fromNotes.add(note.path)
    const type = typeof note.data.mapmarker === "string" ? note.data.mapmarker : "default"
    let locations = Array.isArray(note.data.location) ? (note.data.location as unknown[]) : []
    if (locations.length && !Array.isArray(locations[0])) locations = [locations]
    for (const loc of locations) {
      const [lat, long] = Array.isArray(loc) ? loc : []
      if (num(lat) !== undefined && num(long) !== undefined) markers.push({ type, lat: num(lat)!, long: num(long)!, link: `[[${note.linkText}]]` })
    }
    for (const entry of Array.isArray(note.data.mapmarkers) ? note.data.mapmarkers : []) {
      if (!Array.isArray(entry)) continue
      const [t, loc, description] = entry as [unknown, unknown, unknown]
      const [lat, long] = Array.isArray(loc) ? loc : []
      if (num(lat) !== undefined && num(long) !== undefined) markers.push({ type: typeof t === "string" ? t : "default", lat: num(lat)!, long: num(long)!, link: `[[${note.linkText}]]`, ...(typeof description === "string" && description ? { description } : {}) })
    }
  }

  // Coordenadas de 0 a 1 a partir do canto de cima à esquerda.
  const size = imagePath ? ctx.imageSize(imagePath) : null
  const unit = 2 ** (params.maxZoom - 1)
  const toPoint = (m: RawMarker): [number, number] | null => {
    if (m.percent) return m.percent
    if (m.lat === undefined || m.long === undefined) return null
    if (params.bounds) {
      const [[a, b], [c, d]] = params.bounds
      const [top, bottom, left, right] = [Math.max(a, c), Math.min(a, c), Math.min(b, d), Math.max(b, d)]
      return top === bottom || left === right ? null : [(m.long - left) / (right - left), (top - m.lat) / (top - bottom)]
    }
    return size ? [(m.long * unit) / size.width, (-m.lat * unit) / size.height] : null
  }
  const pins: string[] = []
  const layers: string[] = []
  let lost = 0
  let outside = 0
  for (const m of markers) {
    const point = toPoint(m)
    if (!point) {
      lost++
      continue
    }
    if (point.some((n) => n < -0.001 || n > 1.001)) outside++
    const [x, y] = point.map((n) => Math.round(Math.min(1, Math.max(0, n)) * 10_000) / 10_000) as [number, number]
    const target = linkTarget(m.link)
    const external = target && isUrl(target)
    if (external) warnings.push(`O marcador com o link ${target} virou rótulo (o app não abre links da internet no mapa).`)
    const layer = m.type && m.type !== "default" ? m.type : undefined
    if (layer && !layers.includes(layer)) layers.push(layer)
    const label = m.description ?? (external ? target : undefined)
    if (!target && !label) {
      warnings.push(`Um marcador sem link nem descrição (em ${x}, ${y}) virou o rótulo “Marcador”.`)
    }
    pins.push(`  - ${flowMap({ ...(target && !external ? { nota: `[[${target}]]` } : {}), ...(label || !target ? { rotulo: label ?? "Marcador" } : {}), x, y, ...(layer ? { camada: layer } : {}) })}`)
  }
  if (lost) {
    if (!size && !params.bounds) return { yaml: null, pins: 0, warnings: [...warnings, `Não deu para ler o tamanho da imagem${imagePath ? ` “${imagePath}”` : ""}, e sem ele as coordenadas dos marcadores não têm como ser convertidas; o bloco ficou como está.`] }
    warnings.push(`${lost} marcador(es) sem posição ficaram de fora.`)
  }
  if (outside) warnings.push(`${outside} marcador(es) estavam fora da imagem e foram trazidos para a borda.`)
  if (fromNotes.size) warnings.push(`${fromNotes.size} nota(s) com “location” viraram pinos; se mudar a posição no Obsidian, o pino aqui não acompanha.`)

  const lines = [`imagem: ${JSON.stringify(`[[${imageTarget}]]`)}`, `camadas: ${flowList(layers)}`]
  lines.push(pins.length ? "pinos:" : "pinos: []", ...pins)
  // Escala: a distância do Leaflet é contada em unidades de coordenada vezes `scale`.
  if (params.scale !== undefined || params.unit) {
    const unitName = params.unit ?? "m"
    const scale = params.scale ?? 1
    if (params.bounds) {
      if (size) lines.push(`escala: ${flowMap({ pixels: size.width, distancia: round(Math.abs(params.bounds[1][1] - params.bounds[0][1]) * scale), unidade: unitName })}`)
      else warnings.push("A escala ficou de fora (precisa do tamanho da imagem).")
    } else lines.push(`escala: ${flowMap({ pixels: unit, distancia: round(scale), unidade: unitName })}`)
  }
  return { yaml: lines.join("\n"), pins: pins.length, warnings }
}

const round = (n: number) => Math.round(n * 1_000_000) / 1_000_000
