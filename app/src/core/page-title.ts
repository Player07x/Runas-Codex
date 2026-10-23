/**
 * Título da aba e da janela para cada tela: do mais específico para o mais geral, como “Sessão 12 · Sessões ·
 * As Cinzas de Valdris · Runas-Codex”. Leitores de tela anunciam o título ao trocar de tela, e o histórico e as abas
 * passam a mostrar onde se está (WCAG 2.4.2).
 */
export const APP_NAME = "Runas-Codex"

export function pageTitle(crumbs: readonly string[]): string {
  const parts = crumbs.map((c) => c.trim()).filter(Boolean)
  // Repetições seguidas (a campanha e a nota da campanha com o mesmo nome) não acrescentam nada.
  const unique = parts.filter((part, i) => part !== parts[i - 1])
  return [...unique.reverse(), APP_NAME].join(" · ")
}
