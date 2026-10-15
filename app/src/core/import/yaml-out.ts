/**
 * YAML escrito à mão pelos conversores, no estilo dos blocos do app (um mapa por linha: `- { nome: Gelo, dias: 36 }`),
 * que fica legível no Obsidian. Os testes conferem que o resultado é lido de volta pelos leitores dos blocos.
 */

const RESERVED = /^(?:true|false|yes|no|on|off|null|~|y|n)$/i

/** Texto sem aspas quando dá (letras, números, espaços e pontuação simples); senão, entre aspas duplas. */
export function yamlScalar(value: string | number | boolean): string {
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0"
  if (typeof value === "boolean") return value ? "true" : "false"
  const plain = /^[\p{L}_][\p{L}\p{N} '._()/-]*$/u.test(value) && !/\s$/.test(value) && !RESERVED.test(value)
  return plain ? value : JSON.stringify(value)
}

type Flat = string | number | boolean | undefined

/** `{ chave: valor, … }` numa linha; chaves com `undefined` ficam de fora. */
export function flowMap(entries: Record<string, Flat | Flat[]>): string {
  const parts = Object.entries(entries).flatMap(([key, value]) => {
    if (value === undefined) return []
    if (Array.isArray(value)) return [`${key}: ${flowList(value)}`]
    return [`${key}: ${yamlScalar(value)}`]
  })
  return `{ ${parts.join(", ")} }`
}

export function flowList(values: Flat[]): string {
  return `[${values.filter((v): v is string | number | boolean => v !== undefined).map(yamlScalar).join(", ")}]`
}

/** Data como texto entre aspas (o Obsidian não a trata como data real). */
export const yamlDate = (text: string) => JSON.stringify(text)
