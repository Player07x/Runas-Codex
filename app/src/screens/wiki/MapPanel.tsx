import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { Crosshair, Layers, LockKeyhole, Map as MapIcon, MapPin, Plus, Route, Shapes, Trash2, Type } from "lucide-react"
import { ChoiceGroup } from "../../components/kit/ChoiceGroup"
import { CoverImagePicker } from "../../components/kit/CoverImagePicker"
import { FormField, FormGrid } from "../../components/kit/FormField"
import { ListRow, Notice } from "../../components/kit/Layout"
import { NoteCombobox } from "../../components/kit/NoteCombobox"
import { PanelTabs, TabPanel, type PanelTab } from "../../components/kit/PanelTabs"
import { TONES } from "../../core/tones"
import { DEFAULT_AREA_OPACITY, type AreaBorder, type MapDrawing, type MapImageLayer } from "../../core/wiki-map-extras"
import type { MapSpec } from "../../core/wiki"
import type { DrawingRow, LayerRow, PinRow } from "../../core/map-views"
import type { MapSelection } from "./MapCanvas"

export type MapPanelTab = "pinos" | "areas" | "camadas" | "mapa"
export type SpecChange = (spec: MapSpec) => Partial<MapSpec>
const KIND_TEXT = { zona: "Área", rota: "Rota", rotulo: "Rótulo" } as const
const SHAPE_TEXT = { retangulo: "Retângulo", elipse: "Elipse", livre: "Livre" } as const
const BORDERS = [{ value: "continua", label: "Contínua" }, { value: "tracejada", label: "Tracejada" }, { value: "nenhuma", label: "Sem borda" }] as const

/**
 * Painel do mapa (U17): abas Pinos · Áreas · Camadas · Mapa. A aba Pinos é a alternativa do desenho para quem não usa
 * o ponteiro (cada linha centraliza e abre o pino); Áreas lista e edita áreas, rotas e rótulos; Camadas mostra e
 * esconde; Mapa troca a imagem, a escala e as camadas de imagem por era. Tudo grava sozinho no bloco `runas-mapa`.
 */
export function MapPanel({ tab, onTab, spec, path, root, editable, players, pins, drawings, layers, selection, onChoosePin, onPinAtCenter, onChooseDrawing, onNewDrawing, onDrawingPatch, onDeleteDrawing, onCenterDrawing, onDoneDrawing, onToggleLayer, update, imagePicker }: {
  tab: MapPanelTab; onTab(tab: MapPanelTab): void
  spec: MapSpec; path: string; root: string; editable: boolean; players: boolean
  pins: PinRow[]; drawings: DrawingRow[]; layers: LayerRow[]
  selection: MapSelection
  onChoosePin(index: number): void
  onPinAtCenter(): void
  onChooseDrawing(index: number): void
  onNewDrawing(kind: MapDrawing["kind"]): void
  onDrawingPatch(index: number, patch: Partial<MapDrawing>): void
  onDeleteDrawing(index: number): void
  onCenterDrawing(index: number): void
  onDoneDrawing(): void
  onToggleLayer(name: string): void
  update(change: SpecChange): Promise<void>
  /** Onde o “Trocar a imagem…” do ⋯ põe o foco. */
  imagePicker: RefObject<HTMLDivElement | null>
}) {
  const areas = drawings.filter((d) => d.drawing.kind === "zona").length
  const tabs: PanelTab<MapPanelTab>[] = [
    { value: "pinos", label: "Pinos", icon: <MapPin size={15} />, count: pins.length },
    { value: "areas", label: "Áreas", icon: <Shapes size={15} />, count: areas },
    { value: "camadas", label: "Camadas", icon: <Layers size={15} />, count: layers.length },
    { value: "mapa", label: "Mapa", icon: <MapIcon size={15} /> },
  ]
  const selected = selection?.kind === "drawing" ? drawings.find((d) => d.index === selection.index) : undefined
  return <div className="map-panel">
    <PanelTabs tabs={tabs} value={tab} onChange={onTab} label="Painel do mapa" idPrefix="mapa-painel" />
    <TabPanel idPrefix="mapa-painel" value={tab}>
      {tab === "pinos" && <PinsTab pins={pins} selection={selection} editable={editable} players={players} onChoose={onChoosePin} onCenter={onPinAtCenter} />}
      {tab === "areas" && (selected && editable
        ? <DrawingEditor key={selected.index} row={selected} layers={layers.map((l) => l.name).filter(Boolean)} root={root} path={path} onPatch={(patch) => onDrawingPatch(selected.index, patch)}
          onDelete={() => onDeleteDrawing(selected.index)} onCenter={() => onCenterDrawing(selected.index)} onDone={onDoneDrawing} />
        : <DrawingsTab rows={drawings} selection={selection} editable={editable} onChoose={onChooseDrawing} onNew={onNewDrawing} onDelete={onDeleteDrawing} />)}
      {tab === "camadas" && <LayersTab layers={layers} editable={editable} onToggle={onToggleLayer} update={update} />}
      {tab === "mapa" && <MapTab spec={spec} path={path} editable={editable} players={players} update={update} imagePicker={imagePicker} />}
    </TabPanel>
  </div>
}

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR")

