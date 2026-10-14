import { useState } from "react"
import { GitFork, Network, Users } from "lucide-react"
import { href } from "../../lib/router"
import { Segmented } from "../../components/ui"

type View = "familia" | "diplomacia" | "organograma"

const FACTIONS = [
  { id: "ordem", label: "Ordem da Chama", x: 200, y: 110, color: "var(--cyan)" },
  { id: "condado", label: "Condado de Valdris", x: 520, y: 110, color: "var(--green)" },
  { id: "contrabando", label: "Contrabandistas", x: 140, y: 330, color: "var(--gold)" },
  { id: "culto", label: "Culto do Reflexo", x: 580, y: 330, color: "var(--violet)" },
]

const TIES = [
  { a: "ordem", b: "condado", kind: "tensa", label: "dívida" },
  { a: "condado", b: "contrabando", kind: "guerra", label: "repressão" },
  { a: "ordem", b: "culto", kind: "guerra", label: "heresia" },
  { a: "contrabando", b: "culto", kind: "alianca", label: "rotas" },
  { a: "ordem", b: "contrabando", kind: "neutra", label: "suborno" },
]

const TIE_COLORS: Record<string, string> = { alianca: "var(--green)", guerra: "var(--red)", tensa: "var(--gold)", neutra: "var(--muted)" }

export function WikiRelations() {
  const [view, setView] = useState<View>("familia")
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="eyebrow">Relações tipadas entre artigos</span>
          <h1 className="page-title">Relações</h1>
        </div>
        <Segmented<View>
          label="Tipo"
          value={view}
          onChange={setView}
          options={[
            { value: "familia", label: "Árvore genealógica", icon: <GitFork size={14} /> },
            { value: "diplomacia", label: "Teia diplomática", icon: <Network size={14} /> },
            { value: "organograma", label: "Organograma", icon: <Users size={14} /> },
          ]}
        />
      </div>

      <div className="card flat" style={{ padding: 0, overflow: "auto" }}>
        {view === "familia" && (
          <svg viewBox="0 0 800 400" className="relations-svg" role="img" aria-label="Árvore genealógica da Casa Ormund">
            <Person x={300} y={50} name="Lorde Ademar Ormund" sub="3940 – 3998" />
            <Person x={520} y={50} name="Lady Helena" sub="3945 – 4001" />
            <path d="M380 50 H440" stroke="var(--gold)" strokeWidth="2" />
            <path d="M410 50 V130 M170 130 H650 M170 130 V170 M650 130 V170" stroke="var(--line-strong)" strokeWidth="2" fill="none" />
            <Person x={170} y={195} name="Conde Ormund" sub="63 anos (calculado)" to="conde-ormund" />
            <Person x={650} y={195} name="Irmã Celeste" sub="morta em Myrr" />
            <Person x={420} y={195} name="Mara Vael" sub="ferreira" />
            <path d="M250 195 H340" stroke="var(--violet)" strokeWidth="2" strokeDasharray="5 4" />
            <text x="295" y="187" textAnchor="middle" fontSize="11" fill="var(--violet)">segredo</text>
            <path d="M295 195 V300" stroke="var(--violet)" strokeWidth="2" strokeDasharray="5 4" />
            <Person x={295} y={325} name="Aldren Vael" sub="32 anos (calculado)" to="aldren-vael" secret />
          </svg>
        )}

        {view === "diplomacia" && (
          <svg viewBox="0 0 760 440" className="relations-svg" role="img" aria-label="Teia diplomática">
            {TIES.map((t) => {
              const a = FACTIONS.find((f) => f.id === t.a)!
              const b = FACTIONS.find((f) => f.id === t.b)!
              return (
                <g key={t.a + t.b}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={TIE_COLORS[t.kind]} strokeWidth={t.kind === "guerra" ? 3 : 2} strokeDasharray={t.kind === "tensa" ? "8 6" : undefined} />
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 6} textAnchor="middle" fontSize="12" fill={TIE_COLORS[t.kind]} style={{ paintOrder: "stroke", stroke: "var(--panel)", strokeWidth: 4 }}>
                    {t.label}
                  </text>
                </g>
              )
            })}
            {FACTIONS.map((f) => (
              <g key={f.id} transform={`translate(${f.x} ${f.y})`}>
                <circle r="44" fill="var(--panel-2)" stroke={f.color} strokeWidth="3" />
                <text textAnchor="middle" y="4" fontSize="12" fontWeight="700" fill="var(--text)">{f.label}</text>
              </g>
            ))}
          </svg>
        )}

        {view === "organograma" && (
          <svg viewBox="0 0 760 340" className="relations-svg" role="img" aria-label="Organograma da Ordem">
            <Person x={380} y={50} name="Grão-mestre Ilário" sub="a escrever" />
            <path d="M380 75 V120 M180 120 H580 M180 120 V150 M380 120 V150 M580 120 V150" stroke="var(--line-strong)" strokeWidth="2" fill="none" />
            <Person x={180} y={175} name="Mestres-ferreiros" sub="relíquias" />
            <Person x={380} y={175} name="Cavaleiros" sub="patrulha" />
            <Person x={580} y={175} name="Alquimistas" sub="segredo: os lobos" secret />
            <path d="M380 200 V250" stroke="var(--line-strong)" strokeWidth="2" />
            <Person x={380} y={275} name="Escudeiros" sub="Aldren começou aqui" to="aldren-vael" />
          </svg>
        )}
      </div>
      <p className="tiny faint">As relações ficam nas propriedades das notas (ex.: `pai: "[[Conde Ormund]]"`), então o Obsidian também as vê.</p>
    </div>
  )
}

function Person({ x, y, name, sub, to, secret }: { x: number; y: number; name: string; sub: string; to?: string; secret?: boolean }) {
  const body = (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-80" y="-25" width="160" height="50" rx="10" fill="var(--panel-2)" stroke={secret ? "var(--violet)" : to ? "var(--gold)" : "var(--line-strong)"} strokeWidth="1.5" strokeDasharray={secret ? "5 4" : undefined} />
      <text textAnchor="middle" y="-3" fontSize="13" fontWeight="700" fill="var(--text)">{name}</text>
      <text textAnchor="middle" y="15" fontSize="11" fill="var(--muted)">{sub}</text>
    </g>
  )
  return to ? <a href={href(`/wiki/artigo/${to}`)}>{body}</a> : body
}
