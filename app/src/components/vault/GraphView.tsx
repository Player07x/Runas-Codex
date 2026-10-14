// O PixiJS 8 gera shaders com `new Function`; este módulo troca isso por código pronto (a CSP não tem unsafe-eval).
import "pixi.js/unsafe-eval"
import { Application, Container, Graphics, Text } from "pixi.js"
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force"
import { useEffect, useRef, useState } from "react"
import type { GraphData, GraphGroup, GraphNode } from "../../core/graph-data"

/**
 * Gráfico de notas em WebGL (PixiJS) com simulação de forças (d3-force): fluido com milhares de notas, ao contrário
 * do SVG. Arrastar o fundo move, a roda (ou pinça) aproxima, arrastar um nó o prende enquanto segura, passar o mouse
 * realça os vizinhos e clicar abre a nota.
 */

export interface GraphForces {
  repulsion: number
  distance: number
  nodeSize: number
  linkWidth: number
  arrows: boolean
}

export const DEFAULT_FORCES: GraphForces = { repulsion: 140, distance: 70, nodeSize: 1, linkWidth: 1, arrows: false }

interface SimNode extends SimulationNodeDatum {
  id: string
  node: GraphNode
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  source: SimNode
  target: SimNode
  mutual: boolean
  color?: string
}

interface Settings {
  groups: GraphGroup[]
  forces: GraphForces
  center?: string
  labels: "auto" | "always"
  onOpen(node: GraphNode): void
}

interface Palette {
  note: string
  portal: string
  missing: string
  attachment: string
  edge: string
  highlight: string
  text: string
}

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return {
    note: v("--cyan-dim", "#8d9adb"),
    portal: v("--violet", "#bfadf1"),
    missing: v("--red", "#ffa48e"),
    attachment: v("--gold", "#ecc484"),
    edge: v("--line-strong", "#69799c"),
    highlight: v("--cyan", "#bec6ff"),
    text: v("--text", "#f0f2fa"),
  }
}

class GraphRuntime {
  private app = new Application()
  private world = new Container()
  private edges = new Graphics()
  private dots = new Graphics()
  private labelLayer = new Container()
  private labels = new Map<string, Text>()
  private nodes: SimNode[] = []
  private links: SimLink[] = []
  private byId = new Map<string, SimNode>()
  private neighbors = new Map<string, Set<string>>()
  private sim: Simulation<SimNode, SimLink>
  private palette = readPalette()
  private hover: string | null = null
  private focused: string | null = null
  private dirty = true
  private fitPending = true
  private ticks = 0
  private pointers = new Map<number, { x: number; y: number }>()
  private gesture: { kind: "drag"; node: SimNode; moved: number } | { kind: "pan"; moved: number } | { kind: "pinch"; distance: number } | null = null
  private ready = false
  private destroyed = false
  private cleanup: (() => void)[] = []

  constructor(
    private readonly host: HTMLDivElement,
    private readonly settings: { current: Settings },
  ) {
    this.sim = forceSimulation<SimNode, SimLink>().stop()
    this.applyForces()
  }

  async init(): Promise<void> {
    const { clientWidth, clientHeight } = this.host
    await this.app.init({ width: Math.max(1, clientWidth), height: Math.max(1, clientHeight), backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: window.devicePixelRatio || 1, preference: "webgl" })
    if (this.destroyed) {
      this.app.destroy(true)
      return
    }
    this.host.appendChild(this.app.canvas)
    this.world.addChild(this.edges, this.dots, this.labelLayer)
    this.app.stage.addChild(this.world)
    this.world.position.set(clientWidth / 2, clientHeight / 2)
    this.app.ticker.add(() => this.frame())
    this.bindEvents()
    this.ready = true
  }

  // ---------- Dados e forças ----------

