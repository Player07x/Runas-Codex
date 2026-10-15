/**
 * Voltar/avançar (checklist A.3). O roteador é por hash e quem guarda o histórico é o navegador; aqui só se sabe em
 * que ponto dele o app está, para ligar e desligar os botões. Cada entrada ganha um número (no `history.state`): uma
 * entrada sem número é nova; com número, o usuário voltou ou avançou até ela.
 */
export class NavHistory {
  private position: number
  private last: number

  constructor(start = 0) {
    this.position = start
    this.last = start
  }

  /** Chegou numa entrada (`replaced`: ela tomou o lugar da atual). Devolve o número dela. */
  arrive(tag: number | undefined, replaced = false): number {
    if (replaced) return this.position
    if (tag === undefined) {
      this.position += 1
      this.last = this.position
    } else {
      this.position = tag
      this.last = Math.max(this.last, tag)
    }
    return this.position
  }

  get canBack(): boolean {
    return this.position > 0
  }

  get canForward(): boolean {
    return this.position < this.last
  }
}

/** Uma nota sorteada, diferente da aberta (quando há outra). */
export function randomNote(paths: string[], current?: string, random: () => number = Math.random): string | null {
  const others = paths.filter((p) => p !== current)
  const pool = others.length ? others : paths
  return pool.length ? pool[Math.floor(random() * pool.length)]! : null
}
