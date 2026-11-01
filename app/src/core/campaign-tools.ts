import { parse as parseYaml, stringify } from "yaml"
import { parseEncounter } from "./encounters"

/**
 * Ferramentas da campanha: o tesouro do grupo e a iniciativa presencial, cada uma num bloco YAML de uma nota em
 * `Campanhas/<nome>/Ferramentas/` (`runas-tesouro` e `runas-iniciativa`). O texto continua legível no Obsidian.
 */

export interface TreasureItem {
  id: string
  name: string
  quantity: number
  holder: string
  notes: string
}

export interface Treasury {
  /** Moedas em texto livre (“12 po + 3 peças de prata”): o app não conhece as regras do sistema. */
  coins: string
  items: TreasureItem[]
}

export interface Participant {
  id: string
  name: string
  value: number
  hidden: boolean
  note: string
}

export interface Initiative {
  round: number
  active: string | null
  participants: Participant[]
}

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
const text = (value: unknown) => (typeof value === "string" ? value : "")

// ---------- Tesouro ----------

export function parseTreasury(code: string): Treasury {
  const data = object(parseYaml(code))
  const items = (Array.isArray(data.itens) ? data.itens : []).map((value, i) => {
    const row = object(value)
    const quantity = Number(row.quantidade ?? 1)
    if (typeof row.nome !== "string" || !Number.isFinite(quantity) || quantity < 0) throw new Error("Item de tesouro inválido.")
    return { id: typeof row.id === "string" ? row.id : String(i), name: row.nome, quantity, holder: text(row.portador), notes: text(row.notas) }
  })
  return { coins: typeof data.moedas === "string" ? data.moedas : String(data.moedas ?? ""), items }
}

export function treasuryYaml(data: Treasury): string {
  return stringify({
    moedas: data.coins,
    itens: data.items.map((item) => ({ id: item.id, nome: item.name, quantidade: item.quantity, portador: item.holder, notas: item.notes })),
  })
}

/** Acrescenta um item no fim do tesouro (a recompensa de uma missão concluída, por exemplo). */
export function withTreasureItem(code: string, item: Omit<TreasureItem, "id">, id: string): string {
  const treasury = parseTreasury(code)
  return treasuryYaml({ ...treasury, items: [...treasury.items, { id, ...item }] })
}

// ---------- Iniciativa ----------

export function parseInitiative(code: string): Initiative {
  const data = object(parseYaml(code))
  const participants = (Array.isArray(data.participantes) ? data.participantes : [])
    .map((value, i) => {
      const row = object(value)
      const initiative = Number(row.iniciativa ?? 0)
      if (typeof row.nome !== "string" || !Number.isFinite(initiative)) throw new Error("Participante inválido.")
      return { id: typeof row.id === "string" ? row.id : String(i), name: row.nome, value: initiative, hidden: row.oculto === true, note: text(row.nota) }
    })
    .sort((a, b) => b.value - a.value)
  if (new Set(participants.map((p) => p.id)).size !== participants.length) throw new Error("Participantes com identificadores repetidos.")
  const round = typeof data.rodada === "number" && Number.isSafeInteger(data.rodada) && data.rodada > 0 ? data.rodada : 1
  const active = typeof data.ativo === "string" && participants.some((p) => p.id === data.ativo) ? data.ativo : participants[0]?.id ?? null
  return { round, active, participants }
}

export function initiativeYaml(data: Initiative): string {
  return stringify({
    rodada: data.round,
    ativo: data.active,
    participantes: data.participants.map((p) => ({ id: p.id, nome: p.name, iniciativa: p.value, oculto: p.hidden, nota: p.note })),
  })
}

/** Passa o turno (ou volta, com `-1`); dar a volta na lista muda a rodada. */
export function advanceInitiative(data: Initiative, direction: 1 | -1 = 1): Initiative {
  if (!data.participants.length) return { ...data, active: null }
  const current = Math.max(0, data.participants.findIndex((p) => p.id === data.active))
  const next = (current + direction + data.participants.length) % data.participants.length
  const turn = direction === 1 && next === 0 ? 1 : direction === -1 && current === 0 ? -1 : 0
  return { ...data, active: data.participants[next]!.id, round: Math.max(1, data.round + turn) }
}

/** Participantes de um bloco `runas-encontro`, com 1d20 mais o modificador de cada um (até 200 participantes). */
export function initiativeFromEncounter(code: string, random = Math.random): Initiative {
  const encounter = parseEncounter(code)
  const participants = encounter.combatants
    .flatMap((c, i) => {
      const count = typeof c.count === "number" ? Math.min(100, Math.max(1, Math.floor(c.count))) : 1
      return Array.from({ length: count }, (_, n) => ({
        id: `c${i}-${n}`,
        name: `${c.display ?? c.name}${count > 1 ? ` ${n + 1}` : ""}`,
        value: 1 + Math.min(19, Math.max(0, Math.floor(random() * 20))) + (c.initiative ?? 0),
        hidden: c.hidden,
        note: c.note ?? "",
      }))
    })
    .slice(0, 200)
    .sort((a, b) => b.value - a.value)
  return { round: 1, active: participants[0]?.id ?? null, participants }
}
