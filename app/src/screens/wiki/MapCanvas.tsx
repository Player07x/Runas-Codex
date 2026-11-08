import { useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react"
import { CircleAlert, LockKeyhole, MapPin, Maximize, Minus, Plus, Undo2, X } from "lucide-react"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { bounds, ellipsePolygon, insertVertex, midpoint, nearestInDirection, nudgePoint, rectPolygon, removeVertex, translatePoints, type Direction, type MapPoint } from "../../core/map-geometry"
import { DEFAULT_AREA_OPACITY, type AreaShape, type MapDrawing } from "../../core/wiki-map-extras"
import type { MapPin as Pin, MapSpec } from "../../core/wiki"
import type { DrawingView, ImageLayerView, PinView } from "../../core/map-views"

/**
 * A superfície do mapa (U17, U18, U20): a imagem, as camadas de imagem, os desenhos (SVG no tamanho da imagem, traço
 * que não estica), os pinos e as alças da área escolhida. Só desenho e gesto; quem grava é a tela (`WikiMap`).
 *
 * Teclado: o mapa é uma região com nome; as setas movem a vista, + e − aproximam e 0 enquadra. Os pinos são uma parada
 * de Tab só: as setas vão ao pino mais perto naquela direção, Enter abre, Alt+setas movem 0,5 % (com Shift, 5 %) e
 * Delete apaga. As alças da área escolhida também são uma parada só (setas movem, Enter na alça do meio insere o
 * ponto, Delete apaga o vértice, Esc termina).
 */
export type MapTool = "mover" | "pino" | "area" | "rota" | "rotulo" | "medir"
export type MapSelection = { kind: "pin"; index: number } | { kind: "drawing"; index: number } | null
export interface MapCanvasHandle { fit(): void; zoomBy(factor: number): void; centerOn(point: MapPoint): void; center(): MapPoint }

const AREA_SHAPES = [{ value: "retangulo", label: "Retângulo" }, { value: "elipse", label: "Elipse" }, { value: "livre", label: "Livre" }] as const
const ARROWS: Record<string, Direction | undefined> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }
const DELTA: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }
const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

type Drag =
  | { kind: "pan"; sx: number; sy: number; vx: number; vy: number }
  | { kind: "pin"; index: number; moved: boolean; start: MapPoint }
  | { kind: "shape"; index: number; start: MapPoint; points: MapPoint[]; moved: boolean }
  | { kind: "vertex"; index: number; vertex: number; points: MapPoint[] }
  | { kind: "box"; start: MapPoint }

