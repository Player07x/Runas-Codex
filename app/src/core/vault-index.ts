import type { VaultEntry } from "../platform/platform"
import { parseNote, type LinkRef, type NoteMeta } from "./parse"
import { scopeOf, type Scope } from "./spaces"
import { basename, dirname, extname, foldName, joinPath, noteName } from "./text"

/**
 * Índice do cofre: metadados de cada nota, resolução de links, backlinks, tags, links quebrados e busca.
 * É um cache — sempre pode ser reconstruído a partir dos arquivos. Roda igual na interface, num Worker e nos testes.
 */

export interface IndexedNote {
  path: string
  name: string
  scope: Scope
  mtime: number
  size: number
  text: string
  meta: NoteMeta
}

export interface ResolvedLink {
  link: LinkRef
  from: string
  /** Caminho do arquivo de destino, ou `null` se o link está quebrado. */
  dest: string | null
  /** Resolvido só pelo apelido: o Obsidian não segue esse link (o app grava `[[Nome|apelido]]`). */
  viaAlias?: boolean
  /** Mais de um arquivo com esse nome: o app e o Obsidian podem escolher diferente. */
  ambiguous?: boolean
  /** O arquivo existe, mas o `#título` ou `#^bloco` não. */
  subpathMissing?: boolean
}

export interface Backlink {
  from: string
  links: ResolvedLink[]
  /** Linha em volta de cada link, sem a marcação. */
  context: string[]
  crossScope: boolean
}

export interface SearchHit {
  path: string
  score: number
  snippet: string
}

const isNote = (path: string) => extname(path) === ".md"

export class VaultIndex {
  private readonly notes = new Map<string, IndexedNote>()
  private readonly files = new Map<string, VaultEntry>()
  private byPath = new Map<string, string>()
  private byName = new Map<string, string[]>()
  private byAlias = new Map<string, string[]>()
  private resolvedCache: Map<string, ResolvedLink[]> | null = null
  private backlinkCache: Map<string, ResolvedLink[]> | null = null

  /** Todos os arquivos do cofre (notas e anexos) e o texto das notas. */
  constructor(entries: VaultEntry[] = [], texts: Record<string, string> = {}) {
    for (const entry of entries) this.files.set(entry.path, entry)
    for (const entry of entries) if (isNote(entry.path) && entry.path in texts) this.putNote(entry, texts[entry.path]!)
    this.rebuildMaps()
  }

  // ---------- Atualização ----------

  /** Cria ou atualiza um arquivo; para notas, `text` é o conteúdo. */
  set(entry: VaultEntry, text?: string): void {
    this.files.set(entry.path, entry)
    if (isNote(entry.path) && text !== undefined) this.putNote(entry, text)
    this.rebuildMaps()
  }

  remove(path: string): void {
    this.files.delete(path)
    this.notes.delete(path)
    this.rebuildMaps()
  }

  private putNote(entry: VaultEntry, text: string): void {
    this.notes.set(entry.path, { path: entry.path, name: noteName(entry.path), scope: scopeOf(entry.path), mtime: entry.mtime, size: entry.size, text, meta: parseNote(text) })
  }

  private rebuildMaps(): void {
    this.byPath = new Map()
    this.byName = new Map()
    this.byAlias = new Map()
    const push = (map: Map<string, string[]>, key: string, path: string) => map.set(key, [...(map.get(key) ?? []), path])
    for (const path of this.files.keys()) {
      this.byPath.set(foldName(path), path)
      push(this.byName, foldName(isNote(path) ? noteName(path) : basename(path)), path)
    }
    for (const note of this.notes.values()) for (const alias of note.meta.aliases) push(this.byAlias, foldName(alias), note.path)
    this.resolvedCache = null
    this.backlinkCache = null
  }

  // ---------- Consulta ----------

  get size(): number {
    return this.notes.size
  }

  note(path: string): IndexedNote | undefined {
    return this.notes.get(path)
  }

  allNotes(): IndexedNote[] {
    return [...this.notes.values()]
  }

  allFiles(): VaultEntry[] {
    return [...this.files.values()]
  }

  hasFile(path: string): boolean {
    return this.files.has(path)
  }

  notesIn(root: string): IndexedNote[] {
    return this.allNotes().filter((note) => note.path.startsWith(root))
  }

  /** O nome curto (sem pasta) aponta para um único arquivo no cofre inteiro? */
  isNameUnique(path: string): boolean {
    return (this.byName.get(foldName(isNote(path) ? noteName(path) : basename(path)))?.length ?? 0) <= 1
  }