function PinsTab({ pins, selection, editable, players, onChoose, onCenter }: { pins: PinRow[]; selection: MapSelection; editable: boolean; players: boolean; onChoose(index: number): void; onCenter(): void }) {
  const [query, setQuery] = useState("")
  const q = fold(query.trim())
  const shown = pins.filter((p) => !q || p.search.includes(q))
  return <div className="map-panel-stack">
    {pins.length > 0 && <FormGrid columns={1}>
      <FormField label="Buscar pinos" hint={q ? `${shown.length} de ${pins.length}` : undefined}>
        {(f) => <input id={f.id} aria-describedby={f.describedBy} className="input" type="search" value={query} placeholder="Nome da nota ou rótulo" onChange={(e) => setQuery(e.target.value)} />}
      </FormField>
    </FormGrid>}
    {pins.length === 0 && <p className="small muted">{players ? "Nenhum pino para os jogadores." : editable ? "Nenhum pino ainda. Escolha Pino no trilho e toque no mapa, ou ponha um no meio da vista." : "Nenhum pino neste mapa."}</p>}
    {pins.length > 0 && shown.length === 0 && <p className="small muted">Nenhum pino com “{query.trim()}”.</p>}
    <div className="map-panel-list">
      {shown.map((p) => <ListRow key={p.index} onClick={() => onChoose(p.index)} current={selection?.kind === "pin" && selection.index === p.index}
        media={<span className={`map-row-mark${p.secret ? " secret" : ""}`}>{p.secret ? <LockKeyhole size={17} /> : <MapPin size={17} />}</span>} title={p.title} meta={p.meta} />)}
    </div>
    {editable && <button type="button" className="btn sm map-panel-add" onClick={onCenter}><Plus size={15} /> Pôr pino no meio da vista</button>}
  </div>
}

function drawingMeta(d: MapDrawing, hidden: boolean) {
  return [d.secret && "Segredo", d.kind === "zona" && d.shape && SHAPE_TEXT[d.shape], d.layer, (d.from !== undefined || d.to !== undefined) && `${d.from ?? "…"} a ${d.to ?? "…"}`, hidden && "escondida agora"].filter(Boolean).join(" · ")
}
const drawingTitle = (d: MapDrawing) => d.text.trim() || (d.kind === "zona" ? "Área sem nome" : d.kind === "rota" ? "Rota sem nome" : "Rótulo sem texto")

