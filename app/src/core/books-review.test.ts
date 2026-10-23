import { removeReviewComment, reviewComment, reviewComments } from "./books-review"

describe("comentários de revisão do capítulo", () => {
  const text = "# O Condado\n\nEntre o lago e as cinzas. %% revisão: conferir a data da guerra %%\n\nOutro parágrafo.%%revisao conferir nomes%%\n%% nota comum %%"
  it("acha os comentários de revisão, com e sem acento, e ignora os comentários comuns", () => {
    const found = reviewComments(text)
    expect(found.map((c) => c.text)).toEqual(["conferir a data da guerra", "conferir nomes"])
    expect(found.map((c) => c.line)).toEqual([3, 5])
    expect(text.slice(found[0]!.from, found[0]!.to)).toBe("%% revisão: conferir a data da guerra %%")
  })
  it("tira o comentário sem deixar espaço dobrado", () => {
    const [first] = reviewComments(text)
    expect(removeReviewComment(text, first!)).toContain("Entre o lago e as cinzas.\n")
  })
  it("não mexe no texto se o trecho já não é o comentário", () => {
    const [first] = reviewComments(text)
    expect(removeReviewComment("texto novo", first!)).toBe("texto novo")
  })
  it("monta o comentário sem deixar o %% fechar antes da hora", () => {
    expect(reviewComment("  ver 50%%  do texto\n")).toBe("%% revisão: ver 50% do texto %%")
  })
})
