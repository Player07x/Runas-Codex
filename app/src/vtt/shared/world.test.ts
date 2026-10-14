import { WORLD_FORMAT_VERSION, createWorldManifest, parseWorldManifest, worldFolderName } from "./world"

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
})
