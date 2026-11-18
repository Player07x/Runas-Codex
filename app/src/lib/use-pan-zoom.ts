import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react"
import { centerOn, fitView, initialView, panBy, reveal, zoomAt, type Size, type View } from "../core/pan-zoom"

type Box = { x: number; y: number; w: number; h: number }

/**
 * Desenho que se move livre dentro de uma região (U117): arrastar (mouse ou dedo) move para qualquer lado, a pinça e
 * Ctrl + roda aproximam no ponto, a roda sozinha desloca. A região não rola: se o navegador rolar para mostrar um nó que
 * recebeu o foco (Tab), a rolagem vira deslocamento da câmera. `ignore` diz onde o arrasto não começa na hora (cartões,
 * botões); mudar `resetKey` (a pessoa do centro da árvore) enquadra de novo.
 */
export function usePanZoom(region: RefObject<HTMLDivElement | null>, drawing: Size, ignore = "button, a, input", resetKey = "") {
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 })
  const [ready, setReady] = useState(false)
  const size = useRef<Size>({ width: 0, height: 0 })
  const drawingRef = useRef(drawing)
  drawingRef.current = drawing
  const measure = (): Size => {
    const el = region.current
    if (el) size.current = { width: el.clientWidth, height: el.clientHeight }
    return size.current
  }
  const apply = useCallback((change: (view: View, drawing: Size, region: Size) => View) => setView((old) => change(old, drawingRef.current, measure())), [])

  // Ao abrir (e quando o desenho muda de tamanho, como ao trocar a pessoa do centro): enquadra de novo.
  const opened = useRef("")
  useLayoutEffect(() => {
    const key = `${drawing.width}x${drawing.height}|${resetKey}`
    if (opened.current === key) return
    const box = measure()
    if (!box.width || !box.height) return
    opened.current = key
    setView(initialView(drawing, box))
    setReady(true)
  })
  // A região mudou de tamanho (janela, painel): mantém o desenho dentro dos limites.
  useEffect(() => {
    const el = region.current
    if (!el || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => apply((v, d, r) => panBy(v, 0, 0, d, r)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [apply, region])

  // Roda: com Ctrl (ou a pinça do touchpad, que chega igual) aproxima no ponteiro; sem Ctrl, desloca. Ouvinte não passivo.
  useEffect(() => {
    const el = region.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = el.getBoundingClientRect()
      if (event.ctrlKey || event.metaKey) apply((v, d, r) => zoomAt(v, event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - box.left, event.clientY - box.top, d, r))
      else apply((v, d, r) => panBy(v, event.shiftKey ? -event.deltaY : -event.deltaX, event.shiftKey ? 0 : -event.deltaY, d, r))
    }
    // O navegador rola a região para mostrar o elemento com foco: devolve a rolagem e move a câmera no lugar dela.
    const onScroll = () => {
      const dx = el.scrollLeft, dy = el.scrollTop
      if (!dx && !dy) return
      el.scrollLeft = 0; el.scrollTop = 0
      apply((v, d, r) => panBy(v, -dx, -dy, d, r))
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("scroll", onScroll)
    return () => { el.removeEventListener("wheel", onWheel); el.removeEventListener("scroll", onScroll) }
  }, [apply, region])

  // Arrastar com um ponteiro desloca; com dois dedos, a pinça aproxima no meio deles. Num cartão ou botão, o arrasto só
  // começa depois de 6 px de movimento, e o clique que viria em seguida é anulado; um toque parado continua sendo clique.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const start = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)
  const pinch = useRef<number | null>(null)
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 1) { start.current = { x: event.clientX, y: event.clientY }; moved.current = false }
    // No fundo, o arrasto começa na hora; com dois dedos também (pinça).
    if (!(event.target as HTMLElement).closest(ignore) || pointers.current.size > 1) capture(event)
    pinch.current = null
  }
  const capture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    for (const id of pointers.current.keys()) if (!el.hasPointerCapture(id)) try { el.setPointerCapture(id) } catch { /* ponteiro já solto */ }
    el.classList.add("dragging")
  }
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId)
    if (!last) return
    const now = { x: event.clientX, y: event.clientY }
    if (!moved.current && start.current && Math.hypot(now.x - start.current.x, now.y - start.current.y) < 6 && pointers.current.size === 1) return
    if (!moved.current) { moved.current = true; capture(event) }
    pointers.current.set(event.pointerId, now)
    const all = [...pointers.current.values()]
    if (all.length >= 2) {
      const [a, b] = all as [{ x: number; y: number }, { x: number; y: number }]
      const distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current && distance > 0) {
        const box = event.currentTarget.getBoundingClientRect(), factor = distance / pinch.current
        apply((v, d, r) => zoomAt(v, factor, (a.x + b.x) / 2 - box.left, (a.y + b.y) / 2 - box.top, d, r))
      }
      pinch.current = distance
      return
    }
    apply((v, d, r) => panBy(v, now.x - last.x, now.y - last.y, d, r))
  }
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    pinch.current = null
    if (!pointers.current.size) event.currentTarget.classList.remove("dragging")
  }
  // Depois de arrastar, o clique que o navegador manda ao soltar não abre o cartão debaixo do dedo.
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!moved.current) return
    moved.current = false
    event.preventDefault(); event.stopPropagation()
  }

  const center = () => { const r = measure(); return { x: r.width / 2, y: r.height / 2 } }
  return {
    view,
    ready,
    zoomIn: () => apply((v, d, r) => zoomAt(v, 1.25, center().x, center().y, d, r)),
    zoomOut: () => apply((v, d, r) => zoomAt(v, 1 / 1.25, center().x, center().y, d, r)),
    zoomAt: (factor: number, x: number, y: number) => apply((v, d, r) => zoomAt(v, factor, x, y, d, r)),
    /** “Enquadrar”: o desenho inteiro, no meio. */
    fit: () => apply((_v, d, r) => fitView(d, r)),
    centerOn: (box: Box) => apply((v, d, r) => centerOn(v, box, d, r)),
    reveal: (box: Box) => apply((v, d, r) => reveal(v, box, d, r)),
    handlers: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onClickCapture },
    /** Para o elemento que leva o desenho (origem no canto de cima, à esquerda). */
    transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
  }
}
