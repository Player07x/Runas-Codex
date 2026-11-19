import { alignedFull, birthdayAge, calendarOffsets, convertBetween, directLink, linkVia, moonChecks, shiftedThere, withCorrespondenceDate, withMoonFull } from "./calendar-sync"
import { campaignCalendar } from "./campaign-calendar"
import { addDays, dayNumber, parseCalendar, parseWorldDate, type WorldDate } from "./calendar"
import { VaultIndex } from "./vault-index"
import type { CalendarRef } from "./wiki"

const date = (text: string) => parseWorldDate(text) as WorldDate
const ref = (path: string, yaml: string): CalendarRef => ({ path, calendar: parseCalendar(yaml) })

// A: 10 meses de 30 dias. B: 3 meses de 100 dias. 1/1/0001 de A é 1/1/0010 de B. Selene fica cheia 3 dias depois em B.
const A = `nome: Calendário A
sigla: AA
meses: [${Array.from({ length: 10 }, (_, i) => `{ nome: A${i + 1}, dias: 30 }`).join(", ")}]
luas:
  - { nome: Selene, ciclo: 30, cheia_em: "0001-01-05" }
hoje: "0001-01-01"
correspondencias:
  - { calendario: "[[Calendário B]]", data: "0001-01-01", data_no_outro: "0010-01-01" }`
const B = `nome: Calendário B
sigla: BB
meses: [{ nome: B1, dias: 100 }, { nome: B2, dias: 100 }, { nome: B3, dias: 100 }]
luas:
  - { nome: selene, ciclo: 30, cheia_em: "0010-01-08" }
  - { nome: Morr, ciclo: 12, cheia_em: "0010-01-02" }`
const C = `nome: Calendário C
meses: [{ nome: C1, dias: 50 }]
correspondencias:
  - { calendario: "[[Calendário B]]", data: "0001-01-01", data_no_outro: "0010-01-01" }`

const build = (a = A, b = B) => [ref("W/Calendário A.md", a), ref("W/Calendário B.md", b), ref("W/Calendário C.md", C)] as [CalendarRef, CalendarRef, CalendarRef]
const today = (r: CalendarRef) => dayNumber(r.calendar, r.calendar.today ?? date("0001-01-01"))

describe("conferir a sincronização", () => {
  it("o aniversário é comemorado no calendário de nascimento e aparece no outro", () => {
    const refs = build()
    const [a, b] = refs
    const offset = calendarOffsets(refs, a.path).get(b.path)!
    const born = date("0005-02-10")
    const party = convertBetween(refs, b, date("0012-02-10"), a)!
    expect(birthdayAge(a.calendar, party, b.calendar, offset, born)).toBe(7)
    expect(birthdayAge(a.calendar, addDays(a.calendar, party, 1), b.calendar, offset, born)).toBeNull()
    // No próprio calendário, como sempre: mesmo dia e mês, a partir do ano em que nasceu.
    expect(birthdayAge(b.calendar, date("0012-02-10"), b.calendar, 0, born)).toBe(7)
    expect(birthdayAge(b.calendar, date("0004-02-10"), b.calendar, 0, born)).toBeNull()
  })

  it("compara as luas de mesmo nome e diz quantos dias estão fora", () => {
    const refs = build()
    const [a, b] = refs
    const checks = moonChecks(refs, a, today(a))
    expect(checks.map((c) => [c.other.path, c.here.name, c.diff, c.sameCycle])).toEqual([[b.path, "Selene", 3, true]])
    // A lua sem par (Morr) fica de fora; ver de B, a diferença troca de sinal.
    expect(moonChecks(refs, b, today(a) - calendarOffsets(refs, a.path).get(b.path)!, 0, a.path).map((c) => c.diff)).toEqual([-3])
  })

  it("acertar a lua no outro calendário põe as duas cheias no mesmo dia", () => {
    const refs = build()
    const [a, b] = refs
    const check = moonChecks(refs, a, today(a))[0]!
    const full = alignedFull(check.here, b, calendarOffsets(refs, a.path).get(b.path)!)
    expect(full).toEqual(date("0010-01-05"))
    const fixedB = withMoonFull(B, "Selene", full)
    expect(fixedB).toContain('{ nome: selene, ciclo: 30, cheia_em: "0010-01-05" }')
    expect(fixedB).toContain('{ nome: Morr, ciclo: 12, cheia_em: "0010-01-02" }')
    const again = build(A, fixedB)
    expect(moonChecks(again, again[0], today(again[0]))[0]!.diff).toBe(0)
    expect(() => withMoonFull(B, "Lua que não existe", full)).toThrow(/não está no bloco/)
  })

  it("mover a ligação: a prévia acerta a lua e gravar regrava só a correspondência", () => {
    const refs = build()
    const [a, b, c] = refs
    expect(moonChecks(refs, a, today(a), 3)[0]!.diff).toBe(0)
    const link = directLink(refs, a, b)!
    expect([link.owner.path, link.cited]).toEqual([a.path, "Calendário B"])
    const there = shiftedThere(link, a, 3)
    expect(there).toEqual(date("0010-01-04"))
    const fixedA = withCorrespondenceDate(A, link.cited, link.here, there)
    expect(fixedA).toContain('data_no_outro: "0010-01-04"')
    expect(fixedA).toContain('cheia_em: "0001-01-05"')
    const again = build(fixedA)
    expect(moonChecks(again, again[0], today(again[0]))[0]!.diff).toBe(0)
    // Vista de B, a mesma ligação (no bloco de A) anda ao contrário.
    expect(shiftedThere(directLink(refs, b, a)!, b, 3)).toEqual(date("0009-03-98"))
    // A e C só se ligam por B: ajusta-se por lá.
    expect(directLink(refs, a, c)).toBeNull()
    expect(linkVia(refs, a, c)?.path).toBe(b.path)
    expect(() => withCorrespondenceDate(A, "Calendário B", date("0002-01-01"), there)).toThrow(/não está mais/)
  })
})

describe("calendário da campanha", () => {
  const W = "Wikis/Mundo/"
  const block = (yaml: string) => "# Calendário\n```runas-calendario\n" + yaml + "\n```\n"
  const files: Record<string, string> = {
    [`${W}Mundo.md`]: "---\ntipo: wiki\ncalendario: \"[[Calendário A]]\"\n---\n# Mundo",
    [`${W}Calendários/Calendário A.md`]: block(A),
    [`${W}Calendários/Calendário B.md`]: block(B),
  }
  const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)

  it("usa o calendário da sigla da data da campanha e, sem ela, o padrão da wiki", () => {
    expect(campaignCalendar(index, W, { data_mundo: "0010-01-04 BB" })?.path).toBe(`${W}Calendários/Calendário B.md`)
    expect(campaignCalendar(index, W, {})?.path).toBe(`${W}Calendários/Calendário A.md`)
    expect(campaignCalendar(index, W, { data_mundo: "0010-01-04 ZZ" })?.path).toBe(`${W}Calendários/Calendário A.md`)
    expect(campaignCalendar(index, W, null)?.path).toBe(`${W}Calendários/Calendário A.md`)
  })
})
