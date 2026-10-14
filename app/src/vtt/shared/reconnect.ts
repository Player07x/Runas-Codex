/** Primeira espera antes de religar o WebSocket, e o teto das esperas seguintes. */
export const RECONNECT_MIN_MS = 1_000
export const RECONNECT_MAX_MS = 15_000
/** De quanto em quanto tempo o jogador manda `ping`; o servidor responde `pong`. */
export const PING_INTERVAL_MS = 20_000
/**
 * Sem nenhuma mensagem por este tempo (dois pongs perdidos) a conexão é dada
 * como morta. Um WebSocket semimorto — comum ao voltar de segundo plano no
 * iOS e no Android, ou em rota internacional ruim — nunca dispara `onclose`.
 */
export const DEAD_AFTER_MS = 45_000

/**
 * Espera antes da tentativa `attempt` (0 = primeira): 1 s, 2 s, 4 s… até 15 s,
 * com metade fixa e metade sorteada para que os jogadores de uma mesa que
 * perdeu a conexão juntos não voltem todos no mesmo instante.
 */
export function reconnectDelay(attempt: number, random: () => number = Math.random): number {
  const step = Math.max(0, Math.floor(Number.isFinite(attempt) ? attempt : 0))
  const base = Math.min(RECONNECT_MAX_MS, RECONNECT_MIN_MS * 2 ** Math.min(step, 10))
  return Math.round(base / 2 + random() * (base / 2))
}

/** A conexão está viva? `lastMessageAt` é o instante da última mensagem recebida. */
export function connectionIsDead(lastMessageAt: number, now: number): boolean {
  return now - lastMessageAt > DEAD_AFTER_MS
}
