import { useEffect, useState } from "react"

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

export function navigate(path: string) {
  window.location.hash = path
}

export function href(path: string): string {
  return `#${path}`
}
