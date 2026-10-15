import { parse as parseYaml } from "yaml"

/**
 * Blocos ```statblock``` (plugin Fantasy Statblocks) viram o callout `> [!statblock]` do dialeto, que o Obsidian e o
 * app mostram igual. Os rótulos são os do D&D 5e em português; os valores ficam como estão na nota. Campos que o
 * conversor não conhece entram como "**Campo** valor" — nada some.
 *
 * `monster:`/`creature:`/`extends:` puxam a criatura do bestiário do plugin (o `data.json`, ou uma nota com
 * `statblock: true`); o bloco ganha por cima. Criaturas do SRD, que vêm dentro do plugin, não estão no cofre: sem
 * outros campos, o bloco fica como está.
 */

type Json = Record<string, unknown>
const obj = (v: unknown): Json => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : {})
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : typeof v === "number" || typeof v === "boolean" ? String(v) : "")

/** Bestiário do plugin: `monsters: [[nome, criatura], …]` no `data.json`. */
export function statblockBestiary(json: string): Map<string, Json> {
  const map = new Map<string, Json>()
  try {
    const data = obj(JSON.parse(json))
    for (const entry of Array.isArray(data.monsters) ? data.monsters : []) {
      if (Array.isArray(entry) && typeof entry[0] === "string") map.set(entry[0].toLowerCase(), obj(entry[1]))
    }
  } catch {
    /* data.json ilegível: sem bestiário */
  }
  return map
}

/** Campos de exibição do plugin, que não são dados da criatura. */
const DISPLAY = new Set(["export", "dice", "render", "layout", "statblock", "columns", "columnWidth", "columnHeight", "forceColumns", "note", "path", "mtime", "bestiary", "monster", "creature", "extends", "source_type"])

const LINES: [string, string][] = [
  ["ac", "Classe de Armadura"],
  ["hp", "Pontos de Vida"],
  ["speed", "Deslocamento"],
]
const DETAILS: [string, string][] = [
  ["saves", "Testes de Resistência"],
  ["skillsaves", "Perícias"],
  ["damage_vulnerabilities", "Vulnerabilidades a Dano"],
  ["damage_resistances", "Resistências a Dano"],
  ["damage_immunities", "Imunidades a Dano"],
  ["condition_immunities", "Imunidades a Condição"],
  ["senses", "Sentidos"],
  ["languages", "Idiomas"],
  ["cr", "Nível de Desafio"],
  ["initiative", "Iniciativa"],
  ["vulnerability", "Vulnerabilidade"],
  ["aspects", "Aspectos"],
  ["temporaryAspects", "Aspectos Temporários"],
  ["stress", "Estresse"],
]
const SECTIONS: [string, string, string?][] = [
  ["traits", ""],
  ["spells", "Magias", "spellsNotes"],
  ["actions", "Ações"],
  ["bonus_actions", "Ações Bônus"],
  ["reactions", "Reações"],
  ["legendary_actions", "Ações Lendárias", "legendary_description"],
  ["mythic_actions", "Ações Míticas", "mythic_description"],
  ["lair_actions", "Ações de Covil"],
  ["triggered_actions", "Ações Disparadas"],
  ["nastier_traits", "Características Mais Cruéis"],
  ["consequences", "Consequências"],
  ["skills", "Perícias"],
  ["stunts", "Façanhas"],
  ["items", "Itens"],
  ["extras", "Extras"],
]
const ABILITIES = ["FOR", "DES", "CON", "INT", "SAB", "CAR"]
const FAGE = ["Precisão", "Comunicação", "Constituição", "Destreza", "Luta", "Inteligência", "Percepção", "Força", "Vontade"]
const HANDLED = new Set(["name", "image", "size", "type", "subtype", "alignment", "hit_dice", "stats", "fage_stats", "source", "statblock-link", "description", "flavor_text", "mook", ...LINES.map((l) => l[0]), ...DETAILS.map((d) => d[0]), ...SECTIONS.flatMap(([key, , intro]) => (intro ? [key, intro] : [key]))])

