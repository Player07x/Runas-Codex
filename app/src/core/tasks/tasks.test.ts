import { describe, expect, it } from "vitest"
import { changeTaskInText, postponedDate, postponeField, updateTaskInText } from "./edit"
import { nextOccurrence, parseRecurrence } from "./recurrence"
import { deserialize } from "./serializer"
import { DEFAULT_TASKS_SETTINGS, importTasksPluginData, type TasksSettings } from "./settings"
import { isBlocked, isBlocking, parseContext, parseTaskLine, taskToLine, tasksInNote, urgency, type ParseContext } from "./task"

const D18 = new Date(2026, 9, 18, 10, 30)
const ctx = (settings: Partial<TasksSettings> = {}, today = D18): ParseContext => parseContext({ ...DEFAULT_TASKS_SETTINGS, ...settings }, today)
const toggle = (text: string, line = 0, c = ctx()) => changeTaskInText(text, line, c)

describe("formato da linha (Tasks 8.6.0)", () => {
  it("lê os campos do fim da linha em qualquer ordem e devolve as etiquetas do meio à descrição", () => {
    const f = deserialize("Ligar para Ana #trabalho 📅 2026-10-20 #urgente ⏫ 🔁 every week ➕ 2026-10-01")
    expect(f.description).toBe("Ligar para Ana #trabalho #urgente")
    expect(f.dueDate).toBe("2026-10-20")
    expect(f.priority).toBe("1")
    expect(f.recurrenceText).toBe("every week")
    expect(f.createdDate).toBe("2026-10-01")
    expect(f.tags).toEqual(["#trabalho", "#urgente"])
  })

  it("aceita os emojis alternativos e o seletor de variação", () => {
    expect(deserialize("a 📆 2026-01-02").dueDate).toBe("2026-01-02")
    expect(deserialize("a 🗓 2026-01-03").dueDate).toBe("2026-01-03")
    expect(deserialize("a ⌛ 2026-01-04").scheduledDate).toBe("2026-01-04")
    expect(deserialize("a ⏳️ 2026-01-05").scheduledDate).toBe("2026-01-05")
  })

  it("lê id, dependências e ao concluir", () => {
    const f = deserialize("Revisar 🆔 abc-1 ⛔ x1, y_2 🏁 delete")
    expect(f.id).toBe("abc-1")
    expect(f.dependsOn).toEqual(["x1", "y_2"])
    expect(f.onCompletion).toBe("delete")
  })

  it("lê e grava o formato do Dataview", () => {
    const c = ctx({ taskFormat: "dataview" })
    const task = parseTaskLine("- [ ] Pagar conta [due:: 2026-10-20] (priority:: high) [repeat:: every month]", "a.md", 0, c)!
    expect(task.dueDate).toBe("2026-10-20")
    expect(task.priority).toBe("1")
    expect(task.recurrence?.text).toBe("every month")
    expect(taskToLine(task, c.settings)).toBe("- [ ] Pagar conta  [priority:: high]  [repeat:: every month]  [due:: 2026-10-20]")
  })

  it("regrava na ordem canônica e preserva recuo, marcador, referência de bloco e quebra de linha", () => {
    const task = parseTaskLine("\t> 1) [/] Ler capítulo 📅 2026-10-20 🔼 ^bloco1   ", "a.md", 3, ctx())!
    expect(task.indentation).toBe("\t> ")
    expect(task.listMarker).toBe("1)")
    expect(task.status.type).toBe("IN_PROGRESS")
    expect(taskToLine(task)).toBe("\t> 1) [/] Ler capítulo 🔼 📅 2026-10-20 ^bloco1   ")
  })

  it("ignora tarefas sem o filtro global e tira o filtro das etiquetas", () => {
    const c = ctx({ globalFilter: "#tarefa" })
    expect(parseTaskLine("- [ ] comprar pão", "a.md", 0, c)).toBeNull()
    expect(parseTaskLine("- [ ] #tarefa comprar pão #casa", "a.md", 0, c)!.tags).toEqual(["#casa"])
  })

  it("acha as tarefas de uma nota fora do frontmatter e de blocos de código, com título e tarefa-mãe", () => {
    const text = "---\nlista: \"- [ ] não é tarefa\"\n---\n# Casa\n- [ ] limpar\n  - [x] cozinha ✅ 2026-10-01\n```md\n- [ ] exemplo\n```\n## Mercado\n* [ ] leite\n"
    const tasks = tasksInNote("Notas/Casa.md", text, ctx())
    expect(tasks.map((t) => [t.line, t.description, t.heading, t.parentLine])).toEqual([
      [4, "limpar", "Casa", null],
      [5, "cozinha", "Casa", 4],
      [10, "leite", "Mercado", null],
    ])
  })

  it("usa a data do nome do arquivo como agendada quando a opção está ligada", () => {
    const c = ctx({ useFilenameAsScheduledDate: true, filenameAsDateFolders: ["Diário"] })
    expect(tasksInNote("Diário/2026-10-18.md", "- [ ] revisar", c)[0]!.scheduledDate).toBe("2026-10-18")
    expect(tasksInNote("Outra/2026-10-18.md", "- [ ] revisar", c)[0]!.scheduledDate).toBeNull()
    const t = tasksInNote("Diário/2026-10-18.md", "- [ ] revisar", c)[0]!
    expect(taskToLine(t, c.settings)).toBe("- [ ] revisar")
  })
})

