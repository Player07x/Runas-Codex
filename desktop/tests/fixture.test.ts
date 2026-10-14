import { readFile } from "node:fs/promises"
import { join } from "node:path"

describe("cofre de teste", () => {
  it("a nota dos formatadores é a mesma do exemplo do navegador", async () => {
    const fixture = await readFile(join(__dirname, "cofre-exemplo", "Notas", "Formatadores.md"), "utf8")
    const demo = await readFile(join(__dirname, "..", "..", "app", "src", "data", "formatadores.md"), "utf8")
    expect(fixture).toBe(demo)
  })
})
