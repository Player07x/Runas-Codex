import { navigate } from "./router"

/**
 * Atalhos de exportar (U54, U55): os módulos levam à tela Importar / Exportar com o item (wiki, livro, mesa,
 * campanha) ou as notas e pastas já marcados. O pedido fica guardado até a tela montar; a tela o consome uma vez.
 * `items` usa os ids de `core/transfer/items.ts` (`wiki:Cronos`, `livro:Livros/Guia/Guia.md`, `mesa:.runas/mesas/x`).
 */
export type TransferRequest = { items: string[] } | { paths: string[] }

let pending: TransferRequest | null = null
const listeners = new Set<(request: TransferRequest) => void>()

export function requestExport(request: TransferRequest) {
  pending = request
  navigate("/transferir/exportar")
  // A tela já aberta atende na hora.
  for (const listener of listeners) listener(request)
}

/** O pedido guardado, que some ao ser lido. */
export function takeTransferRequest(): TransferRequest | null {
  const request = pending
  pending = null
  return request
}

export function onTransferRequest(listener: (request: TransferRequest) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const wikiItem = (name: string) => `wiki:${name}`
export const bookItem = (path: string) => `livro:${path}`
export const worldItem = (root: string) => `mesa:${root}`
export const campaignItem = (name: string) => `campanha:${name}`
