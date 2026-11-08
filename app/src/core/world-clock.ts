import { parse as parseYaml } from "yaml"
import { addDays, parseClockData, type Calendar, type WorldClockConfig, type WorldDate } from "./calendar"
import { findCodeBlocks, replaceCodeBlock, setBlockLine } from "./codeblocks"

/**
 * Relógio do mundo (U30): a hora fica no mesmo bloco `runas-calendario` do `hoje:` (`hora: "07:30"`, `periodo: Dia`,
 * `relogio: { horas: 12, minutos: 60, periodos: [Dia, Noite] }`). Cada volta do mostrador é um período; depois do
 * último período, o dia avança. Aqui fica só a conta, sem tela.
 */
export type WorldClock = WorldClockConfig

export const DEFAULT_CLOCK: WorldClock = { hora: "00:00", periodo: "Dia", horas: 12, minutos: 60, periodos: ["Dia", "Noite"] }

/** O relógio do calendário; sem `relogio:` no bloco, o padrão (Dia e Noite de 12 h, começando no Dia). */
export function parseWorldClock(calendar: Calendar | null | undefined): WorldClock {
  return calendar?.worldClock ?? DEFAULT_CLOCK
}

/** Minutos por volta (um período) e por dia (todos os períodos). */
export const minutesPerTurn = (clock: WorldClock) => clock.horas * clock.minutos
export const minutesPerDay = (clock: WorldClock) => minutesPerTurn(clock) * Math.max(1, clock.periodos.length)

const periodIndex = (clock: WorldClock) => Math.max(0, clock.periodos.indexOf(clock.periodo))

/** Minutos desde o começo da volta, com a hora lida e limitada ao relógio. */
export function clockMinutes(clock: WorldClock): number {
  const [hour = 0, minute = 0] = clock.hora.split(":").map((part) => Number(part) || 0)
  return Math.max(0, Math.min(minutesPerTurn(clock) - 1, hour * clock.minutos + minute))
}

/** `HH:MM` de um número de minutos dentro da volta. */
export function clockText(minutes: number, clock: WorldClock): string {
  const hour = Math.floor(minutes / clock.minutos), minute = minutes % clock.minutos
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

/**
 * Avança (ou volta, com minutos negativos) o relógio: passar do fim da volta troca de período e passar do último
 * período soma um dia. `days` diz quantos dias a data andou (negativo ao voltar).
 */
export function advanceClock(clock: WorldClock, minutes: number): { clock: WorldClock; days: number } {
  const turn = minutesPerTurn(clock), day = minutesPerDay(clock)
  const position = periodIndex(clock) * turn + clockMinutes(clock) + Math.trunc(minutes)
  const days = Math.floor(position / day)
  const inDay = position - days * day
  const period = Math.floor(inDay / turn)
  return { clock: { ...clock, hora: clockText(inDay - period * turn, clock), periodo: clock.periodos[period] ?? clock.periodo }, days }
}

/** O próximo período e quantos minutos faltam para ele (o fim da volta). */
export function nextPeriodIn(clock: WorldClock): { period: string; minutes: number; newDay: boolean } {
  const at = periodIndex(clock)
  return { period: clock.periodos[(at + 1) % clock.periodos.length] ?? clock.periodo, minutes: minutesPerTurn(clock) - clockMinutes(clock), newDay: at === clock.periodos.length - 1 }
}

/** “4 h 30 min”, “45 min”, “2 h” nas horas e minutos do relógio. */
export function durationText(minutes: number, clock: WorldClock): string {
  const hours = Math.floor(minutes / clock.minutos), rest = minutes % clock.minutos
  return [hours ? `${hours} h` : "", rest || !hours ? `${rest} min` : ""].filter(Boolean).join(" ")
}

/** Ângulos dos ponteiros, em graus a partir do topo: a hora dá uma volta por período, o minuto uma por hora. */
export function handAngles(clock: WorldClock): { hour: number; minute: number; progress: number } {
  const minutes = clockMinutes(clock)
  const progress = minutes / minutesPerTurn(clock)
  return { hour: progress * 360, minute: ((minutes % clock.minutos) / clock.minutos) * 360, progress }
}

/** Avança o relógio e a data juntos (a data só muda quando o relógio passa do último período). */
export function advanceWorldClock(calendar: Calendar, today: WorldDate | undefined, clock: WorldClock, minutes: number): { clock: WorldClock; today?: WorldDate } {
  const next = advanceClock(clock, minutes)
  return { clock: next.clock, today: today && next.days ? addDays(calendar, today, next.days) : today }
}

/** Confere hora e período antes de gravar; devolve o problema em texto ou `null`. */
export function clockProblem(clock: WorldClock): string | null {
  if (!clock.periodos.length) return "O relógio precisa de pelo menos um período."
  if (new Set(clock.periodos.map((p) => p.trim().toLocaleLowerCase("pt-BR"))).size !== clock.periodos.length) return "Dois períodos com o mesmo nome."
  if (clock.periodos.some((p) => !p.trim())) return "Dê um nome a cada período."
  if (!Number.isInteger(clock.horas) || clock.horas < 1 || clock.horas > 99) return "Horas por volta: de 1 a 99."
  if (!Number.isInteger(clock.minutos) || clock.minutos < 1 || clock.minutos > 99) return "Minutos por hora: de 1 a 99."
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.hora.trim())
  if (!match) return "Escreva a hora como HH:MM (ex.: 07:30)."
  if (Number(match[1]) >= clock.horas || Number(match[2]) >= clock.minutos) return `A hora vai de 00:00 a ${clockText(minutesPerTurn(clock) - 1, clock)} neste relógio.`
  if (!clock.periodos.includes(clock.periodo)) return "Escolha um dos períodos do relógio."
  return null
}

