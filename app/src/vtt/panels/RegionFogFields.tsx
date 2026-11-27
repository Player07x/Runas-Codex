import { useState, type ReactNode } from "react"
import { CloudFog, Eye, EyeOff, LocateFixed, Plus } from "lucide-react"
import { vtt } from "../api"
import { areaPolygon, setAreaExplored } from "../shared/fog-areas"
import { FOG_CHOICES, type FogChoice, type RegionData, type RegionFog } from "../shared/region"
import { normalizeFog, type SceneData } from "../shared/scene"
import { fogLayout } from "../shared/vision"
import type { DocumentInput } from "../shared/ipc"
import type { WorldDocument } from "../shared/world"

const CHOICE_LABELS: Record<Exclude<FogChoice, "default">, string> = { on: "Ligada aqui", off: "Desligada aqui" }
const onOff = (value: boolean) => (value ? "ligada" : "desligada")

/**
 * Névoa por área (1.9 C), nos campos da Área: cada opção da cena pode ficar como está (“Usar padrão”) ou mudar só
 * dentro da área. “Revelar agora” e “Cobrir de novo” mexem nas áreas exploradas da cena.
 */
export function RegionFogFields({ sceneId, scene, data, update }: { sceneId: string; scene: SceneData; data: RegionData; update(patch: Partial<RegionData>): void }) {
  const fog = data.fog
  const vision = scene.vision
  const [status, setStatus] = useState("")
  const setFog = (patch: Partial<RegionFog>) => update({ fog: { ...fog, ...patch } })
  const choice = (label: string, key: "vision" | "exploration" | "globalLight", sceneValue: boolean) => <label className="field"><span>{label}</span>
    <select value={fog[key]} onChange={(event) => setFog({ [key]: event.target.value as FogChoice })}>
      {FOG_CHOICES.map((value) => <option key={value} value={value}>{value === "default" ? `Usar padrão (${onOff(sceneValue)})` : CHOICE_LABELS[value]}</option>)}
    </select>
  </label>
  const hasFog = fog.vision === "on" || (vision.enabled && fog.vision !== "off")
  const remembers = hasFog && (fog.exploration === "on" || (fog.exploration === "default" && vision.exploration))

  async function explore(explored: boolean) {
    try {
      const [current] = await vtt.documents.list("fog", sceneId)
      const next = setAreaExplored(current ? normalizeFog(current.data) : null, fogLayout(scene), areaPolygon(data), explored)
      await vtt.documents.put({ id: `fog-${sceneId}`, type: "fog", parentId: sceneId, data: next })
      setStatus(explored ? "Área revelada como explorada." : "Área coberta de novo (o que um aliado vê agora continua à vista).")
    } catch (reason) {
      setStatus(reason instanceof Error ? reason.message : String(reason))
    }
  }

  return <div className="bars region-fog">
    <label className="check"><input type="checkbox" checked={fog.enabled} onChange={(event) => setFog({ enabled: event.target.checked })} /> <strong>Névoa própria</strong></label>
    {fog.enabled && <>
      {choice("Névoa de guerra", "vision", vision.enabled)}
      {choice("Lembrar as áreas exploradas", "exploration", vision.exploration)}
      {choice("Luz do dia", "globalLight", vision.globalLight)}
      <label className="check"><input type="checkbox" checked={fog.darkness === null} onChange={(event) => setFog({ darkness: event.target.checked ? null : vision.darkness })} /> Escuridão: usar padrão ({Math.round(vision.darkness * 100)}%)</label>
      {fog.darkness !== null && <label className="field"><span>Escuridão aqui: {Math.round(fog.darkness * 100)}%</span><input type="range" min={0} max={1} step={0.05} value={fog.darkness} onChange={(event) => setFog({ darkness: Number(event.target.value) })} /></label>}
      <div className="row-actions" role="group" aria-label="Áreas exploradas desta área">
        <button type="button" className="ghost small" disabled={!remembers} onClick={() => void explore(true)}><Eye size={13} aria-hidden="true" /> Revelar agora</button>
        <button type="button" className="ghost small" disabled={!remembers} onClick={() => void explore(false)}><EyeOff size={13} aria-hidden="true" /> Cobrir de novo</button>
      </div>
      {!remembers && <small className="hint">Revelar e cobrir valem com a névoa e “Lembrar as áreas exploradas” ligadas aqui (na área ou pela cena).</small>}
      {status && <small className="hint" role="status">{status}</small>}
      {!data.enabled && <small className="hint">A área está desativada: a névoa própria só vale com ela ativa.</small>}
    </>}
  </div>
}

/** Lista das áreas com névoa própria, na aba Luz e névoa, e o botão que cria uma no meio da tela. */
export function FogAreasSection({ regions, selected, onFocus, onCreate, editor }: {
  regions: WorldDocument<RegionData>[]; selected: string | null; onFocus(id: string): void; onCreate(): void
  editor(region: WorldDocument<RegionData>): ReactNode
}) {
  const fogged = regions.filter((region) => region.data.fog.enabled)
  return <>
    <div className="scene-side-subhead"><h3 className="scene-side-subtitle">Névoa por área · {fogged.length}</h3>
      <button type="button" className="ghost small" onClick={onCreate}><Plus size={14} aria-hidden="true" /> Nova área de névoa</button>
    </div>
    {!fogged.length ? <p className="hint">Nenhuma área com névoa própria. “Nova área de névoa” cria uma no meio da tela; ou marque “Névoa própria” numa área existente.</p> : <ul className="scene-side-list">
      {fogged.map((region) => {
        const open = selected === region.id
        const parts = [region.data.fog.vision === "off" ? "sempre à vista" : region.data.fog.vision === "on" ? "coberta" : null, region.data.fog.globalLight !== "default" ? `dia ${region.data.fog.globalLight === "on" ? "ligado" : "desligado"}` : null, region.data.fog.darkness !== null ? `escuridão ${Math.round(region.data.fog.darkness * 100)}%` : null, region.data.fog.exploration !== "default" ? `exploração ${region.data.fog.exploration === "on" ? "ligada" : "desligada"}` : null].filter(Boolean)
        return <li key={region.id} className={open ? "selected" : ""}>
          <div className="scene-walls-line">
            <button type="button" className="scene-walls-name" title="Mostrar no mapa e editar" aria-expanded={open} onClick={() => onFocus(region.id)}>
              <CloudFog size={15} aria-hidden="true" style={{ color: region.data.color }} />
              <span><strong>{region.data.name}</strong><small>{parts.length ? parts.join(" · ") : "igual à cena"}{region.data.enabled ? "" : " · desativada"}</small></span>
              <LocateFixed size={14} aria-hidden="true" className="scene-walls-go" />
            </button>
          </div>
          {open && <div className="scene-side-editor" role="group" aria-label={`Campos: ${region.data.name}`}>{editor(region)}</div>}
        </li>
      })}
    </ul>}
  </>
}

/** Documento de uma área de névoa nova, com 4 × 4 células, no meio da tela. */
export function newFogArea(id: string, sceneId: string, center: { x: number; y: number }, cell: number): DocumentInput {
  const size = cell * 4
  return { id, type: "region", parentId: sceneId, data: { name: "Névoa", x: Math.round(center.x - size / 2), y: Math.round(center.y - size / 2), width: size, height: size, color: "#5b6170", fog: { enabled: true, vision: "off" } } }
}
