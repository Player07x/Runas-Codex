import { FORMATTERS, FORMATTER_GROUPS, searchFormatters, slashItems } from "./formatters"
import { SLASH_COMMANDS } from "./note-tools"

describe("catálogo de formatadores", () => {
  it("guarda o grupo de cada formatador e não perde nenhum", () => {
    expect(FORMATTERS.length).toBe(FORMATTER_GROUPS.reduce((total, group) => total + group.items.length, 0))
    expect(new Set(FORMATTERS.map((f) => f.label)).size).toBe(FORMATTERS.length)
    expect(FORMATTERS.find((f) => f.label === "Quebra de página")?.group).toBe("Livro")
  })
  it("busca sem acento nem caixa, com os que começam pela busca primeiro", () => {
    expect(searchFormatters("italico").map((f) => f.label)).toEqual(["Itálico", "Negrito + itálico"])
    expect(searchFormatters("LIVRO").every((f) => f.group === "Livro")).toBe(true)
    expect(searchFormatters("  ")).toHaveLength(FORMATTERS.length)
  })
})

describe("menu / do editor", () => {
  it("começa pelas ações e traz o catálogo inteiro sem repetir os comandos antigos", () => {
    const all = slashItems("", SLASH_COMMANDS)
    expect(all.slice(0, 2).map((i) => i.label)).toEqual(["Formatar…", "Imagem…"])
    expect(all.filter((i) => i.kind === "insert" && i.detail !== "Tabela Markdown").length).toBeGreaterThanOrEqual(FORMATTERS.length)
    expect(all.filter((i) => i.label === "Link…" || i.label === "Link")).toHaveLength(1)
  })
  it("traz os formatadores do espaço antes do catálogo geral", () => {
    const wiki = [{ label: "Spoiler", syntax: "<details class=\"spoiler\"><summary>Revelar</summary>…</details>", group: "Wiki" }]
    const items = slashItems("spoiler", SLASH_COMMANDS, wiki)
    expect(items[0]).toMatchObject({ label: "Spoiler", detail: "Wiki", block: true })
  })
  it("filtra pelo que se digita depois da barra e marca o que é bloco", () => {
    const tabela = slashItems("tabe", SLASH_COMMANDS)
    expect(tabela[0]?.label).toBe("Tabela")
    expect(tabela.every((i) => /tabe/i.test(i.label + i.detail))).toBe(true)
    const quebra = slashItems("quebra de pagina", SLASH_COMMANDS)[0]
    expect(quebra).toMatchObject({ kind: "insert", label: "Quebra de página", block: true })
    expect(slashItems("negrito", SLASH_COMMANDS)[0]).toMatchObject({ label: "Negrito", block: false })
  })
})
