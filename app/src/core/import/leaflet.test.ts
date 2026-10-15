import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseMap } from "../wiki"
import { convertLeaflet, leafletSavedMaps, readLeafletBlock, splitCsv, type LeafletContext } from "./leaflet"

const fixtures = join(__dirname, "fixtures/cofre")
const saved = leafletSavedMaps(readFileSync(join(fixtures, ".obsidian/plugins/obsidian-leaflet-plugin/data.json"), "utf8"))
const block = (note: string) => /```leaflet\n([\s\S]*?)\n```/.exec(readFileSync(join(fixtures, note), "utf8"))![1]!

const ctx = (over: Partial<LeafletContext> = {}): LeafletContext => ({
  resolve: (target) => (target.endsWith(".png") || target.endsWith(".jpg") ? `Anexos/${target}` : `${target}.md`),
  imageSize: (path) => (path.endsWith("valdris.png") ? { width: 2048, height: 1024 } : path.endsWith("masmorra.jpg") ? { width: 1600, height: 800 } : null),
  located: [],
  ...over,
})

describe("Leaflet → runas-mapa", () => {
  it("lê o bloco como o plugin: várias linhas marker:, links e números", () => {
    const params = readLeafletBlock(block("Mapas/Mapa de Valdris.md"))
    expect(params.id).toBe("mapa-valdris")
    expect(params.images).toEqual(["[[valdris.png]]"])
    expect(params.markers).toEqual(["castle, -0.5, 1, [[Cidade Alta]], Capital do condado", "default, -1.5, 3, , Ruínas sem nome"])
    expect(params.markerFolders).toEqual(["Locais"])
    expect([params.maxZoom, params.scale, params.unit]).toEqual([10, 2, "km"])
  })

  it("divide o CSV do marcador sem quebrar links nem aspas", () => {
    expect(splitCsv('castle, 10, 20, [[Nota|Apelido, com vírgula]], "Descrição, longa"')).toEqual(["castle", "10", "20", "[[Nota|Apelido, com vírgula]]", "Descrição, longa"])
  })

  it("converte as coordenadas do mapa de imagem (sem bounds) pelo tamanho da imagem", () => {
    const located = [{ path: "Locais/Cidade de Brasa.md", linkText: "Cidade de Brasa", tags: ["local"], data: { location: [-0.25, 3.5], mapmarker: "tavern" } }]
    const result = convertLeaflet(block("Mapas/Mapa de Valdris.md"), ctx({ saved: saved.find((m) => m.id === "mapa-valdris"), located }))
    const map = parseMap(result.yaml!)
    expect(map.image).toBe("valdris.png")
    expect(map.pins).toEqual([
      { note: "Cidade Alta", label: "Capital do condado", x: 0.25, y: 0.25, layer: "castle" },
      { label: "Ruínas sem nome", x: 0.75, y: 0.75 },
      { note: "Portão do Lago", x: 0.5, y: 0.5 },
      { label: "Covil dos lobos", x: 0.125, y: 0.875, layer: "dungeon" },
      { note: "Cidade de Brasa", x: 0.875, y: 0.125, layer: "tavern" },
    ])
    expect(map.layers).toEqual(["castle", "dungeon", "tavern"])
    // 2 unidades de coordenada = 2 × 512 px no zoom máximo 10 (o plugin usa o zoom 9 para a imagem).
    expect(map.scale).toEqual({ pixels: 512, distance: 2, unit: "km" })
    const warnings = result.warnings.join("\n")
    expect(warnings).toContain("marcador de comando")
    expect(warnings).toContain("1 círculo(s)")
    expect(warnings).toContain("1 nota(s) com “location” viraram pinos")
  })

  it("com bounds, as coordenadas valem dentro deles", () => {
    const result = convertLeaflet(block("Mapas/Masmorra.md"), ctx())
    expect(parseMap(result.yaml!).pins).toEqual([{ note: "Sala do Trono", x: 0.25, y: 0.75 }])
  })

  it("não converte mapa do mundo real nem imagem da internet", () => {
    expect(convertLeaflet(block("Mapas/Mundo real.md"), ctx()).yaml).toBeNull()
    const web = convertLeaflet("image: https://exemplo.com/mapa.png\nmarker: default, -1, 1, [[A]]", ctx())
    expect(web.yaml).toBeNull()
    expect(web.warnings[0]).toContain("internet")
  })

  it("sem o tamanho da imagem, o bloco fica como está (as coordenadas dependem dele)", () => {
    const result = convertLeaflet("image: [[mapa.svg]]\nmarker: default, -1, 1, [[A]]", ctx())
    expect(result.yaml).toBeNull()
    expect(result.warnings.join(" ")).toContain("tamanho da imagem")
  })

  it("mapa sem marcadores vira um mapa vazio", () => {
    const result = convertLeaflet("id: vazio\nimage: [[mapa.svg]]", ctx())
    expect(result.yaml).toBe('imagem: "[[mapa.svg]]"\ncamadas: []\npinos: []')
  })
})
