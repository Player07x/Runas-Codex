import { findCodeBlocks } from "./codeblocks"
import type { LinkRef } from "./parse"
import { caseCollision, pathProblem } from "./names"
import { basename, dirname, extname, foldName, joinPath, noteName, relativePath } from "./text"
import { VaultIndex } from "./vault-index"

/**
 * Renomear ou mover um arquivo atualizando todos os links do cofre: no texto, nas propriedades e nos nós de arquivo
 * dos `.canvas`. Só os trechos dos links mudam; o resto de cada arquivo fica byte a byte igual.
 */

export interface FileEdit {
  path: string
  before: string
  after: string
}

export interface RenamePlan {
  from: string
  to: string
  edits: FileEdit[]
}

interface Splice {
  start: number
  end: number
  text: string
}

function applySplices(text: string, splices: Splice[]): string {
  let out = text
  for (const s of [...splices].sort((a, b) => b.start - a.start)) out = out.slice(0, s.start) + s.text + out.slice(s.end)
  return out
}

/** Valida o destino de um renomear/mover; devolve a mensagem de erro ou `null`. */
export function renameProblem(index: VaultIndex, from: string, to: string): string | null {
  if (from === to) return "O nome é o mesmo."
  if (!index.hasFile(from)) return `“${from}” não existe no cofre.`
  const problem = pathProblem(to)
  if (problem) return problem
  if (extname(from) !== extname(to)) return "A extensão do arquivo não pode mudar."
  const clash = caseCollision(to, index.allFiles().map((f) => f.path), from)
  // Renomear só as maiúsculas (`nota` → `Nota`) é permitido: a plataforma faz em dois passos.
  if (clash && clash !== from) return `Já existe “${clash}” (o Windows e o Android não diferenciam maiúsculas).`
  return null
}

function rewriteWiki(link: LinkRef, newTarget: string): string {
  const prefix = link.embed ? "![[" : "[["
  const inner = link.raw.slice(prefix.length, -2)
  const bar = /\\?\|/.exec(inner)
  const pathPart = bar ? inner.slice(0, bar.index) : inner
  const at = pathPart.indexOf(link.target)
  const newPath = at < 0 ? newTarget + (link.subpath ?? "") : pathPart.slice(0, at) + newTarget + pathPart.slice(at + link.target.length)
  return prefix + newPath + (bar ? inner.slice(bar.index) : "") + "]]"
}

/** Caminho no mesmo estilo do original: com `%20` se o original codificava, acentos crus se ele os deixava crus. */
function encodeHref(path: string, link: LinkRef, originalHref: string): string {
  if (!link.encoded) return path.replace(/ /g, "%20")
  return /[^\x00-\x7f]/.test(originalHref) ? path.replace(/ /g, "%20") : path.split("/").map(encodeURIComponent).join("/")
}

function rewriteMarkdown(link: LinkRef, newPath: string): string {
  const open = link.raw.lastIndexOf("](")
  // Depois de `](`: o caminho e, talvez, um título entre aspas.
  const tail = link.raw.slice(open + 2, -1)
  const hrefRaw = link.angle ? tail.slice(0, tail.indexOf(">") + 1) : tail.split(/\s+/)[0]!
  let href: string
  if (link.angle) href = `<${newPath}${link.subpath ?? ""}>`
  else {
    const hash = hrefRaw.indexOf("#")
    href = encodeHref(newPath, link, hrefRaw) + (hash < 0 ? "" : hrefRaw.slice(hash))
  }
  return link.raw.slice(0, open + 2) + href + tail.slice(hrefRaw.length) + ")"
}

/** Como o link markdown aponta: relativo à pasta da nota, a partir da raiz do cofre ou com `/` na frente. */
function markdownStyle(link: LinkRef, source: string, dest: string): "relative" | "root" | "slash" {
  if (link.target.startsWith("/")) return "slash"
  const relative = joinPath(dirname(source), link.target)
  const matches = (candidate: string | null) => candidate !== null && (foldName(candidate) === foldName(dest) || foldName(candidate + ".md") === foldName(dest))
  return matches(relative) ? "relative" : "root"
}

function markdownPath(style: "relative" | "root" | "slash", sourceFolder: string, dest: string, keepExtension: boolean): string {
  const path = keepExtension ? dest : dest.replace(/\.md$/i, "")
  if (style === "slash") return "/" + path
  if (style === "root") return path
  return relativePath(sourceFolder, path)
}

/**
 * Planeja o renomear/mover de `from` para `to`. `texts` traz o conteúdo dos `.canvas` (o índice só guarda notas).
 * Lança erro se o destino não for válido.
 */
