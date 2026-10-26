/**
 * Fichas de RPG (L5, ADR 0033): callouts comuns nas notas (`> [!magia] Torreta de Fogo`), que o Obsidian e o leitor do
 * app mostram como qualquer callout. Só o livro impresso reorganiza: os rótulos que o valor já explica somem
 * (“1 PV · Feitiço · Área”), os outros ficam, campo vazio não sai e a criatura ganha a linha de atributos.
 */
export const FICHAS = { magia: "Magia", runa: "Runa", habilidade: "Habilidade", item: "Item", criatura: "Criatura", raca: "Raça", classe: "Classe", efeito: "Efeito" } as const
export type FichaKind = keyof typeof FICHAS

/** Tipos de callout desenhados como ficha no livro (o statblock da migração usa o desenho da criatura). */
export function fichaKind(callout: string): FichaKind | "statblock" | null {
  const kind = callout.toLocaleLowerCase("pt-BR")
  if (kind === "raça") return "raca"
  if (kind === "statblock") return "statblock"
  return Object.hasOwn(FICHAS, kind) ? (kind as FichaKind) : null
}

export interface FichaField { label: string; value: string }

const norm = (label: string) => label.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "").replace(/[:.]+$/, "").trim()
/** Rótulos que o valor já explica: no livro sai só o valor. */
const OBVIOUS = new Set(["custo", "tipo", "alcance", "grupo", "categoria", "raridade", "origem"])

/** Separa os campos da primeira linha da ficha em etiquetas (valor sozinho), atributos (criatura) e campos com rótulo. */
export function splitFicha(kind: FichaKind | "statblock", fields: FichaField[]): { tags: string[]; stats: FichaField[]; fields: FichaField[] } {
  const out = { tags: [] as string[], stats: [] as FichaField[], fields: [] as FichaField[] }
  for (const field of fields) {
    const value = field.value.replace(/^[\s·•|,;]+|[\s·•|,;]+$/g, "")
    const label = field.label.replace(/[:.]+\s*$/, "").trim()
    if (!value) continue
    if (OBVIOUS.has(norm(label))) out.tags.push(value)
    else if ((kind === "criatura" || kind === "statblock") && /\d/.test(value) && value.length <= 10) out.stats.push({ label, value })
    else out.fields.push({ label, value })
  }
  return out
}

const SMALL_WORDS = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "no", "na", "nos", "nas", "com", "por", "para", "à", "ao", "aos", "às"])
/** “BAFO DE FOGO” → “Bafo de Fogo”; nomes que já têm minúsculas ficam como estão. */
export function titleCase(name: string): string {
  if (name !== name.toLocaleUpperCase("pt-BR")) return name
  return name.toLocaleLowerCase("pt-BR").split(/(\s+)/).map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1))).join("")
}

const SPELL_TYPES = new Set(["feitico", "ritual", "aura", "rapida", "encantamento"])
const RANGES = new Set(["toque", "pessoal", "projetil", "alvos", "area", "cone", "linha"])

/**
 * “Converter em ficha”: uma magia (ou runa) no formato antigo — nome em negrito numa linha, custo e tipo na linha de
 * baixo, depois o texto — vira o callout da ficha. Devolve `null` se o trecho não tem esse formato.
 */
export function toFicha(text: string, kind?: FichaKind): string | null {
  const lines = text.replace(/\r\n?/g, "\n").trim().split("\n")
  const name = /^(?:\*\*(.+?)\*\*|#{2,6}\s+(.+?))\s*\\?\s*$/.exec(lines[0] ?? "")
  if (!name) return null
  let rest = lines.slice(1)
  let meta: string[] = []
  const second = rest[0]?.trim() ?? ""
  if (second && !second.startsWith("**") && second.length <= 100 && (/[·•|]/.test(second) || /\d\s*(?:PV|PA|PE|PR|pontos?)\b/i.test(second))) {
    meta = second.replace(/\\$/, "").split(/\s*[·•|]\s*/).map((part) => part.trim()).filter(Boolean)
    rest = rest.slice(1)
  }
  const cost = meta.filter((part) => /\d/.test(part) && /(?:PV|PA|PE|PR|pontos?)\b/i.test(part))
  const type = meta.filter((part) => !cost.includes(part) && SPELL_TYPES.has(norm(part)))
  const range = meta.filter((part) => !cost.includes(part) && RANGES.has(norm(part)))
  const other = meta.filter((part) => !cost.includes(part) && !type.includes(part) && !range.includes(part))
  const resolved = kind ?? (cost.some((part) => /pontos?/i.test(part)) ? "runa" : "magia")
  const fields = [
    cost.length ? `**Custo:** ${cost.join(" · ")}` : "",
    type.length || other.length ? `**Tipo:** ${[...type, ...other].join(" · ")}` : "",
    range.length ? `**Alcance:** ${range.join(" · ")}` : "",
  ].filter(Boolean).join(" · ")
  while (rest.length && !rest[0]!.trim()) rest = rest.slice(1)
  const body = rest.map((line) => (line.trim() ? `> ${line}` : ">"))
  return [`> [!${resolved}] ${titleCase((name[1] ?? name[2])!.trim())}`, ...(fields ? [`> ${fields}`] : []), ...(body.length ? [">", ...body] : [])].join("\n")
}
