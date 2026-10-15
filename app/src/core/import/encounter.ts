import { parse as parseYaml } from "yaml"
import { flowList, flowMap, yamlScalar } from "./yaml-out"

/**
 * Blocos ```encounter``` e ```encounter-table``` (plugin Initiative Tracker) viram blocos ```runas-encontro```
 * (`core/encounters.ts`). A sintaxe dos combatentes é a documentada pelo plugin:
 *
 * - `- Goblin` · `- 3: Goblin` (quantidade; pode ser rolagem, `1d4: Goblin`)
 * - `- Goblin, 7, 15, 2, 50` (PV, CA, modificador de iniciativa, XP) · com `, hidden` e `, friend`/`ally`
 * - `- [Hobgoblin, Capitão]` (nome e apelido) · `- [[Hobgoblin, Capitão], 11, 18, 1]`
 * - `- { creature: Hobgoblin, name: Capitão, hp: 11, ac: 18, mod: 1, xp: 100, hidden: true, friend: true }`
 *
 * Vários encontros no mesmo bloco ficam separados por linhas `---`; cada um vira um bloco.
 */

type Json = Record<string, unknown>
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined)
const FLAG_HIDDEN = /^hidden$/i
const FLAG_ALLY = /^(?:friend|friendly|ally)$/i

interface RawCombatant {
  name: string
  display?: string
  count: number | string
  hp?: number
  ac?: number | string
  mod?: number
  xp?: number
  hidden: boolean
  ally: boolean
}

/** Um combatente da lista `creatures:`; `null` se não tem nome. */
export function readCreature(raw: unknown): RawCombatant | null {
  let count: number | string = 1
  let monster: unknown = raw
  if (typeof raw === "string") {
    const m = /^(\d+)\s*:\s*(.+)$/.exec(raw.trim())
    if (m) [count, monster] = [Number(m[1]), m[2]]
  } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const entries = Object.entries(raw as Json)
    // `- 3: Goblin` em YAML é um mapa { 3: Goblin }; `- { creature: … }` é a forma longa.
    if (entries.length === 1 && !/^(creature|name)$/.test(entries[0]![0])) {
      const [key, value] = entries[0]!
      count = num(key) ?? key.trim()
      monster = value
    }
  }
  if (typeof count === "number" && count < 1) count = 0
  const base = { count, hidden: false, ally: false }
  const stats = (values: unknown[]) => {
    const [hp, ac, mod, xp] = values.map((v) => num(v))
    // A CA pode ser texto ("15 (armadura)") no Fantasy Statblocks.
    const acText = typeof values[1] === "string" && num(values[1]) === undefined && values[1].trim() ? values[1].trim() : undefined
    return { ...(hp !== undefined ? { hp } : {}), ...(ac !== undefined ? { ac } : acText ? { ac: acText } : {}), ...(mod !== undefined ? { mod } : {}), ...(xp !== undefined ? { xp } : {}) }
  }
  if (typeof monster === "string") {
    const parts = monster.split(/\s*,\s*/)
    const flags = parts.slice(1)
    const name = parts[0]!.trim()
    if (!name) return null
    return { ...base, name, ...stats(flags.filter((f) => !FLAG_HIDDEN.test(f) && !FLAG_ALLY.test(f))), hidden: flags.some((f) => FLAG_HIDDEN.test(f)), ally: flags.some((f) => FLAG_ALLY.test(f)) }
  }
  if (Array.isArray(monster)) {
    const [head, ...rest] = monster
    let name: string | undefined
    let display: string | undefined
    let values = rest
    if (Array.isArray(head)) [name, display] = [String(head[0] ?? ""), head[1] === undefined ? undefined : String(head[1])]
    else {
      name = String(head ?? "")
      if (typeof rest[0] === "string" && num(rest[0]) === undefined && !FLAG_HIDDEN.test(rest[0]) && !FLAG_ALLY.test(rest[0])) [display, ...values] = rest as [string, ...unknown[]]
    }
    if (!name?.trim()) return null
    const flags = values.filter((v) => typeof v === "string" && (FLAG_HIDDEN.test(v) || FLAG_ALLY.test(v))) as string[]
    return { ...base, name: name.trim(), ...(display?.trim() ? { display: display.trim() } : {}), ...stats(values.filter((v) => !flags.includes(v as string))), hidden: flags.some((f) => FLAG_HIDDEN.test(f)), ally: flags.some((f) => FLAG_ALLY.test(f)) }
  }
  if (monster && typeof monster === "object") {
    const o = monster as Json
    const name = typeof o.creature === "string" ? o.creature.trim() : typeof o.name === "string" ? o.name.trim() : ""
    if (!name) return null
    const display = typeof o.creature === "string" && typeof o.name === "string" ? o.name.trim() : undefined
    return { ...base, name, ...(display ? { display } : {}), ...stats([o.hp, o.ac, o.mod ?? o.modifier, o.xp]), hidden: o.hidden === true, ally: o.friend === true || o.ally === true || o.friendly === true }
  }
  return null
}

