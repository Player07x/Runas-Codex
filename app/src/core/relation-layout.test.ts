import { describe, expect, it } from "vitest"
import { layoutNeighbors, layoutOrg, orgStructure, orgStructureOf, parseRole, type LayoutNode } from "./relation-layout"
import { VaultIndex } from "./vault-index"
import { RELATION_TYPES, type RelationEdge } from "./wiki"

const type = (key: string) => RELATION_TYPES.find((t) => t.key === key)!
const edge = (from: string, key: string, to: string, note?: string): RelationEdge => ({ from, to, type: type(key), ...(note ? { note } : {}) })
const ORG = "W/Ordem.md"

describe("organograma: estrutura", () => {
  it("lê o cargo do parêntese e marca antigo membro pelo “ex”", () => {
    expect(parseRole("tesoureira")).toEqual({ former: false, role: "tesoureira" })
    expect(parseRole("ex-tesoureira")).toEqual({ former: true, role: "tesoureira" })
    expect(parseRole("ex membro")).toEqual({ former: true })
    expect(parseRole("Ex")).toEqual({ former: true })
    expect(parseRole("exilada")).toEqual({ former: false, role: "exilada" })
    expect(parseRole(undefined)).toEqual({ former: false })
  })

  it("monta líderes, cargos, antigos membros e a hierarquia", () => {
    const s = orgStructure([
      edge("W/Brites.md", "membro_de", ORG, "tesoureira"),
      edge("W/Ilan.md", "lider_de", ORG),
      edge("W/Lazaro.md", "membro_de", ORG, "ex-guarda"),
      edge("W/Nilo.md", "membro_de", ORG),
      edge("W/Nilo.md", "subordinado_a", "W/Brites.md"),
      edge("W/Fora.md", "membro_de", "W/Outra.md"),
    ], ORG)
    expect(s.members).toBe(4)
    expect(s.former).toBe(1)
    // Líder primeiro, antigos membros por último.
    expect(s.people.map((p) => p.path)).toEqual(["W/Ilan.md", "W/Brites.md", "W/Lazaro.md"])
    expect(s.people[0]).toMatchObject({ leader: true, former: false })
    expect(s.people[1]).toMatchObject({ role: "tesoureira", children: [{ path: "W/Nilo.md", leader: false, former: false, children: [] }] })
    expect(s.people[2]).toMatchObject({ role: "guarda", former: true })
  })

  it("não trava com subordinação em ciclo", () => {
    const s = orgStructure([edge("W/A.md", "membro_de", ORG), edge("W/B.md", "membro_de", ORG), edge("W/A.md", "subordinado_a", "W/B.md"), edge("W/B.md", "subordinado_a", "W/A.md")], ORG)
    expect(s.members).toBe(2)
    const all = (people: typeof s.people): string[] => people.flatMap((p) => [p.path, ...all(p.children)])
    expect(all(s.people).sort()).toEqual(["W/A.md", "W/B.md"])
  })

  it("lê o cofre: o campo lider da organização conta como líder", () => {
    const files: Record<string, string> = {
      "Wikis/X/Ordem.md": "---\ntipo: organizacao\nlider: \"[[Ilan]]\"\n---\n# Ordem\n",
      "Wikis/X/Ilan.md": "---\ntipo: personagem\n---\n# Ilan\n",
      "Wikis/X/Brites.md": "---\ntipo: personagem\nmembro_de: \"[[Ordem]] (tesoureira)\"\n---\n# Brites\n",
    }
    const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)
    const s = orgStructureOf(index, "Wikis/X/Ordem.md", "Wikis/X/")
    expect(s.people.map((p) => [p.path, p.leader, p.role])).toEqual([["Wikis/X/Ilan.md", true, undefined], ["Wikis/X/Brites.md", false, "tesoureira"]])
  })
})

