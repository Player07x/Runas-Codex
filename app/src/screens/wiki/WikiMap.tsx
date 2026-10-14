import { useState } from "react"
import { ChevronRight, Compass, Layers, MapPin, Ruler, Shield, Skull, Castle, Eye } from "lucide-react"
import { ARTICLES } from "../../data/wiki"
import { href } from "../../lib/router"
import { Switch } from "../../components/ui"

type LayerId = "locais" | "perigos" | "rotas" | "segredos"

const PINS = [
  { id: "valdris", x: 520, y: 330, layer: "locais" as LayerId, icon: <Castle size={16} />, nested: true },
  { id: "lago-espelhado", x: 470, y: 150, layer: "locais" as LayerId, icon: <MapPin size={16} /> },
  { id: "ordem-chama-cinzenta", x: 610, y: 235, layer: "locais" as LayerId, icon: <Shield size={16} /> },
  { id: "lobo-de-cinzas", x: 300, y: 420, layer: "perigos" as LayerId, icon: <Skull size={16} /> },
  { id: "queda-de-myrr", x: 230, y: 250, layer: "perigos" as LayerId, icon: <Skull size={16} /> },
]

export function WikiMap() {
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({ locais: true, perigos: true, rotas: true, segredos: false })
  const [selected, setSelected] = useState<string | null>("valdris")
  const [measure, setMeasure] = useState(false)
  const article = ARTICLES.find((a) => a.id === selected)
  const pin = PINS.find((p) => p.id === selected)

  return (
    <div className="map-screen">
      <div className="map-toolbar">
        <div className="crumbs small">
          <a href={href("/wiki/mapa")}>Mundo</a>
          <ChevronRight size={13} />
          <strong>Condado de Valdris</strong>
        </div>
        <span className="grow" />
        <button className={`btn sm ${measure ? "primary" : ""}`} onClick={() => setMeasure(!measure)}>
          <Ruler size={14} /> Régua
        </button>
      </div>
      <div className="map-body">
        <svg className="map-canvas" viewBox="0 0 800 560" role="img" aria-label="Mapa do Condado de Valdris">
          <defs>
            <pattern id="paper" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="var(--line)" strokeOpacity="0.25" />
            </pattern>
            <radialGradient id="ash" cx="30%" cy="45%" r="35%">
              <stop offset="0" stopColor="var(--red)" stopOpacity="0.35" />
              <stop offset="1" stopColor="var(--red)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="560" fill="var(--bg-deep)" />
          <rect width="800" height="560" fill="url(#paper)" />
          <path d="M80 120 C 160 40, 380 30, 520 70 S 760 90, 740 260 S 700 500, 520 520 S 140 520, 90 400 S 20 200, 80 120 Z" style={{ fill: "color-mix(in srgb, var(--panel-2) 85%, var(--green))" }} stroke="var(--line-strong)" strokeWidth="2" />
          <ellipse cx="470" cy="150" rx="80" ry="42" style={{ fill: "color-mix(in srgb, var(--cyan) 30%, var(--bg))" }} stroke="var(--cyan-dim)" />
          <path d="M470 192 C 480 250, 500 290, 520 330 S 560 430, 600 520" fill="none" style={{ stroke: "color-mix(in srgb, var(--cyan) 55%, var(--bg))" }} strokeWidth="5" strokeLinecap="round" />
          {Array.from({ length: 9 }, (_, i) => (
            <path key={i} d={`M${120 + i * 26} ${210 - (i % 3) * 14} l14 -26 l14 26 Z`} fill="var(--panel-hover)" stroke="var(--line-strong)" />
          ))}
          <circle cx="230" cy="250" r="120" fill="url(#ash)" />
          {layers.rotas && (
            <path d="M300 420 C 380 400, 450 360, 520 330 C 560 300, 590 260, 610 235 M520 330 C 500 260, 480 220, 470 192" fill="none" stroke="var(--gold)" strokeWidth="2.5" strokeDasharray="8 6" />
          )}
          {layers.segredos && (
            <g>
              <circle cx="660" cy="180" r="26" fill="none" stroke="var(--violet)" strokeDasharray="4 4" />
              <text x="660" y="225" textAnchor="middle" fontSize="13" fill="var(--violet)">Torre de Vesper (segredo)</text>
            </g>
          )}
          {measure && (
            <g>
              <line x1="520" y1="330" x2="470" y2="150" stroke="var(--cyan)" strokeWidth="2" strokeDasharray="6 4" />
              <rect x="510" y="225" width="132" height="26" rx="6" fill="var(--panel)" stroke="var(--cyan-dim)" />
              <text x="576" y="243" textAnchor="middle" fontSize="13" fill="var(--text)">18 km · ≈ 4 h a pé</text>
            </g>
          )}
          {PINS.filter((p) => layers[p.layer]).map((p) => {
            const a = ARTICLES.find((x) => x.id === p.id)!
            return (
              <g key={p.id} className={`map-pin ${selected === p.id ? "active" : ""}`} transform={`translate(${p.x} ${p.y})`} onClick={() => setSelected(p.id)}>
                <circle r="15" fill={p.layer === "perigos" ? "var(--red)" : "var(--panel)"} stroke={p.layer === "perigos" ? "var(--red)" : "var(--gold)"} strokeWidth="2" />
                <foreignObject x="-8" y="-8" width="16" height="16" style={{ color: p.layer === "perigos" ? "#fff" : "var(--gold)", pointerEvents: "none" }}>
                  {p.icon}
                </foreignObject>
                <text y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" style={{ paintOrder: "stroke", stroke: "var(--bg-deep)", strokeWidth: 3 }}>
                  {a.title}
                </text>
              </g>
            )
          })}
          <g transform="translate(40 500)">
            <rect width="120" height="6" fill="var(--text)" />
            <rect width="60" height="6" fill="var(--bg)" stroke="var(--text)" />
            <text y="22" fontSize="11" fill="var(--muted)">0</text>
            <text x="112" y="22" fontSize="11" fill="var(--muted)">20 km</text>
          </g>
        </svg>
        <div className="map-compass" aria-hidden="true">
          <Compass size={34} />
        </div>

        <aside className="map-panel stack">
          <div className="card tight stack">
            <span className="section-title row">
              <Layers size={15} /> Camadas
            </span>
            {(
              [
                ["locais", "Locais"],
                ["perigos", "Perigos"],
                ["rotas", "Rotas"],
                ["segredos", "Segredos do mestre"],
              ] as [LayerId, string][]
            ).map(([id, label]) => (
              <div key={id} className="row between small">
                <span className="row">
                  {id === "segredos" && <Eye size={14} color="var(--violet)" />}
                  {label}
                </span>
                <Switch on={layers[id]} label={label} onChange={(v) => setLayers({ ...layers, [id]: v })} />
              </div>
            ))}
          </div>
          {article && (
            <div className="card tight stack">
              <span className="chip">{article.category}</span>
              <strong className="display" style={{ fontSize: 16 }}>{article.title}</strong>
              <p className="muted small">{article.summary}</p>
              <div className="row-wrap">
                <a className="btn sm primary" href={href(`/wiki/artigo/${article.id}`)}>Abrir artigo</a>
                {pin?.nested && <button className="btn sm">Entrar no mapa da cidade</button>}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
