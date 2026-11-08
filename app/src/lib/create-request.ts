import { useEffect, useRef } from "react"
import { navigate } from "./router"

/**
 * “+ Novo” da barra de cima: leva à tela do espaço e pede que ela abra o mesmo diálogo de criação do seu botão.
 * O pedido fica guardado até a tela montar (ou chega na hora, se ela já estiver aberta), para não duplicar a regra
 * de criação fora da tela que já a tem.
 */
export type CreateKind = "evento" | "artigo" | "campanha" | "livro" | "nota-mestre"

export const CREATE_ROUTES: Record<CreateKind, string> = { evento: "/agenda", artigo: "/wiki", campanha: "/campanhas", livro: "/livros", "nota-mestre": "/campanhas" }

/** A nota do mestre é de uma campanha: dentro de uma, vai para as Sessões dela; fora, a lista pergunta qual. */
export function createRoute(kind: CreateKind, hash = typeof window === "undefined" ? "" : window.location.hash): string {
  const campaign = kind === "nota-mestre" ? /^#\/campanhas\/([^/?]+)/.exec(hash)?.[1] : undefined
  return campaign ? `/campanhas/${campaign}/sessoes` : CREATE_ROUTES[kind]
}

let pending: CreateKind | null = null
const listeners = new Set<(kind: CreateKind) => boolean>()

export function requestCreate(kind: CreateKind) {
  pending = kind
  navigate(createRoute(kind))
  // A tela já aberta atende na hora; uma tela nova atende ao montar.
  for (const listener of listeners) if (listener(kind)) break
}

/** Passa o pedido adiante para outra tela (a que vai atendê-lo ao montar), sem chamar quem o passou. */
export function forwardCreate(kind: CreateKind, route: string) {
  pending = kind
  navigate(route)
}

/** Na tela que sabe criar `kind`: chama `open` quando o “+ Novo” pedir. */
export function useCreateRequest(kind: CreateKind, open: () => void) {
  const latest = useRef(open)
  latest.current = open
  useEffect(() => {
    const take = (asked: CreateKind) => {
      if (asked !== kind || pending !== kind) return false
      pending = null
      latest.current()
      return true
    }
    take(pending ?? kind)
    listeners.add(take)
    return () => { listeners.delete(take) }
  }, [kind])
}