  /**
   * Texto do link que o app grava para `dest` a partir de `from`: o nome curto quando é único no cofre e as duas
   * notas estão no mesmo espaço; senão, o caminho completo (assim o Obsidian resolve igual).
   */
  linkTarget(dest: string, from: string): string {
    const full = isNote(dest) ? dest.replace(/\.md$/i, "") : dest
    if (scopeOf(dest).root !== scopeOf(from).root) return full
    return this.isNameUnique(dest) ? (isNote(dest) ? noteName(dest) : basename(dest)) : full
  }

  resolve(link: LinkRef, from: string): ResolvedLink {
    const result: ResolvedLink = { link, from, dest: null }
    if (!link.target) result.dest = from
    else if (link.kind === "markdown") result.dest = this.resolveMarkdown(link.target, from)
    if (!result.dest && link.target) Object.assign(result, this.resolveName(link.target, from))
    if (result.dest && link.subpath && !this.hasSubpath(result.dest, link.subpath)) result.subpathMissing = true
    return result
  }

  private resolveMarkdown(target: string, from: string): string | null {
    const candidates = target.startsWith("/") ? [joinPath(target)] : [joinPath(dirname(from), target), joinPath(target)]
    for (const candidate of candidates) {
      if (!candidate) continue
      const found = this.byPath.get(foldName(candidate)) ?? (extname(candidate) ? undefined : this.byPath.get(foldName(candidate + ".md")))
      if (found) return found
    }
    return null
  }

  private resolveName(target: string, from: string): Partial<ResolvedLink> {
    const clean = target.replace(/^\/+/, "")
    if (clean.includes("/")) {
      const exact = this.byPath.get(foldName(clean)) ?? this.byPath.get(foldName(clean + ".md"))
      if (exact) return { dest: exact }
      // Caminho parcial (`Personagens/Aldren`): vale se só um arquivo termina assim.
      const suffix = "/" + foldName(extname(clean) ? clean : clean + ".md")
      const matches = [...this.byPath.entries()].filter(([key]) => key.endsWith(suffix)).map(([, path]) => path)
      if (matches.length) return { dest: this.closest(matches, from), ...(matches.length > 1 ? { ambiguous: true } : {}) }
      return { dest: null }
    }
    const key = foldName(extname(clean) === ".md" ? clean.slice(0, -3) : clean)
    // Notas entram pelo nome sem `.md`; anexos, pelo nome com extensão (`mapa.png`).
    const byName = this.byName.get(key) ?? []
    if (byName.length) return { dest: this.closest(byName, from), ...(byName.length > 1 ? { ambiguous: true } : {}) }
    const byAlias = this.byAlias.get(key) ?? []
    if (byAlias.length) return { dest: this.closest(byAlias, from), viaAlias: true, ...(byAlias.length > 1 ? { ambiguous: true } : {}) }
    return { dest: null }
  }

