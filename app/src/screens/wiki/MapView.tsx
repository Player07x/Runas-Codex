import { inEra, type MapDrawing, type MapExtras } from "../../core/wiki-map-extras"
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { Crosshair, Layers, MapPin, Minus, Plus, Ruler, Trash2, X } from "lucide-react"
import type { MapPin as Pin, MapSpec } from "../../core/wiki"

export interface PinTarget {
  path: string
  route: string
  /** A nota do pino é outro mapa (mapas aninhados). */
  map?: string
  tipo?: unknown
}

interface Props {
  spec: MapSpec
  imageUrl?: string
  resolveImage?(target:string):string|undefined
  year?:number
  onDecorate?(extras:MapExtras):void
  resolvePin(note: string): PinTarget | undefined
  showSecrets: boolean
  /** Com isto, dá para pôr, mover e apagar pinos. */
  onChange?(pins: Pin[]): void
  /** Pino novo: o nome da nota (existente ou a criar) e a posição. */
  onNewPin?(pin: Pin): void
  onOpen(target: PinTarget, kind: "nota" | "mapa"): void
  notes?: string[]
  compact?: boolean
}

const SECRET_LAYER = /^segredos?$/i

/** Mapa com zoom, camadas, categorias, régua e pinos ligados a notas. */
export function MapView({ spec, imageUrl, resolvePin, showSecrets, onChange, onNewPin, onOpen, notes = [], compact, resolveImage, year:initialYear=0, onDecorate }: Props) {
  const [year,setYear]=useState(()=>{try{const saved=sessionStorage.getItem("runas-codex:era-mapa");return saved===null?initialYear:Number(saved)}catch{return initialYear}})
  const [drawKind,setDrawKind]=useState<MapDrawing["kind"]|"">("")
  const [points,setPoints]=useState<{x:number;y:number}[]>([])
  const [drawText,setDrawText]=useState("")
  const [drawColor,setDrawColor]=useState("#76558f")
  const [drawLayer,setDrawLayer]=useState("")
  const [drawSecret,setDrawSecret]=useState(false)
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [view, setView] = useState({ k: 1, x: 0, y: 0 })
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<number | null>(null)
  const [tool, setTool] = useState<"mover" | "pino" | "regua">("mover")
  const [ruler, setRuler] = useState<{ x: number; y: number }[]>([])
  const drag = useRef<{ kind: "pan"; sx: number; sy: number; vx: number; vy: number } | { kind: "pin"; index: number; moved: boolean } | null>(null)
  const [draft, setDraft] = useState<Pin | null>(null)

  const visible = (pin: Pin) => {
    if (!showSecrets && (pin.secret || (pin.layer && SECRET_LAYER.test(pin.layer)))) return false
    return !hiddenLayers.has(pin.layer ?? "")
  }
  const layers = useMemo(() => [...new Set([...spec.layers, ...spec.pins.map((p) => p.layer ?? ""), ...(spec.images??[]).filter(i=>showSecrets||!i.secret).map(i=>i.name), ...(spec.drawings??[]).filter(d=>showSecrets||!d.secret).map(d=>d.layer)])].filter((l) => l !== "" || spec.pins.some((p) => !p.layer)).filter((l) => showSecrets || !SECRET_LAYER.test(l)), [spec, showSecrets])

  // Enquadra a imagem ao carregar.
  const fit = (w = size?.w, h = size?.h) => {
    const el = box.current
    if (!el || !w || !h) return
    const k = Math.min(el.clientWidth / w, el.clientHeight / h)
    setView({ k, x: (el.clientWidth - w * k) / 2, y: (el.clientHeight - h * k) / 2 })
  }
  useEffect(() => fit(), [size])

  const toImage = (event: { clientX: number; clientY: number }) => {
    const rect = box.current!.getBoundingClientRect()
    return { x: (event.clientX - rect.left - view.x) / view.k, y: (event.clientY - rect.top - view.y) / view.k }
  }
  const zoom = (factor: number, cx?: number, cy?: number) => {
    const el = box.current
    if (!el) return
    const px = cx ?? el.clientWidth / 2
    const py = cy ?? el.clientHeight / 2
    setView((v) => {
      const k = Math.min(8, Math.max(0.05, v.k * factor))
      return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k }
    })
  }
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      zoom(Math.exp(-event.deltaY * 0.0015), event.clientX - rect.left, event.clientY - rect.top)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  })

  const onPointerDown = (event: ReactPointerEvent) => {
    if ((event.target as Element).closest(".map-pin, .map-popup, button")) return
    if (!size) return
    const point = toImage(event)
    if(drawKind && onDecorate){setPoints(p=>[...p,{x:Math.max(0,Math.min(1,point.x/size.w)),y:Math.max(0,Math.min(1,point.y/size.h))}]);return}
    if (tool === "regua") {
      setRuler((r) => (r.length >= 2 ? [point] : [...r, point]))
      return
    }
    if (tool === "pino" && onNewPin) {
      if (point.x < 0 || point.y < 0 || point.x > size.w || point.y > size.h) return
      setDraft({ x: point.x / size.w, y: point.y / size.h, note: "" })
      return
    }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    drag.current = { kind: "pan", sx: event.clientX, sy: event.clientY, vx: view.x, vy: view.y }
    setSelected(null)
  }
  const onPointerMove = (event: ReactPointerEvent) => {
    const d = drag.current
    if (!d || !size) return
    if (d.kind === "pan") setView((v) => ({ ...v, x: d.vx + event.clientX - d.sx, y: d.vy + event.clientY - d.sy }))
    else if (onChange) {
      d.moved = true
      const p = toImage(event)
      const pins = spec.pins.map((pin, i) => (i === d.index ? { ...pin, x: Math.min(1, Math.max(0, p.x / size.w)), y: Math.min(1, Math.max(0, p.y / size.h)) } : pin))
      pinsDuringDrag.current = pins
      setTick((t) => t + 1)
    }
  }
  const pinsDuringDrag = useRef<Pin[] | null>(null)
  const [, setTick] = useState(0)
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d?.kind === "pin" && d.moved && pinsDuringDrag.current && onChange) onChange(pinsDuringDrag.current)
    pinsDuringDrag.current = null
  }
  const pins = pinsDuringDrag.current ?? spec.pins

  const distance = useMemo(() => {
    if (ruler.length < 2 || !spec.scale) return null
    const px = Math.hypot(ruler[1]!.x - ruler[0]!.x, ruler[1]!.y - ruler[0]!.y)
    const value = (px / spec.scale.pixels) * spec.scale.distance
    return { value, unit: spec.scale.unit, days: spec.travelPerDay ? value / spec.travelPerDay : null }
  }, [ruler, spec])

  const current = selected !== null ? pins[selected] : undefined
  const currentTarget = current?.note ? resolvePin(current.note) : undefined

  return (
    <div className={`map-view ${compact ? "compact" : ""}`}>
      <div className="map-toolbar">
        {((spec.images?.length??0)>0 || (spec.drawings?.length??0)>0) && <label>Ano / era<input className="input sm" type="number" aria-label="Ano do mapa" value={year} onChange={e=>setYear(Number(e.target.value))} /></label>}
        {onDecorate && <details className="map-drawing-tools"><summary>Zonas, rotas e rótulos</summary><div className="row-wrap">
          <label>Desenho<select className="input" value={drawKind} onChange={e=>{setDrawKind(e.target.value as typeof drawKind);setPoints([])}}><option value="">Mover mapa</option><option value="zona">Zona</option><option value="rota">Rota</option><option value="rotulo">Rótulo</option></select></label>
          <label>Texto<input className="input" value={drawText} onChange={e=>setDrawText(e.target.value)} /></label><label>Cor<input type="color" value={drawColor} onChange={e=>setDrawColor(e.target.value)} /></label><label>Camada<input className="input" value={drawLayer} onChange={e=>setDrawLayer(e.target.value)} /></label><label className="check"><input type="checkbox" checked={drawSecret} onChange={e=>setDrawSecret(e.target.checked)} />Segredo do mestre</label>
          <span>{points.length} pontos; toque no mapa para acrescentar.</span><button className="btn" disabled={!drawKind||points.length<(drawKind==="zona"?3:drawKind==="rota"?2:1)} onClick={()=>{if(!drawKind)return;onDecorate({...spec,drawings:[...(spec.drawings??[]),{kind:drawKind,points,color:drawColor,text:drawText,layer:drawLayer,secret:drawSecret}]});setPoints([]);setDrawKind("")}}>Salvar desenho</button><button className="btn" onClick={()=>{setPoints([]);setDrawKind("")}}>Cancelar desenho</button>
          {(spec.drawings??[]).map((d,i)=><button className="btn" key={i} onClick={()=>onDecorate({...spec,drawings:spec.drawings!.filter((_,n)=>n!==i)})}>Remover {d.text||d.kind} ({i+1})</button>)}
        </div></details>}

        <button className="icon-btn sm" onClick={() => zoom(1.3)} aria-label="Aproximar">
          <Plus size={15} />
        </button>
        <button className="icon-btn sm" onClick={() => zoom(1 / 1.3)} aria-label="Afastar">
          <Minus size={15} />
        </button>
        <button className="icon-btn sm" onClick={() => fit()} aria-label="Enquadrar o mapa" title="Enquadrar">
          <Crosshair size={15} />
        </button>
        <span className="grow" />
        {spec.scale && (
          <button className={`btn sm ${tool === "regua" ? "primary" : "ghost"}`} onClick={() => (setTool(tool === "regua" ? "mover" : "regua"), setRuler([]))} aria-pressed={tool === "regua"}>
            <Ruler size={14} /> Régua
          </button>
        )}
        {onNewPin && (
          <button className={`btn sm ${tool === "pino" ? "primary" : "ghost"}`} onClick={() => setTool(tool === "pino" ? "mover" : "pino")} aria-pressed={tool === "pino"}>
            <MapPin size={14} /> Pôr pino
          </button>
        )}
        {layers.length > 1 && (
          <span className="row map-layers" role="group" aria-label="Camadas">
            <Layers size={14} />
            {layers.map((layer) => (
              <button key={layer || "-"} className={`chip ${hiddenLayers.has(layer) ? "off" : ""}`} aria-pressed={!hiddenLayers.has(layer)} onClick={() => setHiddenLayers((h) => (h.has(layer) ? new Set([...h].filter((l) => l !== layer)) : new Set([...h, layer])))}>
                {layer || "Sem camada"}
              </button>
            ))}
          </span>
        )}
      </div>
      <div ref={box} className={`map-box tool-${tool}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        {!imageUrl && <div className="map-missing">Imagem “{spec.image}” não encontrada no cofre{typeof window !== "undefined" && !window.runasCodex ? " (no navegador, só as imagens do exemplo aparecem)" : ""}.</div>}
        <div className="map-world" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, width: size?.w, height: size?.h }}>
          {imageUrl && <img src={imageUrl} alt={spec.image} draggable={false} onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth || 1000, h: e.currentTarget.naturalHeight || 700 })} />}
          {size && <>
            {(spec.images??[]).filter(layer=>inEra(layer,year,!showSecrets)&&!hiddenLayers.has(layer.name)).map((layer,i)=>{const url=resolveImage?.(layer.image);return url?<img key={i} className="map-image-layer" src={url} alt={layer.name} style={{position:"absolute",inset:0,width:size.w,height:size.h,opacity:layer.opacity}}/>:null})}
            <svg className="map-drawings" width={size.w} height={size.h} viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"visible"}}>
              {(spec.drawings??[]).filter(d=>inEra(d,year,!showSecrets)&&!hiddenLayers.has(d.layer)).map((d,i)=>d.kind==="rotulo"?<text key={i} x={d.points[0]!.x*1000} y={d.points[0]!.y*1000} fill={d.color} fontSize={18}>{d.text}</text>:<g key={i}>{d.kind==="zona"?<polygon points={d.points.map(p=>`${p.x*1000},${p.y*1000}`).join(" ")} fill={d.color} fillOpacity={.2} stroke={d.color} strokeWidth={2}/>:<polyline points={d.points.map(p=>`${p.x*1000},${p.y*1000}`).join(" ")} fill="none" stroke={d.color} strokeWidth={3}/ >}{d.text&&<text x={d.points[0]!.x*1000} y={d.points[0]!.y*1000} fill={d.color} fontSize={18}>{d.text}</text>}</g>)}
              {points.length>0 && <polyline points={points.map(p=>`${p.x*1000},${p.y*1000}`).join(" ")} fill="none" stroke={drawColor} strokeWidth={3}/ >}
            </svg>
          </>}
          {size &&
            pins.map((pin, i) =>
              visible(pin) ? (
                <button
                  key={i}
                  className={`map-pin ${selected === i ? "active" : ""} ${pin.note && !resolvePin(pin.note) ? "broken" : ""} ${pin.note && resolvePin(pin.note)?.map ? "nested" : ""}`}
                  style={{ left: pin.x * size.w, top: pin.y * size.h, transform: `translate(-50%, -100%) scale(${1 / view.k})` }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    if (onChange && tool === "mover") {
                      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                      drag.current = { kind: "pin", index: i, moved: false }
                    }
                  }}
                  onPointerMove={onPointerMove}
                  onPointerUp={(e) => {
                    const moved = drag.current?.kind === "pin" && drag.current.moved
                    onPointerUp()
                    if (!moved) setSelected(selected === i ? null : i)
                    e.stopPropagation()
                  }}
                  aria-label={pin.note ?? pin.label ?? "Pino"}
                  title={pin.note ?? pin.label}
                >
                  <MapPin size={22} />
                  <span className="map-pin-label">{pin.label ?? pin.note}</span>
                </button>
              ) : null,
            )}
          {size && ruler.length > 0 && (
            <svg className="map-ruler" width={size.w} height={size.h}>
              {ruler.length === 2 && <line x1={ruler[0]!.x} y1={ruler[0]!.y} x2={ruler[1]!.x} y2={ruler[1]!.y} strokeWidth={3 / view.k} />}
              {ruler.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={5 / view.k} />
              ))}
            </svg>
          )}
        </div>
        {distance && (
          <div className="map-distance">
            {distance.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} {distance.unit}
            {distance.days !== null && ` · ${distance.days.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dia(s) de viagem`}
          </div>
        )}
        {current && (
          <div className="map-popup card" onPointerDown={(e) => e.stopPropagation()}>
            <div className="row between">
              <strong className="truncate">{current.label ?? current.note}</strong>
              <button className="icon-btn sm" onClick={() => setSelected(null)} aria-label="Fechar">
                <X size={14} />
              </button>
            </div>
            {current.layer && <span className="tiny faint">Camada: {current.layer}</span>}
            <div className="row-wrap">
              {currentTarget && (
                <button className="btn sm primary" onClick={() => onOpen(currentTarget, "nota")}>
                  Abrir nota
                </button>
              )}
              {currentTarget?.map && (
                <button className="btn sm" onClick={() => onOpen(currentTarget, "mapa")}>
                  Entrar no mapa
                </button>
              )}
              {current.note && !currentTarget && <span className="tiny" style={{ color: "var(--red)" }}>“{current.note}” não existe ainda.</span>}
              {onChange && (
                <button
                  className="btn sm danger"
                  onClick={() => {
                    onChange(spec.pins.filter((_, i) => i !== selected))
                    setSelected(null)
                  }}
                  aria-label="Apagar pino"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        )}
        {draft && onNewPin && (
          <form
            className="map-popup card"
            onPointerDown={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault()
              const data = new FormData(e.currentTarget)
              const name = String(data.get("nota") ?? "").trim()
              const label = String(data.get("rotulo") ?? "").trim()
              const layer = String(data.get("camada") ?? "").trim()
              if (!name && !label) return
              onNewPin({ ...draft, ...(name ? { note: name } : {}), ...(label ? { label } : {}), ...(layer ? { layer } : {}) })
              setDraft(null)
              setTool("mover")
            }}
          >
            <strong className="small">Pino novo</strong>
            <input className="input sm" name="nota" list="mapa-notas" placeholder="Nota (existente ou nova)" autoFocus aria-label="Nota do pino" />
            <datalist id="mapa-notas">
              {notes.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <input className="input sm" name="rotulo" placeholder="Rótulo (opcional)" aria-label="Rótulo do pino" />
            {spec.layers.length > 0 && (
              <select className="select sm" name="camada" aria-label="Camada do pino" defaultValue="">
                <option value="">Sem camada</option>
                {spec.layers.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            )}
            <div className="row" style={{ gap: 6 }}>
              <button className="btn sm primary" type="submit">
                Pôr
              </button>
              <button className="btn sm ghost" type="button" onClick={() => setDraft(null)}>
                Cancelar
              </button>
            </div>
            <span className="tiny faint">Nota que não existe é criada (como Local).</span>
          </form>
        )}
      </div>
      {tool === "regua" && !distance && <span className="tiny faint map-hint">Clique em dois pontos para medir.</span>}
      {tool === "pino" && <span className="tiny faint map-hint">Clique no mapa onde o pino vai ficar.</span>}
    </div>
  )
}
