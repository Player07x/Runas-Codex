import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { listVault, readTexts, resolveInside, VaultError } from "../src/main/vault"

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
