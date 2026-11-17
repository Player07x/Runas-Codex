import { binarySize, BINARY_CHUNK, fromBase64, toBase64 } from "../core/binary-chunks"
import type { VaultEntry } from "./platform"

type Version = { size: number; mtime: number } | null
export interface AndroidBinaryPlugin {
  binaryReadStart(options: { path: string }): Promise<{ id: number; size: number }>
  binaryReadChunk(options: { id: number }): Promise<{ base64: string }>
  binaryReadFinish(options: { id: number }): Promise<void>
  binaryWriteStart(options: { path: string; size: number; expected?: Version; managed: boolean }): Promise<{ id: number }>
  binaryWriteChunk(options: { id: number; base64: string }): Promise<void>
  binaryWriteFinish(options: { id: number }): Promise<VaultEntry & { uri?: string }>
  binaryAbort(options: { id: number }): Promise<void>
}

/** O lado nativo segura no máximo duas transferências abertas (BinaryTransfers.room). */
export const OPEN_TRANSFERS = 2

/** Fila simples: as transferências além do limite esperam a vez em vez de falhar. Uma mesa com várias cenas
 * ou um livro com várias imagens lê tudo com Promise.all; sem a fila, a terceira leitura era recusada. */
function queue(limit: number) {
  let open = 0
  const waiting: (() => void)[] = []
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (open < limit) open++
    else await new Promise<void>(resolve => waiting.push(resolve))
    try { return await task() } finally {
      // A vaga passa direto para o próximo da fila; só fica livre quando ninguém espera.
      const next = waiting.shift()
      if (next) next()
      else open--
    }
  }
}

/** Uma alocação JS por arquivo; os base64 temporários têm no máximo 2 MB de bytes cada. */
export function createAndroidBinary(native: AndroidBinaryPlugin) {
  const turn = queue(OPEN_TRANSFERS)
  return {
    read: (path: string): Promise<Uint8Array> => turn(async () => {
      const { id, size } = await native.binaryReadStart({ path })
      try {
        const bytes = new Uint8Array(binarySize(size))
        for (let at = 0; at < size;) {
          const { base64 } = await native.binaryReadChunk({ id })
          if (base64.length > Math.ceil(BINARY_CHUNK / 3) * 4) throw new Error("Pedaço maior que 2 MB na leitura do arquivo.")
          const chunk = fromBase64(base64)
          if (!chunk.length || chunk.length > BINARY_CHUNK || at + chunk.length > size) throw new Error("A leitura do arquivo ficou incompleta ou mudou de tamanho.")
          bytes.set(chunk, at); at += chunk.length
        }
        await native.binaryReadFinish({ id })
        return bytes
      } catch (error) { await native.binaryAbort({ id }).catch(() => undefined); throw error }
    }),
    write: (path: string, bytes: Uint8Array, expected?: VaultEntry | null, managed = false) => turn(async () => {
      const size = binarySize(bytes.length)
      const version = expected === undefined ? {} : { expected: expected && { size: expected.size, mtime: expected.mtime } }
      const { id } = await native.binaryWriteStart({ path, size, managed, ...version })
      try {
        for (let at = 0; at < size; at += BINARY_CHUNK) await native.binaryWriteChunk({ id, base64: toBase64(bytes.subarray(at, at + BINARY_CHUNK)) })
        return await native.binaryWriteFinish({ id })
      } catch (error) { await native.binaryAbort({ id }).catch(() => undefined); throw error }
    }),
  }
}
