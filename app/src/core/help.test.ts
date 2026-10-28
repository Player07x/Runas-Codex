import { describe, expect, it } from "vitest"
import { FORMATTERS } from "./formatters"
import { FORMATTER_HELP } from "../data/ajuda/formatadores"
import { HELP_GROUPS, HELP_TOPICS, helpHeadings, plainText, searchHelp } from "./help"

describe("documentação da Ajuda", () => {
  it("mantém um tópico único para cada recurso documentado", () => {
    expect(HELP_TOPICS).toHaveLength(22)
    expect(new Set(HELP_TOPICS.map((topic) => topic.id)).size).toBe(HELP_TOPICS.length)
    expect(new Set(HELP_TOPICS.map((topic) => topic.group))).toEqual(new Set(HELP_GROUPS))
  })

  it("tem uma explicação para cada formatador do catálogo", () => {
    expect(FORMATTERS.length).toBeGreaterThan(0)
    expect(FORMATTERS.every((formatter) => FORMATTER_HELP[formatter.label]?.texto.length)).toBe(true)
  })

  it("extrai títulos fora de blocos de código e busca sem acento", () => {
    const markdown = "# Título\n### Fichas\n```ts\n### não é título\n```\n### Próximo"
    expect(helpHeadings(markdown)).toEqual(["Fichas", "Próximo"])
    expect(plainText("**Ação** [[Nota|apelido]] `código`")).toBe("Ação apelido código")
    const hits = searchHelp("fichas", { fichas: "### Fichas e caixas\nCallouts e fichas.", notas: "Árvore de notas" })
    expect(hits[0]?.topic.id).toBe("fichas")
  })
})