export function planRename(index: VaultIndex, from: string, to: string, texts: Record<string, string> = {}): RenamePlan {
  const problem = renameProblem(index, from, to)
  if (problem) throw new Error(problem)
  const isNote = extname(from) === ".md"
  const newName = isNote ? noteName(to) : basename(to)
  const nameTaken = index.allFiles().some((f) => f.path !== from && foldName(isNote ? noteName(f.path) : basename(f.path)) === foldName(newName) && extname(f.path) === extname(to))
  const splicesByPath = new Map<string, Splice[]>()
  const add = (path: string, splice: Splice) => splicesByPath.set(path, [...(splicesByPath.get(path) ?? []), splice])

  // Links que apontam para o arquivo renomeado (inclusive dentro dele mesmo).
  const sources = new Set([...index.backlinks(from).map((b) => b.from), ...(index.note(from) ? [from] : [])])
  for (const source of sources) {
    const sourceAfter = source === from ? to : source
    for (const resolved of index.outgoing(source)) {
      if (resolved.dest !== from || !resolved.link.target || resolved.viaAlias) continue
      const { link } = resolved
      if (link.kind === "wiki") {
        const hadExt = isNote && /\.md$/i.test(link.target)
        const full = isNote ? to.replace(/\.md$/i, "") : to
        const target = link.target.includes("/") || nameTaken ? full : newName
        add(source, { start: link.start, end: link.end, text: rewriteWiki(link, target + (hadExt ? ".md" : "")) })
      } else {
        const style = markdownStyle(link, source, from)
        const keepExt = extname(link.target) !== "" || !isNote
        add(source, { start: link.start, end: link.end, text: rewriteMarkdown(link, markdownPath(style, dirname(sourceAfter), to, keepExt)) })
      }
    }
  }

  // Ao mudar de pasta, os links markdown relativos da própria nota passam a partir de outro lugar.
  if (index.note(from) && dirname(from) !== dirname(to)) {
    for (const resolved of index.outgoing(from)) {
      const { link, dest } = resolved
      if (link.kind !== "markdown" || !dest || dest === from || !link.target) continue
      if (markdownStyle(link, from, dest) !== "relative") continue
      const keepExt = extname(link.target) !== ""
      add(from, { start: link.start, end: link.end, text: rewriteMarkdown(link, markdownPath("relative", dirname(to), dest, keepExt)) })
    }
  }

  // Links dentro dos blocos da Wiki (pinos e imagem do mapa, correspondências do calendário). O leitor de links não
  // olha código, então eles são procurados aqui; sem isto, o mapa perderia o pino ao renomear a nota.
  for (const note of index.allNotes()) {
    if (!/```+ *runas-(mapa|calendario)/.test(note.text)) continue
    for (const block of findCodeBlocks(note.text)) {
      if (block.language !== "runas-mapa" && block.language !== "runas-calendario") continue
      for (const m of block.content.matchAll(/\[\[([^\]|#\n]+)((?:#[^\]|\n]*)?)((?:\|[^\]\n]*)?)\]\]/g)) {
        const target = m[1]!.trim()
        const link: LinkRef = { kind: "wiki", embed: false, target, start: 0, end: 0, raw: m[0], inFrontmatter: false }
        const resolved = index.resolve(link, note.path)
        if (resolved.dest !== from || resolved.viaAlias) continue
        const full = isNote ? to.replace(/\.md$/i, "") : to
        const start = block.contentStart + m.index
        add(note.path, { start, end: start + m[0].length, text: `[[${target.includes("/") || nameTaken ? full : newName}${m[2]}${m[3]}]]` })
      }
    }
  }

  const edits: FileEdit[] = []
  for (const [path, splices] of splicesByPath) {
    const before = index.note(path)!.text
    const after = applySplices(before, splices)
    if (after !== before) edits.push({ path, before, after })
  }

  // `.canvas` (JSON Canvas): troca só o valor dos campos "file" que apontam para o arquivo.
  const escaped = JSON.stringify(from).slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const pattern = new RegExp(`("(?:file|runas_original)"\\s*:\\s*")${escaped}(")`, "g")
  for (const [path, before] of Object.entries(texts)) {
    if (extname(path) !== ".canvas") continue
    const after = before.replace(pattern, (_m, open: string, close: string) => open + JSON.stringify(to).slice(1, -1) + close)
    if (after !== before) edits.push({ path, before, after })
  }
  return { from, to, edits }
}

/**
 * Renomear ou mover uma pasta: simula a mudança arquivo por arquivo numa cópia do índice (assim links entre arquivos
 * da própria pasta também ficam certos) e devolve as edições nos caminhos de antes — o app grava os textos e só
 * depois move a pasta.
 */
export function planFolderRename(index: VaultIndex, from: string, to: string, texts: Record<string, string> = {}): RenamePlan {
  if (from === to) throw new Error("O nome é o mesmo.")
  if ((to + "/").startsWith(from + "/")) throw new Error("Uma pasta não pode ir para dentro dela mesma.")
  const problem = pathProblem(to)
  if (problem) throw new Error(problem)
  const files = index.allFiles().filter((file) => file.path.startsWith(from + "/"))
  if (!files.length) return { from, to, edits: [] }
  const work = new VaultIndex(index.allFiles(), Object.fromEntries(index.allNotes().map((note) => [note.path, note.text])))
  const canvas = { ...texts }
  for (const file of files) {
    const target = to + file.path.slice(from.length)
    const plan = planRename(work, file.path, target, canvas)
    for (const edit of plan.edits) {
      if (extname(edit.path) === ".canvas") canvas[edit.path] = edit.after
      else work.set(work.allFiles().find((f) => f.path === edit.path)!, edit.after)
    }
    const text = work.note(file.path)?.text
    work.remove(file.path)
    work.set({ ...file, path: target }, text)
  }
  const original = (path: string) => (path.startsWith(to + "/") ? from + path.slice(to.length) : path)
  const edits: FileEdit[] = []
  for (const note of work.allNotes()) {
    const path = original(note.path)
    const before = index.note(path)?.text
    if (before !== undefined && before !== note.text) edits.push({ path, before, after: note.text })
  }
  for (const [path, after] of Object.entries(canvas)) if (texts[path] !== undefined && texts[path] !== after) edits.push({ path, before: texts[path]!, after })
  return { from, to, edits }
}
