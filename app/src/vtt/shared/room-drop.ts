import type { PlayerDrop, PlayerState } from "./ipc"

/** Esperas entre as tentativas de reabrir o túnel depois de uma queda (decisão 6 do U89). */
export const TUNNEL_RETRY_DELAYS_MS: readonly number[] = [2_000, 5_000, 15_000]

/**
 * Tenta `open` depois de cada espera, até dar certo, acabar a lista ou `stillWanted` dizer que a sala fechou.
 * Devolve o que `open` devolveu, ou `null` se nenhuma tentativa deu certo.
 */
export async function retryAfter<T>(
  open: () => Promise<T>,
  stillWanted: () => boolean,
  delays: readonly number[] = TUNNEL_RETRY_DELAYS_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<T | null> {
  for (const delay of delays) {
    await sleep(delay)
    if (!stillWanted()) return null
    try {
      return await open()
    } catch {
      // A próxima espera é maior; a última falha fica com o mestre.
    }
  }
  return null
}

export interface DropNotice {
  /** Frase da faixa no topo da mesa. */
  message: string
  /** Mostra “Reconectar”. */
  reconnect: boolean
  /** O link novo para mandar aos jogadores (só quando a sala voltou). */
  link: string | null
}

/** O que a faixa da mesa diz sobre a queda; `null` quando não há o que avisar. */
export function dropNotice(state: Pick<PlayerState, "enabled" | "drop" | "publicUrl" | "localUrl">): DropNotice | null {
  const drop: PlayerDrop | null = state.drop
  if (!state.enabled || !drop) return null
  const link = state.publicUrl ?? state.localUrl
  if (drop.kind === "tunnel") {
    if (drop.status === "reconnecting") return { message: "O link público caiu. Abrindo outro túnel…", reconnect: false, link: null }
    if (drop.status === "restored") return { message: "O link público caiu e foi reaberto com outro endereço. Mande o link novo aos jogadores: eles entram com o mesmo código.", reconnect: false, link: state.publicUrl }
    return { message: "O link público caiu e não foi possível reabrir. Os jogadores da rede local continuam na sala.", reconnect: true, link: null }
  }
  if (drop.kind === "address") return { message: "O endereço do computador na rede mudou. Mande o link novo aos jogadores: eles entram com o mesmo código.", reconnect: false, link }
  if (drop.status === "failed") return { message: "A sala parou e os jogadores foram desconectados.", reconnect: true, link: null }
  return { message: "A sala voltou. Os jogadores entram de novo pelo mesmo link e com o mesmo código.", reconnect: false, link }
}

/** O aviso que o mestre cola no grupo dos jogadores. */
export function playersNotice(link: string): string {
  return `A sala mudou de endereço. Entre de novo por este link, com o mesmo código de antes:\n${link}`
}