describe("marcar tarefas", () => {
  it("exemplo obrigatório: conclui em 18/10 e cria uma única ocorrência para 19/10 acima", () => {
    const text = "- [ ] Beber 2L de água 🔁 every day 📅 2026-10-18"
    expect(toggle(text)).toBe("- [ ] Beber 2L de água 🔁 every day 📅 2026-10-19\n- [x] Beber 2L de água 🔁 every day 📅 2026-10-18 ✅ 2026-10-18")
  })

  it("com recurrenceOnNextLine, a próxima ocorrência vai para baixo", () => {
    const text = "- [ ] Beber 2L de água 🔁 every day 📅 2026-10-18"
    expect(toggle(text, 0, ctx({ recurrenceOnNextLine: true }))).toBe("- [x] Beber 2L de água 🔁 every day 📅 2026-10-18 ✅ 2026-10-18\n- [ ] Beber 2L de água 🔁 every day 📅 2026-10-19")
  })

  it("reabrir tira a data de conclusão sem criar outra ocorrência", () => {
    const done = toggle("- [ ] Beber 2L de água 🔁 every day 📅 2026-10-18")
    expect(toggle(done, 1)).toBe("- [ ] Beber 2L de água 🔁 every day 📅 2026-10-19\n- [ ] Beber 2L de água 🔁 every day 📅 2026-10-18")
  })

  it("recusa quando a linha mudou desde a leitura (sem duplicar a recorrência)", () => {
    const text = "- [ ] Beber água 🔁 every day 📅 2026-10-18"
    const once = toggle(text)
    expect(() => changeTaskInText(once, 0, ctx(), { expected: text })).toThrow(/mudou de lugar/)
  })

  it("cancelar põe ❌ e não gera recorrência; voltar tira a data", () => {
    const c = ctx()
    const cancelled = changeTaskInText("- [ ] a 🔁 every day 📅 2026-10-18", 0, c, { status: c.registry.bySymbol("-") })
    expect(cancelled).toBe("- [-] a 🔁 every day 📅 2026-10-18 ❌ 2026-10-18")
    expect(toggle(cancelled)).toBe("- [ ] a 🔁 every day 📅 2026-10-18")
  })

  it("respeita setDoneDate desligado e põe a data de criação na próxima com setCreatedDate", () => {
    expect(toggle("- [ ] a", 0, ctx({ setDoneDate: false }))).toBe("- [x] a")
    expect(toggle("- [ ] a 🔁 every week ➕ 2026-10-01 📅 2026-10-18", 0, ctx({ setCreatedDate: true }))).toBe("- [ ] a 🔁 every week ➕ 2026-10-18 📅 2026-10-25\n- [x] a 🔁 every week ➕ 2026-10-01 📅 2026-10-18 ✅ 2026-10-18")
  })

  it("🏁 delete apaga a ocorrência concluída e mantém só a próxima", () => {
    expect(toggle("- [ ] lixo 🔁 every week 🏁 delete 📅 2026-10-18\nfim")).toBe("- [ ] lixo 🔁 every week 🏁 delete 📅 2026-10-25\nfim")
    expect(toggle("antes\n- [ ] único 🏁 delete\nfim", 1)).toBe("antes\nfim")
  })

  it("a próxima ocorrência não leva id, dependências nem referência de bloco", () => {
    expect(toggle("- [ ] a 🆔 t1 ⛔ t0 🔁 every day 📅 2026-10-18 ^b1")).toBe("- [ ] a 🔁 every day 📅 2026-10-19\n- [x] a 🆔 t1 ⛔ t0 🔁 every day 📅 2026-10-18 ✅ 2026-10-18 ^b1")
  })

  it("estados personalizados: o próximo estado e o estado da recorrência seguem a configuração", () => {
    const settings = importTasksPluginData(JSON.stringify({ statusSettings: { coreStatuses: [{ symbol: " ", name: "Todo", nextStatusSymbol: ">", type: "TODO" }, { symbol: "x", name: "Done", nextStatusSymbol: " ", type: "DONE" }], customStatuses: [{ symbol: ">", name: "Adiada", nextStatusSymbol: "x", type: "IN_PROGRESS" }] } })).settings
    const c = ctx(settings)
    expect(toggle("- [ ] a", 0, c)).toBe("- [>] a")
    expect(toggle("- [>] a 🔁 every day 📅 2026-10-18", 0, c)).toBe("- [ ] a 🔁 every day 📅 2026-10-19\n- [x] a 🔁 every day 📅 2026-10-18 ✅ 2026-10-18")
  })

  it("fora do filtro global, a caixa só alterna, sem datas", () => {
    expect(toggle("- [ ] sem filtro 📅 2026-10-18", 0, ctx({ globalFilter: "#t" }))).toBe("- [x] sem filtro 📅 2026-10-18")
  })

  it("preserva CRLF e o resto do arquivo", () => {
    expect(toggle("# t\r\n- [ ] a\r\nfim\r\n", 1)).toBe("# t\r\n- [x] a ✅ 2026-10-18\r\nfim\r\n")
  })

  it("muda a data e a prioridade regravando só a linha", () => {
    const text = "x\n- [ ] a 📅 2026-10-18\ny"
    expect(updateTaskInText(text, 1, ctx(), { dueDate: "2026-10-25", priority: "0" })).toBe("x\n- [ ] a 🔺 📅 2026-10-25\ny")
  })

  it("adiar: a partir da data, ou de hoje se já passou", () => {
    const t = parseTaskLine("- [ ] a ⏳ 2026-10-10 📅 2026-10-30", "a.md", 0, ctx())!
    expect(postponeField(t, "due-scheduled-start")).toBe("dueDate")
    expect(postponeField(t, "scheduled-due-start")).toBe("scheduledDate")
    expect(postponedDate("2026-10-30", "2026-10-18", 1)).toBe("2026-10-31")
    expect(postponedDate("2026-10-10", "2026-10-18", 7)).toBe("2026-10-25")
  })
})

