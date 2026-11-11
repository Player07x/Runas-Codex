import { parseCalendar } from "./calendar"
import { calendarForCampaign, campaignTime, withCampaignTime, withoutCampaignTime } from "./campaign-time"

const calendar = parseCalendar(`nome: Ordem x Caos
sigla: OC
semana: [Pedra, Raiz, Chama]
meses:
  - { nome: Gelo, dias: 30 }
hoje: "4031-01-10"
hora: "07:30"
periodo: Dia
relogio: { horas: 12, minutos: 60, periodos: [Dia, Noite] }
`)
const NOTE = "---\ntipo: campanha\nwiki: Ordem x Caos\n---\n# Valknut\n"

describe("tempo de cada campanha (U39)", () => {
  it("sem data_mundo, a campanha segue o hoje da wiki", () => {
    expect(campaignTime({ tipo: "campanha" }, calendar)).toBeNull()
    expect(calendarForCampaign(calendar, null)).toBe(calendar)
  })

  it("com data_mundo, usa a data e o ponteiro dela, e a regra do relógio do calendário", () => {
    const time = campaignTime({ data_mundo: "4031-01-20 OC", hora_mundo: "21:15", periodo_mundo: "Noite" }, calendar)
    const seen = calendarForCampaign(calendar, time)
    expect(seen.today).toEqual({ year: 4031, month: 1, day: 20 })
    expect(seen.worldClock).toEqual({ hora: "21:15", periodo: "Noite", horas: 12, minutos: 60, periodos: ["Dia", "Noite"] })
    expect(calendar.today).toEqual({ year: 4031, month: 1, day: 10 })
  })

  it("ignora a data de outro calendário", () => {
    expect(campaignTime({ data_mundo: "0812-01-01 EL" }, calendar)).toBeNull()
  })

  it("grava data, hora e período entre aspas na nota da campanha e volta a seguir a wiki", () => {
    const text = withCampaignTime(NOTE, calendar, { year: 4031, month: 2, day: 3 }, { hora: "07:30", periodo: "Dia" })
    expect(text).toContain('data_mundo: "4031-02-03 OC"')
    expect(text).toContain('hora_mundo: "07:30"')
    expect(text).toContain("periodo_mundo: Dia")
    expect(withoutCampaignTime(text)).toBe(NOTE)
  })
})

describe("tempo da campanha sem relógio no calendário", () => {
  it("a hora da campanha vale com a regra padrão", () => {
    const plain = parseCalendar("nome: Simples\nsigla: S\nmeses:\n  - { nome: Um, dias: 30 }\nhoje: \"1-01-01\"\n")
    const seen = calendarForCampaign(plain, campaignTime({ data_mundo: "1-01-02 S", hora_mundo: "01:00", periodo_mundo: "Dia" }, plain))
    expect(seen.worldClock?.hora).toBe("01:00")
    expect(seen.today).toEqual({ year: 1, month: 1, day: 2 })
  })
})
