import { useLayoutEffect, useRef, type RefObject } from "react"
const stack: HTMLElement[] = []
const focusable = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"]),summary,[contenteditable="true"]')]
  .filter(element => !element.matches(':disabled,[hidden],[aria-disabled="true"]') && element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'))
/** O diálogo superior contém Tab/Escape e devolve o foco ao elemento que o abriu. */
export function useDialogFocus(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  const close = useRef(onClose)
  close.current = onClose
  const previous = useRef(typeof document === "undefined" ? null : document.activeElement)
  if (!active) previous.current = typeof document === "undefined" ? null : document.activeElement
  useLayoutEffect(() => {
    if (!active) return
    const root = ref.current
    if (!root) return
    stack.push(root)
    const first = () => (focusable(root)[0] ?? root).focus()
    if (!root.contains(document.activeElement)) first()
    const key = (event: KeyboardEvent) => {
      if (stack.at(-1) !== root) return
      if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close.current(); return }
      if (event.key !== "Tab") return
      const elements = focusable(root), at = elements.indexOf(document.activeElement as HTMLElement)
      if (!elements.length) { event.preventDefault(); root.focus() }
      else if (event.shiftKey && at <= 0) { event.preventDefault(); elements.at(-1)!.focus() }
      else if (!event.shiftKey && (at < 0 || at === elements.length - 1)) { event.preventDefault(); elements[0]!.focus() }
    }
    const focus = (event: FocusEvent) => { if (stack.at(-1) === root && event.target instanceof Node && !root.contains(event.target)) first() }
    document.addEventListener("keydown", key, true)
    document.addEventListener("focusin", focus)
    return () => {
      stack.splice(stack.indexOf(root), 1)
      document.removeEventListener("keydown", key, true)
      document.removeEventListener("focusin", focus)
      const target = previous.current
      if (target instanceof HTMLElement && target.isConnected && !root.contains(target)) target.focus()
    }
  }, [ref, active])
}
