import { chmod, mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkWritable } from "../src/main/vault"

// Root ignora as permissões da pasta; o teste de pasta protegida só vale para um usuário comum.
const asRoot = typeof process.getuid === "function" && process.getuid() === 0

describe("Testar gravação (U91)", () => {
  let root = ""
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "runas-teste-gravacao-")) })
  afterEach(async () => { await chmod(root, 0o755).catch(() => undefined); await rm(root, { recursive: true, force: true }) })

  it("cria, troca e apaga o arquivo de teste sem deixar nada na pasta", async () => {
    expect(await checkWritable(root)).toEqual({ ok: true })
    expect(await readdir(root)).toEqual([])
  })

  it.skipIf(process.platform === "win32" || asRoot)("diz que a pasta somente leitura recusou já ao criar", async () => {
    await chmod(root, 0o555)
    const result = await checkWritable(root)
    expect(result).toMatchObject({ ok: false, step: "criar" })
    expect(!result.ok && result.message).toMatch(/EACCES|EPERM/)
  })

  it("quando a troca é barrada (como o Acesso controlado a pastas faz), apaga o que criou", async () => {
    const blocked = async () => { throw Object.assign(new Error("EPERM: operation not permitted, rename"), { code: "EPERM" }) }
    expect(await checkWritable(root, { replace: blocked })).toMatchObject({ ok: false, step: "trocar" })
    expect(await readdir(root)).toEqual([])
  })
})
