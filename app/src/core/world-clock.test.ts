import { describe, expect, it } from "vitest"
import { parse as parseYaml } from "yaml"
import { parseCalendar, parseClockData } from "./calendar"
import { findCodeBlocks } from "./codeblocks"
import { advanceClock, advanceWorldClock, clockProblem, DEFAULT_CLOCK, durationText, handAngles, nextPeriodIn, parseWorldClock, withWorldClock } from "./world-clock"

const source = `nome: Rúnico\nsigla: CR\nmeses: [{ nome: Ogronios, dias: 30 }, { nome: Brumas, dias: 30 }]\nhoje: "5631-01-09"\nhora: "11:50"\nperiodo: Noite\nrelogio: { horas: 12, minutos: 60, periodos: [Dia, Noite] }`
const calendar = parseCalendar(source)
const clock = parseWorldClock(calendar)
const note = (content: string) => `# Rúnico\n\n\`\`\`runas-calendario\n${content}\n\`\`\`\n\nTexto depois.\n`
const blockOf = (text: string) => findCodeBlocks(text, "runas-calendario")[0]!.content

describe("relógio do mundo: leitura", () => {
  it("lê hora, período e configuração do bloco do calendário", () => {
    expect(clock).toEqual({ hora: "11:50", periodo: "Noite", horas: 12, minutos: 60, periodos: ["Dia", "Noite"] })
  })

  it("usa o padrão sem relogio e o primeiro período quando o gravado não existe", () => {
    expect(parseWorldClock(parseCalendar("nome: X\nmeses: [{ nome: A, dias: 10 }]"))).toEqual(DEFAULT_CLOCK)
    expect(parseCalendar("nome: X\nmeses: [{ nome: A, dias: 10 }]\nperiodo: Tarde\nrelogio: { periodos: [Manhã, Noite] }").worldClock).toMatchObject({ periodo: "Manhã", hora: "00:00" })
  })
})

describe("relógio do mundo: avançar", () => {
  it("passa ao próximo período no fim da volta, sem mudar o dia", () => {
    expect(advanceClock({ ...clock, hora: "11:50", periodo: "Dia" }, 10)).toEqual({ clock: { ...clock, hora: "00:00", periodo: "Noite" }, days: 0 })
  })

  it("depois do último período, o dia avança", () => {
    expect(advanceClock(clock, 10)).toEqual({ clock: { ...clock, hora: "00:00", periodo: "Dia" }, days: 1 })
  })

  it("avança vários dias de uma vez", () => {
    const week = advanceClock({ ...clock, hora: "07:30", periodo: "Dia" }, 7 * 24 * 60)
    expect(week).toEqual({ clock: { ...clock, hora: "07:30", periodo: "Dia" }, days: 7 })
  })

  it("volta no tempo, trocando o período e o dia para trás", () => {
    expect(advanceClock({ ...clock, hora: "00:10", periodo: "Dia" }, -20)).toEqual({ clock: { ...clock, hora: "11:50", periodo: "Noite" }, days: -1 })
    expect(advanceClock({ ...clock, hora: "00:10", periodo: "Noite" }, -20)).toEqual({ clock: { ...clock, hora: "11:50", periodo: "Dia" }, days: 0 })
  })

  it("respeita os minutos por hora do relógio", () => {
    const odd = { hora: "05:90", periodo: "Claro", horas: 10, minutos: 100, periodos: ["Claro", "Escuro", "Cinza"] }
    expect(advanceClock(odd, 10).clock).toMatchObject({ hora: "06:00", periodo: "Claro" })
    expect(advanceClock({ ...odd, hora: "09:99", periodo: "Cinza" }, 1)).toEqual({ clock: { ...odd, hora: "00:00", periodo: "Claro" }, days: 1 })
  })

  it("leva a data junto só quando o dia vira", () => {
    expect(advanceWorldClock(calendar, calendar.today, clock, 10).today).toEqual({ year: 5631, month: 1, day: 10 })
    expect(advanceWorldClock(calendar, calendar.today, clock, -60).today).toEqual(calendar.today)
    expect(advanceWorldClock(calendar, calendar.today, clock, 24 * 60 * 25).today).toEqual({ year: 5631, month: 2, day: 4 })
  })
})

