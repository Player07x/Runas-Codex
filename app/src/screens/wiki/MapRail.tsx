import { useRef, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { Hand, MapPin, Route, Ruler, Shapes, Type } from "lucide-react"
import type { MapTool } from "./MapCanvas"

const TOOLS: { id: MapTool; short: string; label: string; icon: typeof Hand; edits: boolean }[] = [
  { id: "mover", short: "Mover", label: "Mover o mapa e escolher", icon: Hand, edits: false },
  { id: "pino", short: "Pino", label: "Pôr pino", icon: MapPin, edits: true },
  { id: "area", short: "Área", label: "Desenhar área", icon: Shapes, edits: true },
  { id: "rota", short: "Rota", label: "Desenhar rota", icon: Route, edits: true },
  { id: "rotulo", short: "Rótulo", label: "Pôr rótulo", icon: Type, edits: true },
  { id: "medir", short: "Medir", label: "Medir distância", icon: Ruler, edits: false },
]

/**
 * Trilho de ferramentas do mapa (U17): só as ferramentas, nunca as abas do painel. É uma barra de ferramentas da
 * WAI-ARIA: uma parada de Tab, as setas andam, Home e End vão às pontas. No celular vira uma faixa no topo do mapa.
 * Sem gravação liberada (ou na versão dos jogadores), só Mover e Medir.
 */
export function MapRail({ tool, onTool, editable, labels }: { tool: MapTool; onTool(tool: MapTool): void; editable: boolean; labels: boolean }) {
  const bar = useRef<HTMLDivElement>(null)
  const tools = TOOLS.filter((t) => editable || !t.edits)
  const onKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const buttons = [...(bar.current?.querySelectorAll<HTMLButtonElement>("button") ?? [])]
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    const next = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: buttons.length - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    buttons[(next + buttons.length) % buttons.length]?.focus()
  }
  return <div ref={bar} className={`map-rail${labels ? " labeled" : ""}`} role="toolbar" aria-label="Ferramentas do mapa" onKeyDown={onKey}>
    {tools.map(({ id, short, label, icon: Icon }) => (
      <button key={id} type="button" className={`map-tool${tool === id ? " on" : ""}`} aria-pressed={tool === id} aria-label={label} title={label}
        tabIndex={tool === id ? 0 : -1} onClick={() => onTool(id)}>
        <Icon size={19} aria-hidden="true" />
        {labels && <span aria-hidden="true">{short}</span>}
      </button>
    ))}
  </div>
}
