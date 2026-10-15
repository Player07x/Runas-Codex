import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { DICTIONARY_FILE, needsCopy } from "../src/main/spellcheck"

const folder = join(__dirname, "..", "resources", "dicionarios")

describe("dicionário do corretor (sem rede)", () => {
  it("o arquivo embutido é o do LEIA-ME (mesmo SHA-256) e é um dicionário do Chromium", () => {
    const bytes = readFileSync(join(folder, DICTIONARY_FILE))
    const readme = readFileSync(join(folder, "LEIA-ME.md"), "utf8")
    expect(bytes.subarray(0, 4).toString("latin1")).toBe("BDic")
    expect(readme).toContain(createHash("sha256").update(bytes).digest("hex"))
    expect(readFileSync(join(folder, "LICENCA-LGPL-2.1.txt"), "utf8")).toContain("GNU LESSER GENERAL PUBLIC LICENSE")
  })

  it("copia quando falta ou quando o do perfil é outro, e não regrava o igual", () => {
    const bundled = new Uint8Array([1, 2, 3])
    expect(needsCopy(bundled, null)).toBe(true)
    expect(needsCopy(bundled, new Uint8Array([1, 2]))).toBe(true)
    expect(needsCopy(bundled, new Uint8Array([1, 2, 4]))).toBe(true)
    expect(needsCopy(bundled, new Uint8Array([1, 2, 3]))).toBe(false)
  })
})
