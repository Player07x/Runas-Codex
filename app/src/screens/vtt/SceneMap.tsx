import type { Scene, Token } from "../../data/types"

export type Tool = "selecionar" | "regua" | "template" | "nevoa" | "paredes" | "luz" | "desenho" | "nota" | "ping"

const CELL = 40

/** Planta dos esgotos: salas (células) e paredes. Desenho fixo do protótipo; no app vem da cena. */
const ROOMS = [
  { x: 1, y: 7, w: 9, h: 6 },
  { x: 10, y: 9, w: 3, h: 2 },
  { x: 12, y: 3, w: 9, h: 8 },
  { x: 15, y: 11, w: 2, h: 4 },
  { x: 13, y: 13, w: 8, h: 2 },
]
const WATER = { x: 1, y: 10, w: 9, h: 1 }
const DOORS = [{ x: 10, y: 9.5, vertical: true }, { x: 12, y: 9.5, vertical: true }]

interface Props {
  scene: Scene
  mode: "gm" | "player"
  selected?: string | null
  active?: string
  onSelect?: (token: Token | null) => void
  tool?: Tool
  playerId?: string
}

export function SceneMap({ scene, mode, selected, active, onSelect, tool = "selecionar", playerId }: Props) {
  const width = scene.cols * CELL
  const height = scene.rows * CELL
  const players = scene.tokens.filter((t) => t.kind === "jogador" || t.kind === "aliado")
  const visibleTokens = scene.tokens.filter((t) => mode === "gm" || !t.hidden)
  const ilsa = scene.tokens.find((t) => t.id === "t-ilsa")!
  const wolf = scene.tokens.find((t) => t.id === "t-lobo1")!
  const c = (v: number, size = 1) => v * CELL + (size * CELL) / 2

  return (
    <svg className="scene-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Cena ${scene.name}`} onClick={() => onSelect?.(null)}>
      <defs>
        <pattern id="stone" width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" fill="#3a332e" />
          <path d="M0 20H40M20 0V20M10 20V40M30 20V40" stroke="#2b2522" strokeWidth="2" />
        </pattern>
        <pattern id="water" width="16" height="8" patternUnits="userSpaceOnUse">
          <rect width="16" height="8" fill="#23423f" />
          <path d="M0 4 Q4 0 8 4 T16 4" fill="none" stroke="#3d6b66" strokeWidth="1.5" />
        </pattern>
        <radialGradient id="ember" r="0.5">
          <stop offset="0" stopColor="#ff7a3c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff7a3c" stopOpacity="0" />
        </radialGradient>
        <mask id="vision">
          <rect width={width} height={height} fill="white" />
          {players.map((t) => (
            <circle key={t.id} cx={c(t.x)} cy={c(t.y)} r={CELL * 4.5} fill="black" />
          ))}
        </mask>
        <mask id="explored">
          <rect width={width} height={height} fill="white" />
          <rect x={CELL} y={CELL * 7} width={CELL * 12} height={CELL * 6} fill="black" />
        </mask>
      </defs>

      <rect width={width} height={height} fill="#0b0909" />
      {ROOMS.map((r, i) => (
        <rect key={i} x={r.x * CELL} y={r.y * CELL} width={r.w * CELL} height={r.h * CELL} fill="url(#stone)" />
      ))}
      <rect x={WATER.x * CELL} y={WATER.y * CELL} width={WATER.w * CELL} height={WATER.h * CELL} fill="url(#water)" />
      <circle cx={c(16)} cy={c(6)} r={CELL * 3} fill="url(#ember)" />
      {ROOMS.map((r, i) => (
        <rect key={`w${i}`} x={r.x * CELL} y={r.y * CELL} width={r.w * CELL} height={r.h * CELL} fill="none" stroke="#120e0d" strokeWidth="6" />
      ))}
      {DOORS.map((d, i) => (
        <rect key={i} x={d.x * CELL - 5} y={d.y * CELL - 14} width="10" height="28" rx="2" fill="#8a5a2b" stroke="#2b1a0c" strokeWidth="2" />
      ))}

      {scene.grid !== "nenhuma" && (
        <g opacity="0.22">
          {Array.from({ length: scene.cols + 1 }, (_, i) => (
            <line key={`v${i}`} x1={i * CELL} y1={0} x2={i * CELL} y2={height} stroke="#d8cfc8" strokeWidth="1" />
          ))}
          {Array.from({ length: scene.rows + 1 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={i * CELL} x2={width} y2={i * CELL} stroke="#d8cfc8" strokeWidth="1" />
          ))}
        </g>
      )}

      {mode === "gm" && (
        <g>
          <line x1={12 * CELL} y1={3 * CELL} x2={21 * CELL} y2={3 * CELL} stroke="var(--cyan)" strokeWidth="3" opacity="0.6" />
          <circle cx={c(16)} cy={c(6)} r="7" fill="#ffb15c" stroke="#5a2a0a" strokeWidth="2" />
        </g>
      )}

      {tool === "template" && (
        <path d={`M${c(ilsa.x)} ${c(ilsa.y)} L ${c(wolf.x) + 40} ${c(wolf.y) - 90} A 200 200 0 0 1 ${c(wolf.x) + 60} ${c(wolf.y) + 70} Z`} fill="rgb(199 101 97 / 28%)" stroke="var(--red)" strokeWidth="2" />
      )}
      {tool === "regua" && (
        <g>
          <line x1={c(ilsa.x)} y1={c(ilsa.y)} x2={c(wolf.x)} y2={c(wolf.y)} stroke="var(--cyan)" strokeWidth="3" strokeDasharray="10 6" />
          <rect x={(c(ilsa.x) + c(wolf.x)) / 2 - 36} y={(c(ilsa.y) + c(wolf.y)) / 2 - 16} width="72" height="28" rx="7" fill="var(--panel)" stroke="var(--cyan-dim)" />
          <text x={(c(ilsa.x) + c(wolf.x)) / 2} y={(c(ilsa.y) + c(wolf.y)) / 2 + 4} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">12 m</text>
        </g>
      )}

      {visibleTokens.map((t) => {
        const isSelected = selected === t.id
        const ring = t.kind === "hostil" ? "#c76561" : t.kind === "aliado" ? "#86a47f" : t.kind === "neutro" ? "#b99b65" : "#82aaa6"
        const r = (CELL * t.size) / 2 - 3
        const mine = playerId && t.owner === playerId
        return (
          <g
            key={t.id}
            transform={`translate(${c(t.x, t.size)} ${c(t.y, t.size)})`}
            opacity={t.hidden ? 0.45 : 1}
            style={{ cursor: "pointer" }}
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(t)
            }}
          >
            {active === t.id && <circle r={r + 8} fill="none" stroke="var(--gold)" strokeWidth="3" strokeDasharray="6 4" />}
            {(isSelected || mine) && <circle r={r + 5} fill="none" stroke={mine ? "var(--gold)" : "var(--cyan)"} strokeWidth="3" />}
            <circle r={r} fill={t.color} stroke={ring} strokeWidth="3" />
            <text textAnchor="middle" y={t.size > 1 ? 9 : 6} fontSize={t.size > 1 ? 26 : 16} fontWeight="800" fill="#120d0d">
              {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </text>
            {t.hp && (mode === "gm" || t.kind !== "hostil") && (
              <g transform={`translate(${-r} ${r + 4})`}>
                <rect width={r * 2} height="5" rx="2" fill="#2a1d1d" />
                <rect width={(r * 2 * t.hp[0]) / t.hp[1]} height="5" rx="2" fill={t.hp[0] / t.hp[1] < 0.5 ? "#c76561" : "#86a47f"} />
              </g>
            )}
            {t.conditions?.map((cond, i) => (
              <g key={cond} transform={`translate(${r - 4 - i * 14} ${-r + 2})`}>
                <circle r="7" fill={cond === "envenenado" ? "#4c8a3f" : cond === "caído" ? "#8b2a22" : "#b99b65"} stroke="#120d0d" strokeWidth="1.5" />
                <text textAnchor="middle" y="3.5" fontSize="9" fontWeight="800" fill="#fff">{cond[0].toUpperCase()}</text>
              </g>
            ))}
          </g>
        )
      })}

      <g className="ping" transform={`translate(${c(13)} ${c(6)})`} pointerEvents="none">
        <circle r="10" fill="none" stroke="var(--gold)" strokeWidth="3" />
        <circle r="10" fill="none" stroke="var(--gold)" strokeWidth="2" className="ping-wave" />
      </g>

      {mode === "player" ? (
        <rect width={width} height={height} fill="#050404" mask="url(#vision)" opacity="0.94" pointerEvents="none" />
      ) : (
        <g mask="url(#vision)" pointerEvents="none">
          <rect width={width} height={height} fill="#050404" opacity="0.35" mask="url(#explored)" />
        </g>
      )}
    </svg>
  )
}
