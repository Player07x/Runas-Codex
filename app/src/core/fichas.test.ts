import { describe, expect, it } from "vitest"
import { fichaKind, splitFicha, titleCase, toFicha } from "./fichas"

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
