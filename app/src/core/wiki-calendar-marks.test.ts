import { dayNumber, fromDayNumber, parseCalendar, type WorldDate } from "./calendar"
import { birthdayAge, calendarOffsets } from "./calendar-sync"
import { VaultIndex } from "./vault-index"
import { prepareWikiCalendar } from "./wiki-calendar-marks"
import { calendarInNote, type CalendarRef } from "./wiki"

const root = "Wikis/Mundo/"
const base: CalendarRef = {
  path: root + "Base.md",
  calendar: parseCalendar(`nome: Base
sigla: BA
hoje: "0004-01-01"
meses: [{ nome: Gelo, dias: 30 }, { nome: Degelo, dias: 30 }]
correspondencias:
  - { calendario: "[[Origem]]", data: "0004-01-01", data_no_outro: "0004-02-28" }`),
}
const other: CalendarRef = {
  path: root + "Origem.md",
  calendar: parseCalendar(`nome: Origem
sigla: OR
meses: [{ nome: Janeiro, dias: 31 }, { nome: Fevereiro, dias: 28 }]
bissexto: { a_cada: 4, mes: Fevereiro, dias: 1 }`),
}

function fixture(players = false) {
  const path = (name: string) => root + name + ".md"
  const texts = {
    [path("Lia")]: '---\nnascimento_mundo: "0000-02-29 OR"\n---',
    [path("Ivo")]: '---\nnascimento_mundo: "0002-01-02 BA"\n---',
    [path("Ari")]: '---\nnascimento_mundo: "0000-02-29 OR"\n---',
    [path("Ainda não nasceu")]: '---\nnascimento_mundo: "0008-02-29 OR"\n---',
    [path("Feira")]: '---\ndata_mundo: "0004-01-01 BA"\ndata_fim_mundo: "0004-01-02 BA"\n---',
    [path("Mercado")]: '---\ndata_mundo: "0004-01-02 BA"\nrecorrencia_mundo: dias\nintervalo_mundo: 2\nfim_recorrencia_mundo: "0004-01-04 BA"\n---',
    [path("Secreto")]: '---\ndata_mundo: "0004-01-02 BA"\nrecorrencia_mundo: dias\nsegredo: true\n---',
  }
  const index = new VaultIndex(Object.keys(texts).map((path) => ({ path, size: 1, mtime: 1 })), texts)
  const offsets = calendarOffsets([base, other], base.path)
  const data = prepareWikiCalendar(index, root, base, offsets, players, () => [base, other])
  return { path, offset: offsets.get(other.path)!, data }
}

describe("marcações do calendário da wiki", () => {
  it("mantém a ordem de eventos e aniversários, inclusive com datas em calendários distintos", () => {
    const { data } = fixture(true)
    const labels = (day: number) => data.marks({ year: 4, month: 1, day }).map((mark) => mark.label)
    expect(labels(1)).toEqual(["Feira"])
    expect(labels(2)).toEqual(["Feira", "Mercado", "Lia (4 · OR)", "Ivo (2)", "Ari (4 · OR)"])
    expect(labels(3)).toEqual([])
    expect(labels(4)).toEqual(["Mercado"])
    expect(labels(6)).toEqual([])
  })

  it("a prévia com deslocamento dá as mesmas três primeiras ocorrências que a conversão dia a dia", () => {
    const { path, offset, data } = fixture()
    const today = base.calendar.today!
    for (const shift of [-1, 0, 1]) {
      const shifted = offset - shift
      const first = dayNumber(base.calendar, today)
      const expected: { date: WorldDate; path: string; age: number }[] = []
      for (let i = 0; i < 400 && expected.length < 3; i++) {
        const date = fromDayNumber(base.calendar, first + i)
        for (const [name, year] of [["Lia", 0], ["Ari", 0], ["Ainda não nasceu", 8]] as const) {
          const age = birthdayAge(base.calendar, date, other.calendar, shifted, { year, month: 2, day: 29 })
          if (age !== null && expected.length < 3) expected.push({ date, path: path(name), age })
        }
      }
      expect(data.upcoming(other, today, shifted)).toEqual(expected)
    }
  })
})

it("lê um bloco com linguagem em maiúsculas em uma nota aberta diretamente", () => {
  const path = root + "Calendário legado.md"
  const index = new VaultIndex([{ path, size: 1, mtime: 1 }], {
    [path]: '~~~RUNAS-CALENDARIO\nnome: Legado\nmeses: [{ nome: Gelo, dias: 30 }]\n~~~',
  })
  expect(calendarInNote(index.note(path)!)).toMatchObject({ calendar: { name: "Legado" } })
})
