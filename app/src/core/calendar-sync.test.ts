import { addCorrespondence, calendarOffsets, convertBetween, findCalendar, syncedTodays } from "./calendar-sync"
import { parseCalendar, parseWorldDate, type WorldDate } from "./calendar"
import type { CalendarRef } from "./wiki"

const date = (text: string) => parseWorldDate(text) as WorldDate
const ref = (path: string, yaml: string): CalendarRef => ({ path, calendar: parseCalendar(yaml) })

// Rúnico: 12 meses de 28 dias. Arthuriano: 4 meses de 84 dias (os dois com 336 dias no ano).
const RUNICO = `nome: Calendário Rúnico
meses: [${Array.from({ length: 12 }, (_, i) => `{ nome: M${i + 1}, dias: 28 }`).join(", ")}]
correspondencias:
  - { calendario: "[[Calendário Arthuriano]]", data: "25200-12-28", data_no_outro: "0000-03-13" }`
const ARTHURIANO = `nome: Calendário Arthuriano
meses: [{ nome: A, dias: 84 }, { nome: B, dias: 84 }, { nome: C, dias: 84 }, { nome: D, dias: 84 }]`
const ELFICO = `nome: Élfico
meses: [{ nome: E, dias: 100 }]
correspondencias:
  - { calendario: "[[Calendário Arthuriano]]", data: "0500-01-01", data_no_outro: "0000-01-01" }`
const SOLTO = `nome: Solto
meses: [{ nome: S, dias: 10 }]`

const refs = [ref("W/Calendário Rúnico.md", RUNICO), ref("W/Calendário Arthuriano.md", ARTHURIANO), ref("W/Élfico.md", ELFICO), ref("W/Solto.md", SOLTO)]
const [runico, arthur, elfico, solto] = refs as [CalendarRef, CalendarRef, CalendarRef, CalendarRef]

describe("calendários sincronizados", () => {
  it("acha o calendário pelo nome da nota ou pelo nome do bloco", () => {
    expect(findCalendar(refs, "[[Calendário Arthuriano]]")).toBe(arthur)
    expect(findCalendar(refs, "élfico")).toBe(elfico)
  })

  it("converte nos dois sentidos e através de outro calendário", () => {
    expect(convertBetween(refs, runico, date("25200-12-28"), arthur)).toEqual(date("0000-03-13"))
    expect(convertBetween(refs, arthur, date("0000-03-14"), runico)).toEqual(date("25201-01-01"))
    // Um ano do Arthuriano (336 dias) depois: o mesmo dia do ano no Rúnico, um ano depois.
    expect(convertBetween(refs, arthur, date("0001-03-14"), runico)).toEqual(date("25202-01-01"))
    // Rúnico → Arthuriano → Élfico: 25200-07-01 é o 13º dia depois de 0000-01-01 no Arthuriano (= 0500-01-01 no Élfico).
    expect(convertBetween(refs, runico, date("25200-07-01"), arthur)).toEqual(date("0000-01-14"))
    expect(convertBetween(refs, runico, date("25200-07-01"), elfico)).toEqual(date("0500-01-14"))
    expect(convertBetween(refs, runico, date("25200-07-01"), solto)).toBeNull()
    expect([...calendarOffsets(refs, runico.path).keys()].sort()).toEqual([arthur.path, runico.path, elfico.path].sort())
  })

  it("avançar o hoje de um calendário dá o hoje dos ligados", () => {
    // 27 anos de 336 dias depois de 0000-01-01 (Arthuriano) = 9072 dias.
    expect(syncedTodays(refs, arthur, date("0027-01-01")).map((s) => [s.ref.path, s.today])).toEqual([
      [runico.path, date("25227-06-16")],
      [elfico.path, date("0590-01-73")],
    ])
  })

  it("acrescenta a correspondência ao bloco sem mexer no resto", () => {
    const novo = addCorrespondence("nome: A\nhoje: \"0001-01-01\"\n", "Calendário B", date("0001-01-01"), date("0100-02-03"))
    expect(novo).toBe('nome: A\nhoje: "0001-01-01"\ncorrespondencias:\n  - { calendario: "[[Calendário B]]", data: "0001-01-01", data_no_outro: "0100-02-03" }')
    const mais = addCorrespondence(`${novo}\nluas: []`, "C", date("0002-01-01"), date("0003-01-01"))
    expect(mais.split("\n").slice(3, 6)).toEqual(['  - { calendario: "[[Calendário B]]", data: "0001-01-01", data_no_outro: "0100-02-03" }', '  - { calendario: "[[C]]", data: "0002-01-01", data_no_outro: "0003-01-01" }', "luas: []"])
    expect(addCorrespondence("nome: A\ncorrespondencias: []", "B", date("0001-01-01"), date("0001-01-01"))).toContain("correspondencias:\n  - { calendario")
    expect(() => parseCalendar(`${mais}\nmeses: [{ nome: M, dias: 30 }]`)).not.toThrow()
  })
})
