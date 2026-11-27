import { ignorableError, pushError, type ErrorEntry } from "../core/error-report"

/**
 * Erros desta sessão para o “Enviar relatório” (1.9): ficam só na memória, nunca em arquivo, e somem ao fechar o app.
 * Também guarda o pedido de abrir o relatório, para qualquer tela (Ajuda, Configurações, o aviso de erro) abrir o mesmo.
 */
let errors: ErrorEntry[] = []
let open = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

export function recordError(message: string, stack?: string): void {
  if (ignorableError(message)) return
  const next = pushError(errors, { at: Date.now(), message: message.slice(0, 500), ...(stack ? { stack: stack.slice(0, 2000) } : {}) })
  const changed = next.length !== errors.length || next.at(-1) !== errors.at(-1)
  errors = next
  if (changed) emit()
}

export function sessionErrors(): ErrorEntry[] { return [...errors] }
export function reportOpen(): boolean { return open }
export function openReport(): void { open = true; emit() }
export function closeReport(): void { open = false; emit() }

export function subscribeErrorLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

let installed = false
/** Escuta os erros não tratados da janela (uma vez por app). */
export function installErrorLog(target: Window = window): void {
  if (installed) return
  installed = true
  target.addEventListener("error", (event) => recordError(event.message || String(event.error), event.error instanceof Error ? event.error.stack : undefined))
  target.addEventListener("unhandledrejection", (event) => {
    const reason: unknown = event.reason
    recordError(reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason), reason instanceof Error ? reason.stack : undefined)
  })
}
