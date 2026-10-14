import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { installSnippet, mediaFile, vaultFileResponse } from "../src/main/vault-files"

let base: string
let root: string

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "runas-codex-anexos-"))
  root = join(base, "Cofre")
  await mkdir(join(root, "Notas", "Anexos"), { recursive: true })
  await mkdir(join(root, ".obsidian"), { recursive: true })
  await writeFile(join(root, "Notas", "Anexos", "mapa com espaço.png"), Buffer.from([137, 80, 78, 71, 1, 2, 3, 4, 5, 6]))
  await writeFile(join(root, "Notas", "nota.md"), "# texto")
  await writeFile(join(root, "Notas", "script.sh"), "echo oi")
  await writeFile(join(root, ".obsidian", "oculta.png"), "x")
  await writeFile(join(base, "fora.png"), "x")
  await symlink(join(base, "fora.png"), join(root, "Notas", "atalho.png"))
})

afterEach(async () => {
  await rm(base, { recursive: true, force: true })
})

const url = (path: string) => `vault-file://cofre/${path.split("/").map(encodeURIComponent).join("/")}`

describe("vault-file://", () => {
  it("serve anexos de mídia do cofre, com o tipo certo", async () => {
    const response = await vaultFileResponse(root, url("Notas/Anexos/mapa com espaço.png"), null)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/png")
    expect(new Uint8Array(await response.arrayBuffer())).toHaveLength(10)
  })

  it("atende Range (áudio e vídeo pedem trechos)", async () => {
    const response = await vaultFileResponse(root, url("Notas/Anexos/mapa com espaço.png"), "bytes=2-5")
    expect(response.status).toBe(206)
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10")
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([78, 71, 1, 2])
  })

  it.each([
    ["nota Markdown", "Notas/nota.md"],
    ["executável/script", "Notas/script.sh"],
    ["pasta oculta", ".obsidian/oculta.png"],
    ["link simbólico para fora", "Notas/atalho.png"],
    ["fora do cofre", "../fora.png"],
  ])("recusa %s", async (_name, path) => {
    expect((await vaultFileResponse(root, url(path), null)).status).toBe(404)
    expect(await mediaFile(root, path)).toBeNull()
  })

  it("sem cofre aberto ou com outro host, nada", async () => {
    expect((await vaultFileResponse(null, url("Notas/Anexos/mapa com espaço.png"), null)).status).toBe(404)
    expect((await vaultFileResponse(root, "vault-file://outro/Notas/Anexos/x.png", null)).status).toBe(404)
  })
})

describe("installSnippet", () => {
  it("grava só .obsidian/snippets/runas-codex.css", async () => {
    await expect(installSnippet(root, ".callout {}")).resolves.toBe(".obsidian/snippets/runas-codex.css")
    expect(await readFile(join(root, ".obsidian", "snippets", "runas-codex.css"), "utf8")).toBe(".callout {}")
  })

  it("recusa .obsidian que aponta para fora do cofre", async () => {
    const other = join(base, "OutroCofre")
    await mkdir(join(other, "Notas"), { recursive: true })
    await mkdir(join(base, "config-de-fora"), { recursive: true })
    await symlink(join(base, "config-de-fora"), join(other, ".obsidian"))
    await expect(installSnippet(other, "x")).rejects.toThrow("fora do cofre")
  })
})