  setData(data: GraphData): void {
    const previous = this.byId
    const spread = 40 + Math.sqrt(data.nodes.length) * 12
    this.nodes = data.nodes.map((node) => {
      const old = previous.get(node.id)
      if (old) return Object.assign(old, { node })
      return { id: node.id, node, x: (Math.random() - 0.5) * spread, y: (Math.random() - 0.5) * spread }
    })
    this.byId = new Map(this.nodes.map((n) => [n.id, n]))
    this.links = data.edges.flatMap((edge) => {
      const source = this.byId.get(edge.source)
      const target = this.byId.get(edge.target)
      return source && target ? [{ source, target, mutual: Boolean(edge.mutual), ...(edge.color ? { color: edge.color } : {}) }] : []
    })
    this.neighbors = new Map(this.nodes.map((n) => [n.id, new Set<string>()]))
    for (const link of this.links) {
      this.neighbors.get(link.source.id)!.add(link.target.id)
      this.neighbors.get(link.target.id)!.add(link.source.id)
    }
    for (const [id, text] of this.labels) {
      if (!this.byId.has(id)) {
        text.destroy()
        this.labels.delete(id)
      }
    }
    this.sim.nodes(this.nodes)
    ;(this.sim.force("link") as ReturnType<typeof forceLink<SimNode, SimLink>>).links(this.links)
    this.sim.alpha(previous.size ? 0.5 : 1)
    if (!previous.size) {
      this.fitPending = true
      this.ticks = 0
    }
    this.dirty = true
  }

  applyForces(): void {
    const { repulsion, distance } = this.settings.current.forces
    this.sim
      .force("charge", forceManyBody<SimNode>().strength(-repulsion).theta(0.9).distanceMax(900))
      .force("link", forceLink<SimNode, SimLink>(this.links).distance(distance).strength(0.4))
      .force("x", forceX<SimNode>(0).strength(0.035))
      .force("y", forceY<SimNode>(0).strength(0.035))
      .force("collide", forceCollide<SimNode>((n) => this.radius(n.node) * 1.3).strength(0.6))
    if (this.sim.alpha() < 0.3) this.sim.alpha(0.3)
    this.dirty = true
  }

  focus(id: string | undefined): void {
    this.focused = id ?? null
    const node = id ? this.byId.get(id) : undefined
    if (node && this.ready) {
      const k = Math.max(this.world.scale.x, 1)
      this.world.scale.set(k)
      this.world.position.set(this.app.screen.width / 2 - (node.x ?? 0) * k, this.app.screen.height / 2 - (node.y ?? 0) * k)
    }
    this.dirty = true
  }

