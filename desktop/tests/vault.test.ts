import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, utimes, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { unzipSync } from "fflate"
import { backupVault, createVault, listBackups, listVault, MAX_BINARY_SIZE, readBinary, readTexts, renamePath, renameRetrying, resolveInside, trashPath, VaultError, writeBinarySafe, writeTextSafe } from "../src/main/vault"

let base: string
let root: string

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "runas-codex-"))
  root = join(base, "Cofre")
  await mkdir(join(root, ".obsidian"), { recursive: true })
  await mkdir(join(root, "Wikis", "Ordem x Caos"), { recursive: true })
  await writeFile(join(root, ".obsidian", "app.json"), "{}")
  await writeFile(join(root, "Início.md"), "\uFEFF# Início\r\n\r\nVer [[Aldren]].\r\n")
  await writeFile(join(root, "Wikis", "Ordem x Caos", "Aldren.md"), "# Aldren\n")
  await writeFile(join(base, "segredo.md"), "fora do cofre")
  await symlink(join(base, "segredo.md"), join(root, "atalho.md"))
})

afterEach(async () => {
  await rm(base, { recursive: true, force: true })
})

describe("resolveInside", () => {
  it("aceita caminhos do cofre com / ou \\", async () => {
    await expect(resolveInside(root, "Wikis/Ordem x Caos/Aldren.md")).resolves.toBe(join(root, "Wikis", "Ordem x Caos", "Aldren.md"))
    await expect(resolveInside(root, "Wikis\\Ordem x Caos\\Aldren.md")).resolves.toBe(join(root, "Wikis", "Ordem x Caos", "Aldren.md"))
  })

  it.each(["../segredo.md", "Wikis/../../segredo.md", "/etc/passwd", "C:/Windows/win.ini", "", "a\0b.md"])("recusa %j", async (path) => {
    await expect(resolveInside(root, path)).rejects.toBeInstanceOf(VaultError)
  })

  it("recusa link simbólico que aponta para fora do cofre", async () => {
    await expect(resolveInside(root, "atalho.md")).rejects.toThrow("fora do cofre")
  })
})

describe("listVault", () => {
  it("lista arquivos com caminho em /, sem pastas com ponto nem links simbólicos", async () => {
    const entries = await listVault(root)
    expect(entries.map((e) => e.path)).toEqual(["Início.md", "Wikis/Ordem x Caos/Aldren.md"])
    expect(entries[0]?.size).toBeGreaterThan(0)
    expect(entries[0]?.mtime).toBeGreaterThan(0)
  })

  it("filtra por prefixo", async () => {
    expect((await listVault(root, "Wikis/")).map((e) => e.path)).toEqual(["Wikis/Ordem x Caos/Aldren.md"])
  })
})

describe("readTexts", () => {
  it("lê em lote sem alterar o conteúdo e ignora arquivos que sumiram", async () => {
    const texts = await readTexts(root, ["Início.md", "Sumiu.md"])
    expect(Object.keys(texts)).toEqual(["Início.md"])
    expect(texts["Início.md"]).toBe("\uFEFF# Início\r\n\r\nVer [[Aldren]].\r\n")
  })

  it("não lê nada fora do cofre", async () => {
    await expect(readTexts(root, ["Início.md", "../segredo.md"])).rejects.toBeInstanceOf(VaultError)
  })
})

describe("writeTextSafe", () => {
  it("cria, recusa criar de novo e atualiza só com a versão certa", async () => {
    const created = await writeTextSafe(root, "Notas/Nova.md", "# Nova\n", null)
    expect(created.size).toBe(7)
    await expect(writeTextSafe(root, "Notas/Nova.md", "x", null)).rejects.toThrow("Já existe")
    await expect(writeTextSafe(root, "Notas/Nova.md", "x", { mtime: 1, size: 7 })).rejects.toThrow("mudou fora do app")
    const updated = await writeTextSafe(root, "Notas/Nova.md", "# Nova 2\n", created)
    expect(await readFile(join(root, "Notas", "Nova.md"), "utf8")).toBe("# Nova 2\n")
    expect(updated.size).toBe(9)
    expect((await readdir(join(root, "Notas"))).filter((name) => name.includes("runas-tmp"))).toEqual([])
  })

  it("não regrava conteúdo igual (a data do arquivo não muda)", async () => {
    const path = join(root, "Início.md")
    await utimes(path, new Date(2020, 0, 1), new Date(2020, 0, 1))
    const before = (await stat(path)).mtimeMs
    const entry = await writeTextSafe(root, "Início.md", "\uFEFF# Início\r\n\r\nVer [[Aldren]].\r\n", { mtime: before, size: (await stat(path)).size })
    expect(entry.mtime).toBe(before)
    expect((await stat(path)).mtimeMs).toBe(before)
  })

  it.each([".obsidian/app.json", "Notas/.oculto.md", "../fora.md", "/tmp/x.md"])("recusa gravar em %j", async (path) => {
    await expect(writeTextSafe(root, path, "x")).rejects.toBeInstanceOf(VaultError)
  })

  it("recusa gravar através de link simbólico", async () => {
    await expect(writeTextSafe(root, "atalho.md", "x")).rejects.toThrow("simbólico")
  })
})

