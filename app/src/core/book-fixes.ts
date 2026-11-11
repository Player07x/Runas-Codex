/**
 * Revisar o livro (U43, G2): acha as gambiarras que o livro não precisa mais e mostra como cada uma fica. Nada é
 * trocado sozinho: a tela pede confirmação e guarda a versão de antes no histórico do capítulo.
 *
 * - Linha só com `\` para separar parágrafos (e o `\` no fim da linha de cima, dentro das caixas): vira linha vazia.
 *   O espaço entre parágrafos agora vem do Estilo do livro, e o `\` sozinho antes de uma caixa saía impresso.
 * - `::: runas-colunas-N` vazio: sai.
 * - `::: runas-colunas-1` só em volta de uma tabela (com o título dela): vira `%% livro: largura-toda %%`.
 */

export type FixKind = "barra" | "colunas-vazio" | "colunas-tabela"
export interface BookFix {
  kind: FixKind
  /** Primeira linha do trecho (0 = primeira da nota). */
  line: number
  /** As linhas como estão e como ficam (a troca confere `before` antes de gravar). */
  before: string[]
  after: string[]
}

export const FIX_LABELS: Record<FixKind, string> = {
  barra: "Linha com \\ para separar parágrafos",
  "colunas-vazio": "Bloco de colunas vazio",
  "colunas-tabela": "Colunas só para a tabela ocupar a largura",
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const QUOTE = /^(?:[ \t]{0,3}>[ \t]?)*/
const COLUMNS_OPEN = /^ {0,3}:{3,}[ \t]*runas-colunas-(\d)[ \t]*$/
const CLOSE = /^ {0,3}:{3,}[ \t]*$/
const TABLE = /^\s*\|/
const HEADING = /^ {0,3}#{1,6}[ \t]/

const split = (line: string) => { const prefix = QUOTE.exec(line)![0]; return { prefix, rest: line.slice(prefix.length) } }
const emptyQuote = (prefix: string) => prefix.trimEnd()

/** As linhas fora de blocos de código. */
function codeLines(lines: string[]): Set<number> {
  const code = new Set<number>()
  let fence: string | null = null
  lines.forEach((line, i) => {
    const open = FENCE.exec(split(line).rest)
    if (fence) { code.add(i); if (open && open[1]![0] === fence[0] && open[1]!.length >= fence.length) fence = null }
    else if (open) { fence = open[1]!; code.add(i) }
  })
  return code
}

export function findBookFixes(text: string): BookFix[] {
  const lines = text.split("\n"), code = codeLines(lines)
  const fixes: BookFix[] = []
  for (let i = 0; i < lines.length; i++) {
    if (code.has(i)) continue
    const { prefix, rest } = split(lines[i]!)
    if (rest.trim() === "\\") {
      const above = i > 0 && !code.has(i - 1) ? split(lines[i - 1]!) : null
      // Dentro da caixa: `texto\` + `> \` faziam uma linha em branco no meio do parágrafo; viram dois parágrafos.
      if (above && above.prefix.trim() === prefix.trim() && above.rest.trim() && above.rest.trimEnd().endsWith("\\") && above.rest.trim() !== "\\") {
        fixes.push({ kind: "barra", line: i - 1, before: [lines[i - 1]!, lines[i]!], after: [lines[i - 1]!.trimEnd().slice(0, -1).trimEnd(), emptyQuote(prefix)] })
      } else fixes.push({ kind: "barra", line: i, before: [lines[i]!], after: [emptyQuote(prefix)] })
      continue
    }
    const open = prefix ? null : COLUMNS_OPEN.exec(lines[i]!)
    if (!open) continue
    const close = lines.findIndex((line, j) => j > i && !code.has(j) && (CLOSE.test(line) || COLUMNS_OPEN.test(line)))
    if (close < 0 || !CLOSE.test(lines[close]!)) continue
    const inner = lines.slice(i + 1, close)
    const content = inner.filter((line) => line.trim())
    if (!content.length) { fixes.push({ kind: "colunas-vazio", line: i, before: lines.slice(i, close + 1), after: [] }); i = close; continue }
    // Só a tabela (e o título logo acima dela), sem linha vazia no meio.
    const first = inner.findIndex((line) => line.trim()), last = inner.length - 1 - [...inner].reverse().findIndex((line) => line.trim())
    const block = inner.slice(first, last + 1)
    const tableAt = block.findIndex((line) => TABLE.test(line))
    const onlyTable = open[1] === "1" && tableAt >= 0 && tableAt <= 1 && (tableAt === 0 || HEADING.test(block[0]!)) && block.slice(tableAt).every((line) => TABLE.test(line))
    if (onlyTable) { fixes.push({ kind: "colunas-tabela", line: i, before: lines.slice(i, close + 1), after: ["%% livro: largura-toda %%", ...block] }); i = close }
  }
  return fixes
}

/**
 * Aplica as trocas escolhidas, de baixo para cima. Uma troca cujo trecho mudou desde a revisão fica de fora (e conta
 * em `skipped`); as outras continuam valendo.
 */
export function applyBookFixes(text: string, fixes: BookFix[]): { text: string; applied: number; skipped: number } {
  const lines = text.split("\n")
  let applied = 0, skipped = 0
  for (const fix of [...fixes].sort((a, b) => b.line - a.line)) {
    const current = lines.slice(fix.line, fix.line + fix.before.length)
    if (current.length !== fix.before.length || current.some((line, i) => line !== fix.before[i])) { skipped++; continue }
    lines.splice(fix.line, fix.before.length, ...fix.after)
    applied++
  }
  return { text: lines.join("\n"), applied, skipped }
}

/** Quantos lugares têm linhas vazias seguidas entre dois blocos (só fazem efeito com “Linhas vazias contam”). */
export function blankRuns(text: string): number {
  const lines = text.split("\n"), code = codeLines(lines)
  const empty = (i: number) => !code.has(i) && !split(lines[i]!).rest.trim()
  let runs = 0
  for (let i = 1; i < lines.length; i++) {
    if (!empty(i) || empty(i - 1)) continue
    let end = i
    while (end < lines.length && empty(end)) end++
    if (end - i >= 2 && end < lines.length) runs++
    i = end
  }
  return runs
}