export function MapCanvas({ spec, label, imageUrl, imageLayers = [], pins, drawings, tool = "mover", areaShape = "retangulo", onAreaShape, editable = false, selection = null, onSelect,
  onActivatePin, onPinsChange, onDrawingChange, onPlacePin, onCreateDrawing, onDeletePin, onToolDone, corner, popover, popoverAt, ghostAt, handle, compact, missingImage }: {
  spec: MapSpec
  /** Nome da região (“Mapa de Bitu”). */
  label: string
  imageUrl?: string
  imageLayers?: ImageLayerView[]
  /** Só os pinos visíveis (camada, segredo e jogadores já filtrados). */
  pins: PinView[]
  drawings: DrawingView[]
  tool?: MapTool
  areaShape?: AreaShape
  onAreaShape?(shape: AreaShape): void
  editable?: boolean
  selection?: MapSelection
  onSelect?(selection: MapSelection): void
  /** Enter ou toque num pino: abre o popover (ou a nota, no mapa da nota). */
  onActivatePin?(index: number): void
  onPinsChange?(pins: Pin[]): void
  onDrawingChange?(index: number, points: MapPoint[], how: "move" | "edit"): void
  onPlacePin?(point: MapPoint): void
  onCreateDrawing?(kind: MapDrawing["kind"], points: MapPoint[], shape?: AreaShape): void
  onDeletePin?(index: number): void
  /** A ferramenta terminou ou foi cancelada: volta a Mover. */
  onToolDone?(): void
  /** Controles a mais no canto (Ano do mapa). */
  corner?: ReactNode
  /** Popover do pino escolhido, posto ao lado dele. */
  popover?: ReactNode
  /** Ponto do mapa usado como âncora quando o pino ainda não foi gravado. */
  popoverAt?: MapPoint | null
  /** Pino-fantasma enquanto o usuário escolhe a posição do pino novo. */
  ghostAt?: MapPoint | null
  handle?: Ref<MapCanvasHandle>
  compact?: boolean
  missingImage?: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const helpId = useId()
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const drag = useRef<Drag | null>(null)
  // Prévia enquanto arrasta (pino, área ou vértice): grava só ao soltar.
  const [preview, setPreview] = useState<{ pins?: Pin[]; drawing?: { index: number; points: MapPoint[] } } | null>(null)
  const [draft, setDraft] = useState<MapPoint[]>([])
  const [boxDraft, setBoxDraft] = useState<{ a: MapPoint; b: MapPoint } | null>(null)
  const [ruler, setRuler] = useState<MapPoint[]>([])
  const [focusPin, setFocusPin] = useState<number | null>(null)
  const [focusHandle, setFocusHandle] = useState(0)

  useEffect(() => { setDraft([]); setBoxDraft(null); if (tool !== "medir") setRuler([]) }, [tool, areaShape])

  // Enquadrado até a pessoa mexer na vista: se a área do mapa muda de tamanho (painel, faixa de ferramentas no
  // celular, girar a tela), enquadra de novo; depois de aproximar ou arrastar, a vista fica onde ela deixou.
  const framed = useRef(true)
  const fit = (w = size?.w, h = size?.h) => {
    const el = box.current
    if (!el || !w || !h || !el.clientWidth || !el.clientHeight) return
    framed.current = true
    const k = Math.min(el.clientWidth / w, el.clientHeight / h)
    setView({ k, x: (el.clientWidth - w * k) / 2, y: (el.clientHeight - h * k) / 2 })
  }
  useEffect(() => fit(), [size])
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => { if (framed.current) fit() })
    observer.observe(el)
    return () => observer.disconnect()
  }, [size])
  const zoomBy = (factor: number, cx?: number, cy?: number) => {
    const el = box.current
    if (!el) return
    const px = cx ?? el.clientWidth / 2, py = cy ?? el.clientHeight / 2
    framed.current = false
    setView((v) => {
      const k = Math.min(8, Math.max(0.05, v.k * factor))
      return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k }
    })
  }
  const centerOn = (p: MapPoint) => {
    const el = box.current
    if (!el || !size) return
    framed.current = false
    setView((v) => ({ ...v, x: el.clientWidth / 2 - p.x * size.w * v.k, y: el.clientHeight / 2 - p.y * size.h * v.k }))
  }
  const center = (): MapPoint => {
    const el = box.current, v = viewRef.current
    if (!el || !size) return { x: 0.5, y: 0.5 }
    return { x: clamp01((el.clientWidth / 2 - v.x) / v.k / size.w), y: clamp01((el.clientHeight / 2 - v.y) / v.k / size.h) }
  }
  useImperativeHandle(handle, () => ({ fit: () => fit(), zoomBy: (f) => zoomBy(f), centerOn, center }))

  // Abrir e fechar o painel muda o tamanho do mapa: o ponto do meio continua no meio.
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === "undefined") return
    let last = { w: el.clientWidth, h: el.clientHeight }
    const observer = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight
      if (w === last.w && h === last.h) return
      const dx = (w - last.w) / 2, dy = (h - last.h) / 2
      last = { w, h }
      framed.current = false
      setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomBy(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  })

  /** Ponto do evento em frações da imagem. */
  const toMap = (event: { clientX: number; clientY: number }): MapPoint | null => {
    if (!size || !box.current) return null
    const rect = box.current.getBoundingClientRect()
    return { x: (event.clientX - rect.left - view.x) / view.k / size.w, y: (event.clientY - rect.top - view.y) / view.k / size.h }
  }
  const inside = (p: MapPoint) => p.x >= 0 && p.y >= 0 && p.x <= 1 && p.y <= 1
  const shown = (index: number) => preview?.drawing?.index === index ? preview.drawing.points : drawings.find((d) => d.index === index)?.drawing.points ?? []
  const selectedDrawing = selection?.kind === "drawing" ? drawings.find((d) => d.index === selection.index) : undefined
  const pinList = preview?.pins ? pins.map((view) => ({ ...view, pin: preview.pins![view.index] ?? view.pin })) : pins

  function finishDraft(raw = draft) {
    // O duplo clique põe dois pontos no mesmo lugar antes de concluir.
    const points = raw.filter((p, i) => i === 0 || Math.hypot(p.x - raw[i - 1]!.x, p.y - raw[i - 1]!.y) > 0.001)
    if (tool === "area" && points.length >= 3) onCreateDrawing?.("zona", points, "livre")
    else if (tool === "rota" && points.length >= 2) onCreateDrawing?.("rota", points)
    else return
    setDraft([])
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return
    const target = event.target as Element
    if (target.closest(".map-pin, .map-handle, .map-popover, .map-corner, .map-options, button, input, select, a")) return
    const point = toMap(event)
    if (!point) return
    const capture = () => event.currentTarget.setPointerCapture(event.pointerId)
    if (tool === "medir") { if (inside(point)) setRuler((r) => (r.length >= 2 ? [point] : [...r, point])); return }
    if (tool === "pino" && editable) { if (inside(point)) onPlacePin?.(point); return }
    if (tool === "rotulo" && editable) { if (inside(point)) onCreateDrawing?.("rotulo", [point]); return }
    if ((tool === "rota" || (tool === "area" && areaShape === "livre")) && editable) {
      if (!inside(point)) return
      // Tocar perto do primeiro ponto fecha a área livre.
      const first = draft[0]
      if (tool === "area" && first && size && draft.length >= 3 && Math.hypot((point.x - first.x) * size.w, (point.y - first.y) * size.h) * view.k < 14) { finishDraft(); return }
      setDraft((d) => [...d, { x: clamp01(point.x), y: clamp01(point.y) }])
      return
    }
    if (tool === "area" && editable) {
      if (!inside(point)) return
      capture()
      drag.current = { kind: "box", start: point }
      setBoxDraft({ a: point, b: point })
      return
    }
    const shape = target.closest<SVGElement>("[data-drawing]")
    if (shape && editable && tool === "mover") {
      const index = Number(shape.dataset.drawing)
      onSelect?.({ kind: "drawing", index })
      capture()
      drag.current = { kind: "shape", index, start: point, points: shown(index), moved: false }
      return
    }
    capture()
    drag.current = { kind: "pan", sx: event.clientX, sy: event.clientY, vx: view.x, vy: view.y }
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    if (d.kind === "pan") { framed.current = false; setView((v) => ({ ...v, x: d.vx + event.clientX - d.sx, y: d.vy + event.clientY - d.sy })); return }
    const p = toMap(event)
    if (!p) return
    if (d.kind === "box") setBoxDraft({ a: d.start, b: { x: clamp01(p.x), y: clamp01(p.y) } })
    else if (d.kind === "pin") {
      d.moved = d.moved || Math.hypot(p.x - d.start.x, p.y - d.start.y) > 0.002
      if (!d.moved) return
      setPreview({ pins: spec.pins.map((pin, i) => (i === d.index ? { ...pin, x: clamp01(p.x), y: clamp01(p.y) } : pin)) })
    } else if (d.kind === "shape") {
      d.moved = d.moved || Math.hypot(p.x - d.start.x, p.y - d.start.y) > 0.002
      if (d.moved) setPreview({ drawing: { index: d.index, points: translatePoints(d.points, p.x - d.start.x, p.y - d.start.y) } })
    } else if (d.kind === "vertex") {
      setPreview({ drawing: { index: d.index, points: d.points.map((q, i) => (i === d.vertex ? { x: clamp01(p.x), y: clamp01(p.y) } : q)) } })
    }
  }

  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d?.kind === "box" && boxDraft) {
      const { a, b } = boxDraft
      setBoxDraft(null)
      if (Math.abs(a.x - b.x) > 0.005 && Math.abs(a.y - b.y) > 0.005) onCreateDrawing?.("zona", areaShape === "elipse" ? ellipsePolygon(a, b) : rectPolygon(a, b), areaShape)
    }
    if (d?.kind === "pin" && d.moved && preview?.pins) onPinsChange?.(preview.pins)
    if (d?.kind === "shape" && d.moved) { if (preview?.drawing) onDrawingChange?.(preview.drawing.index, preview.drawing.points, "move") }
    if (d?.kind === "vertex") { if (preview?.drawing) onDrawingChange?.(preview.drawing.index, preview.drawing.points, "edit") }
    setPreview(null)
  }

  const onBoxKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    const dir = ARROWS[event.key]
    if (dir) {
      event.preventDefault()
      const step = event.shiftKey ? 160 : 40
      const [dx, dy] = DELTA[dir]
      framed.current = false
      setView((v) => ({ ...v, x: v.x - dx * step, y: v.y - dy * step }))
    } else if (event.key === "+" || event.key === "=") { event.preventDefault(); zoomBy(1.3) }
    else if (event.key === "-" || event.key === "_") { event.preventDefault(); zoomBy(1 / 1.3) }
    else if (event.key === "0") { event.preventDefault(); fit() }
    else if (event.key === "Enter" && editable) {
      // Sem mouse: Enter faz no meio da vista o que o toque faria.
      const c = center()
      if (tool === "pino") { event.preventDefault(); onPlacePin?.(c) }
      else if (tool === "rotulo") { event.preventDefault(); onCreateDrawing?.("rotulo", [c]) }
    } else if (event.key === "Escape" && tool !== "mover") { event.preventDefault(); onToolDone?.() }
  }

  const focusPinButton = (index: number) => box.current?.querySelector<HTMLElement>(`[data-pin="${index}"]`)?.focus()
  const onPinKey = (event: ReactKeyboardEvent<HTMLButtonElement>, view: PinView) => {
    const dir = ARROWS[event.key]
    if (dir) {
      event.preventDefault()
      event.stopPropagation()
      if (event.altKey && editable) {
        const [dx, dy] = DELTA[dir]
        const moved = nudgePoint(view.pin, dx, dy, event.shiftKey ? 0.05 : 0.005)
        onPinsChange?.(spec.pins.map((pin, i) => (i === view.index ? { ...pin, ...moved } : pin)))
        return
      }
      const at = pins.findIndex((p) => p.index === view.index)
      const next = pins[nearestInDirection(pins.map((p) => p.pin), at, dir)]
      if (next && next.index !== view.index) { setFocusPin(next.index); onSelect?.({ kind: "pin", index: next.index }); focusPinButton(next.index) }
    } else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onActivatePin?.(view.index) }
    else if ((event.key === "Delete" || event.key === "Backspace") && editable) { event.preventDefault(); event.stopPropagation(); onDeletePin?.(view.index) }
    else if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      const next = event.key === "Home" ? pins[0] : pins.at(-1)
      if (next) { setFocusPin(next.index); onSelect?.({ kind: "pin", index: next.index }); focusPinButton(next.index) }
    }
  }
  const tabPin = pins.some((p) => p.index === focusPin) ? focusPin : selection?.kind === "pin" && pins.some((p) => p.index === selection.index) ? selection.index : pins[0]?.index ?? null

  // Alças da área escolhida: vértices e meios de aresta (a rota não fecha no primeiro ponto).
  const handles: { kind: "vertex" | "mid"; i: number; p: MapPoint }[] = []
  if (selectedDrawing && editable && selectedDrawing.drawing.kind !== "rotulo") {
    const points = shown(selectedDrawing.index)
    points.forEach((p, i) => {
      handles.push({ kind: "vertex", i, p })
      if (selectedDrawing.drawing.kind === "zona" || i < points.length - 1) handles.push({ kind: "mid", i, p: midpoint(points, i) })
    })
  }
  const handleFocus = useRef(false)
  useEffect(() => { setFocusHandle(0); handleFocus.current = false }, [selection?.kind, selection?.index])
  // O foco segue a alça certa também depois de gravar (a lista de alças muda quando a área volta do cofre).
  useEffect(() => { if (handleFocus.current) box.current?.querySelector<HTMLElement>(`[data-handle="${focusHandle}"]`)?.focus() }, [focusHandle, handles.length])

  const commitPoints = (points: MapPoint[]) => { if (selectedDrawing) onDrawingChange?.(selectedDrawing.index, points, "edit") }
  const onHandleKey = (event: ReactKeyboardEvent<HTMLButtonElement>, at: number) => {
    if (!selectedDrawing) return
    const h = handles[at]!
    const points = shown(selectedDrawing.index)
    const min = selectedDrawing.drawing.kind === "zona" ? 3 : 2
    const focus = (n: number) => { handleFocus.current = true; setFocusHandle((n + handles.length) % handles.length) }
    const dir = ARROWS[event.key]
    if (dir) {
      event.preventDefault()
      event.stopPropagation()
      // Como nos pinos: as setas escolhem a alça, Alt+setas movem o ponto (com Shift, 5 %).
      if (event.altKey) {
        if (h.kind !== "vertex") return
        const [dx, dy] = DELTA[dir]
        commitPoints(points.map((q, i) => (i === h.i ? nudgePoint(q, dx, dy, event.shiftKey ? 0.05 : 0.005) : q)))
      } else focus(at + (dir === "right" || dir === "down" ? 1 : -1))
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      focus(event.key === "Home" ? 0 : handles.length - 1)
    } else if ((event.key === "Enter" || event.key === " ") && h.kind === "mid") {
      event.preventDefault()
      commitPoints(insertVertex(points, h.i))
      focus(at + 1)
    } else if ((event.key === "Delete" || event.key === "Backspace") && h.kind === "vertex") {
      event.preventDefault()
      if (points.length > min) { commitPoints(removeVertex(points, h.i, min)); focus(Math.max(0, at - 2)) }
    } else if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      handleFocus.current = false
      onSelect?.(null)
      box.current?.focus()
    }
  }

  const distance = useMemo(() => {
    if (ruler.length < 2 || !size) return null
    const px = Math.hypot((ruler[1]!.x - ruler[0]!.x) * size.w, (ruler[1]!.y - ruler[0]!.y) * size.h)
    if (!spec.scale) return { text: `${Math.round(px).toLocaleString("pt-BR")} pixels da imagem`, hint: "Defina a escala na aba Mapa para medir em distância." }
    const value = (px / spec.scale.pixels) * spec.scale.distance
    const days = spec.travelPerDay ? value / spec.travelPerDay : null
    const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
    return { text: `${fmt(value)} ${spec.scale.unit}${days !== null ? ` · ${fmt(days)} ${days === 1 ? "dia" : "dias"} de viagem` : ""}` }
  }, [ruler, spec, size])

  // Onde o popover fica: ao lado do pino escolhido (ou do pino novo), dentro do mapa.
  const anchor = (() => {
    if (!size) return null
    const point = popoverAt ?? (selection?.kind === "pin" ? (preview?.pins?.[selection.index] ?? spec.pins[selection.index]) : null)
    return point ? { x: view.x + point.x * size.w * view.k, y: view.y + point.y * size.h * view.k } : null
  })()
  const boxWidth = box.current?.clientWidth ?? 800
  const popoverLeft = anchor ? (anchor.x + 24 + 320 < boxWidth ? anchor.x + 24 : Math.max(8, anchor.x - 24 - 320)) : 8
  const popoverTop = anchor ? Math.max(8, Math.min((box.current?.clientHeight ?? 600) - 120, anchor.y - 60)) : 8

  const polygon = (points: MapPoint[]) => size ? points.map((p) => `${p.x * size.w},${p.y * size.h}`).join(" ") : ""
  const k = view.k
  const options = tool !== "mover" ? <ToolOptions tool={tool} areaShape={areaShape} onAreaShape={onAreaShape} draft={draft} distance={distance} hasRuler={ruler.length > 0}
    onUndo={() => setDraft((d) => d.slice(0, -1))} onFinish={() => finishDraft()} onClear={() => setRuler([])} onCancel={() => onToolDone?.()} /> : null

  return (
    <div className={`map-canvas${compact ? " compact" : ""}`}>
      {options}
      <div ref={box} className={`map-box tool-${tool}`} role="region" aria-label={label} aria-describedby={helpId} tabIndex={0}
        onKeyDown={onBoxKey} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onDoubleClick={() => { if (draft.length) finishDraft() }}>
        <span id={helpId} className="sr-only">Setas movem o mapa, + e − aproximam, 0 enquadra.{pins.length ? " Tab chega aos pinos; as setas andam entre eles, Enter abre e Alt+setas movem o pino." : ""}</span>
        <span className="map-keyhint" aria-hidden="true">Setas movem · + − aproximam · 0 enquadra</span>
        {!imageUrl && <div className="map-missing">{missingImage ?? <>Imagem “{spec.image}” não encontrada no cofre.</>}</div>}
        <div className="map-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${k})`, width: size?.w, height: size?.h }}>
          {imageUrl && <img src={imageUrl} alt="" draggable={false} onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth || 1000, h: e.currentTarget.naturalHeight || 700 })} />}
          {size && imageLayers.map((layer) => <img key={layer.name} className="map-image-layer" src={layer.url} alt="" draggable={false} style={{ width: size.w, height: size.h, opacity: layer.opacity }} />)}
          {size && (
            <svg className="map-drawings" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
              {drawings.map(({ index, drawing: d }) => {
                const points = shown(index)
                const selected = selectedDrawing?.index === index
                const textAt = d.kind === "zona" ? (() => { const b = bounds(points); return { x: b.x + b.w / 2, y: b.y + b.h / 2 } })() : points[0]!
                const caption = d.text ? <text className="map-shape-text" x={textAt.x * size.w} y={textAt.y * size.h} fill={d.color} fontSize={14 / k} strokeWidth={3 / k} textAnchor={d.kind === "zona" ? "middle" : "start"} dominantBaseline={d.kind === "zona" ? "middle" : "auto"}>{d.text}</text> : null
                if (d.kind === "rotulo") return <g key={index} className={`map-shape${selected ? " selected" : ""}`} data-drawing={index}>
                  <text className="map-shape-text label" x={points[0]!.x * size.w} y={points[0]!.y * size.h} fill={d.color} fontSize={17 / k} strokeWidth={3.5 / k}>{d.text || "Rótulo"}</text>
                </g>
                const dash = d.border === "tracejada" ? "8 6" : undefined
                return <g key={index} className={`map-shape${selected ? " selected" : ""}`} data-drawing={index}>
                  {d.kind === "zona"
                    ? <polygon points={polygon(points)} fill={d.color} fillOpacity={d.opacity ?? DEFAULT_AREA_OPACITY} stroke={d.border === "nenhuma" ? "none" : d.color} strokeWidth={2} strokeDasharray={dash} vectorEffect="non-scaling-stroke" />
                    : <>
                      <polyline className="map-shape-hit" points={polygon(points)} fill="none" strokeWidth={16} vectorEffect="non-scaling-stroke" />
                      <polyline points={polygon(points)} fill="none" stroke={d.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} vectorEffect="non-scaling-stroke" />
                    </>}
                  {selected && <polygon className="map-shape-outline" points={polygon(points)} fill="none" strokeWidth={1.5} vectorEffect="non-scaling-stroke" style={d.kind === "rota" ? { display: "none" } : undefined} />}
                  {caption}
                </g>
              })}
              {draft.length > 0 && <polyline className="map-draft" points={polygon(draft)} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
              {draft.map((p, i) => <circle key={i} className="map-draft-point" cx={p.x * size.w} cy={p.y * size.h} r={4 / k} />)}
              {boxDraft && <polygon className="map-draft" points={polygon(areaShape === "elipse" ? ellipsePolygon(boxDraft.a, boxDraft.b) : rectPolygon(boxDraft.a, boxDraft.b))} strokeWidth={2} vectorEffect="non-scaling-stroke" />}
              {ruler.length === 2 && <line className="map-ruler-line" x1={ruler[0]!.x * size.w} y1={ruler[0]!.y * size.h} x2={ruler[1]!.x * size.w} y2={ruler[1]!.y * size.h} strokeWidth={3} vectorEffect="non-scaling-stroke" />}
              {ruler.map((p, i) => <circle key={i} className="map-ruler-point" cx={p.x * size.w} cy={p.y * size.h} r={5 / k} />)}
            </svg>
          )}
          {size && handles.length > 0 && <div className="map-handles" role="group" aria-label={`Pontos de ${selectedDrawing!.drawing.text || (selectedDrawing!.drawing.kind === "rota" ? "rota" : "área")}. Setas escolhem o ponto, Alt+setas movem, Enter na alça do meio insere um ponto, Delete apaga, Esc termina.`}
            onBlur={(e) => { if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) handleFocus.current = false }}>
            {handles.map((h, at) => <button key={`${h.kind}-${h.i}`} type="button" data-handle={at} className={`map-handle ${h.kind}`} tabIndex={at === focusHandle ? 0 : -1}
              style={{ left: h.p.x * size.w, top: h.p.y * size.h, transform: `translate(-50%, -50%) scale(${1 / k})` }}
              aria-label={h.kind === "vertex" ? `Ponto ${h.i + 1} de ${shown(selectedDrawing!.index).length}` : `Inserir ponto depois do ${h.i + 1}`}
              onFocus={() => { handleFocus.current = true; setFocusHandle(at) }} onKeyDown={(e) => onHandleKey(e, at)}
              onPointerDown={(e) => {
                e.stopPropagation()
                const points = shown(selectedDrawing!.index)
                const vertex = h.kind === "vertex" ? h.i : h.i + 1
                const start = h.kind === "vertex" ? points : insertVertex(points, h.i)
                ;(e.currentTarget.closest(".map-box") as HTMLElement).setPointerCapture(e.pointerId)
                drag.current = { kind: "vertex", index: selectedDrawing!.index, vertex, points: start }
                setPreview({ drawing: { index: selectedDrawing!.index, points: start } })
              }} />)}
          </div>}
          {size && pinList.length > 0 && <div className="map-pins" role="group" aria-label={`Pinos (${pinList.length})`}>
            {pinList.map((view) => <button key={view.index} type="button" data-pin={view.index} tabIndex={view.index === tabPin ? 0 : -1}
              className={`map-pin${selection?.kind === "pin" && selection.index === view.index ? " active" : ""}${view.secret ? " secret" : ""}${view.broken ? " broken" : ""}${view.nested ? " nested" : ""}`}
              style={{ left: view.pin.x * size.w, top: view.pin.y * size.h, transform: `translate(-50%, -100%) scale(${1 / k})` }}
              aria-label={`${view.title}${view.secret ? ", segredo" : ""}${view.broken ? ", nota não encontrada" : ""}`}
              onFocus={() => setFocusPin(view.index)} onKeyDown={(e) => onPinKey(e, view)}
              onPointerDown={(e) => {
                e.stopPropagation()
                if (!editable || tool !== "mover") return
                ;(e.currentTarget.closest(".map-box") as HTMLElement).setPointerCapture(e.pointerId)
                drag.current = { kind: "pin", index: view.index, moved: false, start: view.pin }
              }}
              onPointerUp={(e) => {
                const moved = drag.current?.kind === "pin" && drag.current.moved
                if (drag.current?.kind === "pin") onPointerUp()
                if (!moved) { setFocusPin(view.index); onActivatePin?.(view.index) }
                e.stopPropagation()
              }}>
              <span className="map-pin-mark">{view.broken ? <CircleAlert size={16} /> : view.secret ? <LockKeyhole size={15} /> : <MapPin size={16} />}</span>
              <span className="map-pin-label">{view.broken ? `⚠ ${view.title}` : view.title}</span>
            </button>)}
          </div>}
          {size && ghostAt && <span className="map-pin ghost" aria-hidden="true" style={{ left: ghostAt.x * size.w, top: ghostAt.y * size.h, transform: `translate(-50%, -100%) scale(${1 / k})` }}>
            <span className="map-pin-mark"><MapPin size={16} /></span><span className="map-pin-label">Pino novo</span>
          </span>}
        </div>
        {popover && <div className="map-popover-wrap" style={{ ["--px" as string]: `${popoverLeft}px`, ["--py" as string]: `${popoverTop}px` }}>{popover}</div>}
        <div className="map-corner">
          {corner}
          <div className="map-zoom" role="group" aria-label="Vista do mapa">
            <button type="button" className="icon-btn" onClick={() => zoomBy(1.3)} aria-label="Aproximar" title="Aproximar (+)"><Plus size={17} /></button>
            <button type="button" className="icon-btn" onClick={() => zoomBy(1 / 1.3)} aria-label="Afastar" title="Afastar (−)"><Minus size={17} /></button>
            <button type="button" className="icon-btn" onClick={() => fit()} aria-label="Enquadrar o mapa" title="Enquadrar (0)"><Maximize size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** A faixa de cima do mapa com o que a ferramenta pede (forma da área, Concluir, a distância medida). */
