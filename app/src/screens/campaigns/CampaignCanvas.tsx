import { FileText, Image, StickyNote, Type } from "lucide-react"
import { href } from "../../lib/router"
import { useProtoAction } from "../../components/ui"

/** Quadro em formato JSON Canvas (.canvas): o mesmo arquivo abre no Obsidian. */
const NODES = [
  { id: "g1", type: "group", x: 20, y: 20, w: 560, h: 300, label: "Ato 2 — A carta" },
  { id: "n1", type: "file", x: 50, y: 70, w: 200, h: 90, label: "Aldren Vael", to: "/wiki/artigo/aldren-vael", text: "Wikis/Ordem x Caos/Personagens/Aldren Vael.md" },
  { id: "n2", type: "text", x: 330, y: 70, w: 210, h: 90, label: "A carta selada", text: "Pede a execução de Aldren. Quem a escreveu?" },
  { id: "n3", type: "file", x: 50, y: 200, w: 200, h: 90, label: "Conde Ormund", to: "/wiki/artigo/conde-ormund", text: "Wikis/Ordem x Caos/Personagens/Conde Ormund.md" },
  { id: "n4", type: "text", x: 330, y: 200, w: 210, h: 90, label: "Escolha do grupo", text: "Entregar a carta, queimar ou mostrar ao Aldren." },
  { id: "n5", type: "text", x: 640, y: 60, w: 220, h: 110, label: "Final A", text: "Aldren foge para a Torre de Vesper." },
  { id: "n6", type: "text", x: 640, y: 210, w: 220, h: 110, label: "Final B", text: "O Conde ganha a Ordem como aliada." },
  { id: "n7", type: "image", x: 300, y: 370, w: 240, h: 130, label: "mapa-cidade-alta.png", text: "" },
]
const EDGES = [
  ["n1", "n2", "é alvo de"],
  ["n3", "n2", "escreveu?"],
  ["n2", "n4", ""],
  ["n4", "n5", "queimar"],
  ["n4", "n6", "entregar"],
]

export function CampaignCanvas() {
  const proto = useProtoAction()
  const center = (id: string) => {
    const n = NODES.find((x) => x.id === id)!
    return [n.x + n.w / 2, n.y + n.h / 2]
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow mono">Campanhas/As Cinzas de Valdris/Quadro.canvas</span>
          <h1 className="page-title">Quadro da campanha</h1>
        </div>
        <div className="row-wrap">
          <button className="btn sm" onClick={proto("adicionar cartão de texto")}>
            <Type size={14} /> Texto
          </button>
          <button className="btn sm" onClick={proto("adicionar nota existente")}>
            <FileText size={14} /> Nota
          </button>
          <button className="btn sm" onClick={proto("adicionar imagem")}>
            <Image size={14} /> Imagem
          </button>
          <button className="btn sm" onClick={proto("adicionar grupo")}>
            <StickyNote size={14} /> Grupo
          </button>
        </div>
      </div>
      <div className="canvas-board">
        <div className="canvas-inner">
          <svg className="canvas-edges" width="900" height="520">
            <defs>
              <marker id="carrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
              </marker>
            </defs>
            {EDGES.map(([a, b, label]) => {
              const [x1, y1] = center(a)
              const [x2, y2] = center(b)
              const na = NODES.find((n) => n.id === a)!
              const nb = NODES.find((n) => n.id === b)!
              const sx = x2 > x1 ? na.x + na.w : na.x
              const ex = x2 > x1 ? nb.x : nb.x + nb.w
              const horizontal = Math.abs(x2 - x1) > 40
              const p = horizontal ? `M${sx} ${y1} C ${(sx + ex) / 2} ${y1}, ${(sx + ex) / 2} ${y2}, ${ex} ${y2}` : `M${x1} ${na.y + na.h} L${x2} ${nb.y}`
              return (
                <g key={a + b}>
                  <path d={p} fill="none" stroke="var(--muted)" strokeWidth="1.6" markerEnd="url(#carrow)" />
                  {label && (
                    <text x={(sx + ex) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="11" fill="var(--muted)" style={{ paintOrder: "stroke", stroke: "var(--bg)", strokeWidth: 4 }}>
                      {label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          {NODES.map((n) =>
            n.type === "group" ? (
              <div key={n.id} className="canvas-group" style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
                <span>{n.label}</span>
              </div>
            ) : (
              <div key={n.id} className={`canvas-node ${n.type}`} style={{ left: n.x, top: n.y, width: n.w, height: n.h }}>
                <strong className="small row">
                  {n.type === "file" && <FileText size={13} color="var(--cyan)" />}
                  {n.type === "image" && <Image size={13} color="var(--gold)" />}
                  {n.to ? <a href={href(n.to)} className="wikilink">{n.label}</a> : n.label}
                </strong>
                {n.text && <span className={`tiny ${n.type === "file" ? "mono faint" : "muted"}`}>{n.text}</span>}
              </div>
            ),
          )}
        </div>
      </div>
      <span className="tiny faint">Substitui o Organizador do Runas DM e agora salva em `.canvas`, que o Obsidian abre do mesmo jeito.</span>
    </div>
  )
}
