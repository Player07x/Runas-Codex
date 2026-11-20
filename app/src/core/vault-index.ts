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

function appendTo<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key)
  if (values) values.push(value)
  else map.set(key, [value])
}

function removeFrom(map: Map<string, string[]>, key: string, path: string): void {
  const values = map.get(key)
  if (!values) return
  const at = values.indexOf(path)
  if (at !== -1) values.splice(at, 1)
  if (!values.length) map.delete(key)
}

const sameItems = <T>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((item, i) => item === b[i])
const fileNameKey = (path: string) => foldName(isNote(path) ? noteName(path) : basename(path))
const SEARCH_CACHE_CHARS = 8 * 1024 * 1024

export class VaultIndex {
  private readonly notes = new Map<string, IndexedNote>()
  private readonly files = new Map<string, VaultEntry>()
  private readonly byPath = new Map<string, string[]>()
  private readonly byName = new Map<string, string[]>()
  private readonly byAlias = new Map<string, string[]>()
  private readonly resolvedCache = new Map<string, ResolvedLink[]>()
  private backlinkCache: Map<string, ResolvedLink[]> | null = null
  private readonly searchTexts = new Map<IndexedNote, string>()
  private searchChars = 0
  private readonly searchCacheChars: number

  /**
   * Todos os arquivos do cofre (notas e anexos) e o texto das notas. `searchCacheChars` limita a cópia normalizada
   * guardada para a busca (menor no celular).
   */
  constructor(entries: VaultEntry[] = [], texts: Record<string, string> = {}, options: { searchCacheChars?: number } = {}) {
    this.searchCacheChars = options.searchCacheChars ?? SEARCH_CACHE_CHARS
    for (const entry of entries) this.putFile(entry)
    for (const entry of entries) if (isNote(entry.path) && entry.path in texts) this.putNote(entry, texts[entry.path]!)
  }

  // ---------- Atualização ----------

  /** Cria ou atualiza um arquivo; para notas, `text` é o conteúdo. */
  set(entry: VaultEntry, text?: string): void {
    const newFile = this.putFile(entry)
    const targetsChanged = isNote(entry.path) && text !== undefined && this.putNote(entry, text)
    if (newFile || targetsChanged) this.resolvedCache.clear()
    if (newFile) this.backlinkCache = null
  }

  remove(path: string): void {
    if (!this.files.delete(path)) return
    removeFrom(this.byPath, foldName(path), path)
    removeFrom(this.byName, fileNameKey(path), path)
    const note = this.notes.get(path)
    if (note) {
      for (const alias of note.meta.aliases) removeFrom(this.byAlias, foldName(alias), path)
      this.dropSearchText(note)
      this.notes.delete(path)
    }
    this.resolvedCache.clear()
    this.backlinkCache = null
  }

  private putFile(entry: VaultEntry): boolean {
    const { path } = entry
    const added = !this.files.has(path)
    this.files.set(path, entry)
    if (added) {
      appendTo(this.byPath, foldName(path), path)
      appendTo(this.byName, fileNameKey(path), path)
    }
    return added
  }

  /** Diz se uma mudança de alvo também pode afetar links escritos em outras notas. */
  private putNote(entry: VaultEntry, text: string): boolean {
    const { path, mtime, size } = entry
    const previous = this.notes.get(path)
    if (previous?.text === text) {
      if (previous.mtime !== mtime || previous.size !== size) {
        this.dropSearchText(previous)
        this.notes.set(path, { ...previous, mtime, size })
      }
      return false
    }
    const meta = parseNote(text)
    const aliases = previous?.meta.aliases ?? []
    const aliasesChanged = !sameItems(aliases, meta.aliases)
    if (aliasesChanged) {
      for (const alias of aliases) removeFrom(this.byAlias, foldName(alias), path)
      for (const alias of meta.aliases) appendTo(this.byAlias, foldName(alias), path)
    }
    if (previous) this.dropSearchText(previous)
    this.notes.set(path, { path, name: noteName(path), scope: scopeOf(path), mtime, size, text, meta })
    this.resolvedCache.delete(path)
    this.backlinkCache = null
    return !previous || aliasesChanged || !sameItems(previous.meta.blocks, meta.blocks)
      || previous.meta.headings.length !== meta.headings.length
      || previous.meta.headings.some((heading, i) => heading.text !== meta.headings[i]?.text)
  }

  private dropSearchText(note: IndexedNote): void {
    const body = this.searchTexts.get(note)
    if (body !== undefined) {
      this.searchTexts.delete(note)
      this.searchChars -= body.length
    }
  }

