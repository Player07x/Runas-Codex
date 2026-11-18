import { describe, expect, it } from "vitest"
import { firstTemplateFolder, titleProblem, titleTarget } from "./note-title"
import { VaultIndex } from "./vault-index"

const files: Record<string, string> = { "Notas/Sem título.md": "", "Notas/Taverna.md": "", "Raiz.md": "" }
const index = new VaultIndex(Object.keys(files).map((path) => ({ path, size: 1, mtime: 1 })), files)

describe("nome da nota no título (U99)", () => {
  it("renomeia na mesma pasta, com a mesma extensão", () => {
    expect(titleTarget("Notas/Sem título.md", "  Diário de bordo ")).toBe("Notas/Diário de bordo.md")
    expect(titleTarget("Raiz.md", "Outra")).toBe("Outra.md")
  })

  it("aceita o mesmo nome e só mudar as maiúsculas", () => {
    expect(titleProblem(index, "Notas/Taverna.md", "Taverna")).toBeNull()
    expect(titleProblem(index, "Notas/Taverna.md", "taverna")).toBeNull()
  })

  it("recusa nome vazio, caractere proibido, outra pasta e nome que já existe", () => {
    expect(titleProblem(index, "Notas/Sem título.md", "  ")).toContain("vazio")
    expect(titleProblem(index, "Notas/Sem título.md", "A:B")).toContain("não é permitido")
    expect(titleProblem(index, "Notas/Sem título.md", "Wiki/Ana")).toBeTruthy()
    expect(titleProblem(index, "Notas/Sem título.md", "TAVERNA")).toContain("Já existe")
  })

  it("o primeiro modelo vai para a pasta do Obsidian", () => {
    expect(firstTemplateFolder("")).toBe("Templates")
    expect(firstTemplateFolder("Modelos/")).toBe("Modelos")
  })
})
