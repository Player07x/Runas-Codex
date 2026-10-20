import type { DocumentDatabase } from "./database"
import { normalizeDocumentData } from "./scene"
import {
  createWorldManifest,
  isDocumentType,
  parseWorldManifest,
  worldFolderName,
  type DocumentType,
  type NewWorldInput,
  type WorldDocument,
  type WorldSummary,
} from "./world"

export interface WorldFile {
  path: string
  mtime: number
  size: number
}
export interface WorldFiles {
  list(): Promise<WorldFile[]>
  read(path: string): Promise<Uint8Array>
  write(path: string, bytes: Uint8Array, expected: WorldFile | null): Promise<WorldFile>
}
const PREFIX = ".runas/mesas/"
const encoder = new TextEncoder()
const encode = (value: unknown) => encoder.encode(JSON.stringify(value) + "\n")
const decode = (bytes: Uint8Array): unknown => JSON.parse(new TextDecoder().decode(bytes))

/** Banco em memória; o adaptador nativo decide como ler e gravar com a versão esperada. */
export class PortableDatabase implements DocumentDatabase {
  private documents = new Map<string, WorldDocument>()
  private dirty = new Set<string>()
  private saving: Promise<void> = Promise.resolve()
  private failure: unknown = null
  constructor(
    readonly path: string,
    private files: WorldFiles,
    private versions: Map<string, WorldFile>,
    partitions: unknown[],
  ) {
    for (const partition of partitions) {
      if (!Array.isArray(partition)) throw new Error("Arquivo de mesa inválido.")
      for (const raw of partition) {
        if (!raw || typeof raw !== "object") continue
        const value = raw as Partial<WorldDocument>
        if (typeof value.id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value.id) || !isDocumentType(value.type)) continue
        if (this.documents.has(value.id)) throw new Error("A mesa contém documentos repetidos.")
        this.documents.set(value.id, {
          id: value.id,
          type: value.type,
          parentId: typeof value.parentId === "string" ? value.parentId : null,
          sort: typeof value.sort === "number" ? value.sort : 0,
          data: normalizeDocumentData(value.type, value.data),
          createdAt: value.createdAt ?? 0,
          updatedAt: value.updatedAt ?? 0,
        })
      }
    }
  }
  get(id: string): WorldDocument | null {
    return structuredClone(this.documents.get(id) ?? null)
  }
  list(type: DocumentType, parentId?: string | null): WorldDocument[] {
    return [...this.documents.values()]
      .filter((d) => d.type === type && (parentId === undefined || d.parentId === parentId))
      .sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt)
      .map((d) => structuredClone(d))
  }
  private partition(document: WorldDocument): string {
    const visited = new Set<string>()
    let current: WorldDocument | undefined = document
    while (current && !visited.has(current.id)) {
      if (current.type === "scene") return `cenas/${current.id}.json`
      visited.add(current.id)
      current = current.parentId ? this.documents.get(current.parentId) : undefined
    }
    return "outros.json"
  }
  put(document: WorldDocument): void {
    if (this.failure) throw this.failure
    const before = this.documents.get(document.id)
    if (before) this.dirty.add(this.partition(before))
    this.documents.set(document.id, structuredClone(document))
    this.dirty.add(this.partition(document))
  }
  descendantIds(id: string): string[] {
    if (!this.documents.has(id)) return []
    const ids = new Set([id])
    for (const parent of ids) for (const document of this.documents.values()) if (document.parentId === parent) ids.add(document.id)
    return [...ids]
  }
  delete(id: string): void {
    if (this.failure) throw this.failure
    for (const child of this.descendantIds(id)) {
      const document = this.documents.get(child)!
      this.dirty.add(this.partition(document))
      this.documents.delete(child)
    }
  }
  flush(): Promise<void> {
    const save = async () => {
      if (this.failure) throw this.failure
      const pending = [...this.dirty].map((partition) => ({
        partition,
        bytes: encode([...this.documents.values()].filter((d) => this.partition(d) === partition)),
      }))
      this.dirty.clear()
      try {
        for (const { partition, bytes } of pending) {
          const target = `${this.path}/${partition}`
          this.versions.set(target, await this.files.write(target, bytes, this.versions.get(target) ?? null))
        }
      } catch (error) {
        this.failure = error
        throw error
      }
    }
    this.saving = this.saving.then(save)
    return this.saving
  }
}

export class PortableWorldStore {
  openWorld: { summary: WorldSummary; database: PortableDatabase } | null = null
  constructor(private readonly files: WorldFiles) {}
  async list(): Promise<WorldSummary[]> {
    const entries = await this.files.list()
    const result: WorldSummary[] = []
    for (const entry of entries) {
      if (!/^\.runas\/mesas\/[^/.]+\/mesa\.json$/.test(entry.path)) continue
      const manifest = parseWorldManifest(decode(await this.files.read(entry.path)))
      const path = entry.path.slice(0, -"/mesa.json".length)
      result.push({
        ...manifest,
        path,
        scenes: entries.filter((e) => e.path.startsWith(`${path}/cenas/`) && e.path.endsWith(".json")).length,
      })
    }
    return result.sort((a, b) => b.updatedAt - a.updatedAt)
  }
  async create(input: NewWorldInput): Promise<WorldSummary> {
    const manifest = createWorldManifest(input, crypto.randomUUID(), Date.now())
    const path = PREFIX + worldFolderName(manifest.title, manifest.id)
    await this.files.write(`${path}/mesa.json`, encode(manifest), null)
    return { ...manifest, path, scenes: 0 }
  }
  async open(id: string): Promise<WorldSummary> {
    if (this.openWorld?.summary.id === id) return this.openWorld.summary
    await this.close()
    const summary = (await this.list()).find((world) => world.id === id)
    if (!summary) throw new Error("Mesa não encontrada no cofre aberto.")
    const entries = (await this.files.list()).filter(
      (e) => e.path === `${summary.path}/outros.json` || (e.path.startsWith(`${summary.path}/cenas/`) && e.path.endsWith(".json")),
    )
    const partitions = await Promise.all(entries.map(async (e) => decode(await this.files.read(e.path))))
    this.openWorld = {
      summary,
      database: new PortableDatabase(summary.path, this.files, new Map(entries.map((e) => [e.path, e])), partitions),
    }
    return summary
  }
  async close(): Promise<void> {
    await this.openWorld?.database.flush()
    this.openWorld = null
  }
  database(): PortableDatabase {
    if (!this.openWorld) throw new Error("Abra uma mesa primeiro.")
    return this.openWorld.database
  }
}
