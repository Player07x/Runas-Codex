import { open, rename, rm, type FileHandle } from "node:fs/promises"

/**
 * Exportações grandes em pedaços (U50, ADR 0037): a janela manda o pacote aos poucos; o arquivo fica com o nome
 * `<destino>.parcial` até fechar, para um pacote pela metade nunca ter o nome do pacote pronto.
 */
export class SaveStreams {
  private readonly open = new Map<number, { handle: FileHandle; target: string; partial: string }>()
  private next = 1

  async start(target: string): Promise<number> {
    const partial = target + ".parcial"
    const handle = await open(partial, "w")
    const id = this.next++
    this.open.set(id, { handle, target, partial })
    return id
  }

  async write(id: number, bytes: Uint8Array): Promise<void> {
    const item = this.get(id)
    try { await item.handle.write(bytes) }
    catch (error) { await this.abort(id); throw error }
  }

  async finish(id: number): Promise<string> {
    const item = this.get(id)
    this.open.delete(id)
    try { await item.handle.close(); await rename(item.partial, item.target) }
    catch (error) { await rm(item.partial, { force: true }); throw error }
    return item.target
  }

  async abort(id: number): Promise<void> {
    const item = this.open.get(id)
    if (!item) return
    this.open.delete(id)
    await item.handle.close().catch(() => undefined)
    await rm(item.partial, { force: true })
  }

  /** Ao fechar o app no meio de uma exportação, não fica arquivo parcial para trás. */
  async abortAll(): Promise<void> {
    await Promise.all([...this.open.keys()].map(id => this.abort(id)))
  }

  private get(id: number) {
    const item = this.open.get(id)
    if (!item) throw new Error("A exportação foi encerrada.")
    return item
  }
}
