/** U99 (decisão 13): a nota que o app acabou de criar abre com o nome selecionado, pronto para digitar. */
let fresh: string | null = null

export function markFreshNote(path: string): void {
  fresh = path
}

/** Diz uma vez só se `path` é a nota recém-criada. */
export function takeFreshNote(path: string): boolean {
  if (fresh !== path) return false
  fresh = null
  return true
}
