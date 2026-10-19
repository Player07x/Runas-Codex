import { describe, expect, it } from "vitest"
import { strToU8, unzipSync, zipSync } from "fflate"
import { createTransferArchive, managedWorldPath, PACKAGE_MANIFEST, readTransferArchive, transferPath, TRANSFER_LIMITS } from "./archive"

const text = (path: string, body = "# Olá\r\n") => ({ path, bytes: strToU8(body) })
describe("pacotes e ZIP Markdown", () => {
  it("leva árvore, BOM, CRLF, bytes e manifesto sem mudar o conteúdo", async () => {
    const files = [text("Notas/Olá.md", "\ufeff# Olá\r\n"), { path: "Anexos/mapa.png", bytes: new Uint8Array([0, 255, 1]) }]
    const bytes = await createTransferArchive("Meu cofre", files)
    const result = await readTransferArchive(bytes)
    expect(result).toMatchObject({ title: "Meu cofre", kind: "runas", ignored: [] })
    expect(result.files).toEqual(files)
    expect(JSON.parse(new TextDecoder().decode(unzipSync(bytes)[PACKAGE_MANIFEST]))).toMatchObject({ format: "runas-codex", version: 1 })
  })
  it("exporta ZIP sem manifesto e mantém notas comuns para o Obsidian", async () => {
    const files = [text("Wikis/Valdris/Lugares/Porto.md")]
    const bytes = await createTransferArchive("Wiki", files, "markdown")
    expect(Object.keys(unzipSync(bytes))).toEqual([files[0]!.path])
    expect((await readTransferArchive(bytes)).files).toEqual(files)
  })
  it("recusa payload adulterado mesmo se o ZIP foi recomposto corretamente", async () => {
    const zip = unzipSync(await createTransferArchive("Cofre", [text("Notas/a.md", "original")]))
    zip["cofre/Notas/a.md"] = strToU8("alterado")
    await expect(readTransferArchive(zipSync(zip))).rejects.toThrow("integridade")
  })
  it("recusa arquivos extras e formato futuro", async () => {
    const zip = unzipSync(await createTransferArchive("Cofre", [text("a.md")]))
    zip["fora.md"] = strToU8("x")
    await expect(readTransferArchive(zipSync(zip))).rejects.toThrow("fora do manifesto")
    delete zip["fora.md"]
    const manifest = JSON.parse(new TextDecoder().decode(zip[PACKAGE_MANIFEST])) as { version: number }
    manifest.version = 2
    zip[PACKAGE_MANIFEST] = strToU8(JSON.stringify(manifest))
    await expect(readTransferArchive(zipSync(zip))).rejects.toThrow("não suportada")
  })
  it.each(["../fora.md", "/fora.md", "C:/fora.md", "Notas/../fora.md", "Notas\\a.md", "Notas//a.md", "Notas/a\0.md"])("recusa o caminho perigoso %s", async path => {
    expect(() => transferPath(path)).toThrow()
    await expect(readTransferArchive(zipSync({ [path]: strToU8("x") }))).rejects.toThrow()
  })
  it("ignora configurações e lixo do sistema sem importar suas preferências", async () => {
    const result = await readTransferArchive(zipSync({ "Notas/a.md": strToU8("a"), ".obsidian/app.json": strToU8("{}"), "__MACOSX/extra": strToU8("x") }))
    expect(result.files.map(file => file.path)).toEqual(["Notas/a.md"])
    expect(result.ignored).toHaveLength(2)
  })
  it("recusa nomes equivalentes, arquivo usado como pasta e pastas que só mudam de caixa", async () => {
    await expect(createTransferArchive("x", [text("Notas/a.md"), text("Notas/A.md")])).rejects.toThrow("repete")
    await expect(createTransferArchive("x", [text("Notas"), text("Notas/a.md")])).rejects.toThrow("pasta")
    await expect(createTransferArchive("x", [text("Notas/a.md"), text("notas/b.md")])).rejects.toThrow("Pastas")
  })
  it("transporta apenas o namespace de mesas autorizado entre os arquivos ocultos", async () => {
    expect(managedWorldPath(".runas/mesas/porto-123/mesa.json")).toBe("porto-123/mesa.json")
    expect(managedWorldPath(".runas/mesas/porto-123/assets/maps/a.png")).toBeTruthy()
    expect(managedWorldPath(".runas/mesas/../perfil.json")).toBeNull()
    expect(managedWorldPath(".runas/senhas.json")).toBeNull()
    const files = [text(".runas/mesas/porto-123/mesa.json", "{}")]
    expect((await readTransferArchive(await createTransferArchive("Mesa", files))).files).toEqual(files)
  })
  it("limita a expansão antes de reservar memória para arquivos enormes", async () => {
    const zip = zipSync({ "a.md": new Uint8Array(1024) })
    await expect(readTransferArchive(zip, "x", { ...TRANSFER_LIMITS, file: 100 })).rejects.toThrow("excessivo")
    await expect(createTransferArchive("x", [text("a.md")], "runas", { ...TRANSFER_LIMITS, expanded: 1 })).rejects.toThrow("limite")
  })
  it("recusa truncamento e corrupção em ZIP sem manifesto", async () => {
    const zip = zipSync({ "a.md": strToU8("conteúdo") }, { level: 0 })
    await expect(readTransferArchive(zip.slice(0, -1))).rejects.toThrow("ZIP")
    const broken = zip.slice()
    broken[35] = broken[35]! ^ 1
    await expect(readTransferArchive(broken)).rejects.toThrow("corrompido")
  })
  it("não exporta uma quantidade que seu próprio leitor rejeitaria", async () => {
    const limits = { ...TRANSFER_LIMITS, files: 2 }
    const zip = await createTransferArchive("x", [text("a.md"), text("b.md")], "runas", limits)
    expect((await readTransferArchive(zip, "x", limits)).files).toHaveLength(2)
  })
})