describe("organograma: desenho", () => {
  const big = orgStructure([
    ...["A", "B", "C", "D"].map((n) => edge(`W/${n}.md`, "membro_de", ORG)),
    ...["A1", "A2", "A3"].map((n) => edge(`W/${n}.md`, "membro_de", ORG)),
    ...["A1", "A2", "A3"].map((n) => edge(`W/${n}.md`, "subordinado_a", "W/A.md")),
    edge("W/A11.md", "membro_de", ORG), edge("W/A11.md", "subordinado_a", "W/A1.md"),
    edge("W/D1.md", "membro_de", ORG, "ex-cozinheiro"), edge("W/D1.md", "subordinado_a", "W/D.md"),
  ], ORG)
  const overlap = (a: LayoutNode, b: LayoutNode) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

  it("põe cada cartão sem cobrir outro e o chefe centrado sobre os seus", () => {
    const layout = layoutOrg(big)
    expect(layout.nodes).toHaveLength(1 + big.members)
    for (const [i, a] of layout.nodes.entries()) for (const b of layout.nodes.slice(i + 1)) expect(overlap(a, b), `${a.path} × ${b.path}`).toBe(false)
    const a = layout.nodes.find((n) => n.path === "W/A.md")!
    const kids = layout.nodes.filter((n) => n.parent === "W/A.md")
    expect(a.x + a.w / 2).toBeCloseTo((Math.min(...kids.map((k) => k.x)) + Math.max(...kids.map((k) => k.x + k.w))) / 2)
    expect(layout.nodes.every((n) => n.x >= 0 && n.x + n.w <= layout.width && n.y + n.h <= layout.height)).toBe(true)
    expect(layout.edges).toHaveLength(big.members)
  })

  it("fecha um ramo sem desenhar quem está nele", () => {
    const layout = layoutOrg(big, new Set(["W/A.md"]))
    expect(layout.nodes.find((n) => n.path === "W/A.md")).toMatchObject({ collapsed: true, childCount: 4 })
    expect(layout.nodes.some((n) => n.path === "W/A1.md" || n.path === "W/A11.md")).toBe(false)
  })

  it("leva as setas ao chefe, ao primeiro subordinado e aos vizinhos do ramo", () => {
    const near = layoutNeighbors(layoutOrg(big))
    expect(near.get(ORG)).toEqual({ down: "W/A.md" })
    expect(near.get("W/A.md")).toMatchObject({ up: ORG, down: "W/A1.md", right: "W/B.md" })
    expect(near.get("W/A2.md")).toEqual({ up: "W/A.md", left: "W/A1.md", right: "W/A3.md" })
  })
})

describe("organograma com muitos membros (U72)", () => {
  const people = (n: number) => Array.from({ length: n }, (_, i) => edge(`W/P${String(i).padStart(2, "0")}.md`, "membro_de", ORG, i === 0 ? "tesoureira" : i === n - 1 ? "ex-membro" : undefined))
  it("põe 11 membros em 3 colunas de 4, sem cartão por cima de outro", () => {
    const layout = layoutOrg(orgStructure(people(11), ORG))
    const stacked = layout.nodes.filter((n) => n.stack)
    expect(stacked).toHaveLength(11)
    expect(new Set(stacked.map((n) => n.stack!.col)).size).toBe(3)
    expect(Math.max(...stacked.map((n) => n.stack!.row))).toBe(3)
    // Quem tem cargo vem primeiro; o antigo membro por último.
    expect(stacked.find((n) => n.stack!.col === 0 && n.stack!.row === 0)?.person?.role).toBe("tesoureira")
    expect(stacked.at(-1)?.person?.former).toBe(true)
    for (const a of layout.nodes) for (const b of layout.nodes) {
      if (a === b) continue
      expect(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true)
    }
    // Bem mais estreito que a fileira única (11 × 196 + 10 × 20).
    expect(layout.width).toBeLessThan(700)
  })
  it("com poucos membros continua lado a lado", () => {
    expect(layoutOrg(orgStructure(people(4), ORG)).nodes.some((n) => n.stack)).toBe(false)
  })
  it("as setas andam por fileira e coluna dentro da pilha", () => {
    const layout = layoutOrg(orgStructure(people(11), ORG)), near = layoutNeighbors(layout)
    const at = (col: number, row: number) => layout.nodes.find((n) => n.stack?.col === col && n.stack.row === row)!.path
    expect(near.get(at(0, 0))).toEqual({ up: ORG, down: at(0, 1), right: at(1, 0) })
    expect(near.get(at(1, 1))).toMatchObject({ up: at(1, 0), left: at(0, 1), right: at(2, 1) })
  })
})