describe("recorrência", () => {
  const next = (rule: string, dates: { dueDate?: string; scheduledDate?: string; startDate?: string }, today = "2026-10-18") => {
    const d = { dueDate: dates.dueDate ?? null, scheduledDate: dates.scheduledDate ?? null, startDate: dates.startDate ?? null }
    const r = parseRecurrence(rule, d, today)
    if (!r) throw new Error(`regra inválida: ${rule}`)
    return nextOccurrence(r, d, today)
  }

  it("grava o texto canônico do rrule", () => {
    const d = { dueDate: "2026-10-18", scheduledDate: null, startDate: null }
    expect(parseRecurrence("Every Day", d, "2026-10-18")?.text).toBe("every day")
    expect(parseRecurrence("every 2 weeks on Monday, Friday when done", d, "2026-10-18")?.text).toBe("every 2 weeks on Monday, Friday when done")
    expect(parseRecurrence("toda segunda", d, "2026-10-18")).toBeNull()
  })

  it("mês com dia 31 cai no último dia do mês seguinte, inclusive em ano bissexto", () => {
    expect(next("every month", { dueDate: "2026-01-31" })).toEqual({ dueDate: "2026-02-28", scheduledDate: null, startDate: null })
    expect(next("every month", { dueDate: "2028-01-31" })?.dueDate).toBe("2028-02-29")
    expect(next("every month on the 31st", { dueDate: "2026-01-31" })?.dueDate).toBe("2026-03-31")
    expect(next("every year", { dueDate: "2028-02-29" })?.dueDate).toBe("2029-02-28")
  })

  it("dias úteis, intervalos e semanas", () => {
    expect(next("every weekday", { dueDate: "2026-10-16" })?.dueDate).toBe("2026-10-19")
    expect(next("every 3 days", { dueDate: "2026-10-18" })?.dueDate).toBe("2026-10-21")
    expect(next("every week on Tuesday", { dueDate: "2026-10-18" })?.dueDate).toBe("2026-10-20")
  })

  it("tarefa atrasada anda a partir da data dela; com when done, a partir de hoje", () => {
    expect(next("every week", { dueDate: "2026-10-01" })?.dueDate).toBe("2026-10-08")
    expect(next("every week when done", { dueDate: "2026-10-01" })?.dueDate).toBe("2026-10-25")
  })

  it("mantém a distância entre as datas (referência: prazo, depois agendada, depois início)", () => {
    expect(next("every week", { startDate: "2026-10-16", scheduledDate: "2026-10-17", dueDate: "2026-10-18" })).toEqual({ startDate: "2026-10-23", scheduledDate: "2026-10-24", dueDate: "2026-10-25" })
    expect(next("every day", { scheduledDate: "2026-10-18", startDate: "2026-10-15" })).toEqual({ startDate: "2026-10-16", scheduledDate: "2026-10-19", dueDate: null })
  })

  it("atravessa a troca do horário de verão sem pular dias", () => {
    expect(next("every day", { dueDate: "2026-11-01" })?.dueDate).toBe("2026-11-02")
    expect(next("every day", { dueDate: "2026-03-08" })?.dueDate).toBe("2026-03-09")
  })

  it("regra que terminou não cria ocorrência", () => {
    expect(next("every day for 1 time", { dueDate: "2026-10-18" })).toBeNull()
  })
})

