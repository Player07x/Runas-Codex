import type { SessionInfo } from "./campaigns"
import type { CanvasDoc, CanvasNode } from "./canvas"

/**
 * Modelos de quadro novo da campanha (sobras da revisão das Campanhas): além do em branco, do mapa de missões e do
 * mapa de relações, a linha do tempo das sessões e uma investigação de três pistas. Cada um é só o `.canvas` inicial;
 * depois o quadro é do mestre.
 */

const id = (prefix: string, n: number) => `runas-modelo-${prefix}-${String(n).padStart(3, "0")}`
const day = (date: string) => date.split("-").reverse().join("/")

/** As sessões em ordem, da esquerda para a direita, com a data real e a data no mundo. */
export function sessionTimelineCanvas(sessions: SessionInfo[], worldLabel: (date: string) => string = (d) => d): CanvasDoc {
  const shown = sessions.filter((s) => s.status !== "cancelada")
  const nodes: CanvasNode[] = shown.map((session, i) => {
    const target = session.path.replace(/\.md$/i, "")
    const lines = [`**[[${target}|${session.title}]]**`, session.date ? day(session.date) : "Sem data", ...(session.worldDate ? [`*${worldLabel(session.worldDate)}*`] : [])]
    return { id: id("sessao", i), type: "text", text: lines.join("\n\n"), x: i * 300, y: 0, width: 260, height: 160, color: session.status === "realizada" ? "4" : "3" }
  })
  const edges = nodes.slice(1).map((node, i) => ({ id: id("passo", i), fromNode: nodes[i]!.id, fromSide: "right" as const, toNode: node.id, toSide: "left" as const, toEnd: "arrow" as const }))
  return { nodes, edges }
}

/** A regra das três pistas: uma conclusão, três pistas que levam a ela e um grupo para os suspeitos. */
export function investigationCanvas(): CanvasDoc {
  const conclusion = id("conclusao", 0)
  const clues = [0, 1, 2].map((i) => id("pista", i))
  const nodes: CanvasNode[] = [
    { id: id("suspeitos", 0), type: "group", label: "Suspeitos", x: -40, y: 560, width: 980, height: 260 },
    { id: conclusion, type: "text", text: "## A conclusão\n\nO que os jogadores precisam descobrir.", x: 560, y: 160, width: 320, height: 160, color: "1" },
    ...clues.map((clue, i): CanvasNode => ({ id: clue, type: "text", text: `### Pista ${i + 1}\n\nOnde se acha:\n\nO que revela:`, x: 0, y: i * 200, width: 300, height: 160, color: "5" })),
    ...[0, 1, 2].map((i): CanvasNode => ({ id: id("suspeito", i), type: "text", text: `**Suspeito ${i + 1}**\n\nMotivo · álibi`, x: i * 320, y: 620, width: 280, height: 160 })),
  ]
  const edges = clues.map((clue, i) => ({ id: id("leva", i), fromNode: clue, fromSide: "right" as const, toNode: conclusion, toSide: "left" as const, toEnd: "arrow" as const }))
  return { nodes, edges }
}
