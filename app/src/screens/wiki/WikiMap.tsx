import "./map.css"
import { useEffect, useMemo, useRef, useState } from "react"
import { Eye, EyeOff, ImageIcon, PanelRight, Pencil, Plus, Tags } from "lucide-react"
import { findCodeBlocks, replaceCodeBlock, setBlockKeys } from "../../core/codeblocks"
import { isMapNote, listMaps, mapSpecKeys, parseMap, type MapPin, type MapSpec } from "../../core/wiki"
import { DEFAULT_DRAWING_COLOR, type AreaShape, type MapDrawing } from "../../core/wiki-map-extras"
import { bounds, rectPolygon, type MapPoint } from "../../core/map-geometry"
import { noteName } from "../../core/text"
import type { IndexedNote } from "../../core/vault-index"
import { useNoteSet } from "../../lib/note-set"
import { href, navigate } from "../../lib/router"
import { noteRoute } from "../../lib/vault-notes"
import { useMarkdownOptions } from "../../components/Markdown"
import { useToast } from "../../components/ui"
import { DocumentBar, Notice, PageHeader, SaveStatus } from "../../components/kit/Layout"
import { Crest } from "../../components/kit/Emblem"
import { OverflowMenu, type MenuEntry } from "../../components/kit/OverflowMenu"
import { ResizablePanel, setPanelCollapsed, usePanelToggle } from "../../components/ResizablePanel"
import { useVault } from "../../platform/VaultProvider"
import { mapViews, type PinTarget } from "../../core/map-views"
import { MapCanvas, type MapCanvasHandle, type MapSelection, type MapTool } from "./MapCanvas"
import { MapPanel, type MapPanelTab, type SpecChange } from "./MapPanel"
import { MapRail } from "./MapRail"
import { PinPopover } from "./PinPopover"
import { articleRoute, useWiki } from "./wiki-state"
import { NewArticleDialog } from "./NewArticleDialog"
import type { NewArticleOptions } from "./NewArticleDialog"

const PANEL = "wiki-mapa"
const stored = (key: string) => { try { return localStorage.getItem(`runas-codex:${key}`) } catch { return null } }
const store = (key: string, value: string) => { try { localStorage.setItem(`runas-codex:${key}`, value) } catch { /* preferência opcional */ } }
const ERA_KEY = "runas-codex:era-mapa"

/** Bloco ```runas-mapa``` dentro de uma nota: o mapa navegável, só de ver (os pinos se editam na tela Mapas). */
export function MapBlock({ code }: { code: string }) {
  const set = useNoteSet()
  const { showSecrets } = useMarkdownOptions()
  const here = set.resolve?.("", "wiki")?.path
  const [active, setActive] = useState<number | null>(null)
  const [year, setYear] = useState(0)
  let spec: MapSpec
  try {
    spec = parseMap(code)
  } catch (error) {
    return <div className="callout aviso"><div className="callout-title">Mapa com erro</div><div className="callout-body small">{error instanceof Error ? error.message : String(error)}</div></div>
  }
  const image = set.resolve?.(spec.image, "wiki")
  const resolve = (target: string): PinTarget | null => { const found = set.resolve?.(target, "wiki"); return found ? { path: found.path, route: found.route, nested: false } : null }
  const views = mapViews(spec, { resolve, players: !showSecrets, hidden: new Set(), year, imageUrl: (target) => { const found = set.resolve?.(target, "wiki"); return found ? set.fileUrl?.(found.path) : undefined } })
  const pin = active !== null ? views.pins.find((p) => p.index === active) : undefined
  const target = pin ? views.targets.get(pin.index) : null
  const close = () => { const at = active; setActive(null); if (at !== null) document.querySelector<HTMLElement>(`.map-block [data-pin="${at}"]`)?.focus() }
  return (
    <div className="map-block">
      <MapCanvas compact spec={spec} label={`Mapa ${noteName(here ?? spec.image)}`} imageUrl={image ? set.fileUrl?.(image.path) : undefined} imageLayers={views.imageLayers} pins={views.pins} drawings={views.drawings}
        selection={pin ? { kind: "pin", index: pin.index } : null} onSelect={(s) => setActive(s?.kind === "pin" ? s.index : null)} onActivatePin={setActive}
        corner={views.hasEras ? <YearField year={year} onYear={setYear} /> : undefined}
        popoverAt={pin ? pin.pin : null}
        popover={pin ? <PinPopover pin={pin.pin} isNew={false} title={pin.title} meta={pin.secret ? "Segredo" : undefined} layers={[]} root="" from={here ?? ""} editable={false} nested={false}
          resolves={() => Boolean(target)} onDone={close} onClose={close} onDelete={close} onOpen={() => target && navigate(target.route)} onEnterMap={close} onCreateNote={() => {}} /> : null} />
      {here && <a className="btn sm map-block-open" href={href(`/wiki/mapa/${encodeURIComponent(here)}`)}><Pencil size={14} /> Abrir no editor de mapas</a>}
    </div>
  )
}
function YearField({ year, onYear }: { year: number; onYear(year: number): void }) {
  return <label className="map-year">Ano<input className="input" type="number" value={year} onChange={(e) => onYear(Number(e.target.value))} /></label>
}

