/**
 * Estados das tarefas, como no plugin Tasks do Obsidian (`src/Statuses/` da versão 8.6.0): o caractere entre os
 * colchetes escolhe o estado; cada estado diz o próximo (ao clicar) e o tipo, que decide o comportamento (concluir põe
 * a data ✅, cancelar põe ❌, `DONE` gera a próxima recorrência).
 */

export const STATUS_TYPES = ["TODO", "DONE", "IN_PROGRESS", "ON_HOLD", "CANCELLED", "NON_TASK", "EMPTY"] as const
export type StatusType = (typeof STATUS_TYPES)[number]

export interface Status {
  symbol: string
  name: string
  nextStatusSymbol: string
  availableAsCommand: boolean
  type: StatusType
}

export const TODO: Status = { symbol: " ", name: "Todo", nextStatusSymbol: "x", availableAsCommand: true, type: "TODO" }
export const DONE: Status = { symbol: "x", name: "Done", nextStatusSymbol: " ", availableAsCommand: true, type: "DONE" }
export const IN_PROGRESS: Status = { symbol: "/", name: "In Progress", nextStatusSymbol: "x", availableAsCommand: true, type: "IN_PROGRESS" }
export const CANCELLED: Status = { symbol: "-", name: "Cancelled", nextStatusSymbol: " ", availableAsCommand: true, type: "CANCELLED" }
export const ON_HOLD: Status = { symbol: "h", name: "On Hold", nextStatusSymbol: " ", availableAsCommand: true, type: "ON_HOLD" }
const EMPTY: Status = { symbol: "", name: "EMPTY", nextStatusSymbol: "", availableAsCommand: true, type: "EMPTY" }

/** Estados que o Tasks traz ligados: os dois do núcleo e os dois "personalizados" padrão. */
export const DEFAULT_CORE_STATUSES: Status[] = [TODO, DONE]
export const DEFAULT_CUSTOM_STATUSES: Status[] = [IN_PROGRESS, CANCELLED]

/** Ordem dos tipos nos agrupamentos e na ordenação (`status.typeGroupText`). */
const TYPE_ORDER: Record<StatusType, number> = { IN_PROGRESS: 1, TODO: 2, ON_HOLD: 3, DONE: 4, CANCELLED: 5, NON_TASK: 6, EMPTY: 7 }

export function typeGroupText(type: StatusType): string {
  return `%%${TYPE_ORDER[type]}%%${type}`
}

export function statusTypeFrom(value: unknown): StatusType {
  const upper = typeof value === "string" ? value.toUpperCase() : ""
  return (STATUS_TYPES as readonly string[]).includes(upper) ? (upper as StatusType) : "TODO"
}

/** Estado de um caractere que não está configurado: o Tasks o trata como "a fazer" que vai para `x`. */
function unknownStatus(symbol: string): Status {
  return { symbol, name: "Unknown", nextStatusSymbol: "x", availableAsCommand: false, type: "TODO" }
}

export function sameStatus(a: Status, b: Status): boolean {
  return a.symbol === b.symbol && a.name === b.name && a.nextStatusSymbol === b.nextStatusSymbol && a.availableAsCommand === b.availableAsCommand && a.type === b.type
}

/** Registro de estados de um cofre (os do Tasks configurados, ou os padrões). */
export class StatusRegistry {
  readonly statuses: readonly Status[]

  constructor(statuses: Status[] = [...DEFAULT_CORE_STATUSES, ...DEFAULT_CUSTOM_STATUSES]) {
    // Como no Tasks: o primeiro de cada símbolo vale; símbolo vazio não entra.
    const seen = new Set<string>()
    this.statuses = statuses.filter((s) => s.symbol !== "" && !seen.has(s.symbol) && (seen.add(s.symbol), true))
  }

  bySymbol(symbol: string): Status {
    return this.statuses.find((s) => s.symbol === symbol) ?? EMPTY
  }

  bySymbolOrCreate(symbol: string): Status {
    return this.statuses.find((s) => s.symbol === symbol) ?? unknownStatus(symbol)
  }

  byName(name: string): Status {
    return this.statuses.find((s) => s.name === name) ?? EMPTY
  }

  /** O próximo estado ao clicar (ou um "desconhecido" com o símbolo pedido, se ele não estiver configurado). */
  next(status: Status): Status {
    if (status.nextStatusSymbol !== "") {
      const found = this.bySymbol(status.nextStatusSymbol)
      if (found.type !== "EMPTY") return found
    }
    return unknownStatus(status.nextStatusSymbol)
  }

  /**
   * Estado da próxima ocorrência de uma tarefa recorrente que acabou de ser concluída: anda pelos "próximos" até achar
   * um TODO; senão um IN_PROGRESS; senão o espaço (getNextRecurrenceStatusOrCreate do Tasks).
   */
  nextRecurrence(done: Status): Status {
    const first = this.next(done)
    for (const wanted of ["TODO", "IN_PROGRESS"] as const) {
      if (first.type === wanted) return first
      let search = first
      // Limite do Tasks contra laço infinito: o número de estados configurados menos um.
      for (let i = 0; i < this.statuses.length - 1; i++) {
        search = this.next(search)
        if (search.type === wanted) return search
      }
    }
    return this.bySymbolOrCreate(" ")
  }
}
