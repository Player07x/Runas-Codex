import { useState } from "react"

/**
 * Preferência de tela lembrada por aparelho (ordem, filtros, vista): `localStorage` com chave `runas-codex:<nome>`, nunca
 * o cofre (regra 5 do AGENTS.md). Sem armazenamento (janela privada, bloqueio), a tela só não lembra.
 */
export function readRemembered<T>(key: string, parse: (raw: unknown) => T): T {
  try { return parse(JSON.parse(localStorage.getItem(key) ?? "null")) } catch { return parse(null) }
}

export function writeRemembered(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* só não é lembrado */ }
}

/** Estado lembrado pela chave; quando a chave muda (outra categoria na mesma tela), relê o que foi guardado para ela. */
export function useRemembered<T>(key: string, parse: (raw: unknown) => T): [T, (next: T | ((current: T) => T)) => void] {
  const [state, setState] = useState(() => ({ key, value: readRemembered(key, parse) }))
  const current = state.key === key ? state.value : readRemembered(key, parse)
  if (state.key !== key) setState({ key, value: current })
  const set = (next: T | ((value: T) => T)) => setState((previous) => {
    const base = previous.key === key ? previous.value : readRemembered(key, parse)
    const value = typeof next === "function" ? (next as (value: T) => T)(base) : next
    writeRemembered(key, value)
    return { key, value }
  })
  return [current, set]
}
