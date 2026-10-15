import type { DocumentInput } from "../shared/ipc"
import type { WorldDocument } from "../shared/world"

export interface SceneEdit { id: string; value: DocumentInput | null }
interface HistoryEntry { before: SceneEdit[]; after: SceneEdit[] }
interface HistoryStore { get<T>(id: string): WorldDocument<T> | null; put(input: DocumentInput): Promise<WorldDocument>; remove(id: string): Promise<void> }
const inputOf = (doc: WorldDocument): DocumentInput => ({ id: doc.id, type: doc.type, parentId: doc.parentId, sort: doc.sort, data: doc.data })
const same = (a: SceneEdit, b: SceneEdit) => JSON.stringify(a.value) === JSON.stringify(b.value)

/** Histórico local: desfazer não reverte uma edição posterior recebida de outro aparelho. */
export class SceneHistory {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private queue = Promise.resolve()
  private generation = 0
  busy = false
  constructor(private store: HistoryStore, private changed: () => void) {}
  get canUndo() { return this.undoStack.length > 0 && !this.busy }
  get canRedo() { return this.redoStack.length > 0 && !this.busy }
  private snapshot(id: string): SceneEdit { const doc = this.store.get(id); return { id, value: doc ? inputOf(doc) : null } }
  private async write(edit: SceneEdit) { if (edit.value) await this.store.put(edit.value); else await this.store.remove(edit.id) }
  private enqueue(action: () => Promise<void>): Promise<void> {
    const result = this.queue.then(async () => { this.busy = true; this.changed(); try { await action() } finally { this.busy = false; this.changed() } })
    this.queue = result.catch(() => {})
    return result
  }
  apply(edits: SceneEdit[]): Promise<void> {
    const generation = this.generation
    return this.enqueue(async () => {
      const entry: HistoryEntry = { before: [], after: [] }
      try {
        for (const edit of edits) {
          const before = this.snapshot(edit.id)
          await this.write(edit)
          const after = this.snapshot(edit.id)
          if (!same(before, after)) { entry.before.push(before); entry.after.push(after) }
        }
      } finally {
        if (generation === this.generation && entry.before.length) { this.undoStack.push(entry); this.undoStack = this.undoStack.slice(-50); this.redoStack = [] }
      }
    })
  }
  undo(): Promise<void> { return this.restore(this.undoStack, this.redoStack, true) }
  redo(): Promise<void> { return this.restore(this.redoStack, this.undoStack, false) }
  private restore(from: HistoryEntry[], to: HistoryEntry[], undo: boolean): Promise<void> {
    return this.enqueue(async () => {
      const entry = from.at(-1)
      if (!entry) return
      const expected = undo ? entry.after : entry.before
      if (expected.some(edit => !same(this.snapshot(edit.id), edit))) throw new Error("O objeto mudou depois desta ação. Não foi possível desfazer/refazer sem perder essa mudança.")
      for (const edit of undo ? entry.before : entry.after) await this.write(edit)
      from.pop(); to.push(entry)
    })
  }
  clear(): void { this.generation++; this.undoStack = []; this.redoStack = []; this.changed() }
}
