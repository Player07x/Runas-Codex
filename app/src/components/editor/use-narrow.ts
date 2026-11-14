import { useSyncExternalStore } from "react"

/** Celular e telas de toque: a barra da seleção dá lugar à barra sobre o teclado. */
const query = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 860px), (pointer: coarse)") : null
const subscribe = (listener: () => void) => { query?.addEventListener("change", listener); return () => query?.removeEventListener("change", listener) }
export const useNarrow = () => useSyncExternalStore(subscribe, () => Boolean(query?.matches), () => false)

/** Celular (até 640 px): a barra da nota troca as três abas de modo por um botão Ler/Editar (U61). */
const phoneQuery = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 640px)") : null
const subscribePhone = (listener: () => void) => { phoneQuery?.addEventListener("change", listener); return () => phoneQuery?.removeEventListener("change", listener) }
export const usePhone = () => useSyncExternalStore(subscribePhone, () => Boolean(phoneQuery?.matches), () => false)
