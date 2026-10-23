import { useLayoutEffect, useState, type RefObject } from "react"

/**
 * Quantos itens de uma fileira (abas) cabem no espaço dela; os outros vão para um menu “Mais” (rework F4b, WIK-1).
 * `measure` é uma cópia invisível da fileira inteira, de onde sai a largura de cada item; `reserve` é a largura do
 * botão “Mais”. Refaz a conta quando o espaço muda (janela, painel, tamanho do texto). Sempre cabe pelo menos um.
 */
export function useFitCount(container: RefObject<HTMLElement | null>, measure: RefObject<HTMLElement | null>, total: number, reserve = 96): number {
  const [fit, setFit] = useState(total)
  useLayoutEffect(() => {
    const box = container.current, copy = measure.current
    if (!box || !copy) return
    const compute = () => {
      const widths = [...copy.children].map((child) => (child as HTMLElement).getBoundingClientRect().width)
      const available = box.clientWidth
      if (widths.reduce((sum, width) => sum + width, 0) <= available) return setFit(widths.length)
      let used = reserve, count = 0
      for (const width of widths) { if (used + width > available) break; used += width; count++ }
      setFit(Math.max(1, count))
    }
    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(box)
    observer.observe(copy)
    return () => observer.disconnect()
  }, [container, measure, total, reserve])
  return fit
}
