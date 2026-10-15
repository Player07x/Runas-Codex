import { changeEmbed, findEmbeds, formatEmbedAlias, parseEmbedOptions, rewriteEmbed } from "./embeds"

describe("parseEmbedOptions", () => {
  it("lê como o Obsidian: o último trecho é o tamanho e o resto é o texto alternativo", () => {
    expect(parseEmbedOptions(undefined)).toEqual({})
    expect(parseEmbedOptions("300")).toEqual({ width: 300 })
    expect(parseEmbedOptions("300x200")).toEqual({ width: 300, height: 200 })
    expect(parseEmbedOptions("direita|300")).toEqual({ position: "direita", width: 300 })
    expect(parseEmbedOptions("Centro")).toEqual({ position: "centro" })
    expect(parseEmbedOptions("Mapa do reino|300")).toEqual({ caption: "Mapa do reino", width: 300 })
    expect(parseEmbedOptions("Mapa do reino")).toEqual({ caption: "Mapa do reino" })
  })

  it("com a ordem trocada o tamanho se perde, como no Obsidian; em tabela o separador vem escapado", () => {
    expect(parseEmbedOptions("300|direita")).toEqual({ caption: "300|direita" })
    expect(parseEmbedOptions("direita\\|300")).toEqual({ position: "direita", width: 300 })
  })
})

describe("formatEmbedAlias", () => {
  it("põe a posição (ou o texto alternativo) antes do tamanho", () => {
    expect(formatEmbedAlias({ position: "direita", width: 300 })).toBe("direita|300")
    expect(formatEmbedAlias({ caption: "Mapa", width: 300, height: 200 })).toBe("Mapa|300x200")
    expect(formatEmbedAlias({ position: "largo", caption: "Mapa" })).toBe("largo")
    expect(formatEmbedAlias({})).toBeUndefined()
    expect(formatEmbedAlias({ position: "esquerda", width: 120 }, "\\|")).toBe("esquerda\\|120")
  })
})

describe("findEmbeds e rewriteEmbed", () => {
  const text = "Antes ![[Anexos/mapa.png|300]] e ![Mapa|200](Imagem%20colada%201.png)\n| ![[foto.png\\|direita\\|100]] |"

  it("acha os dois formatos com posição, alvo e apelido", () => {
    const embeds = findEmbeds(text)
    expect(embeds.map((e) => [e.kind, e.target, e.alias])).toEqual([
      ["wiki", "Anexos/mapa.png", "300"],
      ["markdown", "Imagem colada 1.png", "Mapa|200"],
      ["wiki", "foto.png", "direita\\|100"],
    ])
    expect(text.slice(embeds[0]!.from, embeds[0]!.to)).toBe("![[Anexos/mapa.png|300]]")
  })

  it("regrava só o apelido, no mesmo formato e com o mesmo separador", () => {
    const [wiki, markdown, table] = findEmbeds(text)
    expect(rewriteEmbed(wiki!, { position: "direita", width: 300 })).toBe("![[Anexos/mapa.png|direita|300]]")
    expect(rewriteEmbed(wiki!, {})).toBe("![[Anexos/mapa.png]]")
    expect(rewriteEmbed(markdown!, { position: "centro", width: 250 })).toBe("![centro|250](Imagem%20colada%201.png)")
    expect(rewriteEmbed(table!, { position: "esquerda", width: 100 })).toBe("![[foto.png\\|esquerda\\|100]]")
  })
})

describe("changeEmbed", () => {
  it("troca o embed certo e recusa quando ele não está mais no texto", () => {
    const text = "![[a.png|100]]\n![[b.png|100]]"
    expect(changeEmbed(text, "b.png", "100", { width: 240 })).toEqual({ from: 15, to: 29, insert: "![[b.png|240]]" })
    expect(changeEmbed(text, "c.png", undefined, { width: 240 })).toBeNull()
    expect(changeEmbed("![[a.png]]", "a.png", "velho", { position: "centro" })).toEqual({ from: 0, to: 10, insert: "![[a.png|centro]]" })
    // Um embed de nota não é trocado por engano por uma imagem de dentro dela.
    expect(changeEmbed("![[Outra nota]]", "a.png", undefined, { width: 100 })).toBeNull()
  })
})
