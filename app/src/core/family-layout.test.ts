import { describe, expect, it } from "vitest"
import { familyGraph, generationLabel, layoutFamily } from "./family-layout"
import { VaultIndex } from "./vault-index"

const vault = (files: Record<string, string>) => new VaultIndex(Object.keys(files).map((path) => ({ path, size: files[path]!.length, mtime: 1 })), files)
const person = (links: string) => `---\ntipo: personagem\n${links}\n---\n# x`
const W = "Wikis/X/"

describe("árvore genealógica", () => {
  const index = vault({
    [`${W}Avó.md`]: person("filhos: ['[[Mãe]]']"),
    [`${W}Mãe.md`]: person("pais: ['[[Avó]]']\nconjuges: ['[[Pai]]']\nfilhos: ['[[Ana]]', '[[Bia]]']"),
    [`${W}Pai.md`]: person("conjuges: ['[[Mãe]]']\nfilhos: ['[[Ana]]', '[[Bia]]']"),
    [`${W}Ana.md`]: person("pais: ['[[Mãe]]', '[[Pai]]']\nfilhos: ['[[Neto]]']"),
    [`${W}Bia.md`]: person("pais: ['[[Mãe]]', '[[Pai]]']"),
    [`${W}Neto.md`]: person("pais: ['[[Ana]]']"),
  })

  it("mostra gerações acima e abaixo separadas", () => {
    const one = familyGraph(index, `${W}Mãe.md`, 1, 1, W)
    expect([...one.generations.keys()].sort()).toEqual([-1, 0, 1])
    const onlyDown = familyGraph(index, `${W}Mãe.md`, 0, 2, W)
    expect([...onlyDown.generations.keys()].sort()).toEqual([0, 1, 2])
    expect(onlyDown.edges.every((e) => !e.from.endsWith("Avó.md") && !e.to.endsWith("Avó.md"))).toBe(true)
  })

  it("põe o casal lado a lado e os filhos saindo do meio dele, sem sobrepor", () => {
    const layout = layoutFamily(familyGraph(index, `${W}Mãe.md`, 2, 2, W))
    const node = (name: string) => layout.nodes.find((n) => n.path === `${W}${name}.md`)!
    expect(new Set(layout.nodes.map((n) => `${n.x}:${n.y}`)).size).toBe(layout.nodes.length)
    expect(Math.abs(node("Mãe").x - node("Pai").x)).toBe(170 + 24)
    const middle = (Math.min(node("Mãe").x, node("Pai").x) + Math.max(node("Mãe").x, node("Pai").x) + 170) / 2
    const toAna = layout.lines.filter((l) => l.kind === "filiacao" && l.x2 === node("Ana").x + 85 && l.y2 === node("Ana").y)
    expect(toAna).toEqual([expect.objectContaining({ x1: middle })])
    expect(layout.lines.filter((l) => l.kind === "casamento")).toHaveLength(1)
  })

  it("não trava com ciclo nos dados", () => {
    const cycle = vault({ [`${W}A.md`]: person("filhos: ['[[B]]']\npais: ['[[B]]']"), [`${W}B.md`]: person("filhos: ['[[A]]']\npais: ['[[A]]']") })
    const layout = layoutFamily(familyGraph(cycle, `${W}A.md`, 5, 5, W))
    expect(layout.nodes).toHaveLength(2)
    expect(new Set(layout.nodes.map((n) => `${n.x}:${n.y}`)).size).toBe(2)
  })
})

describe("geração em palavras (U48)", () => {
  it("diz a geração de cada nome para o leitor de tela", () => {
    expect(generationLabel(0, true)).toBe("centro")
    expect(generationLabel(0)).toBe("mesma geração")
    expect(generationLabel(-1)).toBe("1 geração acima")
    expect(generationLabel(2)).toBe("2 gerações abaixo")
  })
})
