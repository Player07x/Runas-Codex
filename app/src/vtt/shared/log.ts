/** Tipos de entrada do Registro da mesa (rolagens, dano, avisos das regiões). */
export const LOG_KINDS = ["test", "damage", "info"] as const
export type LogKind = (typeof LOG_KINDS)[number]

/** Cor padrão de uma barra do token pelo rótulo (PV vermelho, PA ciano, PE violeta; o resto, dourado). */
export function barColor(label: string): string {
  const key = label.trim().toUpperCase()
  if (key.startsWith("PV")) return "#c76561"
  if (key.startsWith("PA")) return "#82aaa6"
  if (key.startsWith("PE")) return "#927f9c"
  return "#b99b65"
}
