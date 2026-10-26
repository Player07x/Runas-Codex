// O pacote `hyphen` não traz tipos: só o que o livro usa (hifenização síncrona em português).
declare module "hyphen/pt" {
  export function hyphenateSync(text: string, options?: { hyphenChar?: string; minWordLength?: number }): string
}