/** Tela Mapas: a lista dos mapas da wiki ou um mapa aberto. */
export function WikiMap({ path }: { path?: string }) {
  const vault = useVault()
  const { wiki } = useWiki()
  const index = vault.index!
  const maps = useMemo(() => listMaps(index, wiki!.root), [index, wiki, vault.version])
  const [creating, setCreating] = useState(false)
  const readOnly = vault.info?.readOnly ?? true
  if (path) return <MapEditor key={path} path={path} />
  return (
    <div className="page">
      <PageHeader eyebrow={`Wiki · ${wiki!.name}`} title="Mapas" meta={<span className="small muted">{maps.length === 1 ? "1 mapa" : `${maps.length} mapas`}</span>}
        primary={!readOnly ? <button className="btn primary" onClick={() => setCreating(true)}><Plus size={16} /> Novo mapa</button> : undefined} />
      {maps.length === 0
        ? <Notice title="Nenhum mapa ainda">Um mapa é uma nota com uma imagem do cofre; os pinos ligam lugares do mapa a artigos da wiki.{!readOnly && " Use “Novo mapa”."}</Notice>
        : <div className="map-cards">{maps.map((note) => <MapCard key={note.path} note={note} />)}</div>}
      {creating && <NewArticleDialog initialKind="mapa" onClose={() => setCreating(false)} />}
    </div>
  )
}
/** Cartão da lista (U21): a imagem do mapa numa faixa no topo, sem texto por cima; sem imagem, o brasão. */
function MapCard({ note }: { note: IndexedNote }) {
  const vault = useVault(), index = vault.index!
  const info = useMemo(() => {
    try {
      const spec = parseMap(findCodeBlocks(note.text, "runas-mapa")[0]!.content)
      const dest = index.resolve({ kind: "wiki", embed: false, target: spec.image, start: 0, end: 0, raw: "", inFrontmatter: false }, note.path).dest
      const areas = spec.drawings?.filter((d) => d.kind === "zona").length ?? 0
      return { url: dest ? vault.platform.fileUrl(dest) ?? undefined : undefined, meta: [spec.pins.length === 1 ? "1 pino" : `${spec.pins.length} pinos`, areas ? (areas === 1 ? "1 área" : `${areas} áreas`) : ""].filter(Boolean).join(" · ") }
    } catch { return { url: undefined, meta: "Bloco do mapa com erro" } }
  }, [note.text, index, vault.version])
  const [failed, setFailed] = useState(false)
  return <a className="card map-card" href={href(`/wiki/mapa/${encodeURIComponent(note.path)}`)}>
    <span className={`map-card-band${info.url && !failed ? "" : " plain"}`} aria-hidden="true">
      {info.url && !failed ? <img src={info.url} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <Crest emblem="mapa" name={note.name} size={56} />}
    </span>
    <span className="map-card-text"><strong>{note.name}</strong><span className="small muted">{info.url || failed ? info.meta : `${info.meta} · sem imagem`}</span></span>
  </a>
}

