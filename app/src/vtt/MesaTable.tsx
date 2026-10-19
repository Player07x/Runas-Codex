import { useVault } from "../platform/VaultProvider"
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { ArrowLeft, Map as MapIcon, Maximize2, Minimize2, MonitorPlay, Music, ScrollText, Settings } from "lucide-react"
import { href, navigate } from "../lib/router"
import { remoteMaster, resolveAssetUrl, vtt } from "./api"
import { AudioEngine } from "./audio-engine"
import { SceneCanvas } from "./canvas/SceneCanvas"
import { DocumentStore } from "./document-store"
import { AudioPanel, audioMixListeners } from "./panels/AudioPanel"
import { LogPanel } from "./panels/LogPanel"
import { PlayerPanel } from "./panels/PlayerPanel"
import { ScenesPanel } from "./panels/ScenesPanel"
import { SettingsDialog } from "./panels/SettingsDialog"
import { useSettings } from "./settings"
import type { AudioState } from "./shared/audio"
import type { WorldSummary } from "./shared/world"
import "./vtt.css"

type SideTab = "scenes" | "audio" | "log" | "players"

const SIDE_TABS: { id: SideTab; label: string; icon: typeof MapIcon }[] = [
  { id: "scenes", label: "Cenas", icon: MapIcon },
  { id: "audio", label: "Áudio", icon: Music },
  { id: "log", label: "Registro", icon: ScrollText },
  { id: "players", label: "Sala", icon: MonitorPlay },
]

const PANEL_WIDTH_KEY = "runas-codex:mesa-painel"
const PANEL_MIN = 320
const CANVAS_MIN = 280

function readPanelWidth(): number {
  try {
    return Number(localStorage.getItem(PANEL_WIDTH_KEY)) || 420
  } catch {
    return 420
  }
}

function clampPanelWidth(width: number, container: number): number {
  return Math.max(PANEL_MIN, Math.min(width, container - CANVAS_MIN))
}

const lastSceneKey = (worldId: string) => `runas-codex:mesa-cena.${worldId}`

function readLastScene(worldId: string): string | null {
  try {
    return localStorage.getItem(lastSceneKey(worldId))
  } catch {
    return null
  }
}

/** O que o processo principal manda tocar, reproduzido nesta máquina com os volumes do mestre. */
function useMasterAudio(): AudioState {
  const settings = useSettings()
  const [state, setState] = useState<AudioState>({ now: 0, sounds: [] })
  const engine = useRef<AudioEngine | null>(null)
  useEffect(() => {
    // No celular do mestre remoto quem toca é o computador da sala; aqui só se acompanha o estado.
    if (remoteMaster) {
      const unsubscribe = vtt.audio.onState(setState)
      void vtt.audio.state().then(setState)
      return unsubscribe
    }
    const created = new AudioEngine(resolveAssetUrl, settings.audio)
    // Só a mesa avisa o fim das faixas: é ela que faz a playlist avançar.
    created.onEnded = (key) => void vtt.audio.ended(key)
    engine.current = created
    const apply = (next: AudioState) => {
      setState(next)
      created.apply(next)
    }
    const unsubscribe = vtt.audio.onState(apply)
    void vtt.audio.state().then(apply)
    const onMix = (mix: typeof settings.audio) => created.setMix(mix)
    audioMixListeners.add(onMix)
    return () => {
      unsubscribe()
      audioMixListeners.delete(onMix)
      created.destroy()
      engine.current = null
    }
    // O motor vive enquanto a mesa estiver aberta; os volumes mudam pelo efeito de baixo.
  }, [])
  useEffect(() => engine.current?.setMix(settings.audio), [settings.audio])
  return state
}

/** Abre a mesa pelo id (rota `/vtt/mesa/<id>`) mantém a sala ao consultar outros espaços. */
export function MesaTable({ id }: { id: string }) {
  const [world, setWorld] = useState<WorldSummary | null>(null)
  const [error, setError] = useState<string>()
  useEffect(() => {
    let active = true
    try{sessionStorage.setItem("runas-codex:mesa-aberta",id)}catch{}
    vtt.openWorld(id).then(
      (opened) => active && setWorld(opened),
      (reason: unknown) => active && setError(reason instanceof Error ? reason.message : String(reason)),
    )
    return () => {
      active = false
      // A sala permanece no processo principal; trocar cofre/mesa ou encerrar explicitamente a fecha.
    }
  }, [id])
  if (error) {
    return (
      <div className="page">
        <p style={{ color: "var(--red)" }}>{error}</p>
        <a className="btn" href={href("/vtt/criar")}>
          <ArrowLeft size={16} /> Voltar às mesas
        </a>
      </div>
    )
  }
  if (!world) {
    return (
      <div className="page">
        <p className="muted">Abrindo a mesa…</p>
      </div>
    )
  }
  return <TableShell key={world.id} world={world} />
}

