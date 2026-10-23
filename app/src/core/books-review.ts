/** Comentários de revisão de um capítulo (`%% revisão: … %%`), ocultos na leitura e na impressão (ADR 0009). */
export interface ReviewComment { text: string; from: number; to: number; line: number }

const REVIEW = /%%\s*revis[aã]o\s*:?\s*([\s\S]*?)\s*%%/giu

/** Os comentários na ordem do texto, com a posição e a linha (1 = primeira) de cada um. */
export function reviewComments(text: string): ReviewComment[] {
  return [...text.matchAll(REVIEW)].map((match) => {
    const from = match.index
    return { text: match[1]!.replace(/\s+/g, " ").trim(), from, to: from + match[0].length, line: text.slice(0, from).split("\n").length }
  })
}

/** O comentário pronto para entrar no texto; `%%` dentro dele fecharia o comentário antes da hora. */
export const reviewComment = (text: string) => `%% revisão: ${text.replace(/%%/g, "%").replace(/\s+/g, " ").trim()} %%`

/**
 * Tira um comentário do texto; um espaço que sobraria dobrado em volta dele também sai. Se o texto mudou e o trecho
 * não é mais aquele comentário, devolve o texto como estava.
 */
export function removeReviewComment(text: string, comment: Pick<ReviewComment, "from" | "to">): string {
  const piece = text.slice(comment.from, comment.to)
  if (!new RegExp(`^${REVIEW.source}$`, "iu").test(piece)) return text
  let from = comment.from, to = comment.to
  if (text[from - 1] === " " && (text[to] === " " || text[to] === "\n" || to === text.length)) from -= 1
  else if (text[to] === " " && (from === 0 || text[from - 1] === "\n")) to += 1
  return text.slice(0, from) + text.slice(to)
}