function DrawingsTab({ rows, selection, editable, onChoose, onNew, onDelete }: { rows: DrawingRow[]; selection: MapSelection; editable: boolean; onChoose(index: number): void; onNew(kind: MapDrawing["kind"]): void; onDelete(index: number): void }) {
  const groups: { kind: MapDrawing["kind"]; title: string; empty: string; add: string; icon: ReactNode }[] = [
    { kind: "zona", title: "Áreas", empty: "Nenhuma área.", add: "Nova área", icon: <Shapes size={15} /> },
    { kind: "rota", title: "Rotas", empty: "Nenhuma rota.", add: "Nova rota", icon: <Route size={15} /> },
    { kind: "rotulo", title: "Rótulos", empty: "Nenhum rótulo.", add: "Novo rótulo", icon: <Type size={15} /> },
  ]
  return <div className="map-panel-stack">
    {editable && <p className="small muted">Escolha uma para editar o nome, a cor e os pontos. Os botões “Nova” põem a forma no meio da vista.</p>}
    {groups.map((g) => {
      const list = rows.filter((r) => r.drawing.kind === g.kind)
      if (!list.length && !editable) return null
      return <section key={g.kind} className="map-panel-group" aria-label={g.title}>
        <div className="map-panel-group-head"><h3>{g.title}</h3>{editable && <button type="button" className="btn sm ghost" onClick={() => onNew(g.kind)}><Plus size={15} /> {g.add}</button>}</div>
        {list.length === 0 ? <p className="small muted">{g.empty}</p> : <div className="map-panel-list">
          {list.map((r) => <div key={r.index} className="map-drawing-row">
            <ListRow onClick={() => onChoose(r.index)} current={selection?.kind === "drawing" && selection.index === r.index}
              media={<span className="map-row-swatch" style={{ ["--sw" as string]: r.drawing.color }}>{g.icon}</span>} title={drawingTitle(r.drawing)} meta={drawingMeta(r.drawing, r.hidden) || KIND_TEXT[r.drawing.kind]} />
            {editable && <button type="button" className="icon-btn sm map-drawing-delete" aria-label={`Apagar ${KIND_TEXT[r.drawing.kind].toLocaleLowerCase("pt-BR")} ${drawingTitle(r.drawing)}`} title="Apagar" onClick={(event) => { event.stopPropagation(); onDelete(r.index) }}><Trash2 size={16} /></button>}
          </div>)}
        </div>}
      </section>
    })}
  </div>
}

/** Edita a área, a rota ou o rótulo escolhido. Cada mudança grava sozinha (o texto, meio segundo depois de parar). */
function DrawingEditor({ row, layers, root, path, onPatch, onDelete, onCenter, onDone }: {
  row: DrawingRow; layers: string[]; root: string; path: string
  onPatch(patch: Partial<MapDrawing>): void; onDelete(): void; onCenter(): void; onDone(): void
}) {
  const [d, setD] = useState(row.drawing)
  const pending = useRef<Partial<MapDrawing>>({})
  const timer = useRef<number | undefined>(undefined)
  const patchRef = useRef(onPatch)
  patchRef.current = onPatch
  const flush = () => { window.clearTimeout(timer.current); if (Object.keys(pending.current).length) { patchRef.current(pending.current); pending.current = {} } }
  // O que voltou do cofre entra, menos os campos que ainda não foram gravados.
  useEffect(() => { setD({ ...row.drawing, ...pending.current }) }, [row.drawing])
  useEffect(() => () => flush(), [])
  const change = (patch: Partial<MapDrawing>, wait = 0) => {
    setD((current) => ({ ...current, ...patch }))
    pending.current = { ...pending.current, ...patch }
    window.clearTimeout(timer.current)
    if (wait) timer.current = window.setTimeout(flush, wait)
    else flush()
  }
  const kind = KIND_TEXT[d.kind]
  const toneId = TONES.find((t) => t.dark.toLowerCase() === d.color.toLowerCase())?.id ?? "livre"
  const opacity = Math.round((d.opacity ?? DEFAULT_AREA_OPACITY) * 100)
  const eraError = d.from !== undefined && d.to !== undefined && d.from > d.to ? "O fim vem antes do começo." : undefined
  return <div className="map-panel-stack map-drawing-editor">
    <div className="map-panel-group-head"><h3>{kind}: {drawingTitle(d)}</h3></div>
    <FormGrid>
      <FormField label={d.kind === "rotulo" ? "Texto" : "Nome"} wide={d.kind === "rotulo"}>
        {(f) => <input id={f.id} className="input" value={d.text} autoFocus={!d.text} onChange={(e) => change({ text: e.target.value }, 500)} onBlur={flush} />}
      </FormField>
      <FormField label="Camada">
        {(f) => <select id={f.id} className="input" value={d.layer} onChange={(e) => change({ layer: e.target.value })}>
          <option value="">Sem camada</option>
          {[...new Set([...layers, ...(d.layer ? [d.layer] : [])])].map((l) => <option key={l} value={l}>{l}</option>)}
        </select>}
      </FormField>
      <FormField label="Cor" wide group>
        {() => <div className="map-tones" role="radiogroup" aria-label="Cor">
          {TONES.map((t) => <label key={t.id} className={`map-tone${toneId === t.id ? " on" : ""}`}>
            <input type="radio" name={`cor-${row.index}`} checked={toneId === t.id} onChange={() => change({ color: t.dark })} />
            <span className="map-tone-dot" style={{ ["--sw" as string]: t.dark }} aria-hidden="true" />{t.label}
          </label>)}
          <label className={`map-tone${toneId === "livre" ? " on" : ""}`}>
            <input type="color" value={d.color} aria-label="Cor livre" onChange={(e) => change({ color: e.target.value }, 400)} />
            Cor livre
          </label>
        </div>}
      </FormField>
      {d.kind === "zona" && <FormField label="Preenchimento" hint={`${opacity} %`}>
        {(f) => <input id={f.id} aria-describedby={f.describedBy} type="range" min={0} max={100} step={5} value={opacity} aria-valuetext={`${opacity} %`} onChange={(e) => change({ opacity: Number(e.target.value) / 100 }, 400)} />}
      </FormField>}
      {d.kind === "zona" && <FormField label="Borda" group>
        {(f) => <ChoiceGroup labelledBy={f.labelId} value={d.border ?? "continua"} options={BORDERS} onChange={(value: AreaBorder) => change({ border: value === "continua" ? undefined : value })} />}
      </FormField>}
      {d.kind === "zona" && <FormField label="Nota da área" wide hint="Opcional: o artigo que fala deste lugar.">
        {(f) => <NoteCombobox id={f.id} describedBy={f.describedBy} root={root} from={path} value={d.note ?? ""} onChange={(value) => change({ note: value.trim() || undefined }, 600)} />}
      </FormField>}
      <FormField label="Desde o ano" error={eraError}>
        {(f) => <input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} className="input" type="number" value={d.from ?? ""} onChange={(e) => change({ from: e.target.value === "" ? undefined : Number(e.target.value) }, 600)} onBlur={flush} />}
      </FormField>
      <FormField label="Até o ano">
        {(f) => <input id={f.id} className="input" type="number" value={d.to ?? ""} onChange={(e) => change({ to: e.target.value === "" ? undefined : Number(e.target.value) }, 600)} onBlur={flush} />}
      </FormField>
      <FormField label="Para quem" wide group>
        {() => <label className="check"><input type="checkbox" checked={Boolean(d.secret)} onChange={(e) => change({ secret: e.target.checked || undefined })} /> Segredo do mestre (some na versão dos jogadores)</label>}
      </FormField>
    </FormGrid>
    {d.kind !== "rotulo" && <p className="small muted">No mapa: arraste a forma para mover e as alças para mudar os pontos; pelo teclado, Tab chega às alças, as setas escolhem, Alt+setas movem e Enter na alça do meio insere um ponto.</p>}
    <div className="map-editor-actions">
      <button type="button" className="btn sm ghost danger" onClick={() => { flush(); onDelete() }}><Trash2 size={15} /> Apagar</button>
      <button type="button" className="btn sm ghost" onClick={onCenter}><Crosshair size={15} /> Centralizar</button>
      <button type="button" className="btn sm primary" onClick={() => { flush(); onDone() }}>Pronto</button>
    </div>
  </div>
}

