import { parseQuery, searchNotes } from "./search"
import { VaultIndex } from "./vault-index"

const texts: Record<string, string> = {
  "Notas/Ponte de Prata.md": "---\nstatus: ativo\ntags: [local/cidade]\naliases: [A Ponte]\n---\n# Ponte de Prata\n\nAldren cruzou a ponte na lua cheia.\n\n## Segredo\n\nA ponte some ao amanhecer.\n",
  "Notas/Diário.md": "---\nstatus: arquivado\n---\n# Diário\n\nHoje Aldren chegou.\nA lua estava nova.\n\n## Ponte\n\nNada sobre cheia aqui. Código 4031-07-15.\n",
  "Wikis/Mundo/Aldren.md": "---\ntipo: npc\nstatus: [vivo, ativo]\n---\n# Aldren\n\nCaçador. Viu a ponte cheia de cinzas.\n",
}
const index = new VaultIndex(Object.keys(texts).map((path) => ({ path, size: 1, mtime: 1 })), texts)
const paths = (query: string, root = "") => searchNotes(index, query, root).map((h) => h.path).sort()

describe("busca com operadores", () => {
  it("termos, frase, exclusão e OR", () => {
    expect(paths("aldren ponte")).toEqual(["Notas/Diário.md", "Notas/Ponte de Prata.md", "Wikis/Mundo/Aldren.md"])
    expect(paths('"lua cheia"')).toEqual(["Notas/Ponte de Prata.md"])
    expect(paths("aldren -cinzas")).toEqual(["Notas/Diário.md", "Notas/Ponte de Prata.md"])
    expect(paths("amanhecer OR caçador")).toEqual(["Notas/Ponte de Prata.md", "Wikis/Mundo/Aldren.md"])
  })

  it("path:, file:, tag: e content:", () => {
    expect(paths("path:wikis")).toEqual(["Wikis/Mundo/Aldren.md"])
    expect(paths("file:diário")).toEqual(["Notas/Diário.md"])
    expect(paths("tag:local")).toEqual(["Notas/Ponte de Prata.md"])
    expect(paths("tag:#local/cidade")).toEqual(["Notas/Ponte de Prata.md"])
    // "ponte" no nome não conta para content:
    expect(paths("content:prata")).toEqual(["Notas/Ponte de Prata.md"])
    expect(paths("content:amanhecer -path:notas")).toEqual([])
  })

  it("line: exige os termos na mesma linha; section:, no mesmo trecho de título", () => {
    expect(paths("line:(aldren lua)")).toEqual(["Notas/Ponte de Prata.md"])
    expect(paths("line:(lua cheia)")).toEqual(["Notas/Ponte de Prata.md"])
    expect(paths("section:(ponte amanhecer)")).toEqual(["Notas/Ponte de Prata.md"])
    expect(paths("section:(ponte cheia)")).toEqual(["Notas/Diário.md", "Notas/Ponte de Prata.md", "Wikis/Mundo/Aldren.md"])
    expect(paths("section:(aldren amanhecer)")).toEqual([])
  })

  it("[propriedade] e [propriedade:valor], inclusive em listas", () => {
    expect(paths("[tipo]")).toEqual(["Wikis/Mundo/Aldren.md"])
    expect(paths("[status:ativo]")).toEqual(["Notas/Ponte de Prata.md", "Wikis/Mundo/Aldren.md"])
    expect(paths('[status:"arquivado"]')).toEqual(["Notas/Diário.md"])
    expect(paths("[status:vivo] aldren")).toEqual(["Wikis/Mundo/Aldren.md"])
  })

  it("regex, com aviso quando é inválida", () => {
    expect(paths("/\\d{4}-\\d{2}-\\d{2}/")).toEqual(["Notas/Diário.md"])
    expect(paths("/(?i:PONTE) some/")).toEqual(["Notas/Ponte de Prata.md"])
    const bad = searchNotes(index, "/[a-/")
    expect(bad).toHaveLength(0)
    expect(bad.error).toContain("Expressão regular inválida")
  })

  it("no espaço escolhido, com o trecho em volta e o nome pesando mais", () => {
    expect(paths("aldren", "Notas/")).toEqual(["Notas/Diário.md", "Notas/Ponte de Prata.md"])
    const [first] = searchNotes(index, "aldren")
    expect(first!.path).toBe("Wikis/Mundo/Aldren.md")
    expect(searchNotes(index, '"lua cheia"')[0]!.snippet).toContain("lua cheia")
  })

  it("lê a busca em partes", () => {
    expect(parseQuery('-tag:npc line:(a "b c") [x:y] OR z').alternatives.map((a) => a.map((t) => t.kind))).toEqual([["field", "group", "prop"], ["text"]])
  })
})

it("usa o texto atualizado nas duas buscas mesmo depois de consultar a versão antiga", () => {
  const path = "Notas/Caderno.md"
  const index = new VaultIndex([{ path, mtime: 1, size: 8 }], { [path]: "Na feira" })
  expect(searchNotes(index, "feira")[0]?.snippet).toBe("Na feira")
  expect(index.search("feira")[0]?.snippet).toBe("Na feira")
  index.set({ path, mtime: 2, size: 10 }, "No mercado")
  expect(searchNotes(index, "feira")).toHaveLength(0)
  expect(index.search("feira")).toHaveLength(0)
  expect(searchNotes(index, "mercado")[0]?.snippet).toBe("No mercado")
  expect(index.search("mercado")[0]?.snippet).toBe("No mercado")
})

it("continua a leitura quando sobra um fechamento depois de um grupo", () => {
  expect(paths("line:(lua cheia))")).toEqual(["Notas/Ponte de Prata.md"])
})
