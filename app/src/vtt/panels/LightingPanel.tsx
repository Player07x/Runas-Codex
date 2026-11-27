import type { ReactNode } from "react"
import { SelectAllButton, SideSelectHint } from "./SideSelect"
import { Lightbulb, LightbulbOff, LocateFixed, RotateCcw } from "lucide-react"
import type { DocumentInput } from "../shared/ipc"
import type { LightData, SceneData, SceneVisionConfig } from "../shared/scene"
import type { WorldDocument } from "../shared/world"
import { vtt } from "../api"

const cells = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${value === 1 ? "quadro" : "quadros"}`

/**
 * Luz e névoa da cena (1.9), na aba do menu da direita: a visão da cena (que antes ficava no fim da configuração da
 * cena) e a lista das luzes, cada uma com os campos abertos ali mesmo.
 */
export function LightingPanel({ scene, lights, put, selected, onFocus, editor, children, onSelectAll }: {
  scene: WorldDocument<SceneData>; lights: WorldDocument<LightData>[]; put(input: DocumentInput): void
  selected: string | null; onFocus(id: string): void; editor(light: WorldDocument<LightData>): ReactNode
  /** Seções a mais embaixo das luzes (áreas de névoa). */
  children?: ReactNode
  onSelectAll?(): void
}) {
  const vision = scene.data.vision
  const updateVision = (patch: Partial<SceneVisionConfig>) => put({ id: scene.id, type: "scene", parentId: null, data: { ...scene.data, vision: { ...vision, ...patch } } })
  const updateLight = (light: WorldDocument<LightData>, patch: Partial<LightData>) => put({ id: light.id, type: "light", parentId: light.parentId, data: { ...light.data, ...patch } })
  return <section className="scene-side-panel lighting-panel" aria-labelledby="scene-lighting-title">
    <header className="panel-header">
      <div><p className="eyebrow">Cena</p><h2 id="scene-lighting-title">Luz e névoa</h2></div>
    </header>
    <div className="scene-side-section" role="group" aria-label="Visão da cena">
      <label className="check"><input type="checkbox" checked={vision.enabled} onChange={(event) => updateVision({ enabled: event.target.checked })} /> Névoa de guerra: os jogadores veem só o que os aliados enxergam</label>
      <label className="field"><span>Escuridão: {Math.round(vision.darkness * 100)}%</span><input type="range" min={0} max={1} step={0.05} value={vision.darkness} onChange={(event) => updateVision({ darkness: Number(event.target.value) })} /></label>
      <label className="check"><input type="checkbox" checked={vision.globalLight} onChange={(event) => updateVision({ globalLight: event.target.checked })} /> Luz do dia: tudo na linha de visão está iluminado</label>
      {vision.enabled && <>
        <label className="check"><input type="checkbox" checked={vision.exploration} onChange={(event) => updateVision({ exploration: event.target.checked })} /> Lembrar as áreas exploradas</label>
        <div className="row-actions"><button className="ghost small" onClick={() => { if (window.confirm("Apagar as áreas exploradas desta cena? A névoa volta a cobrir tudo o que os aliados não estão vendo agora.")) void vtt.vision.resetExploration(scene.id) }}><RotateCcw size={13} /> Redefinir áreas exploradas</button></div>
      </>}
      <small className="hint">Sem luz do dia, só as luzes (ferramenta Luzes ou a luz do token) e o alcance no escuro dos aliados revelam o mapa. Paredes e portas fechadas bloqueiam visão e luz.</small>
    </div>
    <div className="scene-side-subhead"><h3 className="scene-side-subtitle">Luzes · {lights.length}</h3><SelectAllButton count={lights.length} onSelectAll={onSelectAll} /></div>
    {lights.length > 0 && <SideSelectHint what="as luzes" />}
    {!lights.length ? <p className="hint">Nenhuma luz nesta cena. Acenda uma com a ferramenta Luzes; tokens também podem levar luz (nas propriedades do token).</p> : <ul className="scene-side-list">
      {lights.map((light, index) => {
        const name = `Luz ${index + 1}`
        const open = light.id === selected
        return <li key={light.id} className={open ? "selected" : ""}>
          <div className="scene-walls-line">
            <button className="scene-walls-name" title="Mostrar no mapa e editar" aria-expanded={open} onClick={() => onFocus(light.id)}>
              <Lightbulb size={15} aria-hidden="true" style={{ color: light.data.color }} />
              <span><strong>{name}</strong><small>plena {cells(light.data.bright)} · penumbra {cells(light.data.dim)}{light.data.hidden ? " · apagada" : ""}</small></span>
              <LocateFixed size={14} aria-hidden="true" className="scene-walls-go" />
            </button>
            <button className={`icon-toggle ${light.data.hidden ? "" : "active"}`} aria-pressed={!light.data.hidden} aria-label={`${name} acesa`} title={light.data.hidden ? "Apagada: clique para acender" : "Acesa: clique para apagar"} onClick={() => updateLight(light, { hidden: !light.data.hidden })}>
              {light.data.hidden ? <LightbulbOff size={15} /> : <Lightbulb size={15} />}
            </button>
          </div>
          {open && <div className="scene-side-editor" role="group" aria-label={`Campos: ${name}`}>{editor(light)}</div>}
        </li>
      })}
    </ul>}
    {children}
  </section>
}