function LayersTab({ layers, editable, onToggle, update }: { layers: LayerRow[]; editable: boolean; onToggle(name: string): void; update(change: SpecChange): Promise<void> }) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string>()
  const add = () => {
    const clean = name.trim()
    if (!clean) { setError("Dê um nome à camada."); return }
    if (layers.some((l) => fold(l.name) === fold(clean))) { setError("Já existe uma camada com esse nome."); return }
    setError(undefined)
    void update((s) => ({ layers: [...s.layers, clean] })).then(() => setName(""))
  }
  return <div className="map-panel-stack">
    {layers.length === 0 ? <p className="small muted">Sem camadas. Uma camada junta pinos e desenhos que aparecem e somem juntos (Locais, Perigos, Segredos…).</p>
      : <fieldset className="map-layers">
        <legend>Mostrar no mapa</legend>
        {layers.map((l) => <div key={l.name || "-"} className="map-layer-row">
          <label className="check"><input type="checkbox" checked={!l.hidden} onChange={() => onToggle(l.name)} /> {l.name || "Sem camada"}</label>
          <span className="small muted">{l.count} {l.count === 1 ? "item" : "itens"}</span>
          {editable && l.listed && l.count === 0 && <button type="button" className="btn sm ghost" onClick={() => void update((s) => ({ layers: s.layers.filter((x) => x !== l.name) }))} aria-label={`Tirar a camada ${l.name} da lista`}>Tirar</button>}
        </div>)}
      </fieldset>}
    <p className="small muted">Esconder uma camada vale só para esta tela, neste aparelho.</p>
    {editable && <form className="map-panel-stack" onSubmit={(e) => { e.preventDefault(); add() }}>
      <FormGrid columns={1}>
        <FormField label="Nova camada" error={error}>
          {(f) => <div className="map-inline"><input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Rotas comerciais" /><button className="btn sm" type="submit">Acrescentar</button></div>}
        </FormField>
      </FormGrid>
    </form>}
  </div>
}

