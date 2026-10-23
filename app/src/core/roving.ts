/**
 * Navegação por teclado em listas de opções (menus, abas, grades de uma linha): a tecla diz para qual item o foco vai.
 * Itens desativados são pulados; nas pontas, o foco dá a volta, como pedem os padrões de menu e abas da WAI-ARIA.
 */
export type RovingKey = "ArrowDown" | "ArrowUp" | "ArrowRight" | "ArrowLeft" | "Home" | "End"

export function nextIndex(key: string, current: number, disabled: readonly boolean[], orientation: "vertical" | "horizontal" = "vertical"): number | null {
  const total = disabled.length
  if (!total || disabled.every(Boolean)) return null
  const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight"
  const backward = orientation === "vertical" ? "ArrowUp" : "ArrowLeft"
  const step = (from: number, delta: number) => {
    for (let i = 1; i <= total; i++) {
      const at = (((from + delta * i) % total) + total) % total
      if (!disabled[at]) return at
    }
    return null
  }
  if (key === forward) return step(current, 1)
  if (key === backward) return step(current < 0 ? 0 : current, -1)
  if (key === "Home") return step(-1, 1)
  if (key === "End") return step(total, -1)
  return null
}
