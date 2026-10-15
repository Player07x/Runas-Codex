import { afterEach, describe, expect, it } from "vitest"
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createFolder, trashPath } from "../src/main/vault"
import { listTrash, restoreTrash } from "../src/main/trash"
import { WriteQueue } from "../src/main/write-queue"
const roots: string[] = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
async function root() { const path = await mkdtemp(join(tmpdir(), "runas-trash-test-")); roots.push(path); await writeFile(join(path, "Nota.md"), "original"); await trashPath(path, "Nota.md"); return path }
describe("restaurar da lixeira", () => {
  it("restaura no caminho escolhido e só depois remove da lixeira", async () => { const dir = await root(); expect(await listTrash(dir)).toHaveLength(1); await restoreTrash(dir, ".trash/Nota.md", "Notas/Nota.md"); expect(await readFile(join(dir, "Notas/Nota.md"), "utf8")).toBe("original"); expect(await listTrash(dir)).toEqual([]) })
  it("recusa colisão e mantém o original na lixeira", async () => { const dir = await root(); await writeFile(join(dir, "Nota.md"), "novo"); await expect(restoreTrash(dir, ".trash/Nota.md", "Nota.md")).rejects.toThrow(/Já existe/); expect(await listTrash(dir)).toHaveLength(1); expect(await readFile(join(dir, "Nota.md"), "utf8")).toBe("novo") })
  it("recusa escapar da lixeira e do cofre", async () => { const dir = await root(); for (const path of ["Nota.md", ".trash/../Nota.md", ".trash\\Nota.md"]) await expect(restoreTrash(dir, path, "Notas/Nota.md")).rejects.toThrow(); await expect(restoreTrash(dir, ".trash/Nota.md", "../fora.md")).rejects.toThrow() })
  it.skipIf(process.platform === "win32")("recusa atalho e mantém o arquivo apontado intacto", async () => { const dir = await root(); await createFolder(dir, "Notas"); await writeFile(join(dir, "Notas/Segredo.md"), "preservado"); await symlink(join(dir, "Notas/Segredo.md"), join(dir, ".trash/Atalho.md")); await expect(restoreTrash(dir, ".trash/Atalho.md", "Notas/Recuperado.md")).rejects.toThrow(/simbólico/); expect(await readFile(join(dir, "Notas/Segredo.md"), "utf8")).toBe("preservado") })
  it("serializa gravações concorrentes e libera a fila mesmo depois de erro", async () => { const queue = new WriteQueue(), order: number[] = []; await Promise.allSettled([queue.run("nota", async () => { await Promise.resolve(); order.push(1); throw new Error("falha") }), queue.run("nota", async () => { order.push(2) })]); expect(order).toEqual([1, 2]); await queue.run("nota", async () => { order.push(3) }); expect(order).toEqual([1, 2, 3]) })
})
