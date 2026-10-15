import type { PropertyValue } from "./properties"

/**
 * Tipos das propriedades no editor visual (checklist A.3), como o Obsidian: o tipo declarado em
 * `.obsidian/types.json` vale primeiro; sem ele, o tipo sai do valor. Datas do mundo (`*_mundo`, ADR 0010) são texto:
 * o seletor de data real usaria o calendário gregoriano.
 */
export type PropertyKind = "texto" | "lista" | "numero" | "caixa" | "data" | "data-hora" | "link"

export const PROPERTY_KINDS: { kind: PropertyKind; label: string }[] = [
  { kind: "texto", label: "Texto" },
  { kind: "lista", label: "Lista" },
  { kind: "numero", label: "Número" },
  { kind: "caixa", label: "Caixa" },
  { kind: "data", label: "Data" },
  { kind: "data-hora", label: "Data e hora" },
  { kind: "link", label: "Link" },
]

const OBSIDIAN: Record<string, PropertyKind> = { text: "texto", multitext: "lista", aliases: "lista", tags: "lista", number: "numero", checkbox: "caixa", date: "data", datetime: "data-hora" }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/
const LINK = /^\[\[[^\]\n]+\]\]$/

/** Os tipos declarados no `types.json` do Obsidian (`{ "types": { "chave": "date" } }`). */
export function declaredTypes(json: string | undefined): Record<string, string> {
  try {
    const data = JSON.parse(json ?? "{}") as { types?: Record<string, unknown> }
    return Object.fromEntries(Object.entries(data.types ?? {}).filter((e): e is [string, string] => typeof e[1] === "string"))
  } catch {
    return {}
  }
}

/** O valor cabe no tipo? (vazio cabe em todos; um valor que não cabe aparece pelo tipo dele, para não se perder). */
function fits(kind: PropertyKind, value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true
  switch (kind) {
    case "lista":
      return Array.isArray(value)
    case "numero":
      return typeof value === "number"
    case "caixa":
      return typeof value === "boolean"
    case "data":
      return typeof value === "string" && DATE.test(value)
    case "data-hora":
      return typeof value === "string" && DATETIME.test(value)
    default:
      return typeof value === "string"
  }
}

export function propertyKind(key: string, value: unknown, declared?: string): PropertyKind {
  if (key.endsWith("_mundo")) return Array.isArray(value) ? "lista" : "texto"
  const fromConfig = declared ? OBSIDIAN[declared] : undefined
  if (fromConfig && fits(fromConfig, value)) return fromConfig
  if (typeof value === "boolean") return "caixa"
  if (typeof value === "number") return "numero"
  if (Array.isArray(value)) return "lista"
  if (typeof value === "string") {
    if (DATE.test(value)) return "data"
    if (DATETIME.test(value)) return "data-hora"
    if (LINK.test(value)) return "link"
  }
  return "texto"
}

/** O valor de uma propriedade nova de cada tipo. */
export function emptyValue(kind: PropertyKind, now = new Date()): PropertyValue {
  const pad = (n: number) => String(n).padStart(2, "0")
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  switch (kind) {
    case "lista":
      return []
    case "numero":
      return 0
    case "caixa":
      return false
    case "data":
      return day
    case "data-hora":
      return `${day}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    default:
      return ""
  }
}

/** O texto de um campo convertido para o tipo (`null` = valor que não serve, ex. número com letras). */
export function parseInput(kind: PropertyKind, raw: string): PropertyValue | null {
  const text = raw.trim()
  switch (kind) {
    case "lista":
      return raw.split(",").map((s) => s.trim()).filter(Boolean)
    case "numero":
      return text === "" || Number.isNaN(Number(text)) ? null : Number(text)
    case "caixa":
      return text === "true"
    case "data":
      return DATE.test(text) ? text : text === "" ? "" : null
    case "data-hora":
      return DATETIME.test(text) ? text.slice(0, 16) : text === "" ? "" : null
    case "link": {
      if (!text) return ""
      const target = text.replace(/^\[\[|\]\]$/g, "").trim()
      return target ? `[[${target}]]` : null
    }
    default:
      return raw
  }
}
