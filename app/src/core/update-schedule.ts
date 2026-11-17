import { compareVersions, parseVersion, type UpdateInfo } from "./updates"

/**
 * Aviso de atualização (ADR 0038): com a opção ligada (padrão), o app consulta as versões publicadas uma vez por dia,
 * ao abrir. O que lembrar fica neste aparelho (`localStorage`), nunca no cofre: o dia da última consulta e a versão
 * nova que ela achou, para o aviso continuar na barra lateral até o fim do dia sem consultar de novo.
 */
export interface UpdateMemory {
  /** Dia local da última consulta que deu certo (`2026-11-17`). */
  checkedOn: string | null
  /** A versão mais nova que essa consulta achou para este sistema (com instalador), se havia. */
  latest: string | null
}

export const EMPTY_UPDATE_MEMORY: UpdateMemory = { checkedOn: null, latest: null }

/** O dia local de uma data, no formato das propriedades do cofre (`AAAA-MM-DD`). */
export function dayKey(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Lê o que ficou guardado; qualquer coisa estranha vira "nunca consultou". */
export function parseUpdateMemory(raw: string | null): UpdateMemory {
  if (!raw) return EMPTY_UPDATE_MEMORY
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== "object" || value === null) return EMPTY_UPDATE_MEMORY
    const record = value as Record<string, unknown>
    const checkedOn = typeof record.checkedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.checkedOn) ? record.checkedOn : null
    const latest = typeof record.latest === "string" && parseVersion(record.latest) ? record.latest : null
    return { checkedOn, latest }
  } catch {
    return EMPTY_UPDATE_MEMORY
  }
}

export function serializeUpdateMemory(memory: UpdateMemory): string {
  return JSON.stringify(memory)
}

/** Consulta sozinha só com a opção ligada e se ainda não consultou hoje (uma consulta que falhou não conta). */
export function shouldAutoCheck(enabled: boolean, memory: UpdateMemory, today: string): boolean {
  return enabled && memory.checkedOn !== today
}

/** O que guardar depois de uma consulta: só conta a versão que tem instalador conferível para este sistema. */
export function rememberCheck(info: UpdateInfo, today: string): UpdateMemory {
  return { checkedOn: today, latest: installable(info) ? info.latest!.version : null }
}

/** A versão nova lembrada, se ainda é mais nova que a instalada (depois de atualizar, o aviso some sozinho). */
export function rememberedUpdate(memory: UpdateMemory, current: string): string | null {
  if (!memory.latest || !parseVersion(current)) return null
  return compareVersions(memory.latest, current) > 0 ? memory.latest : null
}

/** Dá para instalar pelo app: há versão mais nova, o instalador deste sistema e a lista de somas SHA-256. */
export function installable(info: UpdateInfo | null): boolean {
  return Boolean(info?.newer && info.latest && info.asset && info.checksums)
}
