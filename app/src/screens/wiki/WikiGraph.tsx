import { useMemo, useState } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import { ARTICLES, CATEGORIES } from "../../data/wiki"
import { ALL_NOTES, extractLinks, resolveLink } from "../../lib/links"
import { layoutForces, type GraphEdge } from "../../lib/graph"
import { navigate } from "../../lib/router"
import { routeOfNote } from "../../lib/navigation"
import { Switch } from "../../components/ui"

const W = 900
const H = 620

export function WikiGraph() {
  const [query, setQuery] = useState("")
  const [showBroken, setShowBroken] = useState(true)
  const [showPortals, setShowPortals] = useState(true)
  const [arrows, setArrows] = useState(true)
  const [hover, setHover] = useState<string | null>(null)
  const [panel, setPanel] = useState(true)

  const { nodes, edges } = useMemo(() => {
    const edges: GraphEdge[] = []
    const ghost = new Set<string>()
    const portals = new Set<string>()
    for (const note of ALL_NOTES) {
      for (const link of extractLinks(note.markdown)) {
        if (!link.target) continue
        const target = resolveLink(link.target, note.space)
        if (note.space === "wiki") {
          if (target && target.space === "wiki") edges.push({ source: note.id, target: target.id })
          else if (!target) {
            ghost.add(link.target)
            edges.push({ source: note.id, target: `ghost:${link.target}` })
          }
        } else if (target?.space === "wiki") {
          portals.add(note.id)
          edges.push({ source: `portal:${note.id}`, target: target.id })
        }
      }
    }
    const base = [
      ...ARTICLES.map((a) => ({ id: a.id, label: a.title, group: a.category, kind: "nota" as const })),
      ...[...ghost].map((g) => ({ id: `ghost:${g}`, label: g, group: "", kind: "inexistente" as const })),
      ...[...portals].map((p) => ({ id: `portal:${p}`, label: ALL_NOTES.find((n) => n.id === p)!.title, group: "", kind: "portal" as const })),
    ]
    return { nodes: layoutForces(base, edges, W, H), edges }
  }, [])

  const visible = nodes.filter((n) => (n.kind !== "inexistente" || showBroken) && (n.kind !== "portal" || showPortals))
  const ids = new Set(visible.map((n) => n.id))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const neighbors = new Set(hover ? edges.filter((e) => e.source === hover || e.target === hover).flatMap((e) => [e.source, e.target]) : [])
  const q = query.toLocaleLowerCase("pt-BR")
  const colorOf = (n: (typeof nodes)[number]) =>
    n.kind === "inexistente" ? "var(--red)" : n.kind === "portal" ? "var(--violet)" : CATEGORIES.find((c) => c.id === n.group)?.color ?? "var(--muted)"

  return (
    <div className="graph-screen">
      <svg className="graph-canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfico da wiki">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="var(--line-strong)" />
          </marker>
        </defs>
        {edges
          .filter((e) => ids.has(e.source) && ids.has(e.target))
          .map((e, i) => {
            const a = byId.get(e.source)!
            const b = byId.get(e.target)!
            const lit = hover && (e.source === hover || e.target === hover)
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={lit ? "var(--cyan)" : "var(--line-strong)"}
                strokeOpacity={hover && !lit ? 0.25 : 0.85}
                strokeDasharray={a.kind === "portal" || b.kind === "inexistente" ? "5 4" : undefined}
                markerEnd={arrows ? "url(#arrow)" : undefined}
              />
            )
          })}
        {visible.map((n) => {
          const dim = (hover && hover !== n.id && !neighbors.has(n.id)) || (q && !n.label.toLocaleLowerCase("pt-BR").includes(q))
          const real = ARTICLES.find((a) => a.id === n.id) ?? ALL_NOTES.find((x) => `portal:${x.id}` === n.id)
          return (
            <g
              key={n.id}
              transform={`translate(${n.x} ${n.y})`}
              opacity={dim ? 0.25 : 1}
              style={{ cursor: real ? "pointer" : "default" }}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => real && navigate(routeOfNote(real))}
            >
              <circle r={n.kind === "nota" ? 9 : 7} fill={n.kind === "nota" ? colorOf(n) : "var(--bg)"} stroke={colorOf(n)} strokeWidth={n.kind === "nota" ? 0 : 2} strokeDasharray={n.kind === "portal" ? "3 2" : undefined} />
              <text y={23} textAnchor="middle" fontSize={12} fill={n.kind === "inexistente" ? "var(--red)" : "var(--text)"} style={{ paintOrder: "stroke", stroke: "var(--bg-deep)", strokeWidth: 3 }}>
                {n.kind === "portal" ? `↗ ${n.label}` : n.label}
              </text>
            </g>
          )
        })}
      </svg>

      <button className="icon-btn graph-toggle" onClick={() => setPanel(!panel)} title="Filtros e grupos">
        <SlidersHorizontal size={18} />
      </button>

      {panel && (
        <aside className="graph-panel card stack">
          <label className="search">
            <Search size={15} />
            <input className="input" placeholder="Buscar no gráfico" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <span className="eyebrow">Filtros</span>
          <div className="row between small">
            Links inexistentes <Switch on={showBroken} onChange={setShowBroken} label="Links inexistentes" />
          </div>
          <div className="row between small">
            Notas de outros espaços <Switch on={showPortals} onChange={setShowPortals} label="Portais" />
          </div>
          <div className="row between small">
            Setas <Switch on={arrows} onChange={setArrows} label="Setas" />
          </div>
          <span className="eyebrow">Grupos (cor por consulta)</span>
          {CATEGORIES.filter((c) => ARTICLES.some((a) => a.category === c.id)).map((c) => (
            <span key={c.id} className="row small">
              <span className="dot" style={{ background: c.color }} />
              <span className="mono tiny">path:{c.id}</span>
            </span>
          ))}
          <span className="row small">
            <span className="dot" style={{ background: "var(--violet)" }} /> <span className="mono tiny">outros espaços (portais)</span>
          </span>
          <span className="eyebrow">Forças</span>
          {["Repulsão", "Distância dos links", "Tamanho dos nós"].map((label) => (
            <label key={label} className="field">
              <span>{label}</span>
              <input type="range" defaultValue={50} style={{ accentColor: "var(--cyan)" }} />
            </label>
          ))}
          <span className="tiny faint">Só a wiki aparece; notas de campanha e do bloco de notas entram como portais.</span>
        </aside>
      )}
    </div>
  )
}
