/** Duas janelas não podem conferir a mesma versão antiga ao mesmo tempo e ambas gravarem. */
export class WriteQueue {
  private readonly pending = new Map<string, Promise<void>>()
  async run<T>(path: string, write: () => Promise<T>): Promise<T> {
    const normalized = path.replace(/\\/g, "/").replace(/\/+/g, "/")
    const key = process.platform === "win32" ? normalized.toLowerCase() : normalized
    const previous = this.pending.get(key) ?? Promise.resolve()
    let release!: () => void
    const next = new Promise<void>(resolve => { release = resolve })
    this.pending.set(key, next)
    await previous
    try { return await write() } finally { release(); if (this.pending.get(key) === next) this.pending.delete(key) }
  }
}
