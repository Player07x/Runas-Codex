import { createMemoryPlatform } from "./memory-platform"

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])

describe("plataforma em memória: anexos", () => {
  it("grava, lê, mostra por blob: e segue as regras do texto", async () => {
    const platform = createMemoryPlatform()
    const created = await platform.writeBinary("Anexos/mapa.png", png, null)
    expect(created).toMatchObject({ path: "Anexos/mapa.png", size: png.length })
    expect(await platform.readBinary("Anexos/mapa.png")).toEqual(png)
    expect(platform.fileUrl("Anexos/mapa.png")).toMatch(/^blob:/)
    expect((await platform.listVault("Anexos/")).map((e) => e.path)).toEqual(["Anexos/mapa.png"])
    await expect(platform.writeBinary("Anexos/mapa.png", png, null)).rejects.toThrow("Já existe")
    await expect(platform.writeBinary("Anexos/mapa.png", png, { ...created, size: 1 })).rejects.toThrow("mudou fora do app")
    await expect(platform.writeBinary(".obsidian/x.png", png, null)).rejects.toThrow("ocultos")
    expect(await platform.writeBinary("Anexos/mapa.png", png.slice(), created)).toEqual(created)
  })

  it("renomear leva os bytes junto; somente leitura recusa", async () => {
    const platform = createMemoryPlatform()
    await platform.writeBinary("capa.png", png, null)
    await platform.rename("capa.png", "Livros/capa.png")
    expect(await platform.readBinary("Livros/capa.png")).toEqual(png)
    await platform.setWritable(false)
    await expect(platform.writeBinary("outra.png", png, null)).rejects.toThrow("somente leitura")
  })
})
