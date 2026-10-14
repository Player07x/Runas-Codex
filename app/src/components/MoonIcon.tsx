/**
 * Lua desenhada pela fração do ciclo (0 = cheia, 0,5 = nova).
 * Ilumina o lado direito na crescente e o esquerdo na minguante.
 */
export function MoonIcon({ fraction, color, size = 16 }: { fraction: number; color: string; size?: number }) {
  const r = size / 2 - 1
  const c = size / 2
  const lit = Math.cos(fraction * Math.PI * 2) // 1 cheia, -1 nova
  const waning = fraction < 0.5
  const k = Math.abs(lit) * r
  const sweepOuter = waning ? 0 : 1
  const sweepInner = lit > 0 ? (waning ? 0 : 1) : waning ? 1 : 0
  const d = `M${c},${c - r} A${r},${r} 0 0 ${sweepOuter} ${c},${c + r} A${k},${r} 0 0 ${sweepInner} ${c},${c - r} Z`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ flex: "0 0 auto" }}>
      <circle cx={c} cy={c} r={r} fill="var(--panel-2)" stroke={color} strokeOpacity={0.5} />
      {lit > -0.97 && <path d={d} fill={color} />}
    </svg>
  )
}
