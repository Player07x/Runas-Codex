import { contrastRatio } from "./appearance"
import { DARK_SURFACES, EMBLEMS, LIGHT_SURFACES, ON_TONE, TONES, parseEmblem, parseTone, readableVariant, withToneClass } from "./tones"

const worst = (hex: string, surfaces: string[]) => Math.min(...surfaces.map((s) => contrastRatio(hex, s)))

describe("tons de campanhas e categorias", () => {
  it("os 12 tons passam de 4,5:1 sobre todas as superfícies, nos temas escuro e claro", () => {
    expect(TONES).toHaveLength(12)
    for (const tone of TONES) {
      expect(worst(tone.dark, DARK_SURFACES), `${tone.label} escuro`).toBeGreaterThanOrEqual(4.5)
      expect(worst(tone.light, LIGHT_SURFACES), `${tone.label} claro`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("o texto do botão passa de 4,5:1 sobre cada tom", () => {
    for (const tone of TONES) {
      expect(contrastRatio(ON_TONE.dark, tone.dark), tone.label).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(ON_TONE.light, tone.light), tone.label).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("os tons são distintos entre si", () => {
    expect(new Set(TONES.map((t) => t.dark)).size).toBe(12)
    expect(new Set(TONES.map((t) => t.light)).size).toBe(12)
  })

  it("lê o nome com ou sem acento, os nomes antigos e o hexadecimal", () => {
    expect(parseTone("Âmbar")?.id).toBe("ambar")
    expect(parseTone("mare")?.label).toBe("Maré")
    expect(parseTone("red")?.id).toBe("sangue")
    expect(parseTone("violet")?.id).toBe("ametista")
    expect(parseTone("nada")).toBeNull()
    expect(parseTone(42)).toBeNull()
  })

  it("ajusta uma cor livre que não seria legível e avisa", () => {
    const amarelo = parseTone("#ffff00")!
    expect(amarelo.adjusted).toBe(true)
    expect(amarelo.dark).toBe("#ffff00")
    expect(worst(amarelo.light, LIGHT_SURFACES)).toBeGreaterThanOrEqual(4.5)
    expect(parseTone("#abc")!.id).toBe("#aabbcc")
    expect(readableVariant("#000000", "dark")).not.toBe("#000000")
  })

  it("troca só a classe do tom no cssclasses e mantém as outras", () => {
    expect(withToneClass(["wide", "runas-cor-brasa"], parseTone("jade"))).toEqual(["wide", "runas-cor-jade"])
    expect(withToneClass("wide", null)).toEqual(["wide"])
    expect(withToneClass(undefined, parseTone("#123456"))).toEqual([])
  })
})

describe("ícones de campanhas e categorias", () => {
  it("aceita o nome em português, com ou sem acento, e o do Lucide", () => {
    expect(parseEmblem("Bússola")).toBe("bussola")
    expect(parseEmblem("map-pin")).toBe("local")
    expect(parseEmblem("dragão")).toBeNull()
    expect(new Set(EMBLEMS.map(([id]) => id)).size).toBe(EMBLEMS.length)
  })
})

describe("snippet do Obsidian", () => {
  it("tem as classes dos 12 tons com os mesmos valores do app", async () => {
    const { readFileSync } = await import("node:fs")
    const css = readFileSync(new URL("../markdown/runas-codex.css", import.meta.url), "utf8")
    for (const tone of TONES) {
      expect(css).toContain(`.theme-dark .runas-cor-${tone.id} { --runas-tom: ${tone.dark}; }`)
      expect(css).toContain(`.theme-light .runas-cor-${tone.id} { --runas-tom: ${tone.light}; }`)
    }
  })
})
