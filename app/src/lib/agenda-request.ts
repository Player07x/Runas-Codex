import { useEffect, useRef } from "react"
import { navigate } from "./router"

/**
 * Ações do ⋯ da Agenda pedidas de fora dela (a busca Ctrl K): leva à Agenda e pede que ela abra o mesmo diálogo do
 * menu. Como no “+ Novo” (create-request.ts), o pedido espera a tela montar.
 */
export type AgendaAction = "enquete" | "tempo-livre" | "importar-ics" | "exportar-ics"

let pending: AgendaAction | null = null
const listeners = new Set<(action: AgendaAction) => boolean>()

export function requestAgendaAction(action: AgendaAction) {
  pending = action
  navigate("/agenda")
  for (const listener of listeners) if (listener(action)) break
}

/** Na Agenda: chama `run` quando a busca pedir uma ação do menu. */
export function useAgendaActions(run: (action: AgendaAction) => void) {
  const latest = useRef(run)
  latest.current = run
  useEffect(() => {
    const take = (asked: AgendaAction) => {
      if (pending !== asked) return false
      pending = null
      latest.current(asked)
      return true
    }
    if (pending) take(pending)
    listeners.add(take)
    return () => { listeners.delete(take) }
  }, [])
}
