/**
 * Ritmo das gravações em lote (U91): antivírus com proteção contra ransomware desconfiam de muitas trocas de arquivo
 * em sequência (importar, renomear com links, mover imagens). Até `burst` gravações por janela passam direto; daí em
 * diante cada uma espera `gap` ms. Uma nota editada nunca chega perto do limite.
 */
export function createWritePace({ burst = 20, windowMs = 1_000, gap = 40, now = () => Date.now(), wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)) } = {}) {
  let recent: number[] = []
  return async function pace(): Promise<void> {
    const at = now()
    recent = recent.filter((time) => at - time < windowMs)
    if (recent.length >= burst) await wait(gap)
    recent.push(now())
  }
}
