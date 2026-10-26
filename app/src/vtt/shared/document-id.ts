import { bytesToHex } from "@noble/hashes/utils"

/** HTTP na LAN não oferece randomUUID; getRandomValues continua disponível e mantém os 128 bits aleatórios. */
export function newDocumentId(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
}
