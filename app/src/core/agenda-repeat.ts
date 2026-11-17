import type { Repeat } from "./agenda"

/** Escolhas do seletor “Repetir” do evento (U98: “Todo dia” e “Dias úteis”; a regra RRULE fica em “Avançado”). */
export type RepeatChoice = "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly" | "yearly" | "custom"

/** Como a repetição termina: nunca, numa data ou depois de N vezes (U98). */
export type RepeatEnd = { kind: "never" } | { kind: "until"; date: string } | { kind: "count"; times: number }

export interface RepeatForm {
  choice: RepeatChoice
  /** Dias da semana (0 = domingo) de “Toda semana”. */
  days: number[]
  /** Regra escrita à mão (“Avançado”). */
  custom: string
  end: RepeatEnd
}

const ICAL_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
const WORKDAYS = [1, 2, 3, 4, 5]
const SIMPLE: Record<string, RepeatChoice> = {
  "FREQ=DAILY": "daily",
  "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR": "weekdays",
  "FREQ=WEEKLY;INTERVAL=2": "biweekly",
  "FREQ=MONTHLY": "monthly",
  "FREQ=YEARLY": "yearly",
}
const NEVER: RepeatEnd = { kind: "never" }
/** Limite de “depois de N vezes”, para um número digitado errado não gerar milhares de ocorrências. */
export const MAX_REPEAT_COUNT = 999

const sortDays = (days: number[]) => [...new Set(days)].sort((a, b) => a - b)

/** Separa `;UNTIL=AAAAMMDD…` ou `;COUNT=N` da regra: o fim tem campo próprio no diálogo. */
export function splitEnd(rule: string): { rule: string; end: RepeatEnd } {
  const until = /;UNTIL=(\d{4})(\d{2})(\d{2})[^;]*/i.exec(rule)
  if (until) return { rule: rule.replace(until[0], ""), end: { kind: "until", date: `${until[1]}-${until[2]}-${until[3]}` } }
  const count = /;COUNT=(\d+)/i.exec(rule)
  if (count) return { rule: rule.replace(count[0], ""), end: { kind: "count", times: Number(count[1]) } }
  return { rule, end: NEVER }
}

/**
 * O que o diálogo mostra para uma repetição gravada. `until` é o fim do tipo semanal do Full Calendar (`endRecur`);
 * nas regras RRULE, o fim está na própria regra.
 */
export function repeatForm(repeat: Repeat, until?: string): RepeatForm {
  if (repeat.kind === "none") return { choice: "none", days: [], custom: "", end: NEVER }
  if (repeat.kind === "weekly") {
    const days = sortDays(repeat.days)
    const end: RepeatEnd = until ? { kind: "until", date: until } : NEVER
    return days.join() === WORKDAYS.join() ? { choice: "weekdays", days: [], custom: "", end } : { choice: "weekly", days, custom: "", end }
  }
  const { rule, end } = splitEnd(repeat.rule)
  // O formulário simples só representa datas inteiras e contagens até 999. Preservar regras importadas evita
  // perder a hora/fuso do término ou impedir uma edição que só troca o título do evento.
  if (/;UNTIL=\d{8}T/i.test(repeat.rule) || (end.kind === "count" && (end.times < 1 || end.times > MAX_REPEAT_COUNT))) {
    return { choice: "custom", days: [], custom: repeat.rule, end: NEVER }
  }
  const simple = SIMPLE[rule.toUpperCase()]
  if (simple) return { choice: simple, days: [], custom: "", end }
  // “Toda semana” com contagem ou com datas puladas fica gravada como regra semanal com os dias.
  const weekly = /^FREQ=WEEKLY;BYDAY=([A-Z]{2}(?:,[A-Z]{2})*)$/i.exec(rule)
  if (weekly) return { choice: "weekly", days: sortDays(weekly[1]!.toUpperCase().split(",").map((day) => ICAL_DAYS.indexOf(day))), custom: "", end }
  return { choice: "custom", days: [], custom: repeat.rule, end: NEVER }
}

function endRule(end: RepeatEnd): string {
  if (end.kind === "until") return `;UNTIL=${end.date.replace(/-/g, "")}`
  if (end.kind === "count") return `;COUNT=${Math.min(MAX_REPEAT_COUNT, Math.max(1, Math.round(end.times)))}`
  return ""
}

/**
 * A repetição a gravar. “Toda semana” e “Dias úteis” ficam no tipo semanal do Full Calendar (`daysOfWeek`, e
 * `endRecur` para a data de fim); com “depois de N vezes” viram regra RRULE (`COUNT`), que o tipo semanal não tem.
 * Datas puladas exigem RRULE também: o tipo semanal não grava `skipDates`.
 * `startDay` é o dia da semana da data do evento (vale quando nenhum dia foi marcado).
 */
export function buildRepeat(form: RepeatForm, startDay: number, skipDates: readonly string[] = []): { repeat: Repeat; until?: string } {
  const end = endRule(form.end)
  switch (form.choice) {
    case "none":
      return { repeat: { kind: "none" } }
    case "custom":
      return { repeat: { kind: "rrule", rule: form.custom.trim().replace(/^RRULE:/i, "") } }
    case "weekly":
    case "weekdays": {
      const days = form.choice === "weekdays" ? WORKDAYS : form.days.length ? sortDays(form.days) : [startDay]
      if (form.end.kind === "count" || skipDates.length > 0) return { repeat: { kind: "rrule", rule: `FREQ=WEEKLY;BYDAY=${days.map((day) => ICAL_DAYS[day]).join(",")}${end}` } }
      return { repeat: { kind: "weekly", days }, ...(form.end.kind === "until" ? { until: form.end.date } : {}) }
    }
    case "daily":
      return { repeat: { kind: "rrule", rule: `FREQ=DAILY${end}` } }
    case "biweekly":
      return { repeat: { kind: "rrule", rule: `FREQ=WEEKLY;INTERVAL=2${end}` } }
    case "monthly":
      return { repeat: { kind: "rrule", rule: `FREQ=MONTHLY${end}` } }
    case "yearly":
      return { repeat: { kind: "rrule", rule: `FREQ=YEARLY${end}` } }
  }
}

const SHORT_DAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
const dateText = (date: string) => new Date(`${date}T12:00`).toLocaleDateString("pt-BR")

/** A repetição em palavras, para o painel do evento (“Dias úteis, 10 vezes”); `null` sem repetição. */
export function repeatText(repeat: Repeat, until?: string): string | null {
  if (repeat.kind === "none") return null
  const form = repeatForm(repeat, until)
  const base = {
    none: "",
    daily: "Todo dia",
    weekdays: "Dias úteis",
    weekly: `Toda semana: ${form.days.map((day) => SHORT_DAYS[day]).join(", ")}`,
    biweekly: "A cada 2 semanas",
    monthly: "Todo mês",
    yearly: "Todo ano",
    custom: `Regra: ${form.custom}`,
  }[form.choice]
  if (form.end.kind === "until") return `${base} até ${dateText(form.end.date)}`
  if (form.end.kind === "count") return `${base}, ${form.end.times} ${form.end.times === 1 ? "vez" : "vezes"}`
  return base
}
