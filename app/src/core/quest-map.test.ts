import type { QuestInfo } from "./campaigns"
import { parseCanvas, serializeCanvas } from "./canvas"
import { buildQuestMap, questMapCanvas } from "./quest-map"

const quest = (path: string, title: string, extra: Partial<QuestInfo> = {}): QuestInfo => ({ path, title, status: "ativa", order: "", tags: [], requires: [], ...extra })
const link = (dest: string | null, target = dest ?? "x") => ({ target, dest })

describe("mapa de missões", () => {
  const quests = [
    quest("M/Selo.md", "O Selo do Conde", { order: "2" }),
    quest("M/Yara.md", "Falar com Yara", { order: "2.1", status: "concluida" }),
    quest("M/Mapa.md", "Achar o mapa", { parent: link("M/Selo.md") }),
    quest("M/Cripta.md", "Invadir a cripta", { parent: link("M/Selo.md"), requires: [link("M/Yara.md"), link("M/Mapa.md")] }),
    quest("M/Peste.md", "Peste no porto", { order: "3", status: "ideia" }),
  ]

  it("agrupa pelo parte_de e pela ordem, e põe o pré-requisito numa coluna antes", () => {
    const map = buildQuestMap(quests)
    expect(map.arcs.map((a) => [a.title, a.nodes.map((n) => n.title)])).toEqual([
      ["O Selo do Conde", ["Falar com Yara", "Achar o mapa", "Invadir a cripta"]],
      ["Missões soltas", ["Peste no porto"]],
    ])
    const by = Object.fromEntries(map.nodes.map((n) => [n.title, n]))
    expect(by["Falar com Yara"]).toMatchObject({ inferred: true, layer: 0, blocked: false })
    expect(by["Achar o mapa"]).toMatchObject({ inferred: false, layer: 0 })
    expect(by["Invadir a cripta"]).toMatchObject({ layer: 1, blocked: true })
    expect(by["Invadir a cripta"]!.x).toBeGreaterThan(by["Achar o mapa"]!.x)
    expect(map.edges).toEqual([{ from: "M/Yara.md", to: "M/Cripta.md" }, { from: "M/Mapa.md", to: "M/Cripta.md" }])
    expect(map.warnings).toEqual([])
  })

  it("avisa ciclos e links quebrados sem travar", () => {
    const map = buildQuestMap([
      quest("A.md", "A", { requires: [link("B.md")] }),
      quest("B.md", "B", { requires: [link("A.md"), link(null, "Sumida")] }),
    ])
    expect(map.nodes).toHaveLength(2)
    expect(map.warnings.some((w) => w.includes("Ciclo"))).toBe(true)
    expect(map.warnings.some((w) => w.includes("Sumida"))).toBe(true)
  })

  it("aguenta 200 missões em vários arcos", () => {
    const many = Array.from({ length: 200 }, (_, i) => quest(`M/${i}.md`, `Missão ${i}`, { order: i < 10 ? String(i + 1) : `${(i % 10) + 1}.${i}`, requires: i > 20 ? [link(`M/${i - 10}.md`)] : [] }))
    const map = buildQuestMap(many)
    expect(map.arcs.length).toBe(10)
    expect(map.nodes.length).toBe(190)
  })

  it("gera um .canvas do Obsidian e, ao atualizar, guarda o que o mestre pôs", () => {
    const map = buildQuestMap(quests)
    const first = questMapCanvas(map)
    expect(first.nodes.filter((n) => n.type === "group")).toHaveLength(2)
    expect(first.nodes.filter((n) => n.type === "file").map((n) => n.file)).toEqual(["M/Yara.md", "M/Mapa.md", "M/Cripta.md", "M/Peste.md"])
    expect(first.edges).toHaveLength(2)
    const edited = { ...first, nodes: [...first.nodes, { id: "nota", type: "text", text: "Lembrar do selo", x: 0, y: -100, width: 200, height: 60 }] }
    const parsed = parseCanvas(serializeCanvas(edited))
    if ("error" in parsed) throw new Error(parsed.error)
    const again = questMapCanvas(buildQuestMap(quests.slice(0, 4)), parsed.doc)
    expect(again.nodes.some((n) => n.id === "nota")).toBe(true)
    expect(again.nodes.filter((n) => n.type === "file")).toHaveLength(3)
    expect(again.nodes.filter((n) => n.type === "group")).toHaveLength(1)
  })
})