describe("writeBinarySafe e readBinary", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 255, 128])

  it("cria o anexo com a pasta, lê os mesmos bytes, recusa criar de novo e atualiza só com a versão certa", async () => {
    const created = await writeBinarySafe(root, "Anexos/mapa.png", png, null)
    expect(created).toMatchObject({ path: "Anexos/mapa.png", size: png.length })
    expect(await readBinary(root, "Anexos/mapa.png")).toEqual(png)
    await expect(writeBinarySafe(root, "Anexos/mapa.png", png, null)).rejects.toThrow("Já existe")
    await expect(writeBinarySafe(root, "Anexos/mapa.png", png, { mtime: 1, size: png.length })).rejects.toThrow("mudou fora do app")
    const updated = await writeBinarySafe(root, "Anexos/mapa.png", png.slice(0, 4), created)
    expect(updated.size).toBe(4)
    expect((await readdir(join(root, "Anexos"))).filter((name) => name.includes("runas-tmp"))).toEqual([])
  })

  it("não regrava bytes iguais (a data do arquivo não muda)", async () => {
    const created = await writeBinarySafe(root, "capa.png", png, null)
    await utimes(join(root, "capa.png"), new Date(2020, 0, 1), new Date(2020, 0, 1))
    const before = (await stat(join(root, "capa.png"))).mtimeMs
    const entry = await writeBinarySafe(root, "capa.png", png.slice(), { mtime: before, size: created.size })
    expect(entry.mtime).toBe(before)
  })

  it.each([".obsidian/x.png", "Anexos/.oculta.png", "../fora.png", "/tmp/x.png", "atalho.md"])("recusa gravar em %j", async (path) => {
    await expect(writeBinarySafe(root, path, png)).rejects.toBeInstanceOf(VaultError)
  })

  it("recusa ler fora do cofre e anexo grande demais", async () => {
    await expect(readBinary(root, "../segredo.md")).rejects.toBeInstanceOf(VaultError)
    await expect(writeBinarySafe(root, "grande.bin", new Uint8Array(MAX_BINARY_SIZE + 1))).rejects.toThrow("MB")
  })
})

describe("renamePath e trashPath", () => {
  it("move criando a pasta, recusa sobrescrever e troca só maiúsculas", async () => {
    await renamePath(root, "Início.md", "Notas/Início.md")
    expect((await listVault(root)).map((e) => e.path)).toContain("Notas/Início.md")
    await writeTextSafe(root, "Notas/Outra.md", "x", null)
    await expect(renamePath(root, "Notas/Início.md", "Notas/Outra.md")).rejects.toThrow("Já existe")
    await renamePath(root, "Notas/Outra.md", "Notas/outra.md")
    expect(await readdir(join(root, "Notas"))).toContain("outra.md")
  })

  it("manda para .trash sem apagar, numerando repetidos", async () => {
    await writeTextSafe(root, "a.md", "1", null)
    expect(await trashPath(root, "a.md")).toBe(".trash/a.md")
    await writeTextSafe(root, "a.md", "2", null)
    expect(await trashPath(root, "a.md")).toBe(".trash/a 1.md")
    expect(await readFile(join(root, ".trash", "a 1.md"), "utf8")).toBe("2")
  })
})

describe("createVault e backups", () => {
  it("cria as pastas dos espaços sem sobrescrever o .obsidian", async () => {
    const fresh = join(base, "Novo")
    await mkdir(fresh)
    await createVault(fresh)
    expect((await readdir(fresh)).sort()).toEqual([".obsidian", "Agenda", "Campanhas", "Livros", "Mesas", "Notas", "Wikis"])
    await writeFile(join(fresh, ".obsidian", "app.json"), '{"meu":true}')
    await createVault(fresh)
    expect(await readFile(join(fresh, ".obsidian", "app.json"), "utf8")).toBe('{"meu":true}')
  })

  it("faz backup só do texto e guarda os mais recentes", async () => {
    await writeFile(join(root, "imagem.png"), "binário")
    const folder = join(base, "backups")
    const info = await backupVault(root, folder, 2)
    const zip = unzipSync(await readFile(join(folder, `${info.id}.zip`)))
    expect(Object.keys(zip).sort()).toEqual([".obsidian/app.json", "Início.md", "Wikis/Ordem x Caos/Aldren.md"])
    await new Promise((r) => setTimeout(r, 5))
    await backupVault(root, folder, 2)
    await new Promise((r) => setTimeout(r, 5))
    await backupVault(root, folder, 2)
    expect(await listBackups(folder)).toHaveLength(2)
  })
})

describe("renameRetrying", () => {
  const busy = (code: string) => Object.assign(new Error(code), { code })
  it("no Windows, tenta de novo quando o arquivo está preso por um instante", async () => {
    let calls = 0
    await renameRetrying("a", "b", "win32", async () => { if (++calls < 3) throw busy("EPERM") })
    expect(calls).toBe(3)
  })
  it("desiste depois de dez tentativas e não repete outros erros nem em outros sistemas", async () => {
    let calls = 0
    await expect(renameRetrying("a", "b", "win32", async () => { calls++; throw busy("EBUSY") })).rejects.toThrow("EBUSY")
    expect(calls).toBe(10)
    calls = 0
    await expect(renameRetrying("a", "b", "win32", async () => { calls++; throw busy("ENOENT") })).rejects.toThrow("ENOENT")
    expect(calls).toBe(1)
    calls = 0
    await expect(renameRetrying("a", "b", "linux", async () => { calls++; throw busy("EPERM") })).rejects.toThrow("EPERM")
    expect(calls).toBe(1)
  })
})