  /** Enquadra o gráfico inteiro na tela. */
  fit(): void {
    if (!this.nodes.length || !this.ready) return
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity]
    for (const n of this.nodes) {
      minX = Math.min(minX, n.x!)
      minY = Math.min(minY, n.y!)
      maxX = Math.max(maxX, n.x!)
      maxY = Math.max(maxY, n.y!)
    }
    const { width, height } = this.app.screen
    const k = Math.min(2, Math.max(0.05, Math.min(width / (maxX - minX + 120), height / (maxY - minY + 120))))
    this.world.scale.set(k)
    this.world.position.set(width / 2 - ((minX + maxX) / 2) * k, height / 2 - ((minY + maxY) / 2) * k)
    this.dirty = true
  }

  refreshPalette(): void {
    this.palette = readPalette()
    for (const text of this.labels.values()) text.style.fill = this.palette.text
    this.dirty = true
  }

  resize(): void {
    if (!this.ready) return
    this.app.renderer.resize(Math.max(1, this.host.clientWidth), Math.max(1, this.host.clientHeight))
    this.dirty = true
  }

  // ---------- Desenho ----------

  private radius(node: GraphNode): number {
    const base = node.kind === "note" || node.kind === "portal" ? 4 + Math.sqrt(node.degree) * 1.7 : 3.5
    return base * this.settings.current.forces.nodeSize
  }

  private color(node: GraphNode): string {
    if (node.group !== undefined) return this.settings.current.groups[node.group]?.color ?? this.palette.note
    return node.kind === "portal" ? this.palette.portal : node.kind === "missing" ? this.palette.missing : node.kind === "attachment" ? this.palette.attachment : this.palette.note
  }

  private frame(): void {
    if (this.sim.alpha() >= this.sim.alphaMin()) {
      this.sim.tick()
      this.ticks++
      this.dirty = true
      if (this.fitPending && (this.ticks === 60 || this.sim.alpha() < 0.05)) {
        this.fit()
        if (this.sim.alpha() < 0.05) this.fitPending = false
      }
    }
    if (this.dirty) this.draw()
  }

  private draw(): void {
    this.dirty = false
    const { forces, center, labels } = this.settings.current
    const k = this.world.scale.x
    const active = this.hover ?? this.focused
    const near = active ? this.neighbors.get(active) : undefined
    const lit = (id: string) => !active || id === active || Boolean(near?.has(id))

    const edges = this.edges.clear()
    const width = forces.linkWidth / Math.sqrt(k)
    const paint = (list: SimLink[], color: string, alpha: number) => {
      if (!list.length) return
      for (const { source, target } of list) edges.moveTo(source.x!, source.y!).lineTo(target.x!, target.y!)
      edges.stroke({ width, color, alpha })
    }
    const dim: SimLink[] = []
    const normal: SimLink[] = []
    const strong: SimLink[] = []
    for (const link of this.links) {
      if (!active) normal.push(link)
      else if (link.source.id === active || link.target.id === active) strong.push(link)
      else dim.push(link)
    }
    paint(dim, this.palette.edge, 0.12)
    // Ligações com cor própria (teia diplomática) saem por grupo de cor.
    const byColor = new Map<string, SimLink[]>()
    for (const link of normal) byColor.set(link.color ?? "", [...(byColor.get(link.color ?? "") ?? []), link])
    for (const [color, list] of byColor) paint(list, color || this.palette.edge, color ? 0.85 : 0.55)
    paint(strong, this.palette.highlight, 0.9)
    if (forces.arrows) {
      for (const link of this.links) {
        this.arrow(link.source, link.target)
        if (link.mutual) this.arrow(link.target, link.source)
      }
      edges.fill({ color: this.palette.edge, alpha: active ? 0.35 : 0.75 })
    }

    const dots = this.dots.clear()
    for (const n of this.nodes) {
      const r = this.radius(n.node)
      const color = n.id === active ? this.palette.highlight : this.color(n.node)
      const alpha = lit(n.id) ? 1 : 0.18
      const { x, y } = n as { x: number; y: number }
      if (n.node.kind === "portal") dots.poly([x, y - r, x + r, y, x, y + r, x - r, y]).fill({ color, alpha })
      else if (n.node.kind === "missing") dots.circle(x, y, r).stroke({ width: 1.5, color, alpha })
      else if (n.node.kind === "attachment") dots.rect(x - r, y - r, r * 2, r * 2).fill({ color, alpha })
      else dots.circle(x, y, r).fill({ color, alpha })
      if (n.id === center || n.id === this.focused) dots.circle(x, y, r + 3).stroke({ width: 1.5, color: this.palette.highlight, alpha: 0.9 })
    }

    // Nomes: perto (zoom) os da tela; longe, só o realce. Tamanho constante na tela.
    const { width: sw, height: sh } = this.app.screen
    const [x0, y0] = [-this.world.x / k, -this.world.y / k]
    const [x1, y1] = [x0 + sw / k, y0 + sh / k]
    // Gráfico grande: só bem de perto, para os nomes não virarem uma mancha.
    const showAll = labels === "always" || k >= (this.nodes.length > 300 ? 1.6 : 0.85)
    const shown = new Set<string>()
    if (showAll) {
      const inView = this.nodes.filter((n) => n.x! >= x0 && n.x! <= x1 && n.y! >= y0 && n.y! <= y1)
      inView.sort((a, b) => b.node.degree - a.node.degree)
      for (const n of inView.slice(0, 150)) shown.add(n.id)
    }
    if (active) {
      shown.add(active)
      for (const id of near ?? []) shown.add(id)
    }
    if (center) shown.add(center)
    for (const [id, text] of this.labels) if (!shown.has(id)) text.visible = false
    for (const id of shown) {
      const n = this.byId.get(id)
      if (!n) continue
      let text = this.labels.get(id)
      if (!text) {
        text = new Text({ text: n.node.label, style: { fontFamily: "Geist Variable, system-ui, sans-serif", fontSize: 12, fill: this.palette.text } })
        text.anchor.set(0.5, 0)
        text.resolution = window.devicePixelRatio || 1
        this.labelLayer.addChild(text)
        this.labels.set(id, text)
      }
      text.visible = true
      text.scale.set(1 / k)
      text.alpha = lit(id) ? 0.95 : 0.25
      text.position.set(n.x!, n.y! + this.radius(n.node) + 3 / k)
    }
  }

  private arrow(from: SimNode, to: SimNode): void {
    const dx = to.x! - from.x!
    const dy = to.y! - from.y!
    const length = Math.hypot(dx, dy)
    if (length < 1) return
    const [ux, uy] = [dx / length, dy / length]
    const tip = this.radius(to.node) + 1
    const size = 5 * this.settings.current.forces.linkWidth
    const [tx, ty] = [to.x! - ux * tip, to.y! - uy * tip]
    this.edges.poly([tx, ty, tx - ux * size - uy * size * 0.5, ty - uy * size + ux * size * 0.5, tx - ux * size + uy * size * 0.5, ty - uy * size - ux * size * 0.5])
  }

  // ---------- Interação ----------

  private local(event: PointerEvent | WheelEvent): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  private hit(point: { x: number; y: number }): SimNode | null {
    const k = this.world.scale.x
    const wx = (point.x - this.world.x) / k
    const wy = (point.y - this.world.y) / k
    let best: SimNode | null = null
    let bestDistance = Infinity
    for (const n of this.nodes) {
      const d = Math.hypot(n.x! - wx, n.y! - wy)
      if (d <= this.radius(n.node) + 5 / k && d < bestDistance) {
        best = n
        bestDistance = d
      }
    }
    return best
  }

  private zoomAt(point: { x: number; y: number }, factor: number): void {
    const k = this.world.scale.x
    const next = Math.min(6, Math.max(0.05, k * factor))
    this.world.position.set(point.x - ((point.x - this.world.x) * next) / k, point.y - ((point.y - this.world.y) * next) / k)
    this.world.scale.set(next)
    this.dirty = true
  }

  private bindEvents(): void {
    const canvas = this.app.canvas
    canvas.style.touchAction = "none"
    const on = <K extends keyof HTMLElementEventMap>(type: K, handler: (event: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      canvas.addEventListener(type, handler as EventListener, options)
      this.cleanup.push(() => canvas.removeEventListener(type, handler as EventListener))
    }
    on("pointerdown", (event) => {
      canvas.setPointerCapture(event.pointerId)
      const point = this.local(event)
      this.pointers.set(event.pointerId, point)
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()]
        this.gesture = { kind: "pinch", distance: Math.hypot(a!.x - b!.x, a!.y - b!.y) }
        return
      }
      const node = this.hit(point)
      if (node) {
        node.fx = node.x
        node.fy = node.y
        this.sim.alphaTarget(0.25)
        if (this.sim.alpha() < 0.25) this.sim.alpha(0.25)
        this.gesture = { kind: "drag", node, moved: 0 }
      } else this.gesture = { kind: "pan", moved: 0 }
    })
    on("pointermove", (event) => {
      const point = this.local(event)
      const last = this.pointers.get(event.pointerId)
      if (last) this.pointers.set(event.pointerId, point)
      const gesture = this.gesture
      if (gesture?.kind === "pinch" && this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()]
        const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
        this.zoomAt({ x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 }, distance / gesture.distance)
        gesture.distance = distance
        return
      }
      if (gesture && gesture.kind !== "pinch" && last) {
        const [dx, dy] = [point.x - last.x, point.y - last.y]
        gesture.moved += Math.hypot(dx, dy)
        if (gesture.kind === "drag") {
          const k = this.world.scale.x
          gesture.node.fx = (point.x - this.world.x) / k
          gesture.node.fy = (point.y - this.world.y) / k
        } else if (gesture.kind === "pan") {
          this.world.position.set(this.world.x + dx, this.world.y + dy)
        }
        this.dirty = true
        return
      }
      const hover = this.hit(point)?.id ?? null
      if (hover !== this.hover) {
        this.hover = hover
        canvas.style.cursor = hover ? "pointer" : "grab"
        this.dirty = true
      }
    })
    const end = (event: PointerEvent) => {
      this.pointers.delete(event.pointerId)
      const gesture = this.gesture
      if (gesture?.kind === "drag") {
        gesture.node.fx = null
        gesture.node.fy = null
        this.sim.alphaTarget(0)
        if (gesture.moved < 5 && event.type === "pointerup") this.settings.current.onOpen(gesture.node.node)
      }
      if (gesture?.kind !== "pinch" || this.pointers.size === 0) this.gesture = null
    }
    on("pointerup", end)
    on("pointercancel", end)
    on("pointerleave", () => {
      if (this.hover && !this.gesture) {
        this.hover = null
        this.dirty = true
      }
    })
    on("wheel", (event) => {
      event.preventDefault()
      this.zoomAt(this.local(event), Math.exp(-event.deltaY * 0.0015))
    }, { passive: false })
  }

  destroy(): void {
    this.destroyed = true
    this.sim.stop()
    for (const off of this.cleanup) off()
    if (this.ready) this.app.destroy(true, { children: true })
  }
}

