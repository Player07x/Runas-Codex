import { describe, expect, it } from "vitest"
import { fichaEnd, fichaKind, splitFicha, titleCase, toFicha } from "./fichas"

describe("fichas de RPG (L5)", () => {
  it("reconhece os tipos de ficha, com e sem acento", () => {
    expect(fichaKind("magia")).toBe("magia")
    expect(fichaKind("Raça")).toBe("raca")
    expect(fichaKind("statblock")).toBe("statblock")
    expect(fichaKind("nota")).toBeNull()
  })
  it("rótulos óbvios viram etiquetas, os outros ficam e campo vazio some", () => {
    const out = splitFicha("magia", [{ label: "Custo:", value: "1 PV ·" }, { label: "Tipo", value: "Feitiço" }, { label: "Alcance", value: "Área" }, { label: "Requisito", value: "Cura Mental" }, { label: "Material", value: " " }])
    expect(out).toEqual({ tags: ["1 PV", "Feitiço", "Área"], stats: [], fields: [{ label: "Requisito", value: "Cura Mental" }] })
  })
  it("a criatura separa os atributos numéricos", () => {
    const out = splitFicha("criatura", [{ label: "Tipo", value: "Lobo · Animal" }, { label: "Físico", value: "8" }, { label: "PV", value: "12" }, { label: "Desl.", value: "8 m" }, { label: "Ataque", value: "Mordida forte com 2D+2 perfurante" }])
    expect(out.tags).toEqual(["Lobo · Animal"])
    expect(out.stats.map((s) => s.label)).toEqual(["Físico", "PV", "Desl"])
    expect(out.fields).toEqual([{ label: "Ataque", value: "Mordida forte com 2D+2 perfurante" }])
  })
  it("nome em caixa alta vira título", () => {
    expect(titleCase("BAFO DE FOGO")).toBe("Bafo de Fogo")
    expect(titleCase("Curar Insanidade Menor")).toBe("Curar Insanidade Menor")
  })
  it("converte a magia do formato antigo em ficha", () => {
    const text = "**BAFO DE FOGO**\\\n1 PV · Feitiço · Área\n\nA partir de sua boca, crie um cone.\n\n**Ampliação.** +1 PV: +2 metros."
    expect(toFicha(text)).toBe("> [!magia] Bafo de Fogo\n> **Custo:** 1 PV · **Tipo:** Feitiço · **Alcance:** Área\n>\n> A partir de sua boca, crie um cone.\n>\n> **Ampliação.** +1 PV: +2 metros.")
  })
  it("runa pelo custo em pontos e título por ###", () => {
    expect(toFicha("### Runa do Cavalo\n5 pontos · Runas do Tempo\n\nSeu deslocamento muda.")).toBe("> [!runa] Runa do Cavalo\n> **Custo:** 5 pontos · **Tipo:** Runas do Tempo\n>\n> Seu deslocamento muda.")
  })
  it("recusa o que não está no formato", () => {
    expect(toFicha("Texto corrido sem nome em negrito.")).toBeNull()
    expect(toFicha("> [!magia] Já é ficha")).toBeNull()
  })
})

describe("fichas do Valknut (correções de 26/10)", () => {
  it("o rótulo repetido no valor não sai no livro", () => {
    expect(splitFicha("magia", [{ label: "Custo", value: "Custo: 1 PV · " }, { label: "Tipo", value: "Feitiço" }]).tags).toEqual(["1 PV", "Feitiço"])
  })
  it("a linha do custo com rótulo e os campos das linhas seguintes", () => {
    const text = "**CURA EM MASSA**\\\nCusto: 8 PV · Ritual\nMaterial: \\\nRequisito: Curar Feridas\n\nPara realizar o ritual…"
    expect(toFicha(text)).toBe("> [!magia] Cura em Massa\n> **Custo:** 8 PV · **Tipo:** Ritual\n> **Requisito:** Curar Feridas\n>\n> Para realizar o ritual…")
  })
  it("a imagem logo depois do texto entra na ficha", () => {
    const text = "**CURA MENTAL**\\\nCusto: 1 PV · Feitiço\n\nRemove 1 nível de Insanidade.\n\n**Truque**: Concede prevenção.\n\n![[Anexos/Imagens/Cura.png]]\n\n**CURAR FERIDAS**\\"
    const to = text.indexOf("prevenção.") + "prevenção.".length
    const end = fichaEnd(text, to)
    expect(text.slice(0, end).endsWith("![[Anexos/Imagens/Cura.png]]")).toBe(true)
    expect(toFicha(text.slice(0, end))).toBe("> [!magia] Cura Mental\n> **Custo:** 1 PV · **Tipo:** Feitiço\n>\n> Remove 1 nível de Insanidade.\n>\n> **Truque**: Concede prevenção.\n>\n> ![[Anexos/Imagens/Cura.png]]")
  })
  it("sem imagem logo depois, a ficha termina na seleção", () => {
    const text = "**A**\\\n1 PV\n\nTexto.\n\nOutro parágrafo."
    expect(fichaEnd(text, text.indexOf("Texto.") + 6)).toBe(text.indexOf("Texto.") + 6)
    expect(fichaEnd("x\n![alt](arte.webp)\n", 1)).toBe(19)
  })
})