const signed = (n: number) => (n >= 0 ? `+${n}` : `−${-n}`)
const humanize = (key: string) => key.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase())

/** `saves: [{ dexterity: 4 }]` (ou `{ dex: 4 }`) → "Dexterity +4, …". */
function bonuses(value: unknown): string {
  const items = Array.isArray(value) ? value : [value]
  return items
    .flatMap((item) => {
      if (typeof item === "string") return [item]
      const o = obj(item)
      if (typeof o.name === "string") return [`${o.name}${o.desc ? ` ${text(o.desc)}` : ""}`]
      return Object.entries(o).map(([k, v]) => (typeof v === "number" ? `${humanize(k)} ${signed(v)}` : `${humanize(k)} ${text(v)}`))
    })
    .filter(Boolean)
    .join(", ")
}

/** Valor de qualquer campo como texto de uma linha (listas com vírgula, mapas como "chave: valor"). */
function inline(value: unknown): string {
  if (Array.isArray(value)) return value.map(inline).filter(Boolean).join(", ")
  if (value && typeof value === "object") return Object.entries(value as Json).map(([k, v]) => `${humanize(k)}: ${inline(v)}`).join("; ")
  return text(value)
}

/** Itens de uma seção (características, ações…): `**Nome.** descrição`, com os aninhados logo abaixo. */
function traitLines(value: unknown): string[][] {
  const items = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]
  return items.flatMap((item): string[][] => {
    if (typeof item === "string" || typeof item === "number") return [[String(item)]]
    const o = obj(item)
    const name = text(o.name)
    const desc = text(o.desc ?? o.description)
    const rest = Object.entries(o).filter(([k]) => !["name", "desc", "description", "traits"].includes(k))
    if (!name && !desc && rest.length) return [[rest.map(([k, v]) => `**${humanize(k)}:** ${inline(v)}`).join(" · ")]]
    const first = [`${name ? `**${name.replace(/\.$/, "")}.** ` : ""}${desc}`.trim(), ...rest.map(([k, v]) => `*${humanize(k)}:* ${inline(v)}`)].join(" · ")
    return [[first], ...traitLines(o.traits)]
  })
}

export interface StatblockConversion {
  /** O callout (linhas começando com `>`), ou `null` se não há o que mostrar (o motivo está nos avisos). */
  markdown: string | null
  name: string
  warnings: string[]
}

