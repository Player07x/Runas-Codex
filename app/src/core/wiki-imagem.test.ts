import { describe, expect, it } from "vitest"
import { ARTICLE_KINDS, articleImage, customKindOf } from "./wiki"
import { VaultIndex } from "./vault-index"

describe("imagem em todas as categorias da wiki", () => {
  it("todo tipo pronto tem um campo de imagem na ficha (o mapa usa a imagem do bloco)", () => {
    const semImagem = ARTICLE_KINDS.filter((kind) => kind.id !== "calendario" && kind.id !== "mapa" && !kind.fields.some((field) => field.kind === "imagem"))
    expect(semImagem.map((kind) => kind.id)).toEqual([])
  })

  it("a categoria criada pelo usuário ganha a imagem no começo da ficha", () => {
    const kind = customKindOf("Wikis/Mundo/Navios", { artigo: "Navio", campos: ["Capitão (link)", "Tripulação (número)"] })
    expect(kind?.fields.map((field) => `${field.key}:${field.kind}`)).toEqual(["imagem:imagem", "capitao:link", "tripulacao:numero"])
  })

  it("não repete a imagem quando a categoria já tem um campo de imagem", () => {
    const kind = customKindOf("Wikis/Mundo/Navios", { artigo: "Navio", campos: ["Brasão (imagem)", "Capitão (link)"] })
    expect(kind?.fields.filter((field) => field.kind === "imagem").map((field) => field.key)).toEqual(["brasao"])
  })

  it("a imagem de um acontecimento vira a arte do artigo", () => {
    const path = "Wikis/Mundo/Acontecimentos/Queda.md"
    const text = '---\ntipo: evento\nimagem: "[[queda.png]]"\n---\n# Queda\n'
    const index = new VaultIndex([{ path, size: text.length, mtime: 1 }], { [path]: text })
    expect(articleImage(index.note(path)!)).toBe("queda.png")
  })
})