const yamlText = (value: string) => (/^[\p{L}\p{N}][\p{L}\p{N} '-]*$/u.test(value) && !/^(true|false|null|yes|no|on|off|~)$/i.test(value) ? value : JSON.stringify(value))

/** Troca a chave de topo inteira (a linha e as linhas recuadas logo abaixo, se o valor estava em bloco). */
function setTopKey(content: string, key: string, value: string): string {
  const lines = content.split(/\r?\n/)
  const at = lines.findIndex((line) => new RegExp(`^${key}\\s*:`).test(line))
  if (at < 0) return setBlockLine(content, key, value)
  let end = at + 1
  while (end < lines.length) {
    if (/^\s+\S/.test(lines[end]!)) { end++; continue }
    // Linha em branco só faz parte do valor quando outra linha recuada vem depois dela.
    let next = end
    while (next < lines.length && !lines[next]!.trim()) next++
    if (next > end && next < lines.length && /^\s+\S/.test(lines[next]!)) { end = next; continue }
    break
  }
  const eol = content.includes("\r\n") ? "\r\n" : "\n"
  return [...lines.slice(0, at), `${key}: ${value}`, ...lines.slice(end)].join(eol)
}

const sameConfig = (a: WorldClockConfig | undefined, b: WorldClock) =>
  Boolean(a && a.horas === b.horas && a.minutos === b.minutos && a.periodos.join("\n") === b.periodos.join("\n"))

/**
 * O texto da nota com hora, período e (se mudou) a configuração do relógio no primeiro bloco `runas-calendario`, sem
 * reformatar o resto do bloco; `null` se a nota não tem o bloco. A hora vai entre aspas.
 */
export function withWorldClock(text: string, clock: WorldClock): string | null {
  const block = findCodeBlocks(text, "runas-calendario")[0]
  if (!block) return null
  let content = setBlockLine(block.content, "hora", `"${clock.hora}"`)
  content = setBlockLine(content, "periodo", yamlText(clock.periodo))
  let saved: WorldClockConfig | undefined
  try { saved = parseClockData(parseYaml(block.content)) } catch { saved = undefined }
  if (!sameConfig(saved, clock)) {
    content = setTopKey(content, "relogio", `{ horas: ${clock.horas}, minutos: ${clock.minutos}, periodos: [${clock.periodos.map(yamlText).join(", ")}] }`)
  }
  return replaceCodeBlock(text, block, content)
}
