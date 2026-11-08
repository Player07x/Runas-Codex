import { describe, expect, it } from "vitest"
import { parseCalendar } from "./calendar"
import { parseFrontmatter } from "./parse"
import { ARTICLE_KINDS, articleKind, newArticleNote, type ArticleKind } from "./wiki"
import { applyFicha, fichaErrors, fichaInput, fichaValue, groupKinds, withArticleBody } from "./wiki-ficha"

const calendar = parseCalendar(`nome: Calendário Rúnico
sigla: CR
meses:
  - { nome: Ogronios, dias: 30 }
  - { nome: Brumal, dias: 30 }
hoje: "5631-01-09"`)

const personagem = articleKind("personagem")!
const field = (key: string) => personagem.fields.find((f) => f.key === key)!
const dataOf = (text: string) => parseFrontmatter(text)!.data!

describe("grupos do Novo artigo", () => {
  it("põe cada tipo pronto em exatamente um grupo", () => {
    const groups = groupKinds(ARTICLE_KINDS)
    for (const kind of ARTICLE_KINDS) expect(groups.filter((group) => group.kinds.includes(kind))).toHaveLength(1)
  })

  it("leva Idioma, Documento e Condição para Outros", () => {
    const outros = groupKinds(ARTICLE_KINDS).find((group) => group.label === "Outros")!
    expect(outros.kinds.map((kind) => kind.id)).toEqual(["idioma", "documento", "condicao"])
  })

  it("mostra os tipos criados pelo usuário em Criados nesta wiki", () => {
    const monstro: ArticleKind = { id: "monstro", label: "Monstro", folder: "Monstros", icon: "folder", fields: [], questions: [], sections: [], root: "Wikis/Mundo/" }
    const groups = groupKinds([...ARTICLE_KINDS, monstro])
    expect(groups.find((group) => group.label === "Criados nesta wiki")!.kinds).toEqual([monstro])
    expect(groups.at(-1)!.label).toBe("Outros")
  })

  it("não mostra grupo vazio", () => {
    expect(groupKinds([personagem]).map((group) => group.label)).toEqual(["Pessoas e grupos"])
  })
})

describe("valores da ficha", () => {
  it("lê links, listas e imagens sem os colchetes", () => {
    expect(fichaInput(field("especie"), "[[Humana]]")).toBe("Humana")
    expect(fichaInput(field("afiliacao"), ["[[Ordem do Sal]]", "[[Casa Vatu|a Casa]]"])).toEqual(["Ordem do Sal", "Casa Vatu"])
    expect(fichaInput(field("retrato"), "![[Anexos/brites.png]]")).toBe("Anexos/brites.png")
    expect(fichaInput(field("ocupacao"), null)).toBe("")
  })

  it("grava link, lista, número e texto como o Infobox gravava", () => {
    expect(fichaValue(field("especie"), "Humana", [])).toEqual({ value: "[[Humana]]" })
    expect(fichaValue(field("afiliacao"), ["Ordem do Sal", "", "Casa Vatu"], [])).toEqual({ value: ["[[Ordem do Sal]]", "[[Casa Vatu]]"] })
    expect(fichaValue(field("afiliacao"), "Ordem do Sal, Casa Vatu", [])).toEqual({ value: ["[[Ordem do Sal]]", "[[Casa Vatu]]"] })
    expect(fichaValue(articleKind("cidade")!.fields.find((f) => f.key === "populacao")!, "1200", [])).toEqual({ value: 1200 })
    expect(fichaValue(articleKind("cidade")!.fields.find((f) => f.key === "populacao")!, "uns mil", [])).toEqual({ value: "uns mil" })
    expect(fichaValue(field("ocupacao"), "  ", [])).toEqual({ value: null })
  })

  it("exige a sigla de um calendário que existe e uma data válida", () => {
    expect(fichaValue(field("nascimento_mundo"), "5601-01-12 CR", [calendar])).toEqual({ value: "5601-01-12 CR" })
    expect(fichaValue(field("nascimento_mundo"), "5601-01-12", [calendar])).toHaveProperty("error")
    expect(fichaValue(field("nascimento_mundo"), "5601-01-12 XX", [calendar])).toEqual({ error: "Nenhum calendário com a sigla “XX”." })
    expect(fichaValue(field("nascimento_mundo"), "5601-01-40 CR", [calendar])).toHaveProperty("error")
  })

  it("conta só os erros dos campos preenchidos", () => {
    expect(fichaErrors(personagem, { nascimento_mundo: "5601-01-12", ocupacao: "" }, [calendar])).toHaveProperty("nascimento_mundo")
    expect(fichaErrors(personagem, { morte_mundo: "" }, [calendar])).toEqual({})
  })
})

describe("ficha do artigo novo", () => {
  it("grava os campos pelo setProperty sem mexer no corpo", () => {
    const base = newArticleNote(personagem, "Capitã Brites")
    const note = applyFicha(base, personagem, { especie: "Humana", ocupacao: "Capitã: da guarda", afiliacao: ["Ordem do Sal", "Casa Vatu"], nascimento_mundo: "5601-01-12 CR" }, [calendar])
    const data = dataOf(note)
    expect(data.especie).toBe("[[Humana]]")
    expect(data.ocupacao).toBe("Capitã: da guarda")
    expect(data.afiliacao).toEqual(["[[Ordem do Sal]]", "[[Casa Vatu]]"])
    expect(data.nascimento_mundo).toBe("5601-01-12 CR")
    expect(note).toContain('nascimento_mundo: "5601-01-12 CR"')
    expect(note.slice(note.indexOf("# Capitã Brites"))).toBe(base.slice(base.indexOf("# Capitã Brites")))
  })

  it("deixa os campos vazios como o modelo", () => {
    const base = newArticleNote(personagem, "Yara")
    expect(applyFicha(base, personagem, { ocupacao: "  ", afiliacao: [] })).toBe(base)
  })

  it("recusa a ficha com data errada, dizendo o campo", () => {
    expect(() => applyFicha(newArticleNote(personagem, "Yara"), personagem, { nascimento_mundo: "5601-01-12" }, [calendar])).toThrow(/^Nascimento:/)
  })

  it("põe o texto pronto logo abaixo do título", () => {
    const note = withArticleBody(newArticleNote(personagem, "Alda"), "Barqueira humana; quer pagar a dívida do irmão.")
    expect(note).toContain("# Alda\n\nBarqueira humana; quer pagar a dívida do irmão.\n\n%% O que essa pessoa quer mais do que tudo? %%")
    expect(withArticleBody("# Só título", "Texto")).toBe("# Só título\n\nTexto\n")
  })
})
