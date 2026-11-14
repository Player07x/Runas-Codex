/**
 * Como o bloco de propriedades (frontmatter) aparece no modo Editar (U77), lembrado por aparelho (regra 5):
 * recolhido numa barra (padrão), aberto como tabela, ou escondido (as propriedades ficam no painel Propriedades).
 */
export type PropertiesDisplay = "recolhidas" | "abertas" | "escondidas"

export const PROPERTIES_DISPLAY_KEY = "runas-codex:propriedades-no-documento"

export function parsePropertiesDisplay(raw: unknown): PropertiesDisplay {
  return raw === "abertas" || raw === "escondidas" ? raw : "recolhidas"
}