function MapTab({ spec, path, editable, players, update, imagePicker }: { spec: MapSpec; path: string; editable: boolean; players: boolean; update(change: SpecChange): Promise<void>; imagePicker: RefObject<HTMLDivElement | null> }) {
  return <div className="map-panel-stack">
    {!editable && <Notice tone="info" title={players ? "Versão dos jogadores" : "Somente leitura"}>{players ? "A imagem, a escala e as crônicas se editam na versão do mestre." : "Libere a gravação para trocar a imagem e a escala."}</Notice>}
    <div ref={imagePicker} className="map-image-picker">
      {editable ? <CoverImagePicker legend="Imagem do mapa" value={`[[${spec.image}]]`} nearNote={path} onChange={(link) => { const image = link.replace(/^!?\[\[|\]\]$/g, "").trim(); if (image) void update(() => ({ image })) }} />
        : <p className="small">Imagem: <span className="mono">{spec.image.split("/").at(-1)}</span></p>}
    </div>
    <ScaleFields spec={spec} editable={editable} update={update} />
    <ImageLayers spec={spec} path={path} editable={editable} players={players} update={update} />
  </div>
}

/** Escala da régua (Medir): quantos pixels da imagem valem quanto, e quanto se anda por dia. */
function ScaleFields({ spec, editable, update }: { spec: MapSpec; editable: boolean; update(change: SpecChange): Promise<void> }) {
  const [v, setV] = useState({ pixels: String(spec.scale?.pixels ?? ""), distance: String(spec.scale?.distance ?? ""), unit: spec.scale?.unit ?? "km", travel: String(spec.travelPerDay ?? "") })
  useEffect(() => setV({ pixels: String(spec.scale?.pixels ?? ""), distance: String(spec.scale?.distance ?? ""), unit: spec.scale?.unit ?? "km", travel: String(spec.travelPerDay ?? "") }), [spec.scale, spec.travelPerDay])
  const num = (text: string) => (text.trim() === "" ? undefined : Number(text.replace(",", ".")))
  const pixels = num(v.pixels), distance = num(v.distance), travel = num(v.travel)
  const bad = (n: number | undefined) => n !== undefined && !(Number.isFinite(n) && n > 0)
  const missing = (pixels === undefined) !== (distance === undefined)
  const error = bad(pixels) || bad(distance) ? "Use números maiores que zero." : missing ? "Preencha os pixels e a distância (ou apague os dois)." : undefined
  const save = () => {
    if (error || bad(travel)) return
    const scale = pixels !== undefined && distance !== undefined ? { pixels, distance, unit: v.unit.trim() || "km" } : undefined
    const same = JSON.stringify(scale) === JSON.stringify(spec.scale) && travel === spec.travelPerDay
    if (!same) void update(() => ({ scale, travelPerDay: travel }))
  }
  return <fieldset className="map-fieldset" disabled={!editable}>
    <legend>Escala da régua</legend>
    <FormGrid>
      <FormField label="Pixels da imagem" error={error}>
        {(f) => <input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} className="input" inputMode="decimal" value={v.pixels} onChange={(e) => setV({ ...v, pixels: e.target.value })} onBlur={save} />}
      </FormField>
      <FormField label="Valem">
        {(f) => <input id={f.id} className="input" inputMode="decimal" value={v.distance} onChange={(e) => setV({ ...v, distance: e.target.value })} onBlur={save} />}
      </FormField>
      <FormField label="Unidade">
        {(f) => <input id={f.id} className="input" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} onBlur={save} placeholder="km, léguas…" />}
      </FormField>
      <FormField label="Viagem por dia" hint={bad(travel) ? undefined : "Na mesma unidade; Medir mostra os dias."} error={bad(travel) ? "Use um número maior que zero." : undefined}>
        {(f) => <input id={f.id} aria-describedby={f.describedBy} aria-invalid={f.invalid} className="input" inputMode="decimal" value={v.travel} onChange={(e) => setV({ ...v, travel: e.target.value })} onBlur={save} />}
      </FormField>
    </FormGrid>
  </fieldset>
}

