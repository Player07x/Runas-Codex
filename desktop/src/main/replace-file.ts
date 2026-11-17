import { rename } from "node:fs/promises"

/** Erros do Windows quando outro programa (antivírus, Obsidian, o próprio índice) está com o arquivo aberto. */
const BUSY = new Set(["EPERM", "EACCES", "EBUSY"])
/** ~6 s no total: o antivírus que examina o arquivo novo pode segurá-lo por alguns segundos (U91). */
const ATTEMPTS = 16
const MAX_WAIT = 800

type Options = {
  platform?: NodeJS.Platform
  rename?: (from: string, to: string) => Promise<void>
  wait?: (ms: number) => Promise<void>
}

/**
 * Troca `to` por `from` de uma vez (o `rename` da gravação segura). No Windows, a troca falha enquanto alguém lê o
 * arquivo; a leitura costuma durar milissegundos (a verificação de um antivírus, alguns segundos), então tenta de novo
 * por até ~6 s antes de desistir. Nos outros sistemas,
 * o primeiro erro já é a resposta.
 */
export async function replaceFile(from: string, to: string, options: Options = {}): Promise<void> {
  const { platform = process.platform, rename: move = rename, wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)) } = options
  for (let attempt = 1; ; attempt++) {
    try {
      return await move(from, to)
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (platform !== "win32" || !code || !BUSY.has(code) || attempt >= ATTEMPTS) throw error
      await wait(Math.min(50 * attempt, MAX_WAIT))
    }
  }
}
