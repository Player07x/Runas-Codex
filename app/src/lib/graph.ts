export interface GraphNode {
  id: string
  label: string
  group: string
  kind: "nota" | "inexistente" | "portal"
  x: number
  y: number
}

export interface GraphEdge {
  source: string
  target: string
}

/**
 * Layout de forças simples e determinístico (sempre o mesmo desenho para os mesmos dados).
 * A versão final usa WebGL para milhares de nós; aqui bastam algumas dezenas.
 */
export function layoutForces(nodes: Omit<GraphNode, "x" | "y">[], edges: GraphEdge[], width: number, height: number, iterations = 320): GraphNode[] {
  const placed: GraphNode[] = nodes.map((node, i) => {
    const angle = (i / nodes.length) * Math.PI * 2
    const radius = Math.min(width, height) * (0.25 + 0.15 * ((i * 7) % 5) / 5)
    return { ...node, x: width / 2 + radius * Math.cos(angle), y: height / 2 + radius * Math.sin(angle) }
  })
  const index = new Map(placed.map((n, i) => [n.id, i]))
  const links = edges.map((e) => [index.get(e.source), index.get(e.target)]).filter((pair): pair is [number, number] => pair[0] !== undefined && pair[1] !== undefined)
  for (let step = 0; step < iterations; step += 1) {
    const cooling = 1 - step / iterations
    const fx = new Float64Array(placed.length)
    const fy = new Float64Array(placed.length)
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const dx = placed[i].x - placed[j].x
        const dy = placed[i].y - placed[j].y
        const d2 = Math.max(dx * dx + dy * dy, 25)
        const force = 9000 / d2
        const d = Math.sqrt(d2)
        fx[i] += (dx / d) * force
        fy[i] += (dy / d) * force
        fx[j] -= (dx / d) * force
        fy[j] -= (dy / d) * force
      }
    }
    for (const [a, b] of links) {
      const dx = placed[b].x - placed[a].x
      const dy = placed[b].y - placed[a].y
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const force = (d - 130) * 0.03
      fx[a] += (dx / d) * force
      fy[a] += (dy / d) * force
      fx[b] -= (dx / d) * force
      fy[b] -= (dy / d) * force
    }
    for (let i = 0; i < placed.length; i += 1) {
      fx[i] += (width / 2 - placed[i].x) * 0.006
      fy[i] += (height / 2 - placed[i].y) * 0.006
      placed[i].x = Math.min(width - 30, Math.max(30, placed[i].x + Math.max(-12, Math.min(12, fx[i])) * cooling))
      placed[i].y = Math.min(height - 30, Math.max(30, placed[i].y + Math.max(-12, Math.min(12, fy[i])) * cooling))
    }
  }
  return placed
}
