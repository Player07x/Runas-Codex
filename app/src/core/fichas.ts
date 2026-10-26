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
    const label = field.label.replace(/[:.]+\s*$/, "").trim()
    let value = field.value.replace(/^[\s·•|,;]+|[\s·•|,;]+$/g, "")
    // “**Custo:** Custo: 1 PV” (o rótulo repetido no valor) sai como “1 PV”.
    const repeated = /^(\p{L}[\p{L} ]*?)\s*:\s*/u.exec(value)
    if (repeated && norm(repeated[1]!) === norm(label)) value = value.slice(repeated[0].length).trim()
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

/** Uma linha só com uma imagem (`![[arte.png]]` ou `![](arte.png)`). */
const IMAGE_LINE = /^[ \t]*!\[(?:\[[^\]\n]+\]\]|[^\]\n]*\]\([^)\n]+\))[ \t]*$/

/**
 * Onde termina a ficha a converter: se logo depois do trecho (pulando linhas em branco) vem uma imagem sozinha, ela é a
 * arte da magia e entra junto — no formato antigo a imagem fica depois do texto, e fora do `>` ela sairia da ficha.
 */
export function fichaEnd(text: string, to: number): number {
  const match = /^(?:[ \t]*\r?\n)*([^\n]*)/.exec(text.slice(to))
  return match && IMAGE_LINE.test(match[1]!.replace(/\r$/, "")) ? to + match[0].replace(/\r$/, "").length : to
}

/** “Rótulo: valor” de uma linha de campos (`Requisito: Cura Mental\`). */
const LABELED = /^(\p{L}[\p{L} ]{0,24}?)\s*:\s*(.*)$/u

/**
 * “Converter em ficha”: uma magia (ou runa) no formato antigo — nome em negrito numa linha, custo e tipo na linha de
 * baixo, outros campos (“Requisito: …”) em seguida, depois o texto e a imagem — vira o callout da ficha. Campo vazio
 * (“Material:”) não entra. Devolve `null` se o trecho não tem esse formato.
 */
export function toFicha(text: string, kind?: FichaKind): string | null {
  const lines = text.replace(/\r\n?/g, "\n").trim().split("\n")
  const name = /^(?:\*\*(.+?)\*\*|#{2,6}\s+(.+?))\s*\\?\s*$/.exec(lines[0] ?? "")
  if (!name) return null
  let rest = lines.slice(1)
  const tokens: string[] = []
  const labeled: FichaField[] = []
  // As linhas de campos vêm logo depois do nome, até a primeira linha em branco.
  for (let first = true; rest.length; first = false) {
    const line = rest[0]!.trim().replace(/\s*\\$/, "")
    if (!line || line.startsWith("**") || line.length > 160) break
    const isCost = first && (/[·•|]/.test(line) || /\d\s*(?:PV|PA|PE|PR|pontos?)\b/i.test(line))
    if (isCost) tokens.push(...line.split(/\s*[·•|]\s*/).map((part) => part.trim()).filter(Boolean))
    else if (LABELED.test(line)) { const [, label, value] = LABELED.exec(line)!; labeled.push({ label: label!.trim(), value: value!.trim() }) }
    else break
    rest = rest.slice(1)
  }
  // “Custo: 1 PV” na linha do custo já traz o rótulo.
  const meta: string[] = []
  for (const token of tokens) {
    const own = LABELED.exec(token)
    if (own && norm(own[1]!) !== "custo") labeled.unshift({ label: own[1]!.trim(), value: own[2]!.trim() })
    else meta.push(own ? own[2]!.trim() : token)
  }
  const cost = meta.filter((part) => /\d/.test(part) && /(?:PV|PA|PE|PR|pontos?)\b/i.test(part))
  const type = meta.filter((part) => !cost.includes(part) && SPELL_TYPES.has(norm(part)))
  const range = meta.filter((part) => !cost.includes(part) && RANGES.has(norm(part)))
  const other = meta.filter((part) => !cost.includes(part) && !type.includes(part) && !range.includes(part))
  const resolved = kind ?? (cost.some((part) => /pontos?/i.test(part)) ? "runa" : "magia")
  const first = [
    cost.length ? `**Custo:** ${cost.join(" · ")}` : "",
    type.length || other.length ? `**Tipo:** ${[...type, ...other].join(" · ")}` : "",
    range.length ? `**Alcance:** ${range.join(" · ")}` : "",
  ].filter(Boolean).join(" · ")
  const fields = [first, ...labeled.filter((field) => field.value).map((field) => `**${field.label}:** ${field.value}`)].filter(Boolean)
  while (rest.length && !rest[0]!.trim()) rest = rest.slice(1)
  while (rest.length && !rest.at(-1)!.trim()) rest = rest.slice(0, -1)
  const body = rest.map((line) => (line.trim() ? `> ${line}` : ">"))
  return [`> [!${resolved}] ${titleCase((name[1] ?? name[2])!.trim())}`, ...fields.map((line) => `> ${line}`), ...(body.length ? [">", ...body] : [])].join("\n")
}
