import { archivePath, isArchived, noteFlags, sortNotes, unarchivePath } from "./note-flags"
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

  it("arquivar move para a pasta Arquivo do espaço e desarquivar devolve", () => {
    expect(archivePath("Notas/Ideias/Ponte.md")).toBe("Notas/Arquivo/Ideias/Ponte.md")
    expect(unarchivePath("Notas/Arquivo/Ideias/Ponte.md")).toBe("Notas/Ideias/Ponte.md")
    expect(isArchived("Notas/Arquivo/Ponte.md")).toBe(true)
    expect(archivePath("Notas/Arquivo/Ponte.md")).toBeNull()
    expect(archivePath("Wikis/Mundo/Ponte.md")).toBeNull()
    expect(unarchivePath("Notas/Ponte.md")).toBeNull()
  })
})
