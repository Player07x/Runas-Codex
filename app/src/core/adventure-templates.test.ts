import { ADVENTURE_TEMPLATES, nextArcOrder, planAdventure } from "./adventure-templates"

const template = (id: string) => ADVENTURE_TEMPLATES.find((t) => t.id === id)!

describe("modelos de aventura", () => {
  it("cria o arco e uma missão por cena em fila, com a ordem e o requer de cada uma", () => {
    const t = template("tres-atos")
    const plan = planAdventure({ title: "O Selo", hook: "Um selo falso", goal: "Achar o falsário", scenes: t.scenes, flow: t.flow, order: "4" })
    expect(plan).toHaveLength(5)
    expect(plan[0]).toMatchObject({ title: "O Selo", order: "4", requires: [] })
    expect(plan[0]!.body).toContain("[[O chamado]]")
    expect(plan[1]).toMatchObject({ title: "O chamado", order: "4.1", parent: "O Selo", requires: [] })
    expect(plan[2]).toMatchObject({ order: "4.2", requires: ["O chamado"] })
  })

  it("na investigação as pistas ficam abertas e o esconderijo depende de todas", () => {
    const t = template("investigacao")
    const plan = planAdventure({ title: "Crime", hook: "", goal: "", scenes: t.scenes, flow: t.flow, order: "1" })
    expect(plan[1]!.requires).toEqual([])
    expect(plan[3]!.requires).toEqual([])
    expect(plan[4]!.requires).toEqual(["A cena do crime", "A testemunha relutante", "O rastro do dinheiro"])
    expect(plan[5]!.requires).toEqual(["O esconderijo"])
  })

  it("ignora cenas sem título e acha a próxima ordem livre", () => {
    const plan = planAdventure({ title: "Livre", hook: "", goal: "", scenes: [{ title: "A", hint: "" }, { title: " ", hint: "" }, { title: "B", hint: "" }], flow: "livre", order: "2" })
    expect(plan.map((p) => p.title)).toEqual(["Livre", "A", "B"])
    expect(plan[2]!.requires).toEqual(["A"])
    expect(nextArcOrder(["1", "1.2", "3.1", "x"])).toBe("4")
    expect(nextArcOrder([])).toBe("1")
  })
})
