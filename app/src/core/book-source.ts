/**
 * O texto do capítulo como o livro o desenha (U43, G2). Só a prévia, o PDF e as exportações do livro passam por aqui;
 * a nota não muda e o Obsidian continua igual. Os ajustes viram contêineres `::: livro-…` do dialeto (que o leitor já
 * desenha como `div.md-container`), e o CSS do livro dá o efeito:
 *
 * - `%% livro: largura-toda %%`: o bloco logo abaixo (até a próxima linha vazia) ocupa a largura toda da página.
 * - `%% livro: nova-pagina %%`: o que vem depois começa numa página nova.
 * - `%% livro: espaco 2 %%`: duas linhas de espaço (de 1 a 6).
 * - Com `linhas_vazias: respeitar` no livro, cada linha vazia a mais entre dois blocos vira uma linha de espaço.
 *
 * O Obsidian esconde os comentários `%%…%%` e junta as linhas vazias; nada disso aparece nele.
 */

export interface BookSourceOptions {
  /** `linhas_vazias: respeitar`: as linhas vazias seguidas viram espaço. */
  blankLines: boolean
}

const FENCE = /^ {0,3}(`{3,}|~{3,})/
const QUOTE = /^(?:[ \t]{0,3}>[ \t]?)*/
const ADJUST = /^[ \t]*%%[ \t]*livro[ \t]*:[ \t]*(.+?)[ \t]*%%[ \t]*$/iu
export const MAX_SPACE = 6

/** O que o comentário `%% livro: … %%` pede, ou `null` se não é um ajuste conhecido. */
export function bookAdjust(text: string): { kind: "largura-toda" } | { kind: "nova-pagina" } | { kind: "espaco"; lines: number } | null {
  const value = text.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ")
  if (/^largura[ -]toda$/.test(value)) return { kind: "largura-toda" }
  if (/^nova[ -]pagina$/.test(value)) return { kind: "nova-pagina" }
  const space = /^espaco(?: (\d+))?$/.exec(value)
  if (space) return { kind: "espaco", lines: Math.min(MAX_SPACE, Math.max(1, Number(space[1] ?? 1))) }
  return null
}

const split = (line: string) => { const prefix = QUOTE.exec(line)![0]; return { prefix, rest: line.slice(prefix.length) } }
const blank = (line: string) => !split(line).rest.trim()
/** Um contêiner vazio em parágrafos próprios (com a mesma citação, quando está dentro de uma caixa). */
const marker = (prefix: string, name: string) => [prefix.trimEnd(), `${lead(prefix)}::: ${name}`, `${lead(prefix)}:::`, prefix.trimEnd()]
/** A citação seguida de um espaço (a linha `>` vazia não tem o espaço). */
const lead = (prefix: string) => (prefix.trim() ? `${prefix.trimEnd()} ` : "")

export function bookSource(body: string, options: BookSourceOptions): string {
  const lines = body.split("\n")
  const out: string[] = []
  let fence: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const { prefix, rest } = split(line)
    // Nada muda dentro de blocos de código.
    const open = FENCE.exec(rest)
    if (fence) { if (open && open[1]![0] === fence[0] && open[1]!.length >= fence.length) fence = null; out.push(line); continue }
    if (open) { fence = open[1]!; out.push(line); continue }

    const comment = ADJUST.exec(rest)
    const adjust = comment ? bookAdjust(comment[1]!) : null
    if (adjust?.kind === "nova-pagina") { out.push(...marker(prefix, "livro-nova-pagina")); continue }
    if (adjust?.kind === "espaco") { out.push(...marker(prefix, `livro-espaco-${adjust.lines}`)); continue }
    if (adjust?.kind === "largura-toda") {
      // O bloco de baixo: pula as linhas vazias logo depois do comentário e vai até a próxima linha vazia.
      let start = i + 1
      while (start < lines.length && blank(lines[start]!)) start++
      let end = start
      while (end < lines.length && !blank(lines[end]!)) end++
      if (end === start) continue
      out.push(prefix.trimEnd(), `${lead(prefix)}::: livro-largo`, ...lines.slice(start, end), `${lead(prefix)}:::`, prefix.trimEnd())
      i = end - 1
      continue
    }

    if (options.blankLines && blank(line) && out.length && !blank(out[out.length - 1]!)) {
      let end = i
      while (end < lines.length && blank(lines[end]!) && split(lines[end]!).prefix.trim() === prefix.trim()) end++
      const extra = end - i - 1
      const next = lines[end]
      // Só entre dois blocos: não no fim, nem antes de uma linha recuada (continuação de lista ou código).
      if (extra > 0 && next !== undefined && !/^[ \t]/.test(split(next).rest) && split(next).prefix.trim() === prefix.trim()) {
        out.push(...marker(prefix, `livro-espaco-${Math.min(MAX_SPACE, extra)}`))
        i = end - 1
        continue
      }
    }
    out.push(line)
  }
  return out.join("\n")
}
