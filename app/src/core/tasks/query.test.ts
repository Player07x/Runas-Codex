import { describe, expect, it } from "vitest"
import { continueLines, explainQuery, groupHeading, parseQuery, runQuery } from "./query"
import { DEFAULT_TASKS_SETTINGS, type TasksSettings } from "./settings"
import { parseContext, tasksInNote, type Task } from "./task"

// Domingo, 18/10/2026.
const NOW = new Date(2026, 9, 18, 9, 0)
const settings = DEFAULT_TASKS_SETTINGS

const NOTES: Record<string, string> = {
  "Casa/Tarefas.md": [
    "# Limpeza",
    "- [ ] Lavar louça #casa 📅 2026-10-18",
    "- [ ] Varrer #casa ⏫ 📅 2026-10-15",
    "  - [ ] Varrer a varanda 📅 2026-10-25",
    "- [x] Trocar lâmpada ✅ 2026-10-17",
    "# Compras",
    "- [/] Comprar tinta 🔼 ⏳ 2026-10-19 #obra",
    "- [-] Comprar cortina ❌ 2026-10-10",
  ].join("\n"),
  "Trabalho/Projeto.md": [
    "## Entregas",
    "- [ ] Relatório 🆔 rel 📅 2026-10-21 🔁 every week",
    "- [ ] Revisar relatório ⛔ rel 🛫 2026-10-22",
    "- [ ] Ideia solta",
    "> [!note]",
    "> - [ ] Tarefa no callout 📅 2026-11-02",
  ].join("\n"),
  "Raiz.md": "- [ ] Na raiz 📅 2026-12-31 🔽",
}

function allTasks(s: TasksSettings = settings): Task[] {
  const ctx = parseContext(s, NOW)
  return Object.entries(NOTES).flatMap(([path, text]) => tasksInNote(path, text, ctx))
}

function run(source: string, s: TasksSettings = settings, file = "Consultas/Hoje.md", properties?: Record<string, unknown>) {
  const q = parseQuery(source, { settings: s, now: NOW, file: { path: file, ...(properties ? { properties } : {}) } })
  const result = runQuery(q, allTasks(s), s, NOW)
  return { q, result, names: result.groups.flatMap((g) => g.tasks.map((t) => t.description)) }
}

