import { describe, expect, it } from "vitest"
import { investigationCanvas, sessionTimelineCanvas } from "./board-templates"
import type { SessionInfo } from "./campaigns"

const session = (n: number, status: SessionInfo["status"], extra: Partial<SessionInfo> = {}): SessionInfo => ({
  path: `Campanhas/C/Sessões/Sessão ${n}.md`, name: `Sessão ${n}`, number: n, title: `Sessão ${n}`, status, present: [], summary: "", prep: [], ...extra,
})

describe("modelos de quadro", () => {
  it("linha do tempo: sessões em ordem com datas, sem as canceladas, ligadas por setas", () => {
    const doc = sessionTimelineCanvas([
      session(1, "realizada", { date: "2026-10-03", worldDate: "4031-07-10" }),
      session(2, "cancelada"),
      session(3, "planejada", { date: "2026-10-17" }),
    ], (d) => `dia ${d}`)
    expect(doc.nodes).toHaveLength(2)
    expect(doc.nodes[0]!.text).toContain("[[Campanhas/C/Sessões/Sessão 1|Sessão 1]]")
    expect(doc.nodes[0]!.text).toContain("03/10/2026")
    expect(doc.nodes[0]!.text).toContain("dia 4031-07-10")
    expect(doc.nodes[1]!.color).toBe("3")
    expect(doc.edges).toEqual([expect.objectContaining({ fromNode: doc.nodes[0]!.id, toNode: doc.nodes[1]!.id })])
  })

  it("investigação: três pistas levam à conclusão e há um grupo para os suspeitos", () => {
    const doc = investigationCanvas()
    const conclusion = doc.nodes.find((n) => n.text?.includes("A conclusão"))!
    expect(doc.edges.filter((e) => e.toNode === conclusion.id)).toHaveLength(3)
    expect(doc.nodes.some((n) => n.type === "group" && n.label === "Suspeitos")).toBe(true)
    expect(new Set(doc.nodes.map((n) => n.id)).size).toBe(doc.nodes.length)
  })
})