describe("relógio do mundo: textos e ponteiros", () => {
  it("diz qual é o próximo período e quanto falta", () => {
    expect(nextPeriodIn({ ...clock, hora: "07:30", periodo: "Dia" })).toEqual({ period: "Noite", minutes: 270, newDay: false })
    expect(nextPeriodIn(clock)).toEqual({ period: "Dia", minutes: 10, newDay: true })
    expect(durationText(270, clock)).toBe("4 h 30 min")
    expect(durationText(120, clock)).toBe("2 h")
    expect(durationText(10, clock)).toBe("10 min")
  })

  it("calcula os ponteiros pela volta do período", () => {
    expect(handAngles({ ...clock, hora: "06:00" })).toEqual({ hour: 180, minute: 0, progress: 0.5 })
    expect(handAngles({ ...clock, hora: "07:30" }).hour).toBe(225)
    expect(handAngles({ ...clock, hora: "07:30" }).minute).toBe(180)
  })

  it("recusa hora fora do relógio, períodos vazios ou repetidos", () => {
    expect(clockProblem(clock)).toBeNull()
    expect(clockProblem({ ...clock, hora: "12:00" })).toMatch(/00:00 a 11:59/)
    expect(clockProblem({ ...clock, hora: "7h" })).toMatch(/HH:MM/)
    expect(clockProblem({ ...clock, periodos: ["Dia", "dia"] })).toMatch(/mesmo nome/)
    expect(clockProblem({ ...clock, periodos: [] })).toMatch(/pelo menos um/)
  })
})

describe("relógio do mundo: gravação", () => {
  it("grava hora entre aspas, período e relogio sem mexer no resto do bloco", () => {
    const before = note(`nome: Rúnico\nmeses: [{ nome: Ogronios, dias: 30 }]   # meses do ano\nhoje: "5631-01-09"`)
    const after = withWorldClock(before, { ...clock, hora: "07:30", periodo: "Dia" })!
    expect(blockOf(after)).toBe(`nome: Rúnico\nmeses: [{ nome: Ogronios, dias: 30 }]   # meses do ano\nhoje: "5631-01-09"\nhora: "07:30"\nperiodo: Dia\nrelogio: { horas: 12, minutos: 60, periodos: [Dia, Noite] }`)
    expect(after.endsWith("Texto depois.\n")).toBe(true)
  })

  it("só reescreve relogio quando a configuração muda", () => {
    const before = note(`hora: "01:00"\nperiodo: Dia\nrelogio:\n  horas: 12\n  minutos: 60\n  periodos:\n    - Dia\n    - Noite\nhoje: "5631-01-09"`)
    const moved = withWorldClock(before, { ...clock, hora: "02:00", periodo: "Dia" })!
    expect(blockOf(moved)).toContain("relogio:\n  horas: 12\n  minutos: 60\n  periodos:\n    - Dia\n    - Noite\nhoje:")
    const changed = withWorldClock(before, { ...clock, hora: "02:00", periodo: "Manhã", periodos: ["Manhã", "Tarde", "Noite"] })!
    expect(blockOf(changed)).toBe(`hora: "02:00"\nperiodo: Manhã\nrelogio: { horas: 12, minutos: 60, periodos: [Manhã, Tarde, Noite] }\nhoje: "5631-01-09"`)
    expect(parseClockData(parseYaml(blockOf(changed)))).toMatchObject({ periodo: "Manhã", periodos: ["Manhã", "Tarde", "Noite"] })
  })

  it("põe entre aspas nomes de período que o YAML leria de outro jeito", () => {
    const after = withWorldClock(note("nome: X"), { ...clock, periodo: "Sim", periodos: ["Sim", "Hora: zero", "yes"] })!
    expect(blockOf(after)).toContain(`relogio: { horas: 12, minutos: 60, periodos: [Sim, "Hora: zero", "yes"] }`)
    expect(parseClockData(parseYaml(blockOf(after)))?.periodos).toEqual(["Sim", "Hora: zero", "yes"])
  })

  it("devolve null sem o bloco do calendário", () => {
    expect(withWorldClock("# Nota\n", clock)).toBeNull()
  })
})
