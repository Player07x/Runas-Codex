/**
 * Rolador do protótipo: `XdY`, `+/-N`, `khN`/`klN` (manter maiores/menores), `!` (explosivo), `d%`, `dF` (Fate).
 * Ex.: "2d6+3", "4d6kh3", "1d20+5", "3d6!", "4dF".
 */
export interface DiceResult {
  notation: string
  total: number
  detail: string
}

const TERM = /([+-]?)(\d*)d(\d+|%|F)(kh\d+|kl\d+)?(!)?|([+-]?\d+)/gi

export function roll(notation: string, random: () => number = Math.random): DiceResult {
  const clean = notation.replace(/\s+/g, "")
  if (!/^[+-]?(\d*d(\d+|%|F)(kh\d+|kl\d+)?!?|\d+)([+-](\d*d(\d+|%|F)(kh\d+|kl\d+)?!?|\d+))*$/i.test(clean)) {
    throw new Error(`Notação inválida: ${notation}`)
  }
  let total = 0
  const parts: string[] = []
  for (const match of clean.matchAll(TERM)) {
    if (match[6]) {
      const value = Number(match[6])
      total += value
      parts.push(value >= 0 && parts.length ? `+ ${value}` : `${value < 0 ? "- " : ""}${Math.abs(value)}`)
      continue
    }
    const sign = match[1] === "-" ? -1 : 1
    const count = Math.min(100, Number(match[2] || 1))
    const facesRaw = match[3].toUpperCase()
    const fate = facesRaw === "F"
    const faces = facesRaw === "%" ? 100 : fate ? 3 : Number(facesRaw)
    const rolls: number[] = []
    for (let i = 0; i < count; i += 1) {
      let value = 1 + Math.floor(random() * faces)
      if (fate) value -= 2
      rolls.push(value)
      while (match[5] && !fate && value === faces && rolls.length < 200) {
        value = 1 + Math.floor(random() * faces)
        rolls.push(value)
      }
    }
    let kept = rolls
    const keep = match[4]?.toLowerCase()
    if (keep) {
      const n = Number(keep.slice(2))
      const sorted = [...rolls].sort((a, b) => (keep.startsWith("kh") ? b - a : a - b))
      kept = sorted.slice(0, n)
    }
    const sum = kept.reduce((a, b) => a + b, 0)
    total += sign * sum
    const shown = fate ? rolls.map((v) => (v > 0 ? "+" : v < 0 ? "−" : "0")).join(" ") : rolls.join(", ")
    parts.push(`${parts.length ? (sign < 0 ? "- " : "+ ") : sign < 0 ? "- " : ""}[${shown}]${keep ? ` ${keep}` : ""}`)
  }
  return { notation, total, detail: parts.join(" ") }
}
