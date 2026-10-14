import { ReminderScheduler, validReminders } from "../src/main/reminders"

const shown: { title: string; body: string }[] = []

vi.mock("electron", () => ({
  Notification: class {
    static isSupported() {
      return true
    }
    constructor(private readonly options: { title: string; body: string }) {}
    on() {}
    show() {
      shown.push(this.options)
    }
  },
}))

describe("lembretes no desktop", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    shown.length = 0
  })
  afterEach(() => vi.useRealTimers())

  it("só aceita lembretes bem formados", () => {
    expect(validReminders([{ id: "a", at: 1, title: "t", body: "b", path: "p" }, { id: 1 }, null])).toHaveLength(1)
    expect(() => validReminders("x")).toThrow()
  })

  it("dispara na hora, troca a lista a cada agendamento e não repete", () => {
    const opened: string[] = []
    const scheduler = new ReminderScheduler(() => null, (path) => opened.push(path))
    const now = Date.now()
    expect(scheduler.schedule([{ id: "1", at: now + 1000, title: "Sessão", body: "amanhã", path: "Agenda/a.md" }, { id: "2", at: now + 5000, title: "Outro", body: "", path: "Agenda/b.md" }], now)).toBe(2)
    vi.advanceTimersByTime(1500)
    expect(shown.map((n) => n.title)).toEqual(["Sessão"])
    // Reagendar com a mesma lista não dispara de novo o que já disparou.
    expect(scheduler.schedule([{ id: "1", at: now + 1000, title: "Sessão", body: "", path: "Agenda/a.md" }], now + 1500)).toBe(0)
    vi.advanceTimersByTime(10_000)
    expect(shown.map((n) => n.title)).toEqual(["Sessão"])
    scheduler.stop()
  })

  it("ignora lembretes antigos e longe demais", () => {
    const scheduler = new ReminderScheduler(() => null, () => undefined)
    const now = Date.now()
    expect(scheduler.schedule([{ id: "velho", at: now - 3_600_000, title: "", body: "", path: "" }, { id: "longe", at: now + 40 * 86_400_000, title: "", body: "", path: "" }], now)).toBe(0)
  })
})
