import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, Crosshair, Plus, Search, SlidersHorizontal, X } from "lucide-react"
import { buildGraph, type GraphGroup, type GraphNode } from "../../core/graph-data"
import type { VaultIndex } from "../../core/vault-index"
import { navigate } from "../../lib/router"
import { vaultRoute } from "../../lib/vault-notes"
import { DEFAULT_FORCES, GraphView, type GraphForces } from "./GraphView"

const KEY = "runas-codex:grafico"
const PALETTE = ["#ffa48e", "#9dcbb4", "#ecc484", "#bfadf1", "#7fc8f8", "#f4a3c8"]

interface Saved {
  filter: string
  showOrphans: boolean
  showAttachments: boolean
  showMissing: boolean
  groups: GraphGroup[]
  forces: GraphForces
}

const DEFAULTS: Saved = { filter: "", showOrphans: true, showAttachments: false, showMissing: false, groups: [], forces: DEFAULT_FORCES }

function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Saved>
    return { ...DEFAULTS, ...saved, forces: { ...DEFAULT_FORCES, ...saved.forces } }
  } catch {
    return DEFAULTS
  }
}

/** Gráfico global do espaço (ou do cofre), com os filtros, grupos de cor e forças do Obsidian. */
export function GraphPage({ index, root, version, onBroken }: { index: VaultIndex; root: string; version: number; onBroken(target: string): void }) {
  const [settings, setSettings] = useState<Saved>(load)
  const [panel, setPanel] = useState(() => window.innerWidth > 760)
  const [find, setFind] = useState("")
  const [focus, setFocus] = useState<string>()
  const [fit, setFit] = useState(0)
  const update = (patch: Partial<Saved>) => setSettings((current) => ({ ...current, ...patch }))
  const setForce = (patch: Partial<GraphForces>) => setSettings((current) => ({ ...current, forces: { ...current.forces, ...patch } }))

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* só não é lembrado */
    }
  }, [settings])

  const { filter, showOrphans, showAttachments, showMissing, groups, forces } = settings
  const data = useMemo(() => buildGraph(index, { root, filter, showOrphans, showAttachments, showMissing, groups }), [index, version, root, filter, showOrphans, showAttachments, showMissing, groups])

  const open = (node: GraphNode) => {
    if (node.kind === "missing") onBroken(node.path)
    else if (node.kind === "note" || node.kind === "portal") navigate(vaultRoute(node.path))
  }
  const findNode = () => {
    const q = find.trim().toLocaleLowerCase("pt-BR")
    if (!q) return setFocus(undefined)
    const hit = data.nodes.filter((n) => n.label.toLocaleLowerCase("pt-BR").includes(q)).sort((a, b) => b.degree - a.degree)[0]
    setFocus(hit?.id)
  }

  return (
    <div className="graph-page">
      <GraphView data={data} groups={groups} forces={forces} focus={focus} fitSignal={fit} onOpen={open} />
      <div className="graph-toolbar">
        <button className="icon-btn mobile-switch" onClick={() => navigate("/notas")} aria-label="Voltar para as notas">
          <ChevronLeft size={18} />
        </button>
        <span className="small faint">
          {data.nodes.length} nós · {data.edges.length} ligações
        </span>
        <button className="icon-btn" onClick={() => setFit((n) => n + 1)} title="Enquadrar tudo" aria-label="Enquadrar o gráfico">
          <Crosshair size={17} />
        </button>
        <button className={`icon-btn ${panel ? "active" : ""}`} onClick={() => setPanel(!panel)} title="Filtros, grupos e forças" aria-label="Configurar o gráfico">
          <SlidersHorizontal size={17} />
        </button>
      </div>
      {panel && (
        <aside className="graph-panel card">
          <span className="eyebrow">Filtros</span>
          <label className="search">
            <Search size={14} />
            <input className="input" placeholder="Busca (tag:, path:, file:…)" value={filter} onChange={(e) => update({ filter: e.target.value })} aria-label="Filtrar o gráfico" />
          </label>
          <form
            className="row"
            style={{ gap: 6 }}
            onSubmit={(event) => {
              event.preventDefault()
              findNode()
            }}
          >
            <input className="input grow" placeholder="Achar nota no gráfico" value={find} onChange={(e) => setFind(e.target.value)} aria-label="Achar nota no gráfico" />
            <button className="btn sm" type="submit">
              Achar
            </button>
          </form>
          <Toggle label="Notas órfãs" on={showOrphans} onChange={(v) => update({ showOrphans: v })} />
          <Toggle label="Anexos" on={showAttachments} onChange={(v) => update({ showAttachments: v })} />
          <Toggle label="Notas que não existem" on={showMissing} onChange={(v) => update({ showMissing: v })} />

          <span className="eyebrow" style={{ marginTop: 6 }}>
            Grupos de cor
          </span>
          {groups.map((group, i) => (
            <div key={i} className="row" style={{ gap: 6 }}>
              <input
                type="color"
                value={group.color}
                onChange={(e) => update({ groups: groups.map((g, j) => (j === i ? { ...g, color: e.target.value } : g)) })}
                aria-label={`Cor do grupo ${i + 1}`}
                className="graph-color"
              />
              <input className="input grow" value={group.query} placeholder="tag:#npc, path:Locais…" onChange={(e) => update({ groups: groups.map((g, j) => (j === i ? { ...g, query: e.target.value } : g)) })} aria-label={`Busca do grupo ${i + 1}`} />
              <button className="icon-btn sm" onClick={() => update({ groups: groups.filter((_, j) => j !== i) })} aria-label={`Remover grupo ${i + 1}`}>
                <X size={14} />
              </button>
            </div>
          ))}
          <button className="btn sm ghost" onClick={() => update({ groups: [...groups, { query: "", color: PALETTE[groups.length % PALETTE.length]! }] })}>
            <Plus size={14} /> Novo grupo
          </button>

          <span className="eyebrow" style={{ marginTop: 6 }}>
            Exibição e forças
          </span>
          <Toggle label="Setas de direção" on={forces.arrows} onChange={(v) => setForce({ arrows: v })} />
          <Slider label="Repulsão" min={20} max={600} step={10} value={forces.repulsion} onChange={(v) => setForce({ repulsion: v })} />
          <Slider label="Distância das ligações" min={10} max={250} step={5} value={forces.distance} onChange={(v) => setForce({ distance: v })} />
          <Slider label="Tamanho dos nós" min={0.5} max={3} step={0.1} value={forces.nodeSize} onChange={(v) => setForce({ nodeSize: v })} />
          <Slider label="Espessura das ligações" min={0.5} max={4} step={0.1} value={forces.linkWidth} onChange={(v) => setForce({ linkWidth: v })} />
          <button className="btn sm ghost" onClick={() => setSettings(DEFAULTS)}>
            Restaurar padrões
          </button>
          <span className="tiny faint">Losango = nota de outro espaço (portal). Círculo vazado = nota que ainda não existe.</span>
        </aside>
      )}
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange(value: boolean): void }) {
  return (
    <label className="check small">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  )
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange(value: number): void }) {
  return (
    <label className="field graph-slider">
      <span className="row between small">
        {label} <span className="faint mono">{value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
    </label>
  )
}