interface Props {
  data: GraphData
  groups: GraphGroup[]
  forces: GraphForces
  /** Nó realçado e centralizado (busca "achar no gráfico"). */
  focus?: string
  /** Nó do centro do gráfico local (com anel). */
  center?: string
  labels?: "auto" | "always"
  /** Muda para enquadrar o gráfico inteiro de novo. */
  fitSignal?: number
  onOpen(node: GraphNode): void
  className?: string
}

export function GraphView({ data, groups, forces, focus, center, labels = "auto", fitSignal, onOpen, className }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const runtime = useRef<GraphRuntime | null>(null)
  const settings = useRef<Settings>({ groups, forces, center, labels, onOpen })
  settings.current = { groups, forces, center, labels, onOpen }
  const latestData = useRef(data)
  latestData.current = data
  const [error, setError] = useState<string>()

  useEffect(() => {
    const graph = new GraphRuntime(host.current!, settings)
    let alive = true
    graph.init().then(
      () => {
        if (!alive) return
        runtime.current = graph
        graph.setData(latestData.current)
      },
      (err: unknown) => alive && setError(err instanceof Error ? err.message : String(err)),
    )
    const resize = new ResizeObserver(() => graph.resize())
    resize.observe(host.current!)
    const theme = new MutationObserver(() => graph.refreshPalette())
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => {
      alive = false
      resize.disconnect()
      theme.disconnect()
      graph.destroy()
      runtime.current = null
    }
  }, [])

  useEffect(() => runtime.current?.setData(data), [data])
  useEffect(() => runtime.current?.applyForces(), [forces.repulsion, forces.distance, forces.nodeSize])
  useEffect(() => runtime.current?.focus(focus), [focus])
  useEffect(() => {
    if (fitSignal) runtime.current?.fit()
  }, [fitSignal])
  // Grupos, setas, espessura e o centro só mudam o desenho.
  useEffect(() => runtime.current?.refreshPalette(), [groups, forces.arrows, forces.linkWidth, center])

  return (
    <div ref={host} className={`graph-view ${className ?? ""}`}>
      {error && <p className="graph-error small">O gráfico precisa de WebGL, que não está disponível aqui ({error}).</p>}
    </div>
  )
}