/** Mesa já aberta no computador da sala, controlada pelo celular do mestre (página `/master`, ADR 0016). */
export function RemoteMesa({ world }: { world: WorldSummary }) {
  return <TableShell key={world.id} world={world} remote />
}

function TableShell({ world, remote = false }: { world: WorldSummary; remote?: boolean }) {
  const [store] = useState(() => new DocumentStore())
  const [loaded, setLoaded] = useState(false)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [tab, setTab] = useState<SideTab>("scenes")
  const keyboardHints = useVault().platform.kind !== "capacitor"
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const audio = useMasterAudio()
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    void store.load().then(() => {
      const remembered = readLastScene(world.id)
      const scenes = store.scenes()
      setSceneId(scenes.some((scene) => scene.id === remembered) ? remembered : (scenes[0]?.id ?? null))
      setLoaded(true)
    })
    return () => store.dispose()
  }, [store, world.id])

  function openScene(id: string | null) {
    setSceneId(id)
    setPanelOpen(false)
    try {
      if (id) localStorage.setItem(lastSceneKey(world.id), id)
    } catch {
      /* preferência opcional */
    }
  }

  // Notas no mapa: um link do app (`#/notas/…`) abre aqui mesmo; links externos ficam de fora (o app é offline).
  function openUrl(url: string) {
    if (url.startsWith("#/")) navigate(url.slice(1))
  }

  const [panelWidth, setPanelWidth] = useState(readPanelWidth)
  const [expanded, setExpanded] = useState(false)
  const dragging = useRef(false)
  const [, setResizing] = useState(false)
  const containerWidth = () => root.current?.clientWidth ?? window.innerWidth
  const width = expanded ? containerWidth() - CANVAS_MIN : clampPanelWidth(panelWidth, containerWidth())

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    dragging.current = true
    setResizing(true)
    setExpanded(false)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function resize(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging.current || !root.current) return
    const box = root.current.getBoundingClientRect()
    setPanelWidth(clampPanelWidth(box.right - event.clientX, box.width))
  }
  function endResize() {
    if (!dragging.current) return
    dragging.current = false
    setResizing(false)
    try {
      localStorage.setItem(PANEL_WIDTH_KEY, String(panelWidth))
    } catch {
      /* preferência opcional */
    }
  }

  return (
    <main ref={root} className="vtt-root">
      <div className={`table ${panelOpen ? "panel-open" : ""}`} style={{ gridTemplateColumns: `minmax(${CANVAS_MIN}px, 1fr) ${width}px` }}>
        <header className="table-bar">
          {remote ? (
            <span className="chip" title="As mudanças são gravadas no computador da sala">
              <MonitorPlay size={14} /> Mestre remoto
            </span>
          ) : (
            <button className="ghost" onClick={() => navigate("/vtt/criar")}>
              <ArrowLeft size={16} /> Mesas
            </button>
          )}
          <div className="table-title">
            <strong>{world.title}</strong>
          </div>
          <div className="table-actions">
            <button className="ghost" onClick={() => { setTab("players"); setPanelOpen(true) }} title="Sala dos jogadores">
              <MonitorPlay size={16} /> Sala
            </button>
            {keyboardHints && <button className="icon" onClick={() => setSettingsOpen(true)} title="Configurações da mesa" aria-label="Configurações da mesa">
              <Settings size={16} />
            </button>}
          </div>
          <button className="mesa-panel-toggle ghost" aria-label="Abrir ou fechar painéis" aria-expanded={panelOpen} onClick={() => setPanelOpen(value => !value)}>Painéis</button>
        </header>
        {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
        <section className="canvas-area" aria-label="Cena">
          {loaded && <SceneCanvas store={store} sceneId={sceneId} onOpenUrl={openUrl} />}
        </section>
        <aside className="side-panel" aria-label="Painel da mesa">
          <div className="panel-resizer" role="separator" aria-orientation="vertical" aria-label="Redimensionar painel" onPointerDown={startResize} onPointerMove={resize} onPointerUp={endResize} onPointerCancel={endResize} />
          <nav className="side-tabs" aria-label="Painéis">
            {SIDE_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} className={id === tab ? "active" : ""} onClick={() => { setTab(id); setPanelOpen(tab !== id || !panelOpen) }} aria-expanded={tab === id && panelOpen} title={label} aria-label={label}>
                <Icon size={17} />
              </button>
            ))}
            <span className="side-tabs-spacer" />
            <button onClick={() => setExpanded((value) => !value)} title={expanded ? "Recolher painel" : "Expandir painel"} aria-label={expanded ? "Recolher painel" : "Expandir painel"}>
              {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </nav>
          {tab === "scenes" ? <ScenesPanel store={store} sceneId={sceneId} onOpen={openScene} /> : tab === "log" ? <LogPanel store={store} /> : tab === "players" ? <PlayerPanel store={store} sceneId={sceneId} /> : <AudioPanel store={store} audio={audio} />}
        </aside>
      </div>
    </main>
  )
}