function ToolOptions({ tool, areaShape, onAreaShape, draft, distance, hasRuler, onUndo, onFinish, onClear, onCancel }: {
  tool: MapTool; areaShape: AreaShape; onAreaShape?(shape: AreaShape): void; draft: MapPoint[]; distance: { text: string; hint?: string } | null; hasRuler: boolean
  onUndo(): void; onFinish(): void; onClear(): void; onCancel(): void
}) {
  const free = tool === "rota" || (tool === "area" && areaShape === "livre")
  const min = tool === "rota" ? 2 : 3
  const text = tool === "pino" ? "Toque no mapa onde o pino vai ficar (Enter põe no meio da vista)."
    : tool === "rotulo" ? "Toque no mapa onde o rótulo vai ficar (Enter põe no meio da vista)."
    : tool === "medir" ? (distance ? distance.text : "Toque em dois pontos para medir.")
    : tool === "rota" ? `Toque para pôr cada ponto da rota${draft.length ? ` (${draft.length})` : ""}; Concluir termina.`
    : areaShape === "livre" ? `Toque para pôr cada ponto${draft.length ? ` (${draft.length})` : ""}; toque no primeiro ou em Concluir para fechar.`
    : "Arraste no mapa para desenhar a área."
  return <div className="map-options" role="group" aria-label="Opções da ferramenta">
    {tool === "area" && onAreaShape && <ChoiceGroup label="Forma da área" value={areaShape} options={AREA_SHAPES} onChange={onAreaShape} />}
    <span className="map-options-text" role="status">{text}{tool === "medir" && distance?.hint ? <small> {distance.hint}</small> : null}</span>
    <span className="map-options-actions">
      {free && <button type="button" className="btn sm ghost" disabled={!draft.length} onClick={onUndo}><Undo2 size={15} /> Desfazer ponto</button>}
      {free && <button type="button" className="btn sm primary" disabled={draft.length < min} onClick={onFinish}>Concluir</button>}
      {tool === "medir" && hasRuler && <button type="button" className="btn sm ghost" onClick={onClear}>Limpar</button>}
      <button type="button" className="btn sm ghost" onClick={onCancel}><X size={15} /> {tool === "medir" ? "Fechar" : "Cancelar"}</button>
    </span>
  </div>
}
