import { useEffect, useState, type RefObject } from "react"

/**
 * Quantas colunas uma grade CSS tem agora (U28), lidas do próprio layout (`grid-template-columns` calculado), para o
 * “Mostrar mais” fechar fileiras inteiras. `min` só serve de estimativa quando o navegador não informa as colunas;
 * `watch` refaz a medida quando a grade é trocada (outro modo ou tamanho).
 */
export function useGridColumns(ref: RefObject<HTMLElement | null>, min = 240, watch?: unknown): number {
  const [columns, setColumns] = useState(1)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === "undefined") return
    const update = () => {
      const tracks = getComputedStyle(element).gridTemplateColumns.split(" ").filter((t) => t && t !== "none").length
      setColumns(Math.max(1, tracks || Math.floor((element.clientWidth + 8) / (min + 8))))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, min, watch])
  return columns
}
