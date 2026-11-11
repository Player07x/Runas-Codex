import { agendaTaskLine, appendTaskLine, canFail, failTaskInText, groupAgendaTasks, isFailed, isHabit, recurrenceLabel, statusLabel, taskState } from "./agenda"
import { changeTaskInText } from "./edit"
import { parseContext, parseTaskLine, type Task } from "./task"
import { CANCELLED, TODO } from "./status"

const ctx = { ...parseContext(), today: "2026-11-11" }
const task = (line: string, n = 0): Task => parseTaskLine(line, "Agenda/Tarefas.md", n, ctx)!

describe("tarefas na Agenda (U37)", () => {
  it("separa atrasada, vence hoje, próxima e sem prazo", () => {
    expect(taskState(task("- [ ] a 📅 2026-11-10"), ctx.today)).toBe("atrasada")
    expect(taskState(task("- [ ] a 📅 2026-11-11"), ctx.today)).toBe("hoje")
    expect(taskState(task("- [ ] a 📅 2026-11-12"), ctx.today)).toBe("proxima")
    expect(taskState(task("- [ ] a"), ctx.today)).toBe("sem-prazo")
  })

  it("falhou é cancelada depois do prazo; cancelada no prazo continua cancelada", () => {
    expect(isFailed(task("- [-] a 📅 2026-11-10 ❌ 2026-11-11"))).toBe(true)
    expect(isFailed(task("- [-] a 📅 2026-11-10 ❌ 2026-11-10"))).toBe(false)
    expect(taskState(task("- [-] a 📅 2026-11-12 ❌ 2026-11-11"), ctx.today)).toBe("cancelada")
    expect(taskState(task("- [-] a 📅 2026-11-01 ❌ 2026-11-11"), ctx.today)).toBe("falhou")
  })

  it("só tarefa aberta e vencida pode falhar", () => {
    expect(canFail(task("- [ ] a 📅 2026-11-10"), ctx.today)).toBe(true)
    expect(canFail(task("- [ ] a 📅 2026-11-11"), ctx.today)).toBe(false)
    expect(canFail(task("- [x] a 📅 2026-11-10"), ctx.today)).toBe(false)
  })

  it("marcar falhou grava ❌ hoje, como o Tasks grava ao cancelar", () => {
    const text = "# Tarefas\n- [ ] Revisar mapa 📅 2026-11-09\n"
    expect(failTaskInText(text, task("- [ ] Revisar mapa 📅 2026-11-09", 1), ctx)).toBe("# Tarefas\n- [-] Revisar mapa 📅 2026-11-09 ❌ 2026-11-11\n")
  })

  it("falhou numa tarefa que repete cria a próxima ocorrência acima", () => {
    const line = "- [ ] Treino 🔁 every week 📅 2026-11-09"
    expect(failTaskInText(`${line}\n`, task(line), ctx)).toBe("- [ ] Treino 🔁 every week 📅 2026-11-16\n- [-] Treino 🔁 every week 📅 2026-11-09 ❌ 2026-11-11\n")
  })

  it("recusa marcar falhou se a linha mudou", () => {
    expect(() => failTaskInText("- [ ] outra 📅 2026-11-09\n", task("- [ ] a 📅 2026-11-09"), ctx)).toThrow("mudou")
  })

  it("hábito diário: ao concluir, a feita sai e fica só a próxima", () => {
    const line = agendaTaskLine({ description: "Ler 10 páginas", due: null, habit: true }, ctx.today)
    expect(line).toBe("- [ ] Ler 10 páginas 🔁 every day 🏁 delete 📅 2026-11-11")
    expect(isHabit(task(line))).toBe(true)
    expect(changeTaskInText(`${line}\n`, 0, ctx)).toBe("- [ ] Ler 10 páginas 🔁 every day 🏁 delete 📅 2026-11-12\n")
  })

  it("tarefa nova vai no fim da nota, com prazo se houver", () => {
    const line = agendaTaskLine({ description: "  Comprar  dados ", due: "2026-11-20", habit: false }, ctx.today)
    expect(line).toBe("- [ ] Comprar dados 📅 2026-11-20")
    expect(appendTaskLine("# Tarefas", line)).toBe("# Tarefas\n- [ ] Comprar dados 📅 2026-11-20\n")
    expect(() => agendaTaskLine({ description: " ", due: null, habit: false }, ctx.today)).toThrow()
  })

  it("agrupa nas seções da vista e põe hábitos só em Hábitos", () => {
    const lines = [
      "- [ ] atrasada 📅 2026-11-01",
      "- [ ] hoje 📅 2026-11-11",
      "- [ ] depois 📅 2026-11-20",
      "- [ ] sem prazo",
      "- [ ] hábito 🔁 every day 🏁 delete 📅 2026-11-10",
      "- [x] feita ontem 📅 2026-11-10 ✅ 2026-11-10",
      "- [x] feita há muito ✅ 2026-10-01",
      "- [-] falhou 📅 2026-11-01 ❌ 2026-11-09",
    ]
    const groups = groupAgendaTasks(lines.map((l, i) => task(l, i)), ctx.today)
    expect(groups.atrasadas.map((t) => t.description)).toEqual(["atrasada"])
    expect(groups.hoje.map((t) => t.description)).toEqual(["hoje"])
    expect(groups.proximas.map((t) => t.description)).toEqual(["depois"])
    expect(groups.semPrazo.map((t) => t.description)).toEqual(["sem prazo"])
    expect(groups.habitos.map((t) => t.description)).toEqual(["hábito"])
    expect(groups.feitas.map((t) => t.description)).toEqual(["feita ontem", "falhou"])
  })

  it("mostra estados e repetições em português", () => {
    expect(statusLabel(TODO)).toBe("A fazer")
    expect(statusLabel(CANCELLED)).toBe("Cancelada")
    expect(statusLabel({ ...TODO, symbol: "?", name: "Pergunta" })).toBe("Pergunta")
    expect(recurrenceLabel("every day")).toBe("Todo dia")
    expect(recurrenceLabel("every 3 days when done")).toBe("A cada 3 dias, a partir da conclusão")
    expect(recurrenceLabel("every month on the 1st")).toBe("every month on the 1st")
  })
})
