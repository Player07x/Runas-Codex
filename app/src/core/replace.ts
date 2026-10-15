import { parseFrontmatter } from "./parse"
import type { VaultIndex } from "./vault-index"

/**
 * Buscar e substituir em várias notas (checklist A.3). O texto procurado é literal ou uma expressão regular (com `$1`…
 * na substituição); por padrão as propriedades (frontmatter) ficam de fora, para não quebrar o YAML.
 */

export interface ReplaceOptions {
  find: string
  replace: string
  regex: boolean
  caseSensitive: boolean
  wholeWord: boolean
  includeFrontmatter: boolean
}

export interface ReplaceSample {
  line: number
  before: string
  after: string
}

export interface PlannedReplace {
  path: string
  before: string
  after: string
  count: number
  samples: ReplaceSample[]
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** A expressão que procura (ou o erro, se a regex não vale). */
export function compileFind(options: ReplaceOptions): RegExp | { error: string } {
  if (!options.find) return { error: "Escreva o que procurar." }
  let source = options.regex ? options.find : escape(options.find)
  if (options.wholeWord) source = `(?<![\\p{L}\\p{N}_])(?:${source})(?![\\p{L}\\p{N}_])`
  try {
    const re = new RegExp(source, `g${options.caseSensitive ? "" : "i"}u`)
    if (re.test("")) return { error: "A expressão acha texto vazio; ela substituiria entre todas as letras." }
    return re
  } catch (e) {
    return { error: `Expressão regular inválida: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/** Substitui num texto; devolve o texto novo, quantas trocas e até `maxSamples` linhas de antes e depois. */
export function replaceInText(text: string, options: ReplaceOptions, re: RegExp, maxSamples = 5): Omit<PlannedReplace, "path" | "before"> {
  const frontmatter = options.includeFrontmatter ? null : parseFrontmatter(text)
  const start = frontmatter?.end ?? 0
  const head = text.slice(0, start)
  const body = text.slice(start)
  // Substituição literal: `$` não tem significado especial.
  const replacement = options.regex ? options.replace : options.replace.replace(/\$/g, "$$$$")
  const count = [...body.matchAll(re)].length
  const changed = body.replace(re, replacement)
  const after = head + changed
  const samples: ReplaceSample[] = []
  if (count) {
    const a = text.split("\n")
    const b = after.split("\n")
    // As linhas mudam no mesmo lugar só quando a troca não tem quebra de linha; senão, mostra o começo da diferença.
    for (let i = 0; i < Math.min(a.length, b.length) && samples.length < maxSamples; i++) {
      if (a[i] !== b[i]) samples.push({ line: i + 1, before: a[i]!.trim(), after: b[i]!.trim() })
    }
  }
  return { after, count, samples }
}

/** O plano para as notas escolhidas: só as que mudam, na ordem do caminho. */
export function planReplace(index: VaultIndex, paths: string[], options: ReplaceOptions): PlannedReplace[] | { error: string } {
  const re = compileFind(options)
  if (!(re instanceof RegExp)) return re
  const out: PlannedReplace[] = []
  for (const path of paths) {
    const note = index.note(path)
    if (!note) continue
    re.lastIndex = 0
    const result = replaceInText(note.text, options, re)
    if (result.count) out.push({ path, before: note.text, ...result })
  }
  return out.sort((a, b) => a.path.localeCompare(b.path, "pt-BR"))
}
