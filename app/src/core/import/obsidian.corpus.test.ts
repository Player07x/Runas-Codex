import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import type { VaultEntry } from "../../platform/platform"
import { VaultIndex } from "../vault-index"
import { fencedBlocks } from "./blocks"
import { imageSize } from "./image-size"
import { planObsidianMigration, PLUGIN_FILES } from "./obsidian"
import { expectOnlyPlannedChanges } from "./test-helpers"

/**
 * Migração num cofre real, só lendo: `RUNAS_CORPUS=/caminho/do/cofre npm test -w @runas-codex/app`. Nenhuma nota sem
 * bloco de plugin pode mudar, e nas que mudam, nada fora dos blocos convertidos (e do frontmatter das datas).
 */
const root = process.env.RUNAS_CORPUS

function walk(dir: string, rel = ""): VaultEntry[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    if (item.name.startsWith(".")) return []
    const path = rel ? `${rel}/${item.name}` : item.name
    if (item.isDirectory()) return walk(join(dir, item.name), path)
    if (!item.isFile()) return []
    const info = statSync(join(dir, item.name))
    return [{ path, size: info.size, mtime: info.mtimeMs }]
  })
}

describe.skipIf(!root)("migração do Obsidian no cofre real (RUNAS_CORPUS)", () => {
  it("só mexe nas notas com dados de plugin, e só nos blocos", () => {
    const entries = walk(root!)
    const texts: Record<string, string> = {}
    for (const entry of entries) if (entry.path.endsWith(".md")) texts[entry.path] = readFileSync(join(root!, entry.path), "utf8")
    const files: Record<string, string> = {}
    for (const path of Object.values(PLUGIN_FILES)) {
      try {
        files[path] = readFileSync(join(root!, path), "utf8")
      } catch {
        /* plugin ausente */
      }
    }
    const started = performance.now()
    const plan = planObsidianMigration({
      index: new VaultIndex(entries, texts),
      files,
      imageSize: (path) => {
        try {
          return imageSize(readFileSync(join(root!, path)))
        } catch {
          return null
        }
      },
      options: { kinds: ["calendario", "mapa", "statblock", "encontro"], keepOriginal: true, calendarFolder: "Calendários" },
    })
    console.log("migração:", JSON.stringify({ notas: Object.keys(texts).length, achados: plan.found, mudam: plan.edits.length, novas: plan.notes.length, avisos: plan.notices.length, ms: Math.round(performance.now() - started) }))
    const plugins = new Set(["leaflet", "statblock", "encounter", "encounter-table"])
    for (const edit of plan.edits) {
      expect(fencedBlocks(edit.before).some((b) => plugins.has(b.language)) || /^fc-(date|start):/m.test(edit.before)).toBe(true)
      expectOnlyPlannedChanges(edit)
    }
  })
})
