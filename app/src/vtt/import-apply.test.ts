import { describe, expect, it } from "vitest"
import { childInputs, namedAfterFile, sceneInputs, summarizeImport } from "./import-apply"
import { importBatchTokens, importFoundryScene, importUniversalVtt } from "./shared/importers"

const counter = () => { let n = 0; return () => `novo-${++n}` }

describe("aplicar uma importação na mesa", () => {
  const uvtt = { name: "Masmorra", resolution: { map_size: [800, 600], pixels_per_grid: 100 }, image: "data:image/png;base64,aGk=", line_of_sight: [[0, 0, 100, 0], [100, 0, 100, 100]], portals: [{ bounds: [100, 0, 200, 0], closed: true }] }

  it("resume a cena antes de importar", () => {
    expect(summarizeImport(importUniversalVtt(uvtt))).toMatchObject({ name: "Masmorra", width: 800, height: 600, cell: 100, walls: 2, doors: 1, tokens: 0, lights: 0, map: true })
  })

  it("dá ids novos à cena e aos documentos e troca o mapa pelo caminho gravado", () => {
    const imported = importUniversalVtt(uvtt)
    const inputs = sceneInputs(imported, "cena-nova", counter(), new Map([[imported.assets[0]!.path, "maps/gravado.png"]]))
    expect(inputs[0]).toMatchObject({ id: "cena-nova", type: "scene", parentId: null, data: { background: "maps/gravado.png" } })
    expect(inputs.slice(1).map((input) => [input.id, input.parentId])).toEqual([["novo-1", "cena-nova"], ["novo-2", "cena-nova"], ["novo-3", "cena-nova"]])
  })

  it("duas importações do mesmo arquivo não repetem ids", () => {
    const next = counter()
    const first = sceneInputs(importUniversalVtt(uvtt), "a", next).map((input) => input.id)
    const second = sceneInputs(importUniversalVtt(uvtt), "b", next).map((input) => input.id)
    expect(first.filter((id) => second.includes(id))).toEqual([])
  })

  it("tira o mapa que não foi gravado e mantém a cena do Foundry sem mapa", () => {
    const imported = importUniversalVtt(uvtt)
    expect(sceneInputs(imported, "c", counter())[0]!.data).toMatchObject({ background: null })
    const foundry = importFoundryScene({ name: "Sala", background: { src: "mapas/sala.webp" }, tokens: [{ name: "Lia" }] })
    expect(summarizeImport(foundry)).toMatchObject({ tokens: 1, map: false })
    expect(summarizeImport(foundry).warnings[0]).toContain("mapas/sala.webp")
  })

  it("põe os tokens em lote depois dos que a cena já tem", () => {
    const inputs = childInputs(importBatchTokens([{ name: "A" }, { name: "B" }], "x"), "cena", counter(), 5)
    expect(inputs.map((input) => [input.parentId, input.sort, input.type])).toEqual([["cena", 5, "token"], ["cena", 6, "token"]])
  })

  it("dá à cena sem nome o nome do arquivo", () => {
    const unnamed = importUniversalVtt({ resolution: { map_size: { x: 4, y: 3 }, pixels_per_grid: 50 } })
    expect(namedAfterFile(unnamed, "cripta_do-lobo.dd2vtt").scene.data.name).toBe("cripta do lobo")
    expect(namedAfterFile(importUniversalVtt(uvtt), "outro.dd2vtt").scene.data.name).toBe("Masmorra")
  })
})

