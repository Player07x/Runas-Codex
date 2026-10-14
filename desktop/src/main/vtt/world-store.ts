import { randomUUID } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises"
import { join } from "node:path"
import {
  ASSET_KINDS,
  WORLD_ASSETS_DIR,
  WORLD_MANIFEST_FILE,
  WORLD_SCENES_DIR,
  createWorldManifest,
  parseWorldManifest,
  worldFolderName,
  type NewWorldInput,
  type WorldManifest,
  type WorldSummary,
} from "../../../../app/src/vtt/shared/world"
import { WorldDatabase } from "./world-database"

export interface OpenWorld {
  summary: WorldSummary
  database: WorldDatabase
}

/** Grava primeiro num arquivo temporário: uma queda no meio nunca deixa um manifesto pela metade. */
async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.tmp`
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8")
  await rename(temporary, path)
}

/**
 * As mesas do cofre aberto, em `<cofre>/.runas/mesas/`. Só uma mesa fica aberta por vez: quem opera a mesa é o
 * mestre, numa máquina. `root()` muda quando o usuário troca de cofre.
 */
export class WorldStore {
  private current: OpenWorld | null = null

  constructor(private readonly rootOf: () => string | null) {}

  get root(): string {
    const vault = this.rootOf()
    if (!vault) throw new Error("Abra um cofre primeiro (Configurações › Cofre).")
    return join(vault, ".runas", "mesas")
  }

  get openWorld(): OpenWorld | null {
    return this.current
  }

  async list(): Promise<WorldSummary[]> {
    const root = this.root
    let entries: import("node:fs").Dirent[]
    try {
      entries = await readdir(root, { withFileTypes: true })
    } catch {
      return []
    }
    const worlds: WorldSummary[] = []
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const path = join(root, entry.name)
      try {
        const manifest = parseWorldManifest(JSON.parse(await readFile(join(path, WORLD_MANIFEST_FILE), "utf8")))
        const scenes = await readdir(join(path, WORLD_SCENES_DIR)).then((names) => names.filter((n) => n.endsWith(".json")).length, () => 0)
        worlds.push({ ...manifest, path, scenes })
      } catch {
        // Pastas sem manifesto válido não são mesas; ficam intocadas.
      }
    }
    return worlds.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async create(input: NewWorldInput): Promise<WorldSummary> {
    const manifest = createWorldManifest(input, randomUUID(), Date.now())
    const path = join(this.root, worldFolderName(manifest.title, manifest.id))
    if (existsSync(path)) throw new Error("Já existe uma pasta com este nome.")
    await mkdir(join(path, WORLD_SCENES_DIR), { recursive: true })
    for (const kind of ASSET_KINDS) await mkdir(join(path, WORLD_ASSETS_DIR, kind), { recursive: true })
    await writeJsonAtomically(join(path, WORLD_MANIFEST_FILE), manifest)
    return { ...manifest, path, scenes: 0 }
  }

  async open(id: string): Promise<OpenWorld> {
    if (this.current?.summary.id === id) return this.current
    const summary = (await this.list()).find((world) => world.id === id)
    if (!summary) throw new Error("Mesa não encontrada.")
    this.close()
    const database = new WorldDatabase(summary.path)
    const touched: WorldManifest = { ...stripPath(summary), updatedAt: Date.now() }
    await writeJsonAtomically(join(summary.path, WORLD_MANIFEST_FILE), touched)
    this.current = { summary: { ...touched, path: summary.path }, database }
    return this.current
  }

  close(): void {
    this.current?.database.close()
    this.current = null
  }
}

function stripPath(summary: WorldSummary): WorldManifest {
  const { path: _path, scenes: _scenes, ...manifest } = summary
  return manifest
}
