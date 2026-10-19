import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { listTransferFiles, writeManagedTransfer } from "../src/main/vault-transfer"
let root: string
beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "runas-transfer-")) })
afterEach(async () => { await rm(root, { recursive: true, force: true }) })
describe("arquivos de mesas nos pacotes", () => {
  it("lista notas e mesas sem transportar preferências, lixeira ou arquivos de controle", async () => {
    await mkdir(join(root, "Notas")); await writeFile(join(root, "Notas/a.md"), "a")
    await mkdir(join(root, ".obsidian")); await writeFile(join(root, ".obsidian/app.json"), "{}")
    await mkdir(join(root, ".runas/mesas/porto/cenas"), { recursive: true })
    await writeFile(join(root, ".runas/mesas/porto/mesa.json"), "{}")
    await writeFile(join(root, ".runas/mesas/porto/mesa.json.tmp"), "incompleto")
    expect((await listTransferFiles(root)).map(file => file.path)).toEqual([".runas/mesas/porto/mesa.json", "Notas/a.md"])
    expect((await listTransferFiles(root, false)).map(file => file.path)).toEqual(["Notas/a.md"])
  })
  it("cria somente na área autorizada usando versão esperada e sem regravar bytes iguais", async () => {
    const path = ".runas/mesas/porto/mesa.json", bytes = new TextEncoder().encode("original")
    const first = await writeManagedTransfer(root, path, bytes, null)
    expect(first.path).toBe(path)
    await expect(writeManagedTransfer(root, path, bytes, null)).rejects.toThrow("Já existe")
    expect(await writeManagedTransfer(root, path, bytes, first)).toEqual(first)
    await writeFile(join(root, path), "alteração externa")
    await expect(writeManagedTransfer(root, path, new TextEncoder().encode("novo"), first)).rejects.toThrow("mudou fora")
    expect(await readFile(join(root, path), "utf8")).toBe("alteração externa")
  })
  it.each([".obsidian/app.json", ".runas/senha.json", ".runas/mesas/porto/../fora.json", ".runas/mesas/porto/.oculto", ".runas/mesas/porto/arquivo.js"])("recusa o destino interno não autorizado %s", async path => {
    await expect(writeManagedTransfer(root, path, new Uint8Array([1]), null)).rejects.toThrow("inválida")
  })
  it.skipIf(process.platform === "win32")("recusa link na raiz interna sem tocar no destino", async () => {
    const outside = await mkdtemp(join(tmpdir(), "runas-fora-"))
    try {
      await symlink(outside, join(root, ".runas"), "dir")
      await expect(writeManagedTransfer(root, ".runas/mesas/porto/mesa.json", new Uint8Array([1]), null)).rejects.toThrow("link")
      await expect(readFile(join(outside, "mesas/porto/mesa.json"))).rejects.toThrow()
    } finally { await rm(outside, { recursive: true, force: true }) }
  })
})