describe("dependências e urgência", () => {
  const c = ctx()
  const all = tasksInNote("a.md", "- [ ] base 🆔 b1\n- [ ] depois ⛔ b1\n- [x] feita 🆔 f1\n- [ ] livre ⛔ f1", c)

  it("bloqueada só por tarefa por fazer; bloqueando só se alguém por fazer depende dela", () => {
    expect(all.map((t) => isBlocked(t, all))).toEqual([false, true, false, false])
    expect(all.map((t) => isBlocking(t, all))).toEqual([true, false, false, false])
  })

  it("calcula a urgência como o Tasks", () => {
    const t = (line: string) => parseTaskLine(line, "a.md", 0, c)!
    expect(urgency(t("- [ ] a"), "2026-10-18")).toBeCloseTo(1.95)
    expect(urgency(t("- [ ] a 📅 2026-10-18 ⏫"), "2026-10-18")).toBeCloseTo((14 * 0.8) / 21 * 12 + 0.2 * 12 + 6)
    expect(urgency(t("- [ ] a 📅 2026-10-01"), "2026-10-18")).toBeCloseTo(12 + 1.95)
    expect(urgency(t("- [ ] a 🛫 2026-10-20 ⏳ 2026-10-01 ⏬"), "2026-10-18")).toBeCloseTo(-3 + 5 - 1.8)
  })
})

describe("configurações do Tasks", () => {
  it("importa o data.json e lista o que não muda o comportamento", () => {
    const { settings, ignored } = importTasksPluginData(JSON.stringify({ globalFilter: "#t", taskFormat: "dataview", setDoneDate: false, recurrenceOnNextLine: true, postpone: { dateField: "scheduled" }, presets: { meu: "not done" }, autoSuggestInEditor: true, loggingOptions: {} }))
    expect(settings).toMatchObject({ globalFilter: "#t", taskFormat: "dataview", setDoneDate: false, recurrenceOnNextLine: true, postponeDateField: "scheduled", presets: { meu: "not done" } })
    expect(ignored).toEqual(["autoSuggestInEditor", "loggingOptions"])
  })
})