  /** Entre vários candidatos: mesmo espaço, depois mesma pasta, depois o caminho mais curto. */
  private closest(paths: string[], from: string): string {
    const root = scopeOf(from).root
    const folder = dirname(from)
    const rank = (path: string) => [scopeOf(path).root === root ? 0 : 1, dirname(path) === folder ? 0 : 1, path.split("/").length, path] as const
    return [...paths].sort((a, b) => {
      const [ra, rb] = [rank(a), rank(b)]
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i]! < rb[i]! ? -1 : 1
      return 0
    })[0]!
  }

  private hasSubpath(dest: string, subpath: string): boolean {
    const note = this.notes.get(dest)
    if (!note) return true
    if (subpath.startsWith("#^")) return note.meta.blocks.includes(subpath.slice(2))
    const wanted = subpath.split("#").filter(Boolean).at(-1)
    return !wanted || note.meta.headings.some((h) => foldName(h.text) === foldName(wanted))
  }

  private resolvedAll(): Map<string, ResolvedLink[]> {
    if (!this.resolvedCache) {
      this.resolvedCache = new Map()
      for (const note of this.notes.values()) this.resolvedCache.set(note.path, note.meta.links.map((link) => this.resolve(link, note.path)))
    }
    return this.resolvedCache
  }

  outgoing(path: string): ResolvedLink[] {
    return this.resolvedAll().get(path) ?? []
  }

  backlinks(path: string): Backlink[] {
    if (!this.backlinkCache) {
      this.backlinkCache = new Map()
      for (const links of this.resolvedAll().values()) {
        for (const resolved of links) {
          if (!resolved.dest || resolved.dest === resolved.from) continue
          this.backlinkCache.set(resolved.dest, [...(this.backlinkCache.get(resolved.dest) ?? []), resolved])
        }
      }
    }
    const grouped = new Map<string, ResolvedLink[]>()
    for (const resolved of this.backlinkCache.get(path) ?? []) grouped.set(resolved.from, [...(grouped.get(resolved.from) ?? []), resolved])
    const root = scopeOf(path).root
    return [...grouped].map(([from, links]) => ({
      from,
      links,
      context: links.map((l) => contextLine(this.notes.get(from)!.text, l.link)),
      crossScope: scopeOf(from).root !== root,
    }))
  }

  /** Links para notas que não existem ("a escrever"), agrupados pelo nome, dentro de uma raiz. */
  unresolved(root = ""): { target: string; from: string[] }[] {
    const map = new Map<string, { target: string; from: Set<string> }>()
    for (const [from, links] of this.resolvedAll()) {
      if (!from.startsWith(root)) continue
      for (const resolved of links) {
        if (resolved.dest || !resolved.link.target) continue
        const key = foldName(resolved.link.target)
        const item = map.get(key) ?? { target: resolved.link.target, from: new Set<string>() }
        item.from.add(from)
        map.set(key, item)
      }
    }
    return [...map.values()].map(({ target, from }) => ({ target, from: [...from] })).sort((a, b) => b.from.length - a.from.length || a.target.localeCompare(b.target, "pt-BR"))
  }

  /** Tags com contagem de notas (sem diferenciar maiúsculas; mostra a primeira grafia vista). */
  tags(root = ""): { tag: string; count: number }[] {
    const map = new Map<string, { tag: string; count: number }>()
    for (const note of this.notes.values()) {
      if (!note.path.startsWith(root)) continue
      for (const tag of note.meta.tags) {
        const key = tag.toLocaleLowerCase("pt-BR")
        const item = map.get(key) ?? { tag, count: 0 }
        item.count++
        map.set(key, item)
      }
    }
    return [...map.values()].sort((a, b) => a.tag.localeCompare(b.tag, "pt-BR"))
  }

  /**
   * Busca com operadores simples: termos (todos precisam aparecer), `"frase exata"`, `path:`, `file:`, `tag:` e
   * `-termo` para excluir. Nome e apelidos pesam mais que o texto.
   */
  search(query: string, root = "", limit = 50): SearchHit[] {
    const tokens = [...query.matchAll(/(-?)(?:(path|file|tag):)?(?:"([^"]+)"|(\S+))/g)].map((m) => ({ negate: m[1] === "-", op: m[2] ?? "", value: foldName(m[3] ?? m[4] ?? "").replace(/^#/, "") }))
    if (!tokens.length) return []
    const hits: SearchHit[] = []
    for (const note of this.notes.values()) {
      if (!note.path.startsWith(root)) continue
      const name = foldName(note.name)
      const aliases = note.meta.aliases.map(foldName)
      const body = foldName(note.text)
      let score = 0
      let ok = true
      for (const { negate, op, value } of tokens) {
        const tags = note.meta.tags.map((t) => t.toLocaleLowerCase("pt-BR"))
        const found =
          op === "path" ? foldName(note.path).includes(value)
          : op === "file" ? name.includes(value)
          : op === "tag" ? tags.some((t) => t === value || t.startsWith(value + "/"))
          : name.includes(value) || aliases.some((a) => a.includes(value)) || body.includes(value)
        if (found === negate) {
          ok = false
          break
        }
        if (!negate && !op) score += name === value ? 100 : name.startsWith(value) ? 50 : name.includes(value) ? 30 : aliases.some((a) => a.includes(value)) ? 20 : 1
        else if (!negate) score += 5
      }
      if (!ok) continue
      const first = tokens.find((t) => !t.negate && !t.op)
      hits.push({ path: note.path, score, snippet: first ? snippetAround(note.text, first.value) : "" })
    }
    return hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path, "pt-BR")).slice(0, limit)
  }
}

/** Linha do link, sem marcadores de lista/citação e com os links trocados pelo texto que aparece. */
export function contextLine(text: string, link: LinkRef): string {
  const start = text.lastIndexOf("\n", link.start - 1) + 1
  const endIndex = text.indexOf("\n", link.end)
  const line = text.slice(start, endIndex < 0 ? undefined : endIndex)
  return line
    .replace(/!?\[\[([^\]|#]*)(#[^\]|]*)?(?:\\?\|([^\]]*))?\]\]/g, (_m, target: string, sub: string | undefined, alias: string | undefined) => alias ?? (target ? noteName(target) : (sub ?? "").replace(/^#\^?/, "")))
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*(?:[>*+-]|\d+\.)\s*(?:\[[ xX]\]\s*)?/, "")
    .replace(/[*_=`]/g, "")
    .replace(/\r$/, "")
    .trim()
}

function snippetAround(text: string, folded: string): string {
  const index = foldName(text).indexOf(folded)
  if (index < 0) return ""
  const start = Math.max(0, index - 50)
  return (start > 0 ? "…" : "") + text.slice(start, index + folded.length + 70).replace(/\s+/g, " ").trim()
}
