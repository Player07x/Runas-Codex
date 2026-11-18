import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { installSnippet, mediaFile, setThumbnailer, vaultFileResponse } from "../src/main/vault-files"
import { createThumbnailer } from "../src/main/thumbnails"

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

describe("vault-file:// com miniatura (U86)", () => {
  afterEach(() => setThumbnailer(null))

  it("serve a miniatura pedida com ?w= e guarda no cache, fora do cofre", async () => {
    const cache = join(base, "miniaturas")
    const calls: number[] = []
    setThumbnailer(createThumbnailer(cache, async (_file, width) => { calls.push(width); return Buffer.from("miniatura " + width) }))
    const first = await vaultFileResponse(root, url("Notas/Anexos/mapa com espaço.png") + "?w=640", null)
    expect(first.headers.get("content-type")).toBe("image/png")
    expect(Buffer.from(await first.arrayBuffer()).toString()).toBe("miniatura 640")
    const again = await vaultFileResponse(root, url("Notas/Anexos/mapa com espaço.png") + "?w=640", null)
    expect(Buffer.from(await again.arrayBuffer()).toString()).toBe("miniatura 640")
    // A imagem grande foi lida uma vez só, e nada foi gravado no cofre.
    expect(calls).toEqual([640])
    expect((await readdir(join(root, "Notas", "Anexos"))).sort()).toEqual(["mapa com espaço.png"])
  })

  it("devolve a imagem inteira quando ela já é pequena, quando a largura não é das fixas e para tipos sem miniatura", async () => {
    const calls: string[] = []
    setThumbnailer(createThumbnailer(join(base, "miniaturas"), async (file) => { calls.push(file); return null }))
    const whole = Buffer.from([137, 80, 78, 71, 1, 2, 3, 4, 5, 6])
    for (const suffix of ["?w=640", "?w=640", "?w=641"]) {
      const response = await vaultFileResponse(root, url("Notas/Anexos/mapa com espaço.png") + suffix, null)
      expect(Buffer.from(await response.arrayBuffer())).toEqual(whole)
    }
    // A marca de “já é pequena” evita ler de novo.
    expect(calls).toHaveLength(1)
  })

  it("troca a miniatura quando a imagem muda no disco", async () => {
    const cache = join(base, "miniaturas")
    let version = 0
    setThumbnailer(createThumbnailer(cache, async () => Buffer.from("v" + ++version)))
    const read = async () => Buffer.from(await (await vaultFileResponse(root, url("Notas/Anexos/mapa com espaço.png") + "?w=256", null)).arrayBuffer()).toString()
    expect(await read()).toBe("v1")
    await writeFile(join(root, "Notas", "Anexos", "mapa com espaço.png"), Buffer.from([137, 80, 78, 71, 9, 9, 9, 9, 9, 9, 9, 9]))
    expect(await read()).toBe("v2")
  })
})
