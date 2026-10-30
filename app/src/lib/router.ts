import { useEffect, useState, useSyncExternalStore } from "react"
import { NavHistory } from "../core/nav-history"

/**
 * Roteador por hash (`#/wiki/artigo/aldren`). Funciona aberto de arquivo, dentro do Electron e do
 * Capacitor sem configurar servidor. Cada tela lê os segmentos que precisa.
 */
export function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, "")
  return raw.startsWith("/") ? raw : `/${raw}`
}

export function useRoute(): string[] {
  const [path, setPath] = useState(currentPath)
  useEffect(() => {
    const update = () => setPath(currentPath())
    window.addEventListener("hashchange", update)
    return () => window.removeEventListener("hashchange", update)
  }, [])
  return path.split("/").filter(Boolean).map(decodeURIComponent)
}

/** Vai para a rota; `replace` troca a entrada atual do histórico (rotas de ação, como `/notas/nova`, não ficam nele). */
export function navigate(path: string, options?: { replace?: boolean }) {
  if (options?.replace) {
    replacing = true
    window.location.replace(`#${path}`)
  } else window.location.hash = path
}

// Voltar/avançar: o número de cada entrada fica no `history.state` (core/nav-history.ts).
const NAV_KEY = "runasNav"
const tagOf = (): number | undefined => {
  const value = (window.history.state as Record<string, unknown> | null)?.[NAV_KEY]
  return typeof value === "number" ? value : undefined
}
const tag = (n: number) => window.history.replaceState({ ...((window.history.state as object | null) ?? {}), [NAV_KEY]: n }, "")
let replacing = false
let nav: NavHistory | null = null
let snapshot = { canBack: false, canForward: false }
const navListeners = new Set<() => void>()

if (typeof window !== "undefined") {
  nav = new NavHistory(tagOf() ?? 0)
  if (tagOf() === undefined) tag(0)
  snapshot = { canBack: nav.canBack, canForward: nav.canForward }
  window.addEventListener("hashchange", () => {
    const n = nav!.arrive(tagOf(), replacing)
    replacing = false
    if (tagOf() !== n) tag(n)
    snapshot = { canBack: nav!.canBack, canForward: nav!.canForward }
    navListeners.forEach((listener) => listener())
  })
  // Alt+← / Alt+→ (e Ctrl+Alt, como no Obsidian) e os botões laterais do mouse. O editor usa Alt+← para andar pelo
  // texto: o que ele já tratou (defaultPrevented) não volta a página.
  window.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || !event.altKey || event.shiftKey || event.metaKey) return
    if (event.key === "ArrowLeft") (event.preventDefault(), goBack())
    else if (event.key === "ArrowRight") (event.preventDefault(), goForward())
  })
  ;(window as unknown as { runasCodexVoltar?: () => boolean }).runasCodexVoltar = () => systemBack()
  window.addEventListener("mouseup", (event) => {
    if (event.button === 3) (event.preventDefault(), goBack())
    else if (event.button === 4) (event.preventDefault(), goForward())
  })
}

export function goBack() {
  if (nav?.canBack) window.history.back()
}

/**
 * Voltar do sistema no Android (MainActivity): fecha o diálogo aberto (como o Esc) ou volta pelo histórico do app.
 * Devolve `false` na primeira tela, para o Android sair do app. Vale o histórico do app, não o do WebView, que pula as
 * entradas criadas sem toque (depois de criar uma nota, por exemplo).
 */
export function systemBack(): boolean {
  const dialog = document.querySelector("[role=dialog],[role=alertdialog],dialog[open]")
  if (dialog) {
    ;(document.activeElement ?? dialog).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }))
    return true
  }
  if (!nav?.canBack) return false
  window.history.back()
  return true
}

export function goForward() {
  if (nav?.canForward) window.history.forward()
}

/** Dá para voltar ou avançar agora? (para ligar os botões) */
export function useNavHistory(): { canBack: boolean; canForward: boolean } {
  return useSyncExternalStore(
    (listener) => (navListeners.add(listener), () => navListeners.delete(listener)),
    () => snapshot,
  )
}

export function href(path: string): string {
  return `#${path}`
}