export interface EncounterConversion {
  /** Um conteúdo de bloco ```runas-encontro``` por encontro. */
  blocks: string[]
  combatants: number
  warnings: string[]
}

/** `note` acha a nota de uma criatura pelo nome (para o link), se houver. */
export function convertEncounter(source: string, note: (name: string) => string | null = () => null): EncounterConversion {
  const warnings: string[] = []
  const blocks: string[] = []
  let combatants = 0
  for (const part of source.split(/^-{3,}\s*$/m)) {
    if (!part.trim()) continue
    let data: Json
    try {
      const parsed = parseYaml(part)
      data = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Json) : {}
    } catch (error) {
      warnings.push(`Um encontro tem YAML com erro (${error instanceof Error ? error.message.split("\n")[0] : String(error)}) e ficou de fora.`)
      continue
    }
    const lines: string[] = []
    if (typeof data.name === "string" && data.name.trim()) lines.push(`nome: ${yamlScalar(data.name.trim())}`)
    const players = data.players
    if (players === false || players === "none") lines.push("jogadores: false")
    else if (Array.isArray(players)) lines.push(`jogadores: ${flowList(players.map(String))}`)
    else if (typeof players === "string" && players.trim()) lines.push(`jogadores: ${flowList([players.trim()])}`)
    else if (players === true) lines.push("jogadores: true")
    if (typeof data.party === "string" && data.party.trim()) lines.push(`grupo: ${yamlScalar(data.party.trim())}`)
    const hide = (Array.isArray(data.hide) ? data.hide : data.hide ? [data.hide] : []).map(String).map((h) => (h === "players" ? "jogadores" : h === "creatures" ? "criaturas" : h))
    if (hide.length) lines.push(`esconder: ${flowList(hide)}`)
    if (num(data.xp) !== undefined) lines.push(`xp: ${num(data.xp)}`)
    const rollHp = data.rollHP === true
    const list = Array.isArray(data.creatures) ? data.creatures : data.creatures ? [data.creatures] : []
    const out: string[] = []
    for (const raw of list) {
      const c = readCreature(raw)
      if (!c) {
        warnings.push(`Combatente sem nome ignorado: ${JSON.stringify(raw)}.`)
        continue
      }
      const link = note(c.name)
      combatants += typeof c.count === "number" ? c.count : 1
      out.push(
        `  - ${flowMap({
          nome: c.name,
          ...(c.display ? { apelido: c.display } : {}),
          ...(c.count !== 1 ? { quantidade: c.count } : {}),
          ...(c.hp !== undefined ? { pv: c.hp } : {}),
          ...(c.ac !== undefined ? { ca: c.ac } : {}),
          ...(c.mod !== undefined ? { iniciativa: c.mod } : {}),
          ...(c.xp !== undefined ? { xp: c.xp } : {}),
          ...(link ? { nota: `[[${link}]]` } : {}),
          ...(c.hidden ? { oculto: true } : {}),
          ...(c.ally ? { aliado: true } : {}),
          ...(rollHp && c.hp === undefined ? { rolar_pv: true } : {}),
        })}`,
      )
    }
    lines.push(out.length ? "combatentes:" : "combatentes: []", ...out)
    const unknown = Object.keys(data).filter((k) => !["name", "players", "party", "hide", "xp", "rollHP", "creatures"].includes(k))
    if (unknown.length) warnings.push(`Campos do encontro sem equivalente: ${unknown.join(", ")}.`)
    blocks.push(lines.join("\n"))
  }
  return { blocks, combatants, warnings }
}
