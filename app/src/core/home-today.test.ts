import { describe, expect, it } from "vitest"
import { activeCampaignsNow, homeTasks } from "./home-today"
import { parseContext, parseTaskLine, type Task } from "./tasks/task"
import { VaultIndex } from "./vault-index"

const ctx = { ...parseContext(), today: "2026-11-18" }
const task = (line: string, n = 0): Task => parseTaskLine(line, "Agenda/Tarefas.md", n, ctx)!

describe("Início: Hoje (U46)", () => {
  it("põe as atrasadas antes das de hoje e deixa as próximas para a Agenda", () => {
    const result = homeTasks([task("- [ ] hoje 📅 2026-11-18", 1), task("- [ ] atrasada 📅 2026-11-16", 2), task("- [ ] depois 📅 2026-11-20", 3), task("- [x] feita 📅 2026-11-18 ✅ 2026-11-18", 4)], ctx.today)
    expect(result.tasks.map((t) => [t.task.description, t.overdue])).toEqual([["atrasada", true], ["hoje", false]])
    expect(result.hidden).toBe(0)
  })

  it("mostra o hábito que vale hoje e conta o que passou do limite", () => {
    const tasks = [
      task("- [ ] ler 🔁 every day 📅 2026-11-18", 1),
      task("- [ ] já feito hoje 🔁 every day 📅 2026-11-19", 2),
      task("- [ ] alongar 🔁 every day", 3),
      ...[1, 2, 3, 4].map((n) => task(`- [ ] tarefa ${n} 📅 2026-11-18`, 10 + n)),
    ]
    const result = homeTasks(tasks, ctx.today)
    expect(result.habits.map((t) => t.description)).toEqual(["ler", "alongar"])
    expect(result.tasks).toHaveLength(3)
    expect(result.hidden).toBe(1)
  })
})

const calendar = "# Calendário\n\n```runas-calendario\nnome: Aurion\nsigla: AU\nmeses: [{ nome: Aurion, dias: 30 }, { nome: Brumas, dias: 30 }]\nhoje: \"4031-01-18\"\nhora: \"04:00\"\nperiodo: Noite\nrelogio: { horas: 12, minutos: 60, periodos: [Dia, Noite] }\n```\n"
const files: Record<string, string> = {
  "Campanhas/Cinzas/Cinzas.md": "---\ntipo: campanha\nstatus: ativa\nwiki: Valdris\n---\n# Cinzas\n",
  "Campanhas/Coroa/Coroa.md": "---\ntipo: campanha\nstatus: ativa\n---\n# Coroa\n",
  "Campanhas/Antiga/Antiga.md": "---\ntipo: campanha\nstatus: encerrada\n---\n# Antiga\n",
  "Wikis/Valdris/Valdris.md": "---\ntipo: wiki\ncalendario: \"[[Calendário]]\"\n---\n# Valdris\n",
  "Wikis/Valdris/Calendário.md": calendar,
}
const mtime: Record<string, number> = { "Campanhas/Cinzas/Cinzas.md": 1, "Campanhas/Coroa/Coroa.md": 5 }
const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: mtime[path] ?? 1 })), files)

describe("Início: Campanhas ativas (U46)", () => {
  it("lista só as ativas, a mais mexida primeiro, com data e hora no mundo", () => {
    const { list, total } = activeCampaignsNow(index)
    expect(total).toBe(2)
    expect(list.map((c) => c.campaign.name)).toEqual(["Coroa", "Cinzas"])
    expect(list[1]!.world).toMatch(/18.*Aurion.*4031.*04:00/)
    // Sem `wiki:`, segue o calendário das wikis do cofre, como o Painel da campanha.
    expect(list[0]!.world).toBe(list[1]!.world)
  })

  it("sem calendário do mundo, a campanha aparece sem data", () => {
    const bare = new VaultIndex([{ path: "Campanhas/Coroa/Coroa.md", size: 1, mtime: 1 }], { "Campanhas/Coroa/Coroa.md": files["Campanhas/Coroa/Coroa.md"]! })
    expect(activeCampaignsNow(bare).list).toEqual([expect.objectContaining({ world: null })])
  })
})