describe("consultas tasks: filtros", () => {
  it("not done e done", () => {
    expect(run("done").names.sort()).toEqual(["Comprar cortina", "Trocar lâmpada"])
    expect(run("not done").names).toHaveLength(9)
  })

  it("datas absolutas, relativas e por extenso", () => {
    expect(run("due today").names).toEqual(["Lavar louça #casa"])
    expect(run("due before today").names).toEqual(["Varrer #casa"])
    expect(run("due on or before 2026-10-18").names.sort()).toEqual(["Lavar louça #casa", "Varrer #casa"])
    expect(run("due after this week").names.sort()).toEqual(["Na raiz", "Relatório", "Tarefa no callout", "Varrer a varanda"])
    expect(run("due next week").names.sort()).toEqual(["Relatório", "Varrer a varanda"])
    expect(run("due 2026-10-01 2026-10-16").names).toEqual(["Varrer #casa"])
    expect(run("due in 2026-Q4").names).toHaveLength(6)
    expect(run("due 2026-W43").names.sort()).toEqual(["Relatório", "Varrer a varanda"])
    expect(run("done yesterday").names).toEqual(["Trocar lâmpada"])
    expect(run("has due date\nno due date").names).toEqual([])
  })

  it("starts: tarefa sem início passa (como no Tasks)", () => {
    const names = run("starts before 2026-10-22\nnot done").names
    expect(names).toContain("Ideia solta")
    expect(names).not.toContain("Revisar relatório")
  })

  it("happens olha início, agendada e prazo", () => {
    expect(run("happens on 2026-10-19").names).toEqual(["Comprar tinta #obra"])
    expect(run("no happens date\nnot done").names).toEqual(["Ideia solta"])
  })

  it("texto: descrição, caminho, pasta, raiz, arquivo, título, etiquetas e regex", () => {
    expect(run("description includes RELATÓRIO").names.sort()).toEqual(["Relatório", "Revisar relatório"])
    expect(run("description regex matches /^Varrer$/").names).toEqual([])
    expect(run("description regex matches /^varrer/i").names.sort()).toEqual(["Varrer #casa", "Varrer a varanda"])
    expect(run("path includes Trabalho").names).toHaveLength(4)
    expect(run("folder includes Casa/").names).toHaveLength(6)
    expect(run("root includes Trabalho").names).toHaveLength(4)
    expect(run("filename includes Raiz.md").names).toEqual(["Na raiz"])
    expect(run("heading includes compras").names.sort()).toEqual(["Comprar cortina", "Comprar tinta #obra"])
    expect(run("tags include #obra").names).toEqual(["Comprar tinta #obra"])
    expect(run("tag does not include casa\nnot done").names).not.toContain("Lavar louça #casa")
    expect(run("no tags\ndone").names.sort()).toEqual(["Comprar cortina", "Trocar lâmpada"])
  })

  it("prioridade, estado, recorrência, dependências e sub-itens", () => {
    expect(run("priority is high").names).toEqual(["Varrer #casa"])
    expect(run("priority above none").names.sort()).toEqual(["Comprar tinta #obra", "Varrer #casa"])
    expect(run("priority is below none").names).toEqual(["Na raiz"])
    expect(run("status.type is IN_PROGRESS").names).toEqual(["Comprar tinta #obra"])
    expect(run("status.name includes cancel").names).toEqual(["Comprar cortina"])
    expect(run("is recurring").names).toEqual(["Relatório"])
    expect(run("is blocked").names).toEqual(["Revisar relatório"])
    expect(run("is blocking").names).toEqual(["Relatório"])
    expect(run("has depends on").names).toEqual(["Revisar relatório"])
    expect(run("has id").names).toEqual(["Relatório"])
    expect(run("id includes re").names).toEqual(["Relatório"])
    expect(run("recurrence includes week").names).toEqual(["Relatório"])
    const top = run("exclude sub-items\npath includes Casa").names
    expect(top).not.toContain("Varrer a varanda")
    expect(run("exclude sub-items\npath includes Trabalho").names).toContain("Tarefa no callout")
  })

  it("combinações booleanas com a precedência do Tasks (NOT, XOR, AND, OR)", () => {
    expect(run("(due today) OR (priority is high)").names.sort()).toEqual(["Lavar louça #casa", "Varrer #casa"])
    expect(run("(tag includes #casa) AND NOT (due today)").names).toEqual(["Varrer #casa"])
    expect(run("NOT (path includes Casa)").names).toHaveLength(5)
    expect(run("[due today] OR [done]").names).toHaveLength(3)
    expect(run('"due today" XOR "tag includes #casa"').names).toEqual(["Varrer #casa"])
    // OR é o mais fraco: A OR (B AND C)
    expect(run("(is recurring) OR (path includes Casa) AND (priority is high)").names.sort()).toEqual(["Relatório", "Varrer #casa"])
    expect(run("((due today) OR (is recurring)) AND (not done)").names.sort()).toEqual(["Lavar louça #casa", "Relatório"])
  })

  it("erros com a linha do problema", () => {
    expect(run("due blablabla").result.error).toMatch(/data/)
    expect(run("isso não existe").result.error).toMatch(/não entendi a consulta/)
    expect(run("(due today) OR due tomorrow").result.error).toBeTruthy()
    expect(run("description regex matches /(a+)+/").result.error).toMatch(/aninhados/)
  })

  it("JavaScript fica desligado, como no padrão do Tasks 8", () => {
    expect(run("filter by function task.urgency > 3").result.error).toMatch(/JavaScript está desligado/)
    expect(run("sort by function task.urgency").result.error).toMatch(/JavaScript/)
    expect(run("preset this_folder_only").result.error).toMatch(/JavaScript/)
  })
})