export function convertStatblock(source: string, bestiary: (name: string) => Json | undefined): StatblockConversion {
  const warnings: string[] = []
  let block: Json
  try {
    block = obj(parseYaml(source))
  } catch (error) {
    return { markdown: null, name: "", warnings: [`O YAML do statblock tem erro (${error instanceof Error ? error.message.split("\n")[0] : String(error)}); o bloco ficou como está.`] }
  }
  // Criatura do bestiário por baixo do bloco.
  let data: Json = {}
  for (const key of ["extends", "monster", "creature"]) {
    for (const ref of Array.isArray(block[key]) ? (block[key] as unknown[]) : block[key] !== undefined ? [block[key]] : []) {
      const name = text(ref)
      if (!name) continue
      const base = bestiary(name)
      if (base) data = { ...data, ...base }
      else warnings.push(`A criatura “${name}” vem do bestiário do plugin (SRD) e não está no cofre${Object.keys(block).some((k) => !DISPLAY.has(k)) ? "; só os campos do bloco foram levados" : ""}.`)
    }
  }
  data = { ...data, ...Object.fromEntries(Object.entries(block).filter(([k]) => !DISPLAY.has(k))) }
  const fields = Object.keys(data).filter((k) => data[k] !== null && data[k] !== undefined && data[k] !== "")
  if (!fields.length) return { markdown: null, name: text(block.monster ?? block.creature), warnings: [...warnings, "Não há campos para mostrar; o bloco ficou como está."] }

  const name = text(data.name) || text(block.monster ?? block.creature) || "Criatura"
  const paragraphs: string[][] = []
  const image = text(data.image)
  if (image) {
    const target = /\[\[([^\]|]+)/.exec(image)?.[1]
    if (target) paragraphs.push([`![[${target}|200]]`])
    else {
      warnings.push(`A imagem ${image} vem da internet e ficou só como link.`)
      paragraphs.push([`[Imagem](${image})`])
    }
  }
  const kind = [text(data.size), text(data.type)].filter(Boolean).join(" ") + (text(data.subtype) ? ` (${text(data.subtype)})` : "")
  const subtitle = [kind, text(data.alignment)].filter(Boolean).join(", ")
  if (subtitle) paragraphs.push([`*${subtitle}*`])
  const flavor = text(data.flavor_text) || text(data.description)
  if (flavor) paragraphs.push([flavor])

  const main = LINES.flatMap(([key, label]) => {
    if (data[key] === undefined || data[key] === "") return []
    const value = key === "hp" && text(data.hit_dice) ? `${inline(data.hp)} (${text(data.hit_dice)})` : inline(data[key])
    return [`**${label}** ${value}`]
  })
  if (data.mook === true) main.push("**Lacaio**")
  // Numa linha só, separados por " · ": quebra de linha simples o Obsidian mostra e o leitor do app junta.
  if (main.length) paragraphs.push([main.join(" · ")])

  const stats = Array.isArray(data.stats) ? data.stats : null
  if (stats?.length) {
    const labels = stats.length === 6 ? ABILITIES : stats.map((_, i) => `Atributo ${i + 1}`)
    const cell = (v: unknown) => (typeof v === "number" ? `${v} (${signed(Math.floor((v - 10) / 2))})` : text(v))
    paragraphs.push([`| ${labels.join(" | ")} |`, `|${labels.map(() => ":---:").join("|")}|`, `| ${stats.map(cell).join(" | ")} |`])
  }
  const fage = Array.isArray(data.fage_stats) ? data.fage_stats : null
  if (fage?.length) {
    const labels = fage.map((_, i) => FAGE[i] ?? `Atributo ${i + 1}`)
    paragraphs.push([`| ${labels.join(" | ")} |`, `|${labels.map(() => ":---:").join("|")}|`, `| ${fage.map(text).join(" | ")} |`])
  }

  const details = DETAILS.flatMap(([key, label]) => {
    const value = data[key]
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) return []
    return [`**${label}** ${key === "saves" || key === "skillsaves" ? bonuses(value) : inline(value)}`]
  })
  // Campos que o conversor não conhece, para não perder nada.
  const sections = [...SECTIONS]
  for (const key of Object.keys(data)) {
    if (HANDLED.has(key) || DISPLAY.has(key)) continue
    const value = data[key]
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value) && value.some((v) => v && typeof v === "object" && "name" in (v as Json))) sections.push([key, humanize(key)])
    else details.push(`**${humanize(key)}** ${inline(value)}`)
  }
  if (details.length) paragraphs.push([details.join(" · ")])

  for (const [key, label, intro] of sections) {
    const items = traitLines(data[key])
    const lead = intro ? text(data[intro]) : ""
    if (!items.length && !lead) continue
    if (label) paragraphs.push([`**${label}**`])
    if (lead) paragraphs.push([lead])
    paragraphs.push(...items)
  }
  const credit = inline(data.source)
  const link = text(data["statblock-link"])
  if (credit || link) paragraphs.push([[credit && `*Fonte: ${credit}*`, link].filter(Boolean).join(" · ")])

  const body = paragraphs.map((lines) => lines.flatMap((line) => line.split(/\r?\n/)).map((line) => (line ? `> ${line}` : ">")).join("\n")).join("\n>\n")
  return { markdown: `> [!statblock] ${name}\n${body}`, name, warnings }
}
