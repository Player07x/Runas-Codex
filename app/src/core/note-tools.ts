import { parseFrontmatter, parseNote } from "./parse"
import { noteName } from "./text"
import type { VaultIndex } from "./vault-index"
import { parseCanvas, serializeCanvas } from "./canvas"

export interface NoteSnapshot { at: number; updatedAt: number; text: string }
/** Mantém o ponto inicial, agrupa a digitação de 30 s e guarda até 40 versões por nota neste aparelho. */
export function addSnapshot(history: NoteSnapshot[], text: string, now = Date.now(), force = false): NoteSnapshot[] {
  if (history.at(-1)?.text === text) return history
  const next = [...history], last = next.at(-1)
  if (!force && next.length > 1 && last && now - last.at < 30_000) next[next.length - 1] = { at: last.at, updatedAt: now, text }
  else next.push({ at: now, updatedAt: now, text })
  return next.slice(-40)
}
export function textStats(text: string): { words: number; characters: number } {
  const body = text.slice(parseFrontmatter(text)?.end ?? 0)
  return { words: body.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0, characters: [...body].length }
}
export function extractText(text: string, from: number, to: number, link: string): { text: string; extracted: string; cursor: number } {
  if (from < (parseFrontmatter(text)?.end ?? 0) || from < 0 || to > text.length || to <= from || !text.slice(from, to).trim()) throw new Error("Selecione um trecho do corpo da nota; o frontmatter fica na nota original.")
  return { text: text.slice(0, from) + link + text.slice(to), extracted: text.slice(from, to), cursor: from + link.length }
}
/** Os metadados de origem ficam como YAML no corpo, para nenhuma propriedade desaparecer ao mesclar. */
export function mergeText(target: string, source: string, sourceName: string): string {
  const fm = parseFrontmatter(source), body = source.slice(fm?.end ?? 0).trim()
  const properties = fm ? `\n\n\`\`\`yaml\n${source.slice(fm.yamlStart, fm.yamlEnd)}\n\`\`\`` : ""
  const eol = target.includes("\r\n") ? "\r\n" : "\n"
  return `${target.trimEnd()}\n\n## ${sourceName.replace(/[\r\n]/g, " ")}${properties}\n\n${body}\n`.replace(/\r?\n/g, eol)
}

/** Ao mesclar, os backlinks apontam para o destino e os links relativos da origem continuam resolvendo. */
export function mergeLinks(text: string, from: string, source: string, target: string, index: VaultIndex, rebase = false): string {
  const edits: { from: number; to: number; text: string }[] = []
  for (const link of parseNote(text).links) {
    const resolved = index.resolve(link, from).dest
    if (!resolved || (!rebase && resolved !== source)) continue
    const dest = resolved === source ? target : resolved
    const fragment = link.subpath ?? "", prefix = link.embed ? "!" : ""
    const replacement = link.kind === "wiki"
      ? `${prefix}[[${dest.replace(/\.md$/i, "")}${fragment}${link.alias !== undefined ? `|${link.alias}` : !link.embed ? `|${noteName(resolved)}` : ""}]]`
      : `${prefix}[${link.alias ?? noteName(resolved)}](/${encodeURI(dest).replace(/#/g, "%23").replace(/\?/g, "%3F")}${fragment})`
    edits.push({ from: link.start, to: link.end, text: replacement })
  }
  for (const edit of edits.sort((a, b) => b.from - a.from)) text = text.slice(0, edit.from) + edit.text + text.slice(edit.to)
  return text
}
export function mergeCanvasLinks(text: string, source: string, target: string): string {
  const result = parseCanvas(text)
  if ("error" in result) throw new Error(result.error)
  if (!result.doc.nodes.some(node => node.type === "file" && node.file === source)) return text
  return serializeCanvas({ ...result.doc, nodes: result.doc.nodes.map(node => node.type === "file" && node.file === source ? { ...node, file: target } : node) }, text)
}
/** Comparação linear: mantém as linhas comuns nas bordas e mostra o trecho alterado completo. */
export function compareTexts(before: string, after: string): { before: string; after: string; removed: string; added: string } {
  const a = before.split(/\r?\n/), b = after.split(/\r?\n/)
  let first = 0, endA = a.length, endB = b.length
  while (first < endA && first < endB && a[first] === b[first]) first++
  while (endA > first && endB > first && a[endA - 1] === b[endB - 1]) { endA--; endB-- }
  return { before, after, removed: a.slice(first, endA).join("\n"), added: b.slice(first, endB).join("\n") }
}

export const SLASH_COMMANDS = [
  { label: "tabela", detail: "Tabela Markdown", insert: "| Coluna | Coluna |\n| --- | --- |\n|  |  |\n" },
  { label: "callout", detail: "Caixa de observação", insert: "> [!note] Observação\n> Texto\n" },
  { label: "link", detail: "Ligar outra nota", insert: "[[Nota]]" },
  { label: "imagem", detail: "Embutir imagem do cofre", insert: "![[imagem.png]]" },
  { label: "data", detail: "Data de hoje", insert: "" },
  { label: "tarefa", detail: "Caixa de seleção", insert: "- [ ] " },
  { label: "consulta", detail: "Lista dinâmica", insert: '```dataview\nLIST\nFROM "Notas"\n```\n' },
  { label: "base", detail: "Base de notas", insert: '```base\nviews:\n  - type: table\n    name: Notas\n    order: [file.name, file.tags]\n```\n' },
]
