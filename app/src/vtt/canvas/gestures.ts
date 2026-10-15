import type { Point } from "../shared/grid"

export interface TouchSample extends Point { id: number; time: number }
export type TouchGesture =
  | { type: "tap" | "longpress" | "start" | "move" | "end"; origin: Point; point: Point }
  | { type: "pinchstart" | "pinchmove"; first: Point; second: Point }
  | { type: "cancel" | "pinchend" }

export const LONG_PRESS_MS = 550
const DRAG_DISTANCE = 8

/** Só reconhece intenções. Nenhuma edição começa no primeiro pointerdown. */
export class TouchGestures {
  private pointers = new Map<number, Point>()
  private origin: Point = { x: 0, y: 0 }
  private started = 0
  private mode: "idle" | "pending" | "drag" | "held" | "pinch" | "suppressed" = "idle"

  down(sample: TouchSample): TouchGesture[] {
    this.pointers.set(sample.id, { x: sample.x, y: sample.y })
    if (this.pointers.size === 1 && this.mode === "idle") {
      this.origin = { x: sample.x, y: sample.y }; this.started = sample.time; this.mode = "pending"
    } else if (this.pointers.size === 2 && this.mode !== "suppressed") {
      this.mode = "pinch"
      const [first, second] = [...this.pointers.values()]
      return [{ type: "cancel" }, { type: "pinchstart", first, second }]
    }
    return []
  }

  move(sample: TouchSample): TouchGesture[] {
    if (!this.pointers.has(sample.id)) return []
    const point = { x: sample.x, y: sample.y }
    this.pointers.set(sample.id, point)
    if (this.mode === "pinch") {
      const [first, second] = [...this.pointers.values()]
      return [{ type: "pinchmove", first, second }]
    }
    if (this.mode === "pending" && Math.hypot(point.x - this.origin.x, point.y - this.origin.y) >= DRAG_DISTANCE) {
      this.mode = "drag"
      return [{ type: "start", origin: this.origin, point: this.origin }, { type: "move", origin: this.origin, point }]
    }
    return this.mode === "drag" ? [{ type: "move", origin: this.origin, point }] : []
  }

  tick(time: number): TouchGesture[] {
    if (this.mode !== "pending" || time - this.started < LONG_PRESS_MS) return []
    this.mode = "held"
    return [{ type: "longpress", origin: this.origin, point: this.origin }]
  }

  up(sample: TouchSample, cancelled = false): TouchGesture[] {
    if (!this.pointers.delete(sample.id)) return []
    const previous = this.mode
    this.mode = this.pointers.size ? "suppressed" : "idle"
    if (previous === "pinch") return [{ type: "pinchend" }]
    if (cancelled) return [{ type: "cancel" }]
    const point = { x: sample.x, y: sample.y }
    if (previous === "pending") {
      // Um pointerup distante também pode chegar sem pointermove intermediário.
      if (Math.hypot(point.x - this.origin.x, point.y - this.origin.y) >= DRAG_DISTANCE) return [{ type: "start", origin: this.origin, point: this.origin }, { type: "move", origin: this.origin, point }, { type: "end", origin: this.origin, point }]
      return [{ type: "tap", origin: this.origin, point }]
    }
    return previous === "drag" ? [{ type: "end", origin: this.origin, point }] : []
  }

  reset(): void { this.pointers.clear(); this.mode = "idle" }
}
