import { describe, expect, it } from "vitest"
import { buildRepeat, repeatForm, repeatText, splitEnd, type RepeatForm } from "./agenda-repeat"

const form = (patch: Partial<RepeatForm>): RepeatForm => ({ choice: "none", days: [], custom: "", end: { kind: "never" }, ...patch })

describe("repetição do evento (U98)", () => {
  it("“Todo dia” e “Dias úteis” sem precisar escrever regra", () => {
    expect(buildRepeat(form({ choice: "daily" }), 2)).toEqual({ repeat: { kind: "rrule", rule: "FREQ=DAILY" } })
    // Dias úteis fica no tipo semanal do Full Calendar, que o Obsidian já lê.
    expect(buildRepeat(form({ choice: "weekdays" }), 2)).toEqual({ repeat: { kind: "weekly", days: [1, 2, 3, 4, 5] } })
    expect(repeatForm({ kind: "weekly", days: [5, 1, 3, 2, 4] }).choice).toBe("weekdays")
    expect(repeatForm({ kind: "rrule", rule: "FREQ=DAILY" }).choice).toBe("daily")
  })

  it("termina depois de N vezes", () => {
    expect(buildRepeat(form({ choice: "daily", end: { kind: "count", times: 10 } }), 0).repeat).toEqual({ kind: "rrule", rule: "FREQ=DAILY;COUNT=10" })
    // O tipo semanal não tem contagem: vira regra com os mesmos dias.
    expect(buildRepeat(form({ choice: "weekly", days: [6, 2], end: { kind: "count", times: 4 } }), 0).repeat).toEqual({ kind: "rrule", rule: "FREQ=WEEKLY;BYDAY=TU,SA;COUNT=4" })
    expect(buildRepeat(form({ choice: "weekdays", end: { kind: "count", times: 20 } }), 0).repeat).toEqual({ kind: "rrule", rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20" })
    expect(repeatForm({ kind: "rrule", rule: "FREQ=WEEKLY;BYDAY=TU,SA;COUNT=4" })).toEqual(form({ choice: "weekly", days: [2, 6], end: { kind: "count", times: 4 } }))
    expect(repeatForm({ kind: "rrule", rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=20" })).toEqual(form({ choice: "weekdays", end: { kind: "count", times: 20 } }))
    expect(buildRepeat(form({ choice: "monthly", end: { kind: "count", times: 0 } }), 0).repeat).toEqual({ kind: "rrule", rule: "FREQ=MONTHLY;COUNT=1" })
  })

  it("termina numa data: no tipo semanal fica em `until`, na regra em UNTIL", () => {
    expect(buildRepeat(form({ choice: "weekly", days: [3], end: { kind: "until", date: "2026-12-20" } }), 0)).toEqual({ repeat: { kind: "weekly", days: [3] }, until: "2026-12-20" })
    expect(buildRepeat(form({ choice: "yearly", end: { kind: "until", date: "2030-01-01" } }), 0).repeat).toEqual({ kind: "rrule", rule: "FREQ=YEARLY;UNTIL=20300101" })
    expect(repeatForm({ kind: "weekly", days: [3] }, "2026-12-20").end).toEqual({ kind: "until", date: "2026-12-20" })
    expect(splitEnd("FREQ=MONTHLY;UNTIL=20261231T235959Z")).toEqual({ rule: "FREQ=MONTHLY", end: { kind: "until", date: "2026-12-31" } })
  })

  it("“Toda semana” sem dia marcado usa o dia do evento; regra estranha fica em Avançado", () => {
    expect(buildRepeat(form({ choice: "weekly" }), 6).repeat).toEqual({ kind: "weekly", days: [6] })
    expect(repeatForm({ kind: "rrule", rule: "FREQ=MONTHLY;BYDAY=1SA" })).toEqual(form({ choice: "custom", custom: "FREQ=MONTHLY;BYDAY=1SA" }))
    expect(buildRepeat(form({ choice: "custom", custom: "RRULE:FREQ=MONTHLY;BYDAY=1SA" }), 0).repeat).toEqual({ kind: "rrule", rule: "FREQ=MONTHLY;BYDAY=1SA" })
  })

  it("descreve a repetição em palavras", () => {
    expect(repeatText({ kind: "none" })).toBeNull()
    expect(repeatText({ kind: "rrule", rule: "FREQ=DAILY" })).toBe("Todo dia")
    expect(repeatText({ kind: "weekly", days: [1, 2, 3, 4, 5] })).toBe("Dias úteis")
    expect(repeatText({ kind: "rrule", rule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;COUNT=10" })).toBe("Dias úteis, 10 vezes")
    expect(repeatText({ kind: "weekly", days: [6] }, "2026-12-20")).toBe("Toda semana: sáb até 20/12/2026")
    expect(repeatText({ kind: "rrule", rule: "FREQ=YEARLY;COUNT=1" })).toBe("Todo ano, 1 vez")
  })
})
