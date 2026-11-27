import type { ReactNode } from "react"
import { SelectAllButton, SideSelectHint } from "./SideSelect"
import { Circle, Eye, EyeOff, LocateFixed, Power, PowerOff, Square } from "lucide-react"
import type { DocumentInput } from "../shared/ipc"
import type { RegionData } from "../shared/region"
import type { WorldDocument } from "../shared/world"

/** O que a área faz, em poucas palavras, para a linha da lista. */
export function regionSummary(data: RegionData, sceneName: (id: string | null) => string | null): string {
  const parts = [data.shape === "ellipse" ? "Elipse" : "Retângulo"]
  if (data.teleport.enabled) parts.push(`teleporte${sceneName(data.teleport.sceneId) ? ` → ${sceneName(data.teleport.sceneId)}` : ""}`)
  if (data.text.enabled) parts.push(data.text.once ? "texto uma vez" : "texto")
  if (data.terrain.enabled) parts.push(`terreno ×${data.terrain.multiplier.toLocaleString("pt-BR")}`)
  if (data.fog?.enabled) parts.push("névoa própria")
  if (!data.enabled) parts.push("desativada")
  return parts.join(" · ")
}

/**
 * Áreas da cena (1.9), na aba Áreas do menu da direita: cada linha leva até a área no mapa e abre os campos dela ali
 * mesmo, sem cobrir o painel com as propriedades.
 */
export function RegionsPanel({ regions, put, selected, onFocus, editor, sceneName, onSelectAll }: {
  regions: WorldDocument<RegionData>[]; put(input: DocumentInput): void
  selected: string | null; onFocus(id: string): void; editor(region: WorldDocument<RegionData>): ReactNode
  sceneName(id: string | null): string | null
  onSelectAll?(): void
}) {
  const update = (region: WorldDocument<RegionData>, patch: Partial<RegionData>) => put({ id: region.id, type: "region", parentId: region.parentId, data: { ...region.data, ...patch } })
  return <section className="scene-side-panel" aria-labelledby="scene-regions-title">
    <header className="panel-header">
      <div><p className="eyebrow">Cena</p><h2 id="scene-regions-title">Áreas · {regions.length}</h2></div>
      <SelectAllButton count={regions.length} onSelectAll={onSelectAll} />
    </header>
    {regions.length > 0 && <SideSelectHint what="as áreas" />}
    {!regions.length ? <p className="hint">Nenhuma área nesta cena. Desenhe uma com a ferramenta Áreas: ela pode teleportar, mostrar um texto ou marcar terreno difícil.</p> : <ul className="scene-side-list">
      {regions.map((region) => {
        const open = region.id === selected
        const Shape = region.data.shape === "ellipse" ? Circle : Square
        return <li key={region.id} className={open ? "selected" : ""}>
          <div className="scene-walls-line">
            <button className="scene-walls-name" title="Mostrar no mapa e editar" aria-expanded={open} onClick={() => onFocus(region.id)}>
              <Shape size={15} aria-hidden="true" style={{ color: region.data.color }} />
              <span><strong>{region.data.name}</strong><small>{regionSummary(region.data, sceneName)}</small></span>
              <LocateFixed size={14} aria-hidden="true" className="scene-walls-go" />
            </button>
            <button className={`icon-toggle ${region.data.visible ? "active" : ""}`} aria-pressed={region.data.visible} aria-label={`${region.data.name} visível aos jogadores`} title={region.data.visible ? "Visível aos jogadores" : "Escondida dos jogadores"} onClick={() => update(region, { visible: !region.data.visible })}>
              {region.data.visible ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
            <button className={`icon-toggle ${region.data.enabled ? "active" : ""}`} aria-pressed={region.data.enabled} aria-label={`${region.data.name} ativa`} title={region.data.enabled ? "Ativa: os comportamentos disparam" : "Desativada: nada dispara"} onClick={() => update(region, { enabled: !region.data.enabled })}>
              {region.data.enabled ? <Power size={15} /> : <PowerOff size={15} />}
            </button>
          </div>
          {open && <div className="scene-side-editor" role="group" aria-label={`Campos: ${region.data.name}`}>{editor(region)}</div>}
        </li>
      })}
    </ul>}
  </section>
}
