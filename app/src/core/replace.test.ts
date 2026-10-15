import { compileFind, planReplace, replaceInText, type ReplaceOptions } from "./replace"
import { VaultIndex } from "./vault-index"

const base: ReplaceOptions = { find: "", replace: "", regex: false, caseSensitive: false, wholeWord: false, includeFrontmatter: false }
const run = (text: string, over: Partial<ReplaceOptions>) => {
  const options = { ...base, ...over }
  const re = compileFind(options)
  if (!(re instanceof RegExp)) throw new Error(re.error)
  return replaceInText(text, options, re)
}

describe("buscar e substituir", () => {
  it("literal, sem diferenciar maiúsculas, com $ sem significado especial", () => {
    const r = run("Valdris e VALDRIS e valdrisiano.", { find: "valdris", replace: "Vael$1" })
    expect(r.after).toBe("Vael$1 e Vael$1 e Vael$1iano.")
    expect(r.count).toBe(3)
  })

  it("palavra inteira e maiúsculas", () => {
    expect(run("Valdris e VALDRIS e valdrisiano.", { find: "valdris", replace: "X", wholeWord: true }).after).toBe("X e X e valdrisiano.")
    expect(run("Valdris e VALDRIS.", { find: "Valdris", replace: "X", caseSensitive: true }).after).toBe("X e VALDRIS.")
  })

  it("regex que olha em volta conta só o que troca de verdade", () => {
    const r = run("foobar foo foobaz", { find: "foo(?=bar)", replace: "X", regex: true })
    expect([r.after, r.count]).toEqual(["Xbar foo foobaz", 1])
  })

  it("regex com grupos", () => {
    expect(run("data: 15/07/4031 e 01/02/4030", { find: "(\\d{2})/(\\d{2})/(\\d{4})", replace: "$3-$2-$1", regex: true }).after).toBe("data: 4031-07-15 e 4030-02-01")
  })

  it("deixa o frontmatter de fora, a menos que se peça", () => {
    const text = "---\nlocal: Valdris\n---\nEm Valdris.\n"
    expect(run(text, { find: "Valdris", replace: "Myrr" }).after).toBe("---\nlocal: Valdris\n---\nEm Myrr.\n")
    expect(run(text, { find: "Valdris", replace: "Myrr", includeFrontmatter: true }).after).toBe("---\nlocal: Myrr\n---\nEm Myrr.\n")
  })

  it("mostra as linhas de antes e depois", () => {
    const r = run("a\nb Valdris\nc\nValdris d", { find: "valdris", replace: "Myrr" })
    expect(r.samples).toEqual([
      { line: 2, before: "b Valdris", after: "b Myrr" },
      { line: 4, before: "Valdris d", after: "Myrr d" },
    ])
  })

  it("recusa o que não dá para fazer", () => {
    expect(compileFind({ ...base, find: "" })).toEqual({ error: "Escreva o que procurar." })
    expect(compileFind({ ...base, find: "[", regex: true })).toMatchObject({ error: expect.stringContaining("inválida") })
    expect(compileFind({ ...base, find: "x*", regex: true })).toMatchObject({ error: expect.stringContaining("vazio") })
  })

  it("planeja só as notas que mudam", () => {
    const texts = { "Notas/A.md": "Valdris", "Notas/B.md": "nada", "Notas/C.md": "valdris valdris" }
    const index = new VaultIndex(Object.keys(texts).map((path) => ({ path, size: 1, mtime: 1 })), texts)
    const plan = planReplace(index, Object.keys(texts), { ...base, find: "valdris", replace: "Myrr" })
    expect(Array.isArray(plan) && plan.map((p) => [p.path, p.count, p.after])).toEqual([
      ["Notas/A.md", 1, "Myrr"],
      ["Notas/C.md", 2, "Myrr Myrr"],
    ])
  })
})
