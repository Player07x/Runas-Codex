import { parse as parseYaml } from "yaml"

/**
 * Encontros genéricos (checklist C): a lista de participantes de um combate, sem ficha, num bloco
 * ```runas-encontro``` em YAML. É o formato que a migração do Initiative Tracker grava e o que a mesa lê para
 * montar a iniciativa (ADR 0014):
 *
 * ```yaml
 * nome: Emboscada na estrada
 * jogadores: true                 # true = todos; uma lista de nomes; false = nenhum
 * combatentes:
 *   - { nome: Goblin, quantidade: 3, pv: 7, ca: 15, iniciativa: 2 }
 *   - { nome: Hobgoblin, apelido: Capitão, nota: "[[Hobgoblin]]", oculto: true }
 *   - { nome: Lobo, quantidade: 1d4, aliado: true, xp: 50 }
 * ```
 *
 * `iniciativa` é o modificador somado à rolagem; `quantidade` pode ser um número ou uma rolagem (`1d4+1`); `oculto`
 * não aparece para os jogadores; `aliado` luta do lado do grupo.
 */

export interface Combatant {
  name: string
  display?: string
  /** Quantos (número) ou uma rolagem (`1d4`). */
  count: number | string
  hp?: number
  ac?: number | string
  /** Modificador de iniciativa. */
  initiative?: number
  xp?: number
  /** Alvo do link da nota da criatura. */
  note?: string
  hidden: boolean
  ally: boolean
  rollHp: boolean
}

export interface Encounter {
  name?: string
  /** `true` = todos os jogadores; lista = esses; `false` = nenhum. */
  players: boolean | string[]
  party?: string
  /** O que fica escondido dos jogadores no rastreador: `jogadores` e/ou `criaturas`. */
  hide: string[]
  xp?: number
  combatants: Combatant[]
}

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined)
const text = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
const linkTarget = (v: unknown) => /\[\[([^\]|#]+)/.exec(text(v))?.[1]?.trim() ?? (text(v) || undefined)

export function parseEncounter(source: string): Encounter {
  let data: unknown
  try {
    data = parseYaml(source)
  } catch (error) {
    throw new Error(`YAML inválido: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`)
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("O encontro precisa ser um mapa YAML (nome:, combatentes:…).")
  const d = data as Record<string, unknown>
  const players = d.jogadores === undefined ? true : Array.isArray(d.jogadores) ? d.jogadores.map(text).filter(Boolean) : d.jogadores !== false
  const combatants = (Array.isArray(d.combatentes) ? d.combatentes : []).flatMap((c): Combatant[] => {
    if (typeof c === "string" && c.trim()) return [{ name: c.trim(), count: 1, hidden: false, ally: false, rollHp: false }]
    if (!c || typeof c !== "object") return []
    const o = c as Record<string, unknown>
    const name = text(o.nome)
    if (!name) return []
    const count = num(o.quantidade) ?? (text(o.quantidade) || 1)
    return [
      {
        name,
        ...(text(o.apelido) ? { display: text(o.apelido) } : {}),
        count,
        ...(num(o.pv) !== undefined ? { hp: num(o.pv) } : {}),
        ...(o.ca !== undefined && text(o.ca) ? { ac: num(o.ca) ?? text(o.ca) } : {}),
        ...(num(o.iniciativa) !== undefined ? { initiative: num(o.iniciativa) } : {}),
        ...(num(o.xp) !== undefined ? { xp: num(o.xp) } : {}),
        ...(linkTarget(o.nota) ? { note: linkTarget(o.nota) } : {}),
        hidden: o.oculto === true,
        ally: o.aliado === true,
        rollHp: o.rolar_pv === true,
      },
    ]
  })
  return {
    ...(text(d.nome) ? { name: text(d.nome) } : {}),
    players,
    ...(text(d.grupo) ? { party: text(d.grupo) } : {}),
    hide: (Array.isArray(d.esconder) ? d.esconder : d.esconder ? [d.esconder] : []).map(text).filter(Boolean),
    ...(num(d.xp) !== undefined ? { xp: num(d.xp) } : {}),
    combatants,
  }
}

/** Total de participantes (as quantidades por rolagem contam como 1 até alguém rolar). */
export function combatantCount(encounter: Encounter): number {
  return encounter.combatants.reduce((sum, c) => sum + (typeof c.count === "number" ? c.count : 1), 0)
}
