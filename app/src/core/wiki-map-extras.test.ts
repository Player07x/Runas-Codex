import { describe, expect, it } from "vitest"
import { parse as parseYaml } from "yaml"
import { mapExtrasYaml, parseMapExtras } from "./wiki-map-extras"
import { mapSpecKeys, parseMap, pinForPlayers } from "./wiki"

describe("desenhos do mapa: campos das áreas", () => {
  it("lê e grava opacidade, borda, nota e forma (ida e volta)", () => {
    const extras = parseMapExtras(parseYaml(`desenhos:
  - tipo: zona
    pontos: [{x: 0.1, y: 0.1}, {x: 0.3, y: 0.1}, {x: 0.3, y: 0.3}]
    cor: "#2fa37a"
    texto: Pântano Alto
    camada: Perigos
    opacidade: 0.45
    borda: tracejada
    nota: "[[Pântano Alto]]"
    forma: retangulo
`) as Record<string, unknown>)
    expect(extras.drawings![0]).toMatchObject({ opacity: 0.45, border: "tracejada", note: "Pântano Alto", shape: "retangulo", text: "Pântano Alto" })
    const yaml = mapExtrasYaml(extras)
    expect(yaml.desenhos[0]).toMatchObject({ opacidade: 0.45, borda: "tracejada", nota: "[[Pântano Alto]]", forma: "retangulo" })
    expect(parseMapExtras(yaml)).toEqual(extras)
  })

  it("um mapa antigo não ganha campo novo ao gravar de novo", () => {
    const extras = parseMapExtras({ desenhos: [{ tipo: "rota", pontos: [{ x: 0, y: 0 }, { x: 1, y: 1 }], cor: "#123456", texto: "Estrada", camada: "" }] })
    expect(Object.keys(mapExtrasYaml(extras).desenhos[0]!).sort()).toEqual(["camada", "cor", "pontos", "texto", "tipo"])
  })

  it("ignora borda e forma desconhecidas em vez de quebrar o mapa", () => {
    const extras = parseMapExtras({ desenhos: [{ tipo: "zona", pontos: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], borda: "ondulada", forma: "estrela", opacidade: 3 }] })
    expect(extras.drawings![0]).not.toHaveProperty("border")
    expect(extras.drawings![0]).not.toHaveProperty("shape")
    expect(extras.drawings![0]!.opacity).toBe(1)
  })
})

describe("bloco do mapa: o que gravar", () => {
  const base = parseMap('imagem: "[[bitu.png]]"\ncamadas: [Locais]\npinos:\n  - nota: "[[Porto]]"\n    x: 0.2\n    y: 0.3\n')

  it("regrava só a chave que mudou e tira a lista que ficou vazia", () => {
    expect(mapSpecKeys(base, { ...base, image: "Mapas/bitu-2.png" })).toEqual({ imagem: "[[Mapas/bitu-2.png]]" })
    expect(mapSpecKeys(base, { ...base, pins: [] })).toEqual({ pinos: [] })
    expect(mapSpecKeys(base, { ...base, drawings: [] })).toEqual({ desenhos: undefined })
    expect(mapSpecKeys(base, { ...base, scale: { pixels: 100, distance: 5, unit: "léguas" }, travelPerDay: 8 })).toEqual({ escala: { pixels: 100, distancia: 5, unidade: "léguas" }, viagem: { por_dia: 8 } })
  })

  it("esconde dos jogadores o pino secreto e o que aponta para nota que eles não veem", () => {
    const sees = (target: string) => target === "Porto"
    expect(pinForPlayers({ note: "Porto", x: 0, y: 0 }, sees)).toBe(true)
    expect(pinForPlayers({ note: "Rei", x: 0, y: 0 }, sees)).toBe(false)
    expect(pinForPlayers({ label: "Cofre", x: 0, y: 0, secret: true }, sees)).toBe(false)
    expect(pinForPlayers({ label: "Passagem", x: 0, y: 0, layer: "Segredos" }, sees)).toBe(false)
    expect(pinForPlayers({ label: "Torre", x: 0, y: 0 }, sees)).toBe(true)
  })
})
