import { describe, expect, it } from "vitest"
import { timeOnDay } from "./overnight"

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute)
const day = (n: number) => new Date(2026, 10, n)

describe("U105: evento que cruza a meia-noite", () => {
  it("mostra o horário normal no mesmo dia", () => {
    expect(timeOnDay(at(17, 19), at(17, 22, 30), true, day(17))).toBe("19:00–22:30")
    expect(timeOnDay(at(17, 19), at(17, 20), false, day(17))).toBe("19:00")
  })

  it("diz na noite que termina amanhã e na manhã que continua de ontem", () => {
    const start = at(17, 23), end = at(18, 7, 30)
    expect(timeOnDay(start, end, true, day(17))).toBe("23:00 até 07:30 de amanhã")
    expect(timeOnDay(start, end, true, day(18))).toBe("continua de ontem, até 07:30")
  })

  it("fim à meia-noite é fim do mesmo dia", () => {
    expect(timeOnDay(at(17, 22), at(18, 0), true, day(17))).toBe("22:00–00:00")
  })

  it("evento de vários dias mostra as datas", () => {
    const start = at(17, 20), end = at(20, 10)
    expect(timeOnDay(start, end, true, day(17))).toMatch(/^20:00 até 10:00 de 20 de nov/)
    expect(timeOnDay(start, end, true, day(18))).toMatch(/^continua de ontem, até 10:00 de 20 de nov/)
    expect(timeOnDay(start, end, true, day(19))).toMatch(/^continua desde 17 de nov.*, até 10:00 de amanhã$/)
    expect(timeOnDay(start, end, true, day(20))).toMatch(/^continua desde 17 de nov.*, até 10:00$/)
  })

  it("sem hora de fim, o dia seguinte diz quando começou", () => {
    expect(timeOnDay(at(17, 23, 30), at(18, 0, 30), false, day(18))).toBe("ontem às 23:30")
  })
})