function MapEditor({ path }: { path: string }) {
  const vault = useVault()
  const toast = useToast()
  const { wiki, players, setPlayers, calendar } = useWiki()
  const index = vault.index!
  const note = index.note(path)
  const readOnly = vault.info?.readOnly ?? true
  const editable = !readOnly && !players
  const block = note ? findCodeBlocks(note.text, "runas-mapa")[0] : undefined
  const parsed = useMemo(() => {
    if (!block) return null
    try { return { spec: parseMap(block.content) } } catch (error) { return { error: error instanceof Error ? error.message : String(error) } }
  }, [block?.content])

  const panel = usePanelToggle(PANEL, 860)
  const canvas = useRef<MapCanvasHandle>(null)
  const imagePicker = useRef<HTMLDivElement>(null)
  // Foco depois da mudança de estado (nada de requestAnimationFrame): o pino ou o seletor de imagem já desenhados.
  const [focusTarget, setFocusTarget] = useState<{ pin: number } | { picker: true } | null>(null)
  useEffect(() => {
    if (!focusTarget) return
    const target = "pin" in focusTarget
      ? document.querySelector<HTMLElement>(`.map-screen [data-pin="${focusTarget.pin}"]`)
      : imagePicker.current?.querySelector<HTMLElement>("input, button")
    if (target) { target.focus(); setFocusTarget(null) }
  })
  const [tool, setToolState] = useState<MapTool>("mover")
  const [shape, setShapeState] = useState<AreaShape>(() => (["retangulo", "elipse", "livre"].includes(stored("mapa-forma-area") ?? "") ? stored("mapa-forma-area") as AreaShape : "retangulo"))
  const [labels, setLabels] = useState(() => stored("mapa-nomes-ferramentas") !== "0")
  const [tab, setTabState] = useState<MapPanelTab>(() => (["pinos", "areas", "camadas", "mapa"].includes(stored("mapa-aba") ?? "") ? stored("mapa-aba") as MapPanelTab : "pinos"))
  const [selection, setSelection] = useState<MapSelection>(null)
  const [popover, setPopover] = useState<{ index: number } | { at: MapPoint } | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [year, setYearState] = useState(() => { try { const saved = sessionStorage.getItem(ERA_KEY); return saved === null ? calendar?.calendar.today?.year ?? 0 : Number(saved) } catch { return calendar?.calendar.today?.year ?? 0 } })
  const [saving, setSaving] = useState<"salvo" | "salvando" | "erro">("salvo")
  const [reveal, setReveal] = useState(0)
  const [creating, setCreating] = useState<NewArticleOptions | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const setTool = (next: MapTool) => { setToolState(next); setPopover(null) }
  const setShape = (next: AreaShape) => { setShapeState(next); store("mapa-forma-area", next) }
  const setTab = (next: MapPanelTab) => { setTabState(next); store("mapa-aba", next) }
  const setYear = (next: number) => { setYearState(next); try { sessionStorage.setItem(ERA_KEY, String(next)) } catch { /* opcional */ } }
  useEffect(() => { if (!editable && tool !== "mover" && tool !== "medir") setToolState("mover") }, [editable])

  const resolveDest = (target: string) => index.resolve({ kind: "wiki", embed: false, target, start: 0, end: 0, raw: "", inFrontmatter: false }, path).dest
  const resolve = (target: string): PinTarget | null => {
    const dest = resolveDest(target)
    return dest ? { path: dest, route: noteRoute(dest), nested: isMapNote(index, dest), tipo: index.note(dest)?.meta.frontmatter?.data?.tipo } : null
  }
  const fail = (error: unknown) => toast(error instanceof Error ? error.message : String(error))

  /** Grava uma mudança no bloco: uma por vez, sempre sobre o texto de agora (outra mudança pode ter gravado antes). */
  const update = (change: SpecChange): Promise<void> => {
    setSaving("salvando")
    const run = queue.current.then(async () => {
      const current = vault.index!.note(path)
      const currentBlock = current ? findCodeBlocks(current.text, "runas-mapa")[0] : undefined
      if (!current || !currentBlock) throw new Error("O mapa não está mais nesta nota.")
      const before = parseMap(currentBlock.content)
      const keys = mapSpecKeys(before, { ...before, ...change(before) })
      if (Object.keys(keys).length) await vault.save(path, replaceCodeBlock(current.text, currentBlock, setBlockKeys(currentBlock.content, keys)))
    })
    queue.current = run.catch(() => {})
    return run.then(() => setSaving("salvo"), (error) => { setSaving("erro"); fail(error); throw error })
  }
  const quiet = (promise: Promise<void>) => { promise.catch(() => {}) }

  if (!note || !block || !parsed) return <div className="page"><Notice tone="warn" title="Mapa não encontrado" actions={<a className="btn sm" href={href("/wiki/mapa")}>Ver os mapas</a>}>A nota pode ter sido movida ou apagada.</Notice></div>
  if ("error" in parsed) {
    return <div className="page"><Notice tone="danger" title="Mapa com erro" actions={<a className="btn sm" href={href(articleRoute(path))}>Corrigir na nota</a>}>{parsed.error}</Notice></div>
  }
  const spec = parsed.spec
  const image = resolveDest(spec.image)
  const views = mapViews(spec, { resolve, players, hidden, year, imageUrl: (target) => { const dest = resolveDest(target); return dest ? vault.platform.fileUrl(dest) ?? undefined : undefined } })
  const layerNames = views.layers.map((l) => l.name).filter(Boolean)
  const narrow = panel.overlay || (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(max-width: 860px)").matches)

  const focusPin = (index: number) => setFocusTarget({ pin: index })
  const closePopover = (focus: number | null) => {
    setPopover(null)
    if (focus !== null) focusPin(focus)
    else document.querySelector<HTMLElement>(".map-screen .map-box")?.focus()
  }
  const showPanel = () => { if (narrow) { if (!panel.overlay) panel.toggle() } else { setPanelCollapsed(PANEL, false); setReveal((n) => n + 1) } }

  const choosePin = (index: number, center = false) => {
    setSelection({ kind: "pin", index })
    setPopover({ index })
    if (center) canvas.current?.centerOn(spec.pins[index]!)
    if (narrow && panel.overlay) panel.close()
  }
  const deletePin = (index: number) => {
    const removed = spec.pins[index]
    if (!removed) return
    const title = views.pins.find((p) => p.index === index)?.title ?? views.pinRows.find((p) => p.index === index)?.title ?? "Pino"
    setPopover(null)
    setSelection(null)
    quiet(update((s) => ({ pins: s.pins.filter((_, i) => i !== index) })).then(() => {
      document.querySelector<HTMLElement>(".map-screen .map-box")?.focus()
      toast(`Pino “${title}” apagado.`, { label: "Desfazer", run: () => quiet(update((s) => ({ pins: [...s.pins.slice(0, index), removed, ...s.pins.slice(index)] }))) })
    }))
  }
  const savePin = (pin: MapPin, index: number | null) => {
    const at = index ?? spec.pins.length
    quiet(update((s) => ({ pins: index === null ? [...s.pins, pin] : s.pins.map((p, i) => (i === index ? pin : p)) })).then(() => {
      setSelection({ kind: "pin", index: index ?? at })
      if (index === null) setToolState("mover")
      focusPin(index ?? at)
    }))
    setPopover(null)
  }

  const createDrawing = (kind: MapDrawing["kind"], points: MapPoint[], areaShape?: AreaShape) => {
    const drawing: MapDrawing = { kind, points, color: DEFAULT_DRAWING_COLOR, text: "", layer: "", ...(kind === "zona" && areaShape ? { shape: areaShape } : {}) }
    const at = spec.drawings?.length ?? 0
    quiet(update((s) => ({ drawings: [...(s.drawings ?? []), drawing] })).then(() => {
      setSelection({ kind: "drawing", index: at })
      setTab("areas")
      setToolState("mover")
      showPanel()
    }))
  }
  const newDrawingAtCenter = (kind: MapDrawing["kind"]) => {
    const c = canvas.current?.center() ?? { x: 0.5, y: 0.5 }
    const points = kind === "zona" ? rectPolygon({ x: c.x - 0.06, y: c.y - 0.05 }, { x: c.x + 0.06, y: c.y + 0.05 })
      : kind === "rota" ? [{ x: Math.max(0, c.x - 0.08), y: c.y }, { x: Math.min(1, c.x + 0.08), y: c.y }] : [c]
    createDrawing(kind, points, kind === "zona" ? "retangulo" : undefined)
  }
  const patchDrawing = (index: number, patch: Partial<MapDrawing>) => quiet(update((s) => ({ drawings: (s.drawings ?? []).map((d, i) => (i === index ? { ...d, ...patch } : d)) })))
  const moveDrawing = (index: number, points: MapPoint[], how: "move" | "edit") =>
    quiet(update((s) => ({ drawings: (s.drawings ?? []).map((d, i) => (i === index ? { ...d, points, ...(how === "edit" && d.shape && d.shape !== "livre" ? { shape: "livre" as const } : {}) } : d)) })))
  const deleteDrawing = (index: number) => {
    const removed = spec.drawings?.[index]
    if (!removed) return
    setSelection(null)
    quiet(update((s) => ({ drawings: (s.drawings ?? []).filter((_, i) => i !== index) })).then(() => {
      const what = removed.kind === "zona" ? "Área" : removed.kind === "rota" ? "Rota" : "Rótulo"
      toast(`${what}${removed.text ? ` “${removed.text}”` : ""} apagad${removed.kind === "rotulo" ? "o" : "a"}.`, { label: "Desfazer", run: () => quiet(update((s) => ({ drawings: [...(s.drawings ?? []).slice(0, index), removed, ...(s.drawings ?? []).slice(index)] }))) })
    }))
  }
  const centerDrawing = (index: number) => {
    const d = spec.drawings?.[index]
    if (!d) return
    const b = bounds(d.points)
    canvas.current?.centerOn({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
    if (narrow && panel.overlay) panel.close()
  }
  const selectOnMap = (next: MapSelection) => {
    setSelection(next)
    if (next?.kind === "drawing") { setTab("areas"); if (!narrow) showPanel() }
    if (next?.kind !== "pin") setPopover(null)
  }

  const popoverPin = popover && "index" in popover ? spec.pins[popover.index] : popover ? { x: popover.at.x, y: popover.at.y } : undefined
  const popoverView = popover && "index" in popover ? views.pins.find((p) => p.index === popover.index) ?? null : null
  const popoverTarget = popover && "index" in popover ? views.targets.get(popover.index) ?? null : null
  const menu: MenuEntry[] = [
    { label: "Abrir a nota do mapa", icon: <Pencil size={16} />, onSelect: () => navigate(articleRoute(path)) },
    { label: players ? "Voltar à versão do mestre" : "Ver a versão dos jogadores", icon: players ? <Eye size={16} /> : <EyeOff size={16} />, onSelect: () => setPlayers(!players) },
    ...(editable ? [{ label: "Trocar a imagem…", icon: <ImageIcon size={16} />, onSelect: () => { setTab("mapa"); showPanel(); setFocusTarget({ picker: true }) } }] : []),
    "separator",
    { label: labels ? "Esconder os nomes das ferramentas" : "Mostrar os nomes das ferramentas", icon: <Tags size={16} />, onSelect: () => { setLabels(!labels); store("mapa-nomes-ferramentas", labels ? "0" : "1") } },
  ]

  return (
    <div className={`map-screen${panel.overlay ? " show-panel" : ""}`}>
      <DocumentBar back={{ label: "Mapas", onClick: () => navigate("/wiki/mapa") }} title={note.name} subtitle={`Mapa · Wiki ${wiki!.name}`}
        status={<SaveStatus state={readOnly ? "somente-leitura" : saving} />}
        actions={<button type="button" className="btn sm doc-panel map-panel-button" aria-expanded={panel.expanded} onClick={panel.toggle}><PanelRight size={16} /><span>Painel</span></button>}
        menu={<OverflowMenu label="Mais ações do mapa" items={menu} />} />
      {players && <div className="map-notice"><Notice title="Versão dos jogadores" actions={<button type="button" className="btn sm" onClick={() => setPlayers(false)}>Voltar à versão do mestre</button>}>Os segredos estão escondidos e nada se edita aqui.</Notice></div>}
      {readOnly && !players && <div className="map-notice"><Notice tone="warn" title="Somente leitura">Libere a gravação em Configurações › Cofre para pôr pinos e desenhar.</Notice></div>}
      <MapRail tool={tool} onTool={setTool} editable={editable} labels={labels} />
      <MapCanvas handle={canvas} spec={spec} label={`Mapa de ${note.name}`} imageUrl={image ? vault.platform.fileUrl(image) ?? undefined : undefined} imageLayers={views.imageLayers}
        missingImage={<>Imagem “{spec.image.split("/").at(-1)}” não encontrada no cofre{!window.runasCodex ? " (no navegador, só as imagens do exemplo aparecem)" : ""}.{editable && <> Troque em Painel › Mapa.</>}</>}
        pins={views.pins} drawings={views.drawings} tool={tool} areaShape={shape} onAreaShape={setShape} editable={editable} selection={selection} onSelect={selectOnMap}
        onActivatePin={(index) => choosePin(index)}
        onPinsChange={(pins) => quiet(update(() => ({ pins })))}
        onDrawingChange={moveDrawing}
        onPlacePin={(at) => { setSelection(null); setPopover({ at }) }}
        onCreateDrawing={createDrawing}
        onDeletePin={deletePin}
        onToolDone={() => setTool("mover")}
        corner={views.hasEras ? <YearField year={year} onYear={setYear} /> : undefined}
        popoverAt={popoverPin ?? null}
        popover={popover && popoverPin ? <PinPopover key={"index" in popover ? `pino-${popover.index}` : `novo-${popover.at.x}-${popover.at.y}`}
          pin={"index" in popover ? spec.pins[popover.index]! : { x: popover.at.x, y: popover.at.y }} isNew={!("index" in popover)}
          title={popoverView?.title ?? "Pino"} meta={popoverView ? views.pinRows.find((r) => r.index === popoverView.index)?.meta : undefined}
          layers={layerNames} root={wiki!.root} from={path} editable={editable} nested={Boolean(popoverTarget?.nested)}
          resolves={(target) => Boolean(resolve(target))}
          onDone={(pin) => savePin(pin, "index" in popover ? popover.index : null)}
          onClose={() => closePopover("index" in popover ? popover.index : null)}
          onDelete={() => { if ("index" in popover) deletePin(popover.index) }}
          onOpen={() => { const t = popoverTarget ?? (popoverPin && "note" in popoverPin && popoverPin.note ? resolve(popoverPin.note) : null); if (t) navigate(t.route) }}
          onEnterMap={() => { if (popoverTarget?.nested) navigate(`/wiki/mapa/${encodeURIComponent(popoverTarget.path)}`) }}
          onCreateNote={(name, link) => setCreating({ initialName: name, initialKind: "local", onCreated: (created) => { link(index.linkTarget(created, path)); toast(`Nota criada: ${noteName(created)}`) } })} /> : null}
        ghostAt={popover && !("index" in popover) ? popover.at : null} />
      <ResizablePanel id={PANEL} label="Painel do mapa" side="right" width={340} className="map-side" reveal={reveal > 0} onCollapsedChange={panel.onCollapsedChange}>
        {narrow && <button type="button" className="btn ghost sm map-side-close" onClick={panel.close}>Fechar o painel</button>}
        <MapPanel tab={tab} onTab={setTab} spec={spec} path={path} root={wiki!.root} editable={editable} players={players}
          pins={views.pinRows} drawings={views.drawingRows} layers={views.layers} selection={selection}
          onChoosePin={(index) => choosePin(index, true)}
          onPinAtCenter={() => { const c = canvas.current?.center() ?? { x: 0.5, y: 0.5 }; setSelection(null); setPopover({ at: c }); if (narrow && panel.overlay) panel.close() }}
          onChooseDrawing={(index) => { setSelection({ kind: "drawing", index }); setPopover(null) }}
          onNewDrawing={newDrawingAtCenter} onDrawingPatch={patchDrawing} onDeleteDrawing={deleteDrawing} onCenterDrawing={centerDrawing}
          onDoneDrawing={() => setSelection(null)}
          onToggleLayer={(name) => setHidden((h) => { const next = new Set(h); if (next.has(name)) next.delete(name); else next.add(name); return next })}
          update={update} imagePicker={imagePicker} />
      </ResizablePanel>
      {creating && <NewArticleDialog {...creating} onClose={() => setCreating(null)} />}
    </div>
  )
}
