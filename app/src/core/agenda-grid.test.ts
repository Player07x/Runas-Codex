import { addMonths, dayLabel, layoutDay, moveDay } from "./agenda-grid"
import { isoDate, type AgendaEvent, type Occurrence } from "./agenda"

const d = (iso: string) => new Date(`${iso}T00:00`)
const at = (iso: string, key: string, shift = false) => isoDate(moveDay(d(iso), key, shift)!)

describe("grade do mês pelo teclado", () => {
  it("setas andam um dia ou uma semana e viram o mês e o ano", () => {
    expect(at("2026-10-22", "ArrowRight")).toBe("2026-10-23")
    expect(at("2026-10-01", "ArrowLeft")).toBe("2026-09-30")
    expect(at("2026-10-29", "ArrowDown")).toBe("2026-11-05")
    expect(at("2026-01-03", "ArrowUp")).toBe("2025-12-27")
  })

  it("Home e End vão ao domingo e ao sábado da semana", () => {
    expect(at("2026-10-22", "Home")).toBe("2026-10-18")
    expect(at("2026-10-22", "End")).toBe("2026-10-24")
    expect(at("2026-10-18", "Home")).toBe("2026-10-18")
  })

  it("PageUp e PageDown trocam de mês sem pular o mês curto, e com Shift trocam de ano", () => {
    expect(at("2026-10-31", "PageDown")).toBe("2026-11-30")
    expect(at("2026-03-31", "PageUp")).toBe("2026-02-28")
    expect(at("2028-02-29", "PageUp", true)).toBe("2027-02-28")
    expect(isoDate(addMonths(d("2026-12-15"), 1))).toBe("2027-01-15")
  })

  it("outras teclas não movem", () => {
    expect(moveDay(d("2026-10-22"), "Enter")).toBeNull()
  })

  it("dá a cada dia um nome completo para o leitor de tela", () => {
    expect(dayLabel(d("2026-10-22"), d("2026-10-22"), 4, "2h")).toBe("quinta-feira, 22 de outubro de 2026, hoje, 4 eventos, 2h livres")
    expect(dayLabel(d("2026-10-24"), d("2026-10-22"), 1)).toBe("sábado, 24 de outubro de 2026, 1 evento")
    expect(dayLabel(d("2026-10-25"), d("2026-10-22"), 0)).toBe("domingo, 25 de outubro de 2026, nada marcado")
  })
})

describe("eventos sobrepostos na semana e no dia", () => {
  const ev = (title: string): AgendaEvent => ({ path: `Agenda/${title}.md`, title, allDay: false, date: "2026-10-22", repeat: { kind: "none" }, skipDates: [], reminders: [], countdown: false, notes: "" } as unknown as AgendaEvent)
  const occ = (title: string, from: string, to: string): Occurrence => ({ event: ev(title), start: new Date(`2026-10-22T${from}`), end: new Date(`2026-10-22T${to}`), key: `${title}@2026-10-22` })

  it("põe lado a lado só o que se sobrepõe", () => {
    const { placed, overflow } = layoutDay([occ("A", "10:00", "11:00"), occ("B", "10:30", "11:30"), occ("C", "14:00", "15:00")], d("2026-10-22"), 44)
    expect(overflow).toEqual([])
    expect(placed.map((p) => [p.occurrence.event.title, p.column, p.columns])).toEqual([["A", 0, 2], ["B", 1, 2], ["C", 0, 1]])
    expect(placed[0]).toMatchObject({ top: 440, height: 42 })
  })

  it("com mais de três ao mesmo tempo, os de sobra viram “+N” na última coluna", () => {
    const list = ["A", "B", "C", "D", "E"].map((t) => occ(t, "18:00", "19:00"))
    const { placed, overflow } = layoutDay(list, d("2026-10-22"), 44)
    expect(placed.map((p) => p.occurrence.event.title)).toEqual(["A", "B"])
    expect(placed.every((p) => p.columns === 3)).toBe(true)
    expect(overflow).toHaveLength(1)
    expect(overflow[0]).toMatchObject({ column: 2, columns: 3 })
    expect(overflow[0]!.hidden.map((o) => o.event.title)).toEqual(["C", "D", "E"])
  })

  it("corta na meia-noite o evento que atravessa o dia", () => {
    const longo: Occurrence = { ...occ("Viagem", "22:00", "23:00"), end: new Date("2026-10-23T02:00") }
    const { placed } = layoutDay([longo], d("2026-10-22"), 44)
    expect(placed[0]).toMatchObject({ top: 22 * 44, height: 2 * 44 - 2 })
  })
})