  /** Normaliza sob demanda e limita a cópia extra de texto mantida por cofre. */
  foldedSearchText(note: IndexedNote): string {
    const cached = this.searchTexts.get(note)
    if (cached !== undefined) return cached
    const body = foldName(note.text)
    if (this.notes.get(note.path) === note && this.searchChars + body.length <= this.searchCacheChars) {
      this.searchTexts.set(note, body)
      this.searchChars += body.length
    }
    return body
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

  entry(path: string): VaultEntry | undefined {
    return this.files.get(path)
  }

  allFiles(): VaultEntry[] {
    return [...this.files.values()]
  }

  hasFile(path: string): boolean {
    return this.files.has(path)
  }

  notesIn(root: string): IndexedNote[] {
    if (!root) return this.allNotes()
    const notes: IndexedNote[] = []
    for (const note of this.notes.values()) if (note.path.startsWith(root)) notes.push(note)
    return notes
  }

  /** O nome curto (sem pasta) aponta para um único arquivo no cofre inteiro? */
  isNameUnique(path: string): boolean {
    return (this.byName.get(fileNameKey(path))?.length ?? 0) <= 1
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
      const found = this.byPath.get(foldName(candidate))?.at(-1) ?? (extname(candidate) ? undefined : this.byPath.get(foldName(candidate + ".md"))?.at(-1))
      if (found) return found
    }
    return null
  }

  private resolveName(target: string, from: string): Partial<ResolvedLink> {
    const clean = target.replace(/^\/+/, "")
    if (clean.includes("/")) {
      const exact = this.byPath.get(foldName(clean))?.at(-1) ?? this.byPath.get(foldName(clean + ".md"))?.at(-1)
      if (exact) return { dest: exact }
      // Caminho parcial (`Personagens/Aldren`): vale se só um arquivo termina assim.
      const suffix = "/" + foldName(extname(clean) ? clean : clean + ".md")
      const matches: string[] = []
      for (const [key, paths] of this.byPath) if (key.endsWith(suffix)) matches.push(paths.at(-1)!)
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

  outgoing(path: string): ResolvedLink[] {
    const note = this.notes.get(path)
    if (!note) return []
    let links = this.resolvedCache.get(path)
    if (!links) {
      links = note.meta.links.map((link) => this.resolve(link, path))
      this.resolvedCache.set(path, links)
    }
    return links
  }

  backlinks(path: string): Backlink[] {
    if (!this.backlinkCache) {
      this.backlinkCache = new Map()
      for (const from of this.notes.keys()) {
        for (const resolved of this.outgoing(from)) {
          if (!resolved.dest || resolved.dest === resolved.from) continue
          appendTo(this.backlinkCache, resolved.dest, resolved)
        }
      }
    }
    const grouped = new Map<string, ResolvedLink[]>()
    for (const resolved of this.backlinkCache.get(path) ?? []) appendTo(grouped, resolved.from, resolved)
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
    for (const from of this.notes.keys()) {
      if (!from.startsWith(root)) continue
      for (const resolved of this.outgoing(from)) {
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
    const hits: { note: IndexedNote; score: number }[] = []
    const first = tokens.find((t) => !t.negate && !t.op)
    for (const note of this.notes.values()) {
      if (!note.path.startsWith(root)) continue
      let name: string | undefined, aliases: string[] | undefined, body: string | undefined
      let score = 0
      let ok = true
      for (const { negate, op, value } of tokens) {
        const found =
          op === "path" ? foldName(note.path).includes(value)
          : op === "file" ? (name ??= foldName(note.name)).includes(value)
          : op === "tag" ? note.meta.tags.some((t) => {
            const tag = t.toLocaleLowerCase("pt-BR")
            return tag === value || tag.startsWith(value + "/")
          })
          : (name ??= foldName(note.name)).includes(value) || (aliases ??= note.meta.aliases.map(foldName)).some((a) => a.includes(value)) || (body ??= this.foldedSearchText(note)).includes(value)
        if (found === negate) {
          ok = false
          break
        }
        if (!negate && !op) score += name === value ? 100 : name?.startsWith(value) ? 50 : name?.includes(value) ? 30 : aliases?.some((a) => a.includes(value)) ? 20 : 1
        else if (!negate) score += 5
      }
      if (ok) hits.push({ note, score })
    }
    return hits.sort((a, b) => b.score - a.score || a.note.path.localeCompare(b.note.path, "pt-BR")).slice(0, limit)
      .map(({ note, score }) => ({
        path: note.path,
        score,
        snippet: first ? snippetAround(note.text, this.foldedSearchText(note).indexOf(first.value), first.value.length) : "",
      }))
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

function snippetAround(text: string, index: number, length: number): string {
  if (index < 0) return ""
  const start = Math.max(0, index - 50)
  return (start > 0 ? "…" : "") + text.slice(start, index + length + 70).replace(/\s+/g, " ").trim()
}
