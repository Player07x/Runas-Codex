import { isMasterLink } from "./master"

export interface RoomLink {
  url: string
  /** Link da mesa do mestre remoto (`/master?m=…`), não da sala dos jogadores. */
  master: boolean
}

/** Rede local (IPv4 privado, o próprio aparelho, `.local`) ou o túnel rápido da sala (`*.trycloudflare.com`). */
export function isRoomHost(host: string): boolean {
  const name = host.toLowerCase().replace(/^\[|\]$/g, "")
  if (name === "localhost" || name === "::1" || name.endsWith(".local") || name.endsWith(".trycloudflare.com")) return true
  const parts = name.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts as [number, number, number, number]
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)
}

/**
 * O link da sala a partir do que a pessoa colou: o link sozinho, sem `http://`, ou a mensagem inteira em que ele veio.
 * Link de jogador precisa da chave (`?k=`); link do mestre (`/master?m=`) só vale para a rede local ou o túnel da sala
 * (U47), porque quem o abre comanda a mesa.
 */
export function parseRoomLink(text: string): RoomLink {
  const trimmed = text.trim()
  const found = /https?:\/\/\S+/i.exec(trimmed)?.[0] ?? trimmed.split(/\s+/).find((word) => /[?&](k|m)=/.test(word)) ?? trimmed
  const candidate = found.replace(/[)\].,;!?"'»”]+$/, "")
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `http://${candidate}`)
  } catch {
    throw new Error("Não reconheci um link. Cole o endereço que o mestre mandou.")
  }
  if (url.username || url.password) throw new Error("Link da sala inválido.")
  if (isMasterLink(url.href)) {
    if (!isRoomHost(url.hostname)) throw new Error("Este link de mestre não é da rede local nem do túnel da sala. Peça o link de novo no painel Sala do aparelho que hospeda a mesa.")
    return { url: url.href, master: true }
  }
  if (!url.searchParams.get("k")) throw new Error("O link precisa ter a chave da sala (a parte ?k=…). Peça ao mestre o link completo.")
  return { url: url.href, master: false }
}
