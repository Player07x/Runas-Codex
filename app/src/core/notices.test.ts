import { parseEvent } from "./agenda"
import { collectNotices, markSeen, noticeTime, taskReminders, unseenCount } from "./notices"
import { parseContext, parseTaskLine, type Task } from "./tasks/task"

const ctx = { ...parseContext(), today: "2026-11-11" }
const task = (line: string, n = 0): Task => parseTaskLine(line, "Agenda/Tarefas.md", n, ctx)!
const now = new Date("2026-11-11T10:00")
const tasks = [
  task("- [ ] atrasada 📅 2026-11-09", 0),
  task("- [ ] vence hoje 📅 2026-11-11", 1),
  task("- [ ] amanhã 📅 2026-11-12", 2),
  task("- [ ] hábito 🔁 every day 🏁 delete 📅 2026-11-11", 3),
  task("- [x] feita 📅 2026-11-11 ✅ 2026-11-11", 4),
]
const event = parseEvent("Agenda/Mesa.md", "---\ntitle: Mesa\ndate: 2026-11-11\nstartTime: \"19:30\"\nlembrete: [\"1d\", 60]\n---\n")!

describe("central de avisos (U45)", () => {
  it("mostra atrasadas, as que vencem hoje (com hábitos) e lembretes das 24 h em volta", () => {
    const notices = collectNotices(tasks, [event], now)
    expect(notices.atrasadas.map((t) => t.description)).toEqual(["atrasada"])
    expect(notices.hoje.map((t) => t.description)).toEqual(["vence hoje", "hábito"])
    // "1d" antes (ontem, 19:30: já disparou) e 60 min antes (hoje, 18:30: ainda não).
    expect(notices.lembretes.map((r) => [r.at.getDate(), r.at.getHours(), r.fired])).toEqual([[10, 19, true], [11, 18, false]])
    expect(notices.lembretes.every((r) => r.path === "Agenda/Mesa.md")).toBe(true)
  })

  it("o lembrete que já disparou conta no sino; o que ainda vai disparar, não", () => {
    const fired = collectNotices([], [event], new Date("2026-11-11T18:45"))
    expect(fired.lembretes.find((r) => r.at.getHours() === 18)?.fired).toBe(true)
    expect(unseenCount(fired, new Set())).toBe(fired.lembretes.filter((r) => r.fired).length)
  })

  it("abrir o painel marca tudo como visto e a lista de vistos não guarda o que sumiu", () => {
    const notices = collectNotices(tasks, [], now)
    expect(unseenCount(notices, new Set())).toBe(3)
    const seen = new Set(markSeen(notices))
    expect(unseenCount(notices, seen)).toBe(0)
    expect(unseenCount(collectNotices([...tasks, task("- [ ] nova 📅 2026-11-10", 9)], [], now), seen)).toBe(1)
  })

  it("cada tarefa aberta vira um lembrete no dia do prazo, na hora escolhida", () => {
    const list = taskReminders(tasks, now, "09:30")
    expect(list.map((r) => [r.title, r.at.getDate(), r.at.getHours(), r.at.getMinutes()])).toEqual([["Vence hoje: amanhã", 12, 9, 30]])
    expect(taskReminders(tasks, new Date("2026-11-11T08:00"), "09:00").map((r) => r.title)).toEqual(["Vence hoje: vence hoje", "Vence hoje: amanhã", "Vence hoje: hábito"])
  })

  it("hora inválida volta para 09:00", () => {
    expect(noticeTime("25:00")).toBe("09:00")
    expect(noticeTime("7:5")).toBe("09:00")
    expect(noticeTime("07:05")).toBe("07:05")
  })
})
