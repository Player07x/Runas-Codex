import { WORLD_FORMAT_VERSION, createWorldManifest, parseWorldManifest, renameWorldManifest, setWorldCoverManifest, worldFolderName } from "./world"

describe("formato da mesa", () => {
  it("cria um manifesto normalizado", () => {
    const manifest = createWorldManifest({ title: "  Crônicas   de Ordem  " }, "abc", 100)
    expect(manifest).toEqual({ formatVersion: WORLD_FORMAT_VERSION, id: "abc", title: "Crônicas de Ordem", description: "", createdAt: 100, updatedAt: 100 })
  })

  it("recusa mesa sem nome", () => {
    expect(() => createWorldManifest({ title: "   " }, "abc", 1)).toThrow()
  })

  it("gera nome de pasta seguro e único", () => {
    expect(worldFolderName("Crônicas: Ordem/Caos?", "0123456789ab")).toBe("cronicas-ordem-caos-01234567")
    expect(worldFolderName("???", "0123456789ab")).toBe("mesa-01234567")
  })

  it("recusa manifesto de versão futura em vez de arriscar corromper a mesa", () => {
    expect(() => parseWorldManifest({ formatVersion: WORLD_FORMAT_VERSION + 1, id: "x", title: "X" })).toThrow(/Atualize o Runas-Codex/)
  })

  it("completa campos ausentes de um manifesto válido", () => {
    const manifest = parseWorldManifest({ formatVersion: 1, id: "x", title: "", createdAt: 5 })
    expect(manifest.title).toBe("Mesa sem nome")
    expect(manifest.updatedAt).toBe(5)
  })

  it("preserva e troca a capa da mesa", () => {
    const manifest = createWorldManifest({ title: "Teste" }, "id-1", 1)
    expect(parseWorldManifest({ ...manifest, cover: "capas/mesa.png" }).cover).toBe("capas/mesa.png")
    expect(setWorldCoverManifest(manifest, "  capas/nova.png  ", 5)).toMatchObject({ cover: "capas/nova.png", updatedAt: 5 })
    expect(setWorldCoverManifest({ ...manifest, cover: "antiga.png" }, undefined, 6)).not.toHaveProperty("cover")
  })
})

describe("renameWorldManifest", () => {
  it("troca o nome e a data, sem mexer no id", () => {
    const manifest = createWorldManifest({ title: "Teste" }, "id-1", 1)
    expect(renameWorldManifest(manifest, "  Nova  ", 5)).toMatchObject({ id: "id-1", title: "Nova", createdAt: 1, updatedAt: 5 })
    expect(() => renameWorldManifest(manifest, " ", 5)).toThrow("precisa de um nome")
  })
})
