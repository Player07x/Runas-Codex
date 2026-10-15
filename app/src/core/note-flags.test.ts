import { archivePath, isArchived, moveDestination, noteFlags, sortNotes, unarchivePath } from "./note-flags"
import { VaultIndex } from "./vault-index"

const texts: Record<string, string> = {
  "Notas/Bravo.md": "---\nfixada: true\ncor: Verde\n---\nB",
  "Notas/Alfa.md": "A",
  "Notas/Charlie.md": "---\ncor: rosa\nfixada: \"true\"\n---\nC",
  "Notas/Delta.md": "---\nfixada: true\n---\nD",
}
const index = new VaultIndex(Object.keys(texts).map((path) => ({ path, size: 1, mtime: 1 })), texts)

describe("fixar, colorir e arquivar notas", () => {
  it("lê fixada e cor das propriedades (cor só das que o app conhece)", () => {
    expect(noteFlags(index.note("Notas/Bravo.md")!)).toEqual({ pinned: true, color: "verde" })
    expect(noteFlags(index.note("Notas/Charlie.md")!)).toEqual({ pinned: false })
    expect(noteFlags(index.note("Notas/Alfa.md")!)).toEqual({ pinned: false })
  })

  it("as fixadas vêm primeiro, cada grupo em ordem de nome", () => {
    expect(sortNotes(index.allNotes()).map((n) => n.name)).toEqual(["Bravo", "Delta", "Alfa", "Charlie"])
  })

  it("ordena por nome ao contrário, por edição e por criação, com as fixadas sempre antes", () => {
    const notes = [
      { name: "Alfa", mtime: 30, meta: { frontmatter: { data: { criado: "2026-01-02" } } } },
      { name: "Bravo", mtime: 10, meta: { frontmatter: { data: { criado: "2026-03-01" } } } },
      { name: "Charlie", mtime: 20, meta: { frontmatter: { data: { fixada: true } } } },
    ] as unknown as Parameters<typeof sortNotes>[0]
    const names = (order: Parameters<typeof sortNotes>[1]) => sortNotes(notes, order).map((n) => n.name)
    expect(names("nome-desc")).toEqual(["Charlie", "Bravo", "Alfa"])
    expect(names("modificada")).toEqual(["Charlie", "Alfa", "Bravo"])
    expect(names("modificada-antiga")).toEqual(["Charlie", "Bravo", "Alfa"])
    expect(names("criada")).toEqual(["Charlie", "Bravo", "Alfa"])
    expect(names("criada-antiga")).toEqual(["Charlie", "Alfa", "Bravo"])
  })

  it("arrastar para uma pasta: destino, nada a fazer ou recusa", () => {
    const exists = (p: string) => p === "Notas/Lugares/Ponte.md"
    expect(moveDestination("Notas/Ideias/Lago.md", "Notas/Lugares", false, exists)).toEqual({ to: "Notas/Lugares/Lago.md" })
    expect(moveDestination("Notas/Ideias/Lago.md", "", false, exists)).toEqual({ to: "Lago.md" })
    expect(moveDestination("Notas/Ideias/Lago.md", "Notas/Ideias", false, exists)).toBeNull()
    expect(moveDestination("Notas/Ideias/Ponte.md", "Notas/Lugares", false, exists)).toMatchObject({ error: expect.stringContaining("Já existe") })
    expect(moveDestination("Notas/Ideias", "Notas/Ideias/Velhas", true, exists)).toMatchObject({ error: expect.stringContaining("dentro dela mesma") })
    expect(moveDestination("Notas/Ideias", "Notas/Lugares", true, exists)).toEqual({ to: "Notas/Lugares/Ideias" })
  })

  it("arquivar move para a pasta Arquivo do espaço e desarquivar devolve", () => {
    expect(archivePath("Notas/Ideias/Ponte.md")).toBe("Notas/Arquivo/Ideias/Ponte.md")
    expect(unarchivePath("Notas/Arquivo/Ideias/Ponte.md")).toBe("Notas/Ideias/Ponte.md")
    expect(isArchived("Notas/Arquivo/Ponte.md")).toBe(true)
    expect(archivePath("Notas/Arquivo/Ponte.md")).toBeNull()
    expect(archivePath("Wikis/Mundo/Ponte.md")).toBeNull()
    expect(unarchivePath("Notas/Ponte.md")).toBeNull()
  })
})
