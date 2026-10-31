import { barColor } from "./log"
import { isAlly, type BarVisibility, type TokenBar, type TokenData, type TokenDisposition } from "./scene"
import type { PlayerBarVisibility } from "./ipc"
import type { PlayerProjection } from "./player"

/** As três barras de sempre, oferecidas mesmo numa mesa que ainda não usou nenhuma. */
const DEFAULT_TEMPLATES: TokenBar[] = [
  { label: "PV", value: 10, max: 10, color: barColor("PV") },
  { label: "PA", value: 10, max: 10, color: barColor("PA") },
  { label: "PE", value: 10, max: 10, color: barColor("PE") },
]

const fold = (label: string) => label.trim().toLocaleLowerCase("pt-BR")

/**
 * Modelos de barra da mesa (U12): cada nome já usado num token desta mesa (com a cor, o máximo e a visibilidade da
 * primeira vez que aparece), mais PV, PA e PE. Criar “Sanidade” num token já a oferece em todos os outros.
 */
export function barTemplates(tokens: readonly TokenData[]): TokenBar[] {
  const seen = new Map<string, TokenBar>()
  for (const bar of [...tokens.flatMap((token) => token.bars), ...DEFAULT_TEMPLATES]) {
    const key = fold(bar.label)
    if (key && !seen.has(key)) seen.set(key, { ...bar, value: bar.max })
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
}

/** Acrescenta a barra no fim, cheia; um token não fica com duas barras do mesmo nome. */
export function addBar(bars: readonly TokenBar[], template: TokenBar): TokenBar[] {
  if (bars.some((bar) => fold(bar.label) === fold(template.label))) return [...bars]
  return [...bars, { ...template, value: template.max }]
}

/** Nome livre para uma barra nova (“Barra”, “Barra 2”…). */
export function newBarLabel(bars: readonly TokenBar[]): string {
  for (let n = 1; ; n++) {
    const label = n === 1 ? "Barra" : `Barra ${n}`
    if (!bars.some((bar) => fold(bar.label) === fold(label))) return label
  }
}

/** Sobe (-1) ou desce (+1) uma barra; a de cima é desenhada mais perto do token. */
export function moveBar(bars: readonly TokenBar[], index: number, delta: -1 | 1): TokenBar[] {
  const target = index + delta
  if (index < 0 || index >= bars.length || target < 0 || target >= bars.length) return [...bars]
  const next = [...bars]
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

/**
 * Quais barras de um token saem para a sala. `padrao` segue a escolha da sala (só em aliados, todos ou nenhuma);
 * `mestre` nunca sai; `todos` sai em qualquer token (menos com a sala em “Nenhuma”); `dono` sai só se o token tem
 * dono, e `projectionForSeat` a entrega apenas ao assento dele.
 */
export function playerBars(bars: readonly TokenBar[], room: PlayerBarVisibility, disposition: TokenDisposition, owner: string | undefined): TokenBar[] {
  if (room === "none") return []
  const byRoom = room === "all" || isAlly(disposition)
  return bars.filter((bar) => {
    const visibility: BarVisibility = bar.visibility ?? "padrao"
    if (visibility === "mestre") return false
    if (visibility === "todos") return true
    if (visibility === "dono") return Boolean(owner)
    return byRoom
  }).map((bar) => ({ ...bar }))
}

type Child = PlayerProjection["children"][number]
const hasOwnerBars = (child: Child) => child.type === "token" && child.data.bars.some((bar) => bar.visibility === "dono")

export function childrenHaveOwnerBars(children: readonly Child[]): boolean {
  return children.some(hasOwnerBars)
}

/** Os objetos que um assento recebe: barras “só do dono” ficam só no token daquele jogador (espectadores não as veem). */
export function childrenForSeat(children: Child[], slotId: string | null | undefined): Child[] {
  if (!childrenHaveOwnerBars(children)) return children
  return children.map((child) => {
    if (child.type !== "token" || !hasOwnerBars(child)) return child
    const mine = Boolean(slotId) && child.data.playerSlotId === slotId
    return { ...child, data: { ...child.data, bars: child.data.bars.filter((bar) => bar.visibility !== "dono" || mine) } }
  })
}

export function projectionForSeat(projection: PlayerProjection, slotId: string | null | undefined): PlayerProjection {
  return childrenHaveOwnerBars(projection.children) ? { ...projection, children: childrenForSeat(projection.children, slotId) } : projection
}
