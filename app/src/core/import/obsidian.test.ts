import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import type { VaultEntry } from "../../platform/platform"
import { findCodeBlocks } from "../codeblocks"
import { parseEncounter } from "../encounters"
import { parseFrontmatter } from "../parse"
import { VaultIndex } from "../vault-index"
import { calendarFor, parseMap } from "../wiki"
import { fencedBlocks } from "./blocks"
import { changedRegion, defaultCalendarFolder, leafletImagePaths, planObsidianMigration, PLUGIN_FILES, type MigrationOptions, type MigrationPlan } from "./obsidian"
import { expectOnlyPlannedChanges } from "./test-helpers"

const root = join(__dirname, "fixtures/cofre")

function walk(dir: string, rel = ""): VaultEntry[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = rel ? `${rel}/${item.name}` : item.name
    if (item.isDirectory()) return walk(join(dir, item.name), path)
    const info = statSync(join(dir, item.name))
    return [{ path, size: info.size, mtime: info.mtimeMs }]
  })
}

const all = walk(root)
const notes = all.filter((e) => e.path.endsWith(".md") && !e.path.startsWith("."))
const texts = Object.fromEntries(notes.map((e) => [e.path, readFileSync(join(root, e.path), "utf8")]))
const files = Object.fromEntries(Object.values(PLUGIN_FILES).flatMap((p) => (all.some((e) => e.path === p) ? [[p, readFileSync(join(root, p), "utf8")]] : [])))
// As imagens dos mapas: só a entrada no índice (o tamanho vem do cabeçalho, aqui informado direto).
const images: VaultEntry[] = [
  { path: "Anexos/valdris.png", size: 1, mtime: 1 },
  { path: "Anexos/masmorra.jpg", size: 1, mtime: 1 },
]
const sizes: Record<string, { width: number; height: number }> = { "Anexos/valdris.png": { width: 2048, height: 1024 }, "Anexos/masmorra.jpg": { width: 1600, height: 800 } }

const ALL: MigrationOptions = { kinds: ["calendario", "mapa", "statblock", "encontro"], keepOriginal: false, calendarFolder: "Calendários" }

function plan(options: Partial<MigrationOptions> = {}, index = new VaultIndex([...notes, ...images], texts)): MigrationPlan {
  return planObsidianMigration({ index, files, imageSize: (p) => sizes[p] ?? null, options: { ...ALL, ...options } })
}

/** O índice depois de gravar o plano (como a tela faz pelo useVault). */
function applied(result: MigrationPlan): VaultIndex {
  const next = { ...texts }
  for (const edit of result.edits) next[edit.path] = edit.after
  for (const note of result.notes) next[note.path] = note.content
  const entries = Object.keys(next).map((path) => ({ path, size: next[path]!.length, mtime: 2 }))
  return new VaultIndex([...entries, ...images], next)
}