describe("consultas tasks: ordem, grupos e layout", () => {
  it("ordem padrão: tipo de estado, urgência, prazo, prioridade, caminho", () => {
    const names = run("path includes Casa").names
    expect(names.slice(0, 1)).toEqual(["Comprar tinta #obra"])
    expect(names.slice(-2)).toEqual(["Trocar lâmpada", "Comprar cortina"])
  })

  it("sort by com reverse e por etiqueta", () => {
    expect(run("not done\nhas due date\nsort by due").names[0]).toBe("Varrer #casa")
    expect(run("not done\nhas due date\nsort by due reverse").names[0]).toBe("Na raiz")
    expect(run("not done\nsort by description").names.slice(0, 2)).toEqual(["Comprar tinta #obra", "Ideia solta"])
  })

  it("group by com títulos ordenados e limit groups", () => {
    const { result } = run("not done\ngroup by priority")
    expect(result.groups.map((g) => groupHeading(g.names[0]!))).toEqual(["High priority", "Medium priority", "Normal priority", "Low priority"])
    const byDue = run("not done\ngroup by due").result.groups.map((g) => g.names[0])
    expect(byDue[0]).toBe("2026-10-15 quinta-feira")
    expect(byDue.at(-1)).toBe("No due date")
    const tags = run("group by tags\nlimit groups 1").result
    expect(tags.groups.map((g) => g.names[0])).toEqual(["(No tags)", "#casa", "#obra"])
    expect(tags.groups.every((g) => g.tasks.length === 1)).toBe(true)
  })

  it("limit conta antes e depois", () => {
    const { result } = run("not done\nlimit 3")
    expect(result.count).toBe(3)
    expect(result.countBeforeLimit).toBe(9)
  })

  it("hide/show, short mode, explain, view columns e comentários", () => {
    const { q } = run("# comentário\nhide due date\nshow urgency\nshort mode\nexplain\nview columns by status.type")
    expect(q.hidden.has("due date")).toBe(true)
    expect(q.hidden.has("urgency")).toBe(false)
    expect(q.shortMode && q.explain).toBe(true)
    expect(q.view.mode).toBe("columns")
    expect(explainQuery(run("due before tomorrow").q)).toContain("2026-10-19")
  })

  it("linhas continuadas com barra invertida", () => {
    expect(continueLines("(due today) OR \\\n   (done)\nnot done")).toEqual(["(due today) OR (done)", "not done"])
  })
})

describe("consultas tasks: predefinições, marcadores e consulta global", () => {
  it("this_file e this_folder usam a nota da consulta", () => {
    expect(run("preset this_file", settings, "Trabalho/Projeto.md").names).toHaveLength(4)
    expect(run("preset this_folder", settings, "Casa/Outra.md").names).toHaveLength(6)
    expect(run("path includes {{query.file.folder}}", settings, "Casa/x.md").names).toHaveLength(6)
  })

  it("marcador de propriedade da nota", () => {
    expect(run("tag includes {{query.file.property('etiqueta')}}", settings, "x.md", { etiqueta: "#obra" }).names).toEqual(["Comprar tinta #obra"])
  })

  it("predefinição inexistente lista as disponíveis", () => {
    expect(run("preset nada").result.error).toMatch(/Não achei a predefinição "nada"[\s\S]*this_file/)
  })

  it("consulta global vem antes, e ignore global query a desliga", () => {
    const s = { ...settings, globalQuery: "path includes Casa" }
    expect(run("not done", s).names).toHaveLength(4)
    expect(run("not done\nignore global query", s).names).toHaveLength(9)
  })

  it("propriedades TQ_ da nota viram instruções", () => {
    const { q } = run("not done", settings, "x.md", { TQ_short_mode: true, TQ_show_due_date: false, TQ_extra_instructions: "path includes Casa" })
    expect(q.shortMode).toBe(true)
    expect(q.hidden.has("due date")).toBe(true)
    expect(run("not done", settings, "x.md", { TQ_extra_instructions: "path includes Casa" }).names).toHaveLength(4)
  })

  it("filtro global: só conta tarefa com o texto, e a descrição é comparada sem ele", () => {
    const s = { ...settings, globalFilter: "#casa" }
    expect(run("not done", s).names.sort()).toEqual(["Lavar louça #casa", "Varrer #casa"])
  })
})
