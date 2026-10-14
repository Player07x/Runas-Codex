import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import type { VaultEntry } from "../platform/platform"
import { parseNote, type NoteMeta } from "./parse"
import { setProperty } from "./properties"
import { planRename } from "./rename"
import { detectFormat, fromEditorText, textToSave, toEditorText } from "./text"
import { VaultIndex } from "./vault-index"

/**
 * Ida e volta num cofre real, só lendo os arquivos: `RUNAS_CORPUS=/caminho/do/cofre npm test -w @runas-codex/app`.
 * Sem a variável, o teste é pulado (o CI não tem cofre).
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

/** Texto com cada link trocado por um marcador: dois textos iguais assim só diferem dentro dos links. */
function withoutLinks(text: string, meta: NoteMeta = parseNote(text)): string {
  let out = text
  for (const link of [...meta.links].sort((a, b) => b.start - a.start)) out = out.slice(0, link.start) + "\u0000" + out.slice(link.end)
  return out
}

describe.skipIf(!root)("cofre real (RUNAS_CORPUS)", () => {
  const entries = root ? walk(root) : []
  const texts: Record<string, string> = {}
  for (const entry of entries) if (/\.(md|canvas)$/i.test(entry.path)) texts[entry.path] = readFileSync(join(root!, entry.path), "utf8")
  const notes = Object.keys(texts).filter((p) => p.endsWith(".md"))

  it("lê todas as notas, com posições exatas", () => {
    for (const path of notes) {
      const meta = parseNote(texts[path]!)
      for (const link of meta.links) expect(texts[path]!.slice(link.start, link.end)).toBe(link.raw)
    }
  })

  it("editor ida e volta não muda nenhum byte", () => {
    for (const path of notes) {
      const text = texts[path]!
      expect(textToSave(text, toEditorText(text))).toBeNull()
      const crlf = (text.match(/\r\n/g) ?? []).length
      const lf = (text.match(/\n/g) ?? []).length
      if (crlf === 0 || crlf === lf) expect(fromEditorText(toEditorText(text), detectFormat(text))).toBe(text)
    }
  })

  it("criar e remover uma propriedade devolve o arquivo original", () => {
    let checked = 0
    for (const path of notes) {
      const text = texts[path]!
      const meta = parseNote(text)
      if (!meta.frontmatter?.data || "runas_teste" in meta.frontmatter.data) continue
      expect(setProperty(setProperty(text, "runas_teste", "ok"), "runas_teste", undefined)).toBe(text)
      checked++
    }
    console.log(`propriedades: ${checked} notas com frontmatter conferidas`)
  })

  it("indexa e renomeia as notas mais citadas mexendo só nos links", () => {
    const started = performance.now()
    const index = new VaultIndex(entries, texts)
    const ms = Math.round(performance.now() - started)
    const all = notes.flatMap((p) => index.outgoing(p))
    const stats = {
      notas: index.size,
      links: all.length,
      resolvidos: all.filter((r) => r.dest).length,
      porApelido: all.filter((r) => r.viaAlias).length,
      ambiguos: all.filter((r) => r.ambiguous).length,
      quebrados: all.filter((r) => !r.dest).length,
      tags: index.tags().length,
      indexarMs: ms,
    }
    console.log("índice:", JSON.stringify(stats))

    const top = [...notes].sort((a, b) => index.backlinks(b).length - index.backlinks(a).length).slice(0, 15)
    for (const from of top) {
      const to = from.replace(/\.md$/, " (renomeado).md")
      const plan = planRename(index, from, to, texts)
      for (const edit of plan.edits) {
        if (!edit.path.endsWith(".md")) continue
        expect(withoutLinks(edit.after)).toBe(withoutLinks(edit.before))
      }
    }
  })
})