describe("migração do Obsidian (cofre de exemplo com os plugins)", () => {
  const result = plan()
  const edit = (path: string) => result.edits.find((e) => e.path === path)

  it("acha os dados de cada plugin e os plugins ligados", () => {
    expect(result.found).toEqual({ calendario: 2, mapa: 3, statblock: 4, encontro: 1 })
    expect(result.enabledPlugins).toContain("obsidian-leaflet-plugin")
  })

  it("só mexe nas notas que tinham blocos ou datas do Calendarium", () => {
    expect(result.edits.map((e) => e.path)).toEqual([
      "Bestiário/Capitão Vorn.md",
      "Bestiário/Goblin.md",
      "Bestiário/Rato.md",
      "Crônicas/A Coroação.md",
      "Crônicas/O Cerco.md",
      "Encontros/Emboscada.md",
      "Mapas/Mapa de Valdris.md",
      "Mapas/Masmorra.md",
    ])
    expect(result.notes.map((n) => n.path)).toEqual(["Calendários/Gregorian Calendar.md", "Calendários/Calendário de Tharn.md"])
  })

  it("fora dos blocos convertidos (e das datas no frontmatter), nenhum byte muda", () => {
    for (const e of result.edits) expectOnlyPlannedChanges(e)
    for (const e of plan({ keepOriginal: true }).edits) expectOnlyPlannedChanges(e)
  })

  it("as datas entram no frontmatter sem tirar as do Calendarium, e o corpo fica igual", () => {
    for (const path of ["Crônicas/A Coroação.md", "Crônicas/O Cerco.md"]) {
      const e = edit(path)!
      const [before, after] = [parseFrontmatter(e.before)!, parseFrontmatter(e.after)!]
      expect(e.after.slice(after.end)).toBe(e.before.slice(before.end))
      for (const [key, value] of Object.entries(before.data!)) expect(after.data![key]).toEqual(value)
    }
    expect(parseFrontmatter(edit("Crônicas/A Coroação.md")!.after)!.data).toMatchObject({ calendario: "[[Calendário de Tharn]]", data_mundo: "4031-03-12" })
    expect(parseFrontmatter(edit("Crônicas/O Cerco.md")!.after)!.data).toMatchObject({ calendario: "[[Calendário de Tharn]]", data_mundo: "4012-05-01", data_fim_mundo: "4012-05-03" })
    // Datas entre aspas no arquivo (o Obsidian não as trata como datas reais).
    expect(edit("Crônicas/O Cerco.md")!.after).toContain('data_mundo: "4012-05-01"')
  })

  it("mantém o CRLF de quem usa CRLF", () => {
    const after = edit("Bestiário/Rato.md")!.after
    expect(after).toContain("> [!statblock] Rato Gigante\r\n")
    expect(/[^\r]\n/.test(after)).toBe(false)
  })

  it("os blocos novos são lidos pelo app", () => {
    const map = parseMap(findCodeBlocks(edit("Mapas/Mapa de Valdris.md")!.after, "runas-mapa")[0]!.content)
    expect(map.pins.map((p) => p.note ?? p.label)).toEqual(["Cidade Alta", "Ruínas sem nome", "Portão do Lago", "Covil dos lobos", "Cidade de Brasa"])
    const encounters = findCodeBlocks(edit("Encontros/Emboscada.md")!.after, "runas-encontro").map((b) => parseEncounter(b.content))
    expect(encounters.map((e) => e.name)).toEqual(["Emboscada na estrada", "Reforços"])
    expect(encounters[0]!.combatants[0]).toMatchObject({ name: "Goblin", count: 3, note: "Goblin" })
    expect(edit("Bestiário/Goblin.md")!.after).toContain("\n> [!statblock] Goblin\n> *Small humanoid (goblinoid), neutral evil*\n")
  })

  it("avisa do que ficou como estava", () => {
    const text = result.notices.map((n) => `${n.path ?? ""}: ${n.text}`).join("\n")
    expect(text).toContain("Mapas/Mundo real.md: Mapa do mundo real")
    expect(text).toContain("Mapas/Rascunho.md: 1 bloco(s) statblock dentro de citação")
    expect(text).toContain("Bestiário/Capitão Vorn.md: A criatura “Ancient Red Dragon”")
    expect(text).toContain("Encontros/Emboscada.md: Encontros em linha")
    expect(text).toContain("Crônicas/Festa anual.md: A data “*-04-01” repete")
    // O bloco dentro de %%comentário%% não conta nem aparece nos avisos.
    expect(text).not.toContain("velho")
  })

  it("guarda o bloco original num comentário quando pedido", () => {
    const kept = plan({ keepOriginal: true }).edits.find((e) => e.path === "Mapas/Masmorra.md")!.after
    expect(kept).toContain("%% Bloco original do Leaflet, guardado pela migração do Runas-Codex:\n```leaflet\nid: masmorra\n")
    expect(fencedBlocks(kept).map((b) => b.language)).toEqual(["runas-mapa"])
  })

  it("migra só o que foi escolhido", () => {
    const only = plan({ kinds: ["statblock"] })
    expect(only.edits.map((e) => e.path)).toEqual(["Bestiário/Capitão Vorn.md", "Bestiário/Goblin.md", "Bestiário/Rato.md"])
    expect(only.notes).toEqual([])
  })

  it("migrar de novo não muda nada nem duplica os calendários", () => {
    const index = applied(result)
    const again = plan({}, index)
    expect(again.edits).toEqual([])
    expect(again.notes).toEqual([])
    expect(again.notices.filter((n) => n.text.includes("já está no cofre"))).toHaveLength(2)
    // E as notas datadas acham o calendário convertido.
    const ref = calendarFor(index, "Crônicas/A Coroação.md")
    expect(ref && "calendar" in ref ? ref.calendar.name : ref).toBe("Calendário de Tharn")
  })
})

describe("ajudantes da tela de migração", () => {
  it("acha as imagens dos mapas do Leaflet no cofre", () => {
    expect(leafletImagePaths(new VaultIndex([...notes, ...images], texts))).toEqual(["Anexos/valdris.png", "Anexos/masmorra.jpg"])
  })

  it("mostra só o trecho que muda", () => {
    expect(changedRegion("a\nb\nc\nd", "a\nB\nB2\nd")).toEqual({ line: 2, removed: ["b", "c"], added: ["B", "B2"] })
    expect(changedRegion("a\r\nb", "a\nb\nc")).toEqual({ line: 3, removed: [], added: ["c"] })
  })

  it("põe os calendários na wiki só se ela ainda não tem um, e avisa quando a pasta escolhida tem", () => {
    const withWiki = { ...texts, "Wikis/Mundo/Mundo.md": "# Mundo\n" }
    const entries = (t: Record<string, string>) => Object.keys(t).map((path) => ({ path, size: 1, mtime: 1 }))
    expect(defaultCalendarFolder(new VaultIndex(entries(withWiki), withWiki))).toBe("Wikis/Mundo/Calendários")
    const withCalendar = { ...withWiki, "Wikis/Mundo/Calendário.md": "```runas-calendario\nnome: Velho\nmeses: [{ nome: Um, dias: 10 }]\n```\n" }
    const index = new VaultIndex(entries(withCalendar), withCalendar)
    expect(defaultCalendarFolder(index)).toBe("Calendários")
    const notices = plan({ calendarFolder: "Wikis/Mundo/Calendários" }, index).notices.map((n) => n.text)
    expect(notices.some((n) => n.includes("A wiki “Mundo” já tem calendário"))).toBe(true)
  })
})
