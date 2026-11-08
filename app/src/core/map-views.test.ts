import { describe, expect, it } from "vitest"
import { mapViews, type PinTarget } from "./map-views"
import type { MapSpec } from "./wiki"

const target = (path: string, tipo = "local"): PinTarget => ({ path, route: `/wiki/artigo/${encodeURIComponent(path)}`, nested: false, tipo })

describe("mapViews", () => {
  const spec: MapSpec = {
    image: "mapa.png",
    layers: ["Locais", "Segredos"],
    pins: [
      { note: "Porto", x: 0.1, y: 0.2, layer: "Locais" },
      { note: "Segredo", x: 0.2, y: 0.3, secret: true },
      { note: "Pista", x: 0.3, y: 0.4, layer: "Segredos" },
      { label: "Ponte", x: 0.4, y: 0.5, layer: "Locais" },
    ],
    drawings: [
      { kind: "zona", points: [{ x: 0, y: 0 }, { x: 0.2, y: 0 }, { x: 0.2, y: 0.2 }], color: "#76558f", text: "Agora", layer: "Locais", from: 0, to: 10 },
      { kind: "rota", points: [{ x: 0, y: 0 }, { x: 0.2, y: 0.2 }], color: "#76558f", text: "Fora de era", layer: "Locais", from: 20 },
      { kind: "zona", points: [{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.3 }, { x: 0.4, y: 0.4 }], color: "#76558f", text: "Secreta", layer: "Segredos", secret: true },
    ],
    images: [{ name: "Antes", image: "antes.png", opacity: 0.5, from: -10, to: 0 }],
  }

  const resolve = (value: string) => value === "Porto" ? target("Wikis/Mundo/Porto.md") : value === "Pista" ? target("Wikis/Mundo/Pista.md") : null
  const imageUrl = (value: string) => value === "antes.png" ? "/antes.png" : undefined

  it("esconde segredo, camada de segredos e nota que os jogadores não veem", () => {
    const views = mapViews(spec, { resolve, players: true, hidden: new Set(), year: 0, imageUrl })
    expect(views.pins.map((pin) => pin.title)).toEqual(["Porto", "Ponte"])
    expect(views.pinRows.map((pin) => pin.title)).toEqual(["Porto", "Ponte"])
  })

  it("esconde uma camada só do mapa, sem tirá-la da lista do painel", () => {
    const views = mapViews(spec, { resolve, players: false, hidden: new Set(["Locais"]), year: 0, imageUrl })
    expect(views.pins.map((pin) => pin.title)).toEqual(["Segredo", "Pista"])
    expect(views.pinRows.find((pin) => pin.title === "Porto")?.meta).toContain("camada escondida")
    expect(views.layers.find((layer) => layer.name === "Locais")).toMatchObject({ hidden: true, count: 4 })
  })

  it("filtra eras e conta as camadas", () => {
    const views = mapViews(spec, { resolve, players: false, hidden: new Set(), year: 0, imageUrl })
    expect(views.drawings.map((drawing) => drawing.drawing.text)).toEqual(["Agora", "Secreta"])
    expect(views.imageLayers.map((layer) => layer.name)).toEqual(["Antes"])
    expect(views.layers.find((layer) => layer.name === "Locais")?.count).toBe(4)
    expect(views.layers.find((layer) => layer.name === "Segredos")?.count).toBe(2)
  })
})
