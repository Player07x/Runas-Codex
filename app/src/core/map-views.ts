import { articleKind, pinForPlayers, type MapPin, type MapSpec } from "./wiki"
import { inEra, type MapDrawing } from "./wiki-map-extras"

export interface PinTarget { path: string; route: string; nested: boolean; tipo?: unknown }
export interface PinView { index: number; pin: MapPin; title: string; secret: boolean; broken: boolean; nested: boolean }
export interface DrawingView { index: number; drawing: MapDrawing }
export interface ImageLayerView { name: string; url: string; opacity: number }
export interface PinRow { index: number; title: string; meta: string; secret: boolean; search: string }
export interface DrawingRow { index: number; drawing: MapDrawing; hidden: boolean }
export interface LayerRow { name: string; count: number; hidden: boolean; listed: boolean }

const SECRET_LAYER = /^segredos?$/i
const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")
const noteLabel = (target: string) => (target.split("/").at(-1) ?? target).replace(/\.md$/i, "")

/**
 * Monta o estado derivado do mapa para a tela e para a projeção dos jogadores.
 * Não depende de React: a mesma regra vale para o mapa dentro da nota e para o editor.
 */
export function mapViews(spec: MapSpec, { resolve, players, hidden, year, imageUrl }: {
  resolve(target: string): PinTarget | null
  players: boolean
  hidden: ReadonlySet<string>
  year: number
  imageUrl(target: string): string | undefined
}) {
  const all = spec.pins.map((pin, index) => {
    const target = pin.note ? resolve(pin.note) : null
    const title = pin.note ? (target ? noteLabel(target.path) : noteLabel(pin.note)) : pin.label ?? "Pino"
    const view: PinView = { index, pin, title, secret: Boolean(pin.secret || (pin.layer && SECRET_LAYER.test(pin.layer))), broken: Boolean(pin.note && !target), nested: Boolean(target?.nested) }
    return { view, target }
  }).filter(({ view }) => !players || pinForPlayers(view.pin, (target) => Boolean(resolve(target))))

  const pins = all.filter(({ view }) => !hidden.has(view.pin.layer ?? "")).map(({ view }) => view)
  const pinRows: PinRow[] = all.map(({ view, target }) => ({
    index: view.index,
    title: view.title,
    secret: view.secret,
    search: fold(`${view.title} ${view.pin.label ?? ""}`),
    meta: [view.secret && "Segredo", target && articleKind(target.tipo)?.label, view.pin.layer, view.broken && "nota não encontrada", !view.pin.note && "Rótulo, sem nota", hidden.has(view.pin.layer ?? "") && "camada escondida"].filter(Boolean).join(" · "),
  }))

  const drawingList = (spec.drawings ?? []).map((drawing, index) => ({ index, drawing })).filter(({ drawing }) => !players || !drawing.secret)
  const drawings: DrawingView[] = drawingList.filter(({ drawing }) => inEra(drawing, year, players) && !hidden.has(drawing.layer))
  const drawingRows: DrawingRow[] = drawingList.map((drawing) => ({ ...drawing, hidden: !inEra(drawing.drawing, year, players) || hidden.has(drawing.drawing.layer) }))
  const imageLayers: ImageLayerView[] = (spec.images ?? []).filter((layer) => inEra(layer, year, players) && !hidden.has(layer.name))
    .flatMap((layer) => { const url = imageUrl(layer.image); return url ? [{ name: layer.name, url, opacity: layer.opacity }] : [] })

  const names = [...new Set([
    ...spec.layers,
    ...all.map(({ view }) => view.pin.layer ?? ""),
    ...drawingList.map(({ drawing }) => drawing.layer),
    ...(spec.images ?? []).filter((layer) => !players || !layer.secret).map((layer) => layer.name),
  ])]
    .filter((name) => name !== "" || all.some(({ view }) => !view.pin.layer) || drawingList.some(({ drawing }) => !drawing.layer))
    .filter((name) => !players || !SECRET_LAYER.test(name))
  const layers: LayerRow[] = names.length > 1 || spec.layers.length ? names.map((name) => ({
    name,
    hidden: hidden.has(name),
    listed: spec.layers.includes(name),
    count: all.filter(({ view }) => (view.pin.layer ?? "") === name).length + drawingList.filter(({ drawing }) => drawing.layer === name).length + (spec.images ?? []).filter((layer) => layer.name === name).length,
  })) : []
  const hasEras = Boolean(spec.images?.length || spec.drawings?.some((drawing) => drawing.from !== undefined || drawing.to !== undefined))
  return { pins, pinRows, targets: new Map(all.map(({ view, target }) => [view.index, target])), drawings, drawingRows, imageLayers, layers, hasEras }
}
