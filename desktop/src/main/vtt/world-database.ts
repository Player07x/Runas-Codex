import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { normalizeDocumentData } from "../../../../app/src/vtt/shared/scene"
import { isDocumentType, WORLD_OTHERS_FILE, WORLD_SCENES_DIR, type DocumentType, type WorldDocument } from "../../../../app/src/vtt/shared/world"

const OTHERS = "\0outros"

/** Grava num temporário e troca de uma vez: uma queda no meio nunca deixa um arquivo pela metade. */
export function writeJsonAtomicallySync(path: string, value: unknown): void {
  const temporary = `${path}.tmp`
  writeFileSync(temporary, `${JSON.stringify(value)}\n`, "utf8")
  renameSync(temporary, path)
}

function readDocuments(path: string): WorldDocument[] {
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown
  if (!Array.isArray(raw)) throw new Error(`Arquivo de mesa inválido: ${path}`)
  return raw.flatMap((value) => {
    const document = value as Partial<WorldDocument>
    if (!document || typeof document.id !== "string" || !isDocumentType(document.type)) return []
    return [{
      id: document.id,
      type: document.type,
      parentId: typeof document.parentId === "string" ? document.parentId : null,
      sort: typeof document.sort === "number" ? document.sort : 0,
      // Normalizar na leitura: documentos de versões anteriores ganham os campos novos com os padrões.
      data: normalizeDocumentData(document.type, document.data),
      createdAt: typeof document.createdAt === "number" ? document.createdAt : 0,
      updatedAt: typeof document.updatedAt === "number" ? document.updatedAt : 0,
    }]
  })
}

/**
 * Documentos de uma mesa (cenas, tokens, paredes, playlists…), com a mesma interface síncrona do banco do RunasVTT.
 * Tudo fica em memória; cada cena (com o que ela contém) é um JSON em `cenas/`, e o resto vai para `outros.json`.
 * As gravações são adiadas um pouco e juntam várias mudanças (arrastar um token não grava a cada pixel).
 */
export class WorldDatabase {
  private readonly documents = new Map<string, WorldDocument>()
  private readonly dirty = new Set<string>()
  private timer: NodeJS.Timeout | null = null
  private closed = false

  constructor(
    readonly path: string,
    private readonly delay = 1000,
  ) {
    const scenes = join(path, WORLD_SCENES_DIR)
    if (existsSync(scenes)) for (const name of readdirSync(scenes)) if (name.endsWith(".json")) for (const document of readDocuments(join(scenes, name))) this.documents.set(document.id, document)
    const others = join(path, WORLD_OTHERS_FILE)
    if (existsSync(others)) for (const document of readDocuments(others)) this.documents.set(document.id, document)
  }

  /** Cena a que o documento pertence (ou `OTHERS`), subindo pelos pais. */
  private partitionOf(document: WorldDocument): string {
    let current: WorldDocument | undefined = document
    for (let depth = 0; current && depth < 16; depth++) {
      if (current.type === "scene") return current.id
      current = current.parentId ? this.documents.get(current.parentId) : undefined
    }
    return OTHERS
  }

  private touch(partition: string): void {
    if (this.closed) throw new Error("A mesa foi fechada.")
    this.dirty.add(partition)
    if (this.timer) return
    this.timer = setTimeout(() => this.flush(), this.delay)
  }

  /** Grava agora o que mudou. */
  flush(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (!this.dirty.size) return
    const byPartition = new Map<string, WorldDocument[]>()
    for (const document of this.documents.values()) {
      const partition = this.partitionOf(document)
      if (this.dirty.has(partition)) byPartition.set(partition, [...(byPartition.get(partition) ?? []), document])
    }
    mkdirSync(join(this.path, WORLD_SCENES_DIR), { recursive: true })
    for (const partition of this.dirty) {
      const target = partition === OTHERS ? join(this.path, WORLD_OTHERS_FILE) : join(this.path, WORLD_SCENES_DIR, `${partition}.json`)
      const documents = byPartition.get(partition)
      if (documents?.length) writeJsonAtomicallySync(target, documents)
      else rmSync(target, { force: true })
    }
    this.dirty.clear()
  }

  put(document: WorldDocument): void {
    const previous = this.documents.get(document.id)
    if (previous) this.touch(this.partitionOf(previous))
    this.documents.set(document.id, structuredClone(document))
    this.touch(this.partitionOf(document))
  }

  get(id: string): WorldDocument | null {
    const document = this.documents.get(id)
    return document ? structuredClone(document) : null
  }

  list(type: DocumentType, parentId?: string | null): WorldDocument[] {
    return [...this.documents.values()]
      .filter((d) => d.type === type && (parentId === undefined || d.parentId === parentId))
      .sort((a, b) => a.sort - b.sort || a.createdAt - b.createdAt)
      .map((d) => structuredClone(d))
  }

  /** Ids do documento e de tudo o que ele contém, em qualquer profundidade. */
  descendantIds(id: string): string[] {
    if (!this.documents.has(id)) return []
    const ids = [id]
    for (let i = 0; i < ids.length; i++) for (const document of this.documents.values()) if (document.parentId === ids[i]) ids.push(document.id)
    return ids
  }

  /** Remove o documento e tudo o que ele contém. */
  delete(id: string): void {
    const document = this.documents.get(id)
    if (!document) return
    const partition = this.partitionOf(document)
    for (const child of this.descendantIds(id)) this.documents.delete(child)
    this.touch(partition)
    // Uma cena apagada some do disco no próximo `flush` (a partição fica vazia).
  }

  close(): void {
    if (this.closed) return
    this.flush()
    this.closed = true
  }
}
