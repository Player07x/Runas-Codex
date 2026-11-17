/** Mensagens limitadas a 2 MB; o binário do arquivo tem o mesmo teto de 512 MB do desktop. */
export const BINARY_CHUNK = 2 * 1024 * 1024
export const MAX_BINARY_SIZE = 512 * 1024 * 1024
export function binarySize(size: number): number {
  if (!Number.isSafeInteger(size) || size < 0 || size > MAX_BINARY_SIZE) throw new Error("O arquivo passa do limite de 512 MB.")
  return size
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ""
  // Em pedaços: `String.fromCharCode(...bytes)` estoura a pilha com arquivos grandes.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

