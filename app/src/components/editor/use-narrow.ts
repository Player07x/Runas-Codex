import { useSyncExternalStore } from "react"

/** Celular e telas de toque: a barra da seleção dá lugar à barra sobre o teclado. */
const query = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 860px), (pointer: coarse)") : null
const subscribe = (listener: () => void) => { query?.addEventListener("change", listener); return () => query?.removeEventListener("change", listener) }
export const useNarrow = () => useSyncExternalStore(subscribe, () => Boolean(query?.matches), () => false)