/** Camadas de imagem por era (crônicas): a mesma região em outra época, por cima da imagem do mapa. */
function ImageLayers({ spec, path, editable, players, update }: { spec: MapSpec; path: string; editable: boolean; players: boolean; update(change: SpecChange): Promise<void> }) {
  const empty = { name: "", image: "", from: "", to: "", opacity: 100, secret: false }
  const [f, setF] = useState(empty)
  const [error, setError] = useState<string>()
  const list = (spec.images ?? []).map((layer, i) => ({ layer, i })).filter(({ layer }) => !players || !layer.secret)
  const add = () => {
    const name = f.name.trim(), image = f.image.replace(/^!?\[\[|\]\]$/g, "").trim()
    if (!name || !image) { setError(!name ? "Dê um nome à camada." : "Escolha a imagem da camada."); return }
    const from = f.from === "" ? undefined : Number(f.from), to = f.to === "" ? undefined : Number(f.to)
    if (from !== undefined && to !== undefined && from > to) { setError("O fim vem antes do começo."); return }
    setError(undefined)
    const layer: MapImageLayer = { name, image, opacity: f.opacity / 100, ...(from !== undefined ? { from } : {}), ...(to !== undefined ? { to } : {}), ...(f.secret ? { secret: true } : {}) }
    void update((s) => ({ images: [...(s.images ?? []), layer] })).then(() => setF(empty))
  }
  const era = (l: MapImageLayer) => (l.from === undefined && l.to === undefined ? "sempre" : `${l.from ?? "…"} a ${l.to ?? "…"}`)
  return <section className="map-panel-group" aria-labelledby="mapa-cronicas">
    <div className="map-panel-group-head"><h3 id="mapa-cronicas">Camadas de imagem e crônicas</h3></div>
    <p className="small muted">A mesma região em outra época: a imagem aparece por cima nos anos escolhidos (o Ano fica no canto do mapa).</p>
    {list.length === 0 ? <p className="small muted">Nenhuma camada de imagem.</p> : <div className="map-panel-list">
      {list.map(({ layer, i }) => <ListRow key={i} media={<span className="map-row-mark">{layer.secret ? <LockKeyhole size={17} /> : <Layers size={17} />}</span>} title={layer.name}
        meta={[layer.secret && "Segredo", era(layer), `${Math.round(layer.opacity * 100)} %`].filter(Boolean).join(" · ")}
        trailing={editable ? <button type="button" className="icon-btn" aria-label={`Tirar a camada ${layer.name}`} title="Tirar a camada" onClick={() => void update((s) => ({ images: (s.images ?? []).filter((_, n) => n !== i) }))}><Trash2 size={16} /></button> : undefined} />)}
    </div>}
    {editable && <details className="map-add-layer">
      <summary>Acrescentar camada de imagem</summary>
      <form className="map-panel-stack" onSubmit={(e) => { e.preventDefault(); add() }}>
        <FormGrid>
          <FormField label="Nome da camada" wide error={error}>
            {(c) => <input id={c.id} aria-describedby={c.describedBy} aria-invalid={c.invalid} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Antes da enchente" />}
          </FormField>
          <FormField label="Desde o ano">
            {(c) => <input id={c.id} className="input" type="number" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />}
          </FormField>
          <FormField label="Até o ano">
            {(c) => <input id={c.id} className="input" type="number" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />}
          </FormField>
          <FormField label="Opacidade" hint={`${f.opacity} %`}>
            {(c) => <input id={c.id} aria-describedby={c.describedBy} type="range" min={0} max={100} step={5} value={f.opacity} aria-valuetext={`${f.opacity} %`} onChange={(e) => setF({ ...f, opacity: Number(e.target.value) })} />}
          </FormField>
          <FormField label="Para quem" group>
            {() => <label className="check"><input type="checkbox" checked={f.secret} onChange={(e) => setF({ ...f, secret: e.target.checked })} /> Segredo do mestre</label>}
          </FormField>
        </FormGrid>
        <CoverImagePicker legend="Imagem da camada" value={f.image} nearNote={path} onChange={(link) => setF({ ...f, image: link })} />
        <button type="submit" className="btn sm primary map-panel-add">Acrescentar camada</button>
      </form>
    </details>}
  </section>
}
