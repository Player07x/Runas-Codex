import { deferredView } from "../kit/deferred-view"

export interface GraphForces {
  repulsion: number
  distance: number
  nodeSize: number
  linkWidth: number
  arrows: boolean
}

export const DEFAULT_FORCES: GraphForces = { repulsion: 140, distance: 70, nodeSize: 1, linkWidth: 1, arrows: false }

export const GraphView = deferredView(
  () => import("./GraphView").then(({ GraphView }) => GraphView),
  (props) => <div className={`graph-view ${props.className ?? ""}`}><p className="graph-error small" role="status">Carregando gráfico…</p></div>,
)
