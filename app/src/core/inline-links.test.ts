import { describe, expect, it } from "vitest"
import { wikiLinkParts } from "./inline-links"

describe("U106: links dentro de texto simples", () => {
  it("separa a origem da recompensa em texto e link", () => {
    const parts = wikiLinkParts("Recompensa de [[A carta selada]]")
    expect(parts[0]).toEqual({ text: "Recompensa de " })
    expect(parts[1]).toMatchObject({ label: "A carta selada", link: { kind: "wiki", target: "A carta selada", raw: "[[A carta selada]]" } })
    expect(parts).toHaveLength(2)
  })

  it("mostra o apelido ou só o nome, sem a pasta", () => {
    expect(wikiLinkParts("[[Campanhas/Valdris/Missões/A carta|a carta]]")[0]).toMatchObject({ label: "a carta", link: { target: "Campanhas/Valdris/Missões/A carta", alias: "a carta" } })
    expect(wikiLinkParts("[[Campanhas/Valdris/A carta]]")[0]).toMatchObject({ label: "A carta" })
    expect(wikiLinkParts("[[Nota#Título]]")[0]).toMatchObject({ label: "Nota", link: { target: "Nota", subpath: "#Título" } })
  })

  it("deixa texto sem link e embeds como estão", () => {
    expect(wikiLinkParts("Espada longa\nfica com a Lia")).toEqual([{ text: "Espada longa\nfica com a Lia" }])
    expect(wikiLinkParts("Mapa ![[mapa.png]]")).toEqual([{ text: "Mapa ![[mapa.png]]" }])
    expect(wikiLinkParts("")).toEqual([])
  })

  it("aceita vários links e texto depois do último", () => {
    const parts = wikiLinkParts("De [[A]] e [[B]].")
    expect(parts.map((part) => ("text" in part ? part.text : `<${part.label}>`)).join("")).toBe("De <A> e <B>.")
  })
})
