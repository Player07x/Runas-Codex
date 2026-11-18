import { parseLibraryItem } from "./library"
import { isAssetPath } from "./scene"

/**
 * Serviços do cofre para o mestre remoto (U47): o aparelho que comanda a sala não tem o cofre, então pede ao app do
 * computador (ou do celular) que hospeda a sala. Quem atende é a interface do app da sala, que grava pelo `useVault()`
 * e pela biblioteca do cofre, como faria a mesa local; a sala só repassa o pedido (chave do mestre, ADR 0016).
 */
export const HOST = {
  libraryList: "vtt:host-library-list",
  libraryAsset: "vtt:host-library-asset",
  librarySave: "vtt:host-library-save",
  libraryRemove: "vtt:host-library-remove",
  libraryCopyToWorld: "vtt:host-library-copy",
  sessionTargets: "vtt:host-session-targets",
  sessionSave: "vtt:host-session-save",
} as const

export const HOST_CHANNELS: readonly string[] = Object.values(HOST)

/** No desktop: o processo principal pede à interface (`request`), ela responde (`reply`) e diz se está atendendo. */
export const HOST_RELAY = { request: "vtt:host-request", reply: "vtt:host-reply", ready: "vtt:host-ready" } as const

export type HostHandler = (channel: string, args: unknown[]) => Promise<unknown>

/** Campanhas onde a sessão pode ser salva, com o próximo número. */
export interface SessionTargets {
  campaigns: { name: string; next: number }[]
  readOnly: boolean
}

export interface SessionInput {
  campaign: string
  number: number
  title: string
  date: string
  text: string
}

/** O pedido chegou sem o app da sala para atender (fechado, ou noutra janela). */
export const NO_HOST = "Abra o Runas-Codex no aparelho da sala para usar a biblioteca e salvar a sessão."

/** Bytes ↔ base64 para passar imagens da biblioteca pelo JSON do mestre remoto. */
export function toBase64(bytes: Uint8Array): string {
  let text = ""
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}

export function fromBase64(value: string): Uint8Array {
  const text = atob(value)
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i)
  return bytes
}

const isText = (value: unknown): value is string => typeof value === "string"

/** Confere os argumentos de cada pedido antes de chegar ao cofre (o celular do mestre não é confiável por padrão). */
export function hostArgs(channel: string, args: unknown[]): unknown[] {
  switch (channel) {
    case HOST.libraryList:
    case HOST.sessionTargets:
      return []
    case HOST.libraryAsset:
      if (!isAssetPath(args[0])) throw new Error("Imagem da biblioteca inválida.")
      return [args[0]]
    case HOST.libraryRemove:
      if (!isText(args[0]) || !args[0]) throw new Error("Item da biblioteca inválido.")
      return [args[0]]
    case HOST.librarySave:
    case HOST.libraryCopyToWorld: {
      // O mesmo leitor dos itens gravados no cofre: o que ele recusa não entra.
      const item = parseLibraryItem(args[0])
      if (!item) throw new Error("Item da biblioteca inválido.")
      return [item]
    }
    case HOST.sessionSave: {
      const input = args[0] as Partial<SessionInput> | null
      if (!input || !isText(input.campaign) || !isText(input.title) || !isText(input.date) || !isText(input.text) || !Number.isInteger(input.number) || input.number! < 1) throw new Error("Sessão inválida.")
      if (input.text.length > 2_000_000) throw new Error("Texto grande demais.")
      return [input]
    }
    default:
      throw new Error("Isto só pelo computador da sala.")
  }
}
